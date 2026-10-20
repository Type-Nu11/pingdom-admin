import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'
import { settledControlSurface as surface } from '../helpers/settled-control-surface.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-merchant-controls-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
  name: 'merchant-control-surfaces', configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
    if (!['/merchant-qa', '/apply-qa', '/admin-qa'].includes(req.url?.split('?')[0])) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-control-surfaces-fixture.jsx')))
  }) },
}] })
let browser
async function checkControls(page, prefix, merchant) {
  // A route or modal can move a control under the previous click's pointer.
  await page.mouse.move(0, 0)
  const controls = page.locator(`[aria-label="${prefix} 입력"] [role="combobox"], [aria-label="${prefix} 입력"] button[aria-haspopup="dialog"]`)
  assert.equal(await controls.count(), 6)
  for (const control of await controls.all()) {
    const css = await surface(control)
    const disabled = await control.isDisabled()
    const context = JSON.stringify({ url: page.url(), viewport: page.viewportSize(), prefix, merchant, css })
    assert.equal(css.border, merchant ? '1px' : '0px', context)
    assert.equal(css.background, merchant ? disabled ? 'rgb(242, 242, 243)' : 'rgb(255, 255, 255)' : 'rgb(246, 246, 247)', context)
  }
  assert.equal((await surface(page.getByRole('button', { name: prefix + ' 저장', exact: true }))).background, 'rgb(255, 25, 86)', 'Primary action retains brand color')
  assert.notEqual(await page.getByRole('button', { name: prefix + ' 삭제', exact: true }).evaluate(element => getComputedStyle(element).color), 'rgb(255, 25, 86)', 'Danger action retains its semantic color')
}
try {
  await server.listen(); browser = await chromium.launch()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const guard = await guardBrowserPage(page, base)
    await page.goto(base + '/merchant-qa')
    await page.getByRole('heading', { name: '상점주 버튼 검증 · 실제 API 없음' }).waitFor()
    await checkControls(page, '페이지', true)
    const select = page.getByRole('combobox', { name: '페이지 상태', exact: true })
    await select.hover()
    assert.notEqual((await surface(select)).background, 'rgb(255, 255, 255)', 'hover has a distinct surface after transition')
    await page.mouse.move(0, 0)
    assert.equal((await surface(select)).background, 'rgb(255, 255, 255)', 'leaving hover restores the exact normal surface')
    await select.focus(); await select.press('ArrowDown'); await select.press('ArrowDown'); await select.press('Enter')
    assert.match(await select.innerText(), /승인 대기/)
    await select.focus()
    assert.equal((await surface(select)).outline, 'solid')
    await page.screenshot({ path: join(output, `page-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: '모달 열기', exact: true }).click()
    await checkControls(page, '모달', true)
    const dialog = page.getByRole('dialog', { name: '선택 버튼 검증', exact: true })
    await dialog.getByRole('button', { name: /^모달 일시,/ }).click()
    const calendar = page.getByRole('dialog', { name: '모달 일시', exact: true })
    await calendar.waitFor()
    await page.mouse.move(0, 0)
    assert.equal((await surface(calendar.getByRole('button', { name: /^시간 선택,/ }))).background, 'rgb(255, 255, 255)', 'Nested portal inherits merchant appearance')
    await calendar.getByRole('button', { name: '적용', exact: true }).click()
    await page.screenshot({ path: join(output, `portal-${width}.png`), fullPage: true })
    await dialog.getByRole('button', { name: '닫기', exact: true }).click()
    await page.getByRole('link', { name: '신청 화면', exact: true }).click()
    await page.getByRole('heading', { name: '신청 버튼 검증 · 실제 API 없음' }).waitFor()
    await checkControls(page, '페이지', true)
    await page.getByRole('link', { name: '관리자', exact: true }).click()
    await page.getByRole('heading', { name: '관리자 버튼 검증 · 실제 API 없음' }).waitFor()
    await checkControls(page, '페이지', false)
    await page.getByRole('button', { name: '모달 열기', exact: true }).click()
    await checkControls(page, '모달', false)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    guard.assertClean()
    await page.close()
  }
  console.log('PASS merchant controls: white outlined normal/portal/nested picker/applicant; disabled, focus, keyboard, brand/danger and admin isolation at three sizes. ' + output)
} finally { await browser?.close(); await server.close() }
