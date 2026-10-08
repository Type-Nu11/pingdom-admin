import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { startMerchantDialogServer } from './merchant-dialog-server.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const cases = [
  ['refund', '전액 환불', '결제 전액 환불', '전액 환불', null, '/merchant-owner/payments/1/refund', '상점주 결제 환불 실패'],
  ['selection', '상품 선택', 'Verified Boost 상품 선택', '선택 완료', null, '/merchant-owner/verified-boost-selections', '상점주 Verified Boost 상품 선택 실패'],
  ['stop', '집행 중단', 'Verified Boost 집행 중단', '집행 중단', null, '/merchant-owner/verified-boost-executions/1/stop', '상점주 Verified Boost 집행 중단 실패'],
  ['response', '응답 작성', '재확인 요청 응답', '응답 제출', '응답 내용', '/merchant-owner/place-information-reverification-requests/1/responses', '상점주 장소 정보 재확인 응답 제출 실패'],
  ['review', '리뷰 #1 삭제 요청', '리뷰 삭제 요청', '삭제 요청 제출', '요청 사유', '/merchant-owner/places/1/reviews/1/deletion-requests', '상점주 리뷰 삭제 요청 실패'],
]
const { server, base, output } = await startMerchantDialogServer()
let browser
try {
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    for (const [screen, triggerName, title, submitName, field, path, prefix] of cases) {
      const page = await browser.newPage({ viewport: { width, height } })
      try {
        let expectingFailure = false
        const guard = await guardBrowserPage(page, base, event => expectingFailure && (
          (event.kind === 'fixture-api' && event.method === 'POST' && event.path === path && event.status === 500 && event.text === 'Synthetic failure') ||
          (event.kind === 'console' && event.level === 'error' && event.text.startsWith(prefix + ' Error: Synthetic failure'))))
        await page.goto(`${base}/__qa/merchant-dialog?screen=${screen}&scenario=controlled`)
        const trigger = page.getByRole('button', { name: triggerName, exact: true })
        await trigger.click()
        const dialog = page.getByRole('dialog', { name: title, exact: true })
        await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
        if (field) await dialog.getByRole('textbox', { name: field }).fill('합성 QA 입력')
        const before = await dialog.innerText()
        const submit = dialog.getByRole('button', { name: submitName, exact: true })
        await submit.click()
        await page.waitForFunction(() => typeof window.qaDialog.release === 'function')
        assert.equal(await dialog.locator('button[aria-label="닫기"]').isDisabled(), true)
        assert.ok(await dialog.locator('button, input, textarea, select').evaluateAll(elements => elements.every(element => element.disabled)), 'all modal controls locked')
        await page.keyboard.press('Escape')
        await page.mouse.click(1, 1)
        assert.equal(await dialog.count(), 1, 'pending dialog stays open')
        await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab')
        assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true)
        assert.equal(await page.evaluate(() => window.qaDialog.calls.filter(call => call.method !== 'get').length), 1)
        await page.screenshot({ path: join(output, `${screen}-${width}-pending.png`) })
        expectingFailure = true
        await page.evaluate(() => window.qaDialog.release())
        await dialog.getByRole('alert').filter({ hasText: '합성 처리 실패' }).waitFor()
        if (field) assert.equal(await dialog.getByRole('textbox', { name: field }).inputValue(), '합성 QA 입력')
        assert.ok((await dialog.innerText()).includes(before.split('\n')[0]), 'same dialog target after failure')
        assert.equal(await dialog.locator('button[aria-label="닫기"]').isEnabled(), true)
        assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth), false)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        await dialog.getByRole('button', { name: submitName, exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        assert.equal(await page.evaluate(() => window.qaDialog.calls.filter(call => call.method !== 'get').length), 2)
        assert.equal(await page.evaluate(() => document.activeElement?.tagName === 'BUTTON' || /^H[1-6]$/.test(document.activeElement?.tagName)), true)
        guard.assertClean()
        assert.equal(guard.allowed.filter(event => event.kind === 'fixture-api').length, 1, 'exactly one deliberately failed write')
        console.log(`PASS synthetic ${screen} lock/focus/error/input/retry ${width}x${height}`)
      } finally { await page.close() }
    }
  }
  console.log(`Synthetic screenshots: ${output}; no real refunds or changes.`)
} finally { await browser?.close(); await server.close() }
