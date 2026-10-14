import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'
import { chromium } from 'playwright'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'
import { measureElementContrast } from '../helpers/element-contrast.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-regression-probes-'))
const server = await createServer({ cacheDir: join(output, 'cache'), plugins: [{
  name: 'regression-probes', configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
    if (req.url?.split('?')[0] === '/__qa/http-failure') { res.statusCode = 503; res.end('synthetic'); return }
    if (req.url?.split('?')[0] !== '/__qa/probes') return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/regression-probes-fixture.jsx')))
  }) },
}], server: { host: '127.0.0.1', port: 0 } })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  const run = async (fault = '') => {
    const page = await browser.newPage()
    try {
      const guard = await guardBrowserPage(page, origin)
      await page.goto(`${origin}/__qa/probes?fault=${fault}`)
      await page.getByRole('heading', { name: '검사 감지 능력 검증' }).waitFor()
      if (['console', 'warning'].includes(fault)) await page.evaluate(level => console[level]('injected diagnostic'), fault === 'warning' ? 'warn' : 'error')
      if (fault === 'pageerror') {
        const emitted = page.waitForEvent('pageerror')
        await page.evaluate(() => setTimeout(() => { throw new Error('injected runtime failure') }, 0))
        await emitted
      }
      if (fault === 'fixture-api') await page.evaluate(() => window.qaCaughtFailure())
      if (fault === 'http') await page.evaluate(() => fetch('/__qa/http-failure'))
      if (fault === 'blocked-request') await page.evaluate(() => fetch('https://invalid.example/never-forward').catch(() => {}))
      if (['console', 'warning', 'pageerror', 'fixture-api', 'http', 'blocked-request'].includes(fault)) { guard.assertClean(); return }
      const contrast = await page.locator('[data-contrast]').evaluate(measureElementContrast)
      assert.ok(contrast.ratio >= 4.5, 'CONTRAST_REGRESSION')
      const second = page.getByRole('tab', { name: '탭 2' })
      await page.getByRole('tab', { name: '탭 1' }).focus()
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter')
      if (fault === 'tab') await second.evaluate(element => element.setAttribute('aria-selected', 'false'))
      assert.equal(await second.getAttribute('aria-selected'), 'true', 'TAB_REGRESSION')
      assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), await second.getAttribute('id'))
      await page.getByRole('textbox', { name: '미저장 입력' }).fill('합성 보존 입력')
      await page.getByRole('button', { name: '입력 초기화' }).click()
      const confirmation = page.getByRole('dialog', { name: '저장하지 않은 변경 사항이 있습니다' })
      assert.equal(await confirmation.count(), 1, 'UNSAVED_REGRESSION')
      await confirmation.getByRole('button', { name: '계속 작성' }).click()
      assert.equal(await page.getByRole('textbox', { name: '미저장 입력' }).inputValue(), '합성 보존 입력')
      await page.getByRole('button', { name: '처리 모달 열기' }).click()
      const dialog = page.getByRole('dialog', { name: '처리 중 잠금 검증' })
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
      await page.keyboard.press('Escape')
      assert.equal(await dialog.count(), 1, 'CLOSE_REGRESSION')
      assert.equal(await dialog.getByRole('button', { name: '닫기', exact: true }).isDisabled(), true)
      await page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true)
      await page.mouse.click(1, 1)
      assert.equal(await dialog.count(), 1)
      guard.assertClean()
    } finally { await page.close() }
  }
  await run()
  for (const fault of ['console', 'warning', 'pageerror', 'fixture-api', 'http', 'blocked-request', 'contrast', 'tab', 'unsaved', 'close']) {
    const marker = { contrast: 'CONTRAST_REGRESSION', tab: 'TAB_REGRESSION', unsaved: 'UNSAVED_REGRESSION', close: 'CLOSE_REGRESSION' }[fault] || 'Unexpected browser/fixture failures'
    await assert.rejects(run(fault), error => error.code === 'ERR_ASSERTION' && error.message.includes(marker), `Fault ${fault} must fail the intended assertion, not import/timeout/setup`)
    console.log(`Detected injected ${fault} regression at the intended assertion`)
  }
  console.log('PASS production primitives + 10 deliberate failures; no real API.')
} finally { await browser?.close(); await server.close() }
