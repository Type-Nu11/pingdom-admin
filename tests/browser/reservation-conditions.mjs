import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-297-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'reservation-qa', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/reservation-qa') && !req.url.startsWith('/merchant/payments')) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/reservation-conditions-fixture.jsx')))
  })
} }] })
let browser
const expectedConflict = event => (event.kind === 'fixture-api' && event.method === 'POST' && event.status === 409 && event.text === 'Synthetic conflict' && /^\/merchant-owner\/reservations\/\d+\/cancel$/.test(event.path)) || (event.kind === 'console' && event.level === 'error' && event.text.startsWith('상점주 예약 취소 실패') && event.text.includes('Synthetic conflict'))
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, timezoneId: 'America/Los_Angeles' })
    const guard = await guardBrowserPage(page, base, expectedConflict)
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/reservation-qa`)
    await page.getByText('예약 신청 목록', { exact: true }).waitFor()
    await page.getByLabel('수락한 예약 조건').first().waitFor()
    const text = await page.locator('body').innerText()
    assert.match(text, /테스트 매장.*2명.*예약 당시 적용된 조건.*버전 1/s)
    assert.match(text, /승인 대기/)
    assert.match(text, /반려.*합성 반려 사유/s)
    assert.doesNotMatch(text, /상품|총액|금액|무료|0원|결제 불필요|undefined/)
    const cancel = page.getByRole('button', { name: '예약 취소', exact: true })
    assert.equal(await cancel.nth(3).isDisabled(), true)
    assert.equal(await cancel.nth(4).isDisabled(), false)
    await page.getByText(/기기 시각 기준.*취소 요청/).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `list-${width}.png`), fullPage: true })
    await cancel.first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '예약 취소', exact: true }).click()
    await dialog.getByRole('button', { name: '결제·환불 내역 확인' }).waitFor()
    assert.equal(await dialog.locator('[aria-label="수락한 예약 조건"] p').evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth)), true)
    await page.screenshot({ path: join(output, `refund-${width}.png`), fullPage: true })
    assert.equal(await page.evaluate(() => window.qaWrites.length), 1)
    const bounds = await dialog.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height)
    await page.evaluate(() => { window.qaMode = 'pending' })
    await dialog.getByRole('button', { name: '예약 취소', exact: true }).click()
    await dialog.getByRole('button', { name: '처리 중' }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await dialog.count(), 1)
    assert.equal(await dialog.getByRole('button', { name: '닫기', exact: true }).first().isDisabled(), true)
    await page.mouse.click(2, 2)
    assert.equal(await dialog.count(), 1)
    assert.equal(await page.evaluate(() => window.qaWrites.length), 2)
    await page.evaluate(() => { window.qaRelease() })
    await dialog.waitFor({ state: 'hidden' })
    await page.getByRole('status').filter({ hasText: '예약을 취소했습니다.' }).waitFor()
    assert.equal(await cancel.count(), 4)
    await page.evaluate(() => { window.qaMode = 'policy' })
    await cancel.nth(1).click()
    await dialog.getByText(/이 예약의 취소 조건을 확인할 수 없습니다/).waitFor()
    await dialog.getByRole('button', { name: '예약 취소', exact: true }).click()
    await dialog.getByRole('alert').filter({ hasText: '이 예약에 적용된 취소 정책' }).waitFor()
    assert.equal(await dialog.getByRole('button', { name: '결제·환불 내역 확인' }).count(), 0)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await page.evaluate(() => { window.qaMode = 'refund' })
    await cancel.first().click()
    await dialog.getByRole('button', { name: '예약 취소', exact: true }).click()
    await dialog.getByRole('button', { name: '결제·환불 내역 확인' }).click()
    await page.getByRole('heading', { name: '결제·정산' }).waitFor()
    await page.getByText('결제 #10', { exact: true }).waitFor()
    await page.getByText('예약 #1 · 금액 정보 없음', { exact: true }).waitFor()
    assert.doesNotMatch(await page.locator('body').innerText(), /0원|0 KRW/)
    await page.getByRole('button', { name: '전액 환불', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '전액 환불', exact: true }).click()
    await page.getByRole('status').filter({ hasText: '환불 요청이 접수되었습니다.' }).waitFor()
    await page.getByText('환불 처리 중', { exact: true }).waitFor()
    assert.doesNotMatch(await page.locator('body').innerText(), /환불 완료|전액 환불했습니다/)
    assert.equal(await page.getByRole('button', { name: '전액 환불', exact: true }).count(), 0)
    guard.assertClean()
    await page.close()
  }
  for (const [skew, deadlineOffset, mode] of [[120_000, 60_000, 'success'], [-120_000, -60_000, 'policy']]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await page.addInitScript(({ skew, deadline }) => {
      const originalNow = Date.now.bind(Date)
      Date.now = () => originalNow() + skew
      window.qaDeadline = deadline
    }, { skew, deadline: new Date(Date.now() + deadlineOffset).toISOString() })
    const guard = await guardBrowserPage(page, base, expectedConflict)
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/reservation-qa`)
    const cancel = page.getByRole('button', { name: '예약 취소', exact: true }).first()
    await cancel.waitFor()
    assert.equal(await cancel.isDisabled(), false)
    await cancel.click()
    const dialog = page.getByRole('dialog')
    if (skew > 0) await dialog.getByText(/기기 시각 기준.*취소 요청/).waitFor()
    else assert.equal(await dialog.getByText(/기기 시각 기준/).count(), 0)
    await page.evaluate(mode => { window.qaMode = mode }, mode)
    await dialog.getByRole('button', { name: '예약 취소', exact: true }).click()
    if (mode === 'success') {
      await dialog.waitFor({ state: 'hidden' })
      await page.getByRole('status').filter({ hasText: '예약을 취소했습니다.' }).waitFor()
    } else {
      await dialog.getByRole('alert').filter({ hasText: '이 예약에 적용된 취소 정책' }).waitFor()
      assert.equal(await page.getByText('확정', { exact: true }).count(), 5)
      await page.screenshot({ path: join(output, 'server-deadline-1366.png'), fullPage: true })
    }
    assert.equal(await page.evaluate(() => window.qaWrites.length), 1)
    guard.assertClean()
    await page.close()
  }
  console.log('PASS reservation conditions, conflicts, pending dialog guards, success, refund navigation and clock skew; ' + output)
} finally { await browser?.close(); await server.close() }
