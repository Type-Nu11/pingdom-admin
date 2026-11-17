import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-place-review-structure-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'place-review-structure-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/visitor-verifications') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/admin-place-review-structure-fixture.jsx')))
    })
  },
}] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    page.setDefaultTimeout(10000)
    const guard = await guardBrowserPage(page, base)
    await page.goto(`${base}/visitor-verifications`)
    const record = id => page.getByRole('button', { name: new RegExp(`(?:제보|정정) #${id} · 장소 #70001`) })
    const latest = kind => page.evaluate(kind => window.visitorQa.calls.filter(call => call.url === `/admin/visitor-verification-reports${kind === 'corrections' ? '/corrections' : ''}`).at(-1), kind)
    const checkConfirmation = async (decision, kind) => {
      await page.getByRole('button', { name: decision, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: `${kind} ${decision}`, exact: true })
      await dialog.getByRole('button', { name: '심사 확정', exact: true }).click()
      await dialog.getByRole('alert').filter({ hasText: '심사 근거를 입력해주세요.' }).waitFor()
      await dialog.getByRole('textbox', { name: /심사 근거/ }).fill('합성 근거 — 실제 심사하지 않음')
      await dialog.getByRole('button', { name: '취소', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
    }
    await record(1901).waitFor()
    assert.match(await record(1901).textContent(), /사용자 #901/)
    await record(1901).focus(); await page.keyboard.press('Enter')
    await page.getByRole('button', { name: '승인', exact: true }).waitFor()
    assert.equal((await latest('reports')).params.limit, 10)
    await checkConfirmation('승인', '검증 제보')
    await checkConfirmation('반려', '검증 제보')
    await page.getByRole('button', { name: '2페이지로 이동', exact: true }).click()
    await record(1902).waitFor()
    assert.equal((await latest('reports')).params.page, 2)
    await page.getByText('심사할 항목을 선택해주세요.', { exact: true }).waitFor()
    await page.getByRole('combobox', { name: '심사 상태', exact: true }).click()
    await page.getByRole('option', { name: '승인', exact: true }).click()
    await record(1901).waitFor()
    assert.equal((await latest('reports')).params.page, 1)
    assert.equal((await latest('reports')).params.status, 'ACCEPTED')
    await record(1901).click()
    assert.equal(await page.getByRole('button', { name: '승인', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: '반려', exact: true }).count(), 0)
    const tab = page.getByRole('tab', { name: '검증 제보', exact: true })
    await tab.focus(); await page.keyboard.press('ArrowRight')
    assert.equal(await page.getByRole('tab', { name: '정정 요청', exact: true }).evaluate(element => element === document.activeElement), true)
    assert.equal(await tab.getAttribute('aria-selected'), 'true', 'arrows move focus without triggering the manual-activation tab')
    await page.keyboard.press('Enter')
    await record(2901).waitFor()
    assert.match(await record(2901).textContent(), /사용자 #902/, 'corrections must use requesterUserId, not the original reporter')
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'corrections')
    await record(2901).click()
    assert.equal((await latest('corrections')).params.status, 'SUBMITTED')
    await checkConfirmation('승인', '정정 요청')
    await checkConfirmation('반려', '정정 요청')
    await page.getByRole('button', { name: '2페이지로 이동', exact: true }).click()
    await record(2902).waitFor()
    assert.equal((await latest('corrections')).params.page, 2)
    await page.getByRole('tab', { name: '검증 제보', exact: true }).click()
    await record(1901).waitFor()
    assert.match(await page.getByRole('combobox', { name: '심사 상태', exact: true }).textContent(), /^승인/)
    await page.goto(`${base}/visitor-verifications?tab=corrections`)
    await record(2901).waitFor()
    assert.equal(await page.getByRole('tab', { name: '정정 요청', exact: true }).getAttribute('aria-selected'), 'true')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(await page.evaluate(() => window.visitorQa.unexpected), [])
    assert.ok(await page.evaluate(() => window.visitorQa.calls.every(call => call.method === 'get')))
    await page.screenshot({ path: join(output, `visitor-${width}.png`) })
    guard.assertClean()
    console.log(`${width}×${height}: list/keyboard/tabs/query/page/status/read-only approvals and four canceled confirmations PASS`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; no operational writes.`)
} finally {
  await browser?.close()
  await server.close()
}
