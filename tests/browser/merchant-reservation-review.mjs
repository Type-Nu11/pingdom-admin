import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { startMerchantReservationQueryServer } from './merchant-reservation-query-server.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const { server, base, output } = await startMerchantReservationQueryServer()
let browser
const details = page => page.locator('[aria-label="예약 상세와 처리 이력"]')
async function open(page, action) {
  await page.getByRole('button', { name: '예약 #1 상세 보기', exact: true }).click()
  await details(page).getByRole('button', { name: '예약 ' + action, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '예약 #1 ' + action, exact: true })
  await dialog.waitFor()
  return dialog
}
try {
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const guard = await guardBrowserPage(page, base)
    await page.goto(base + '/merchant/reservations?scenario=review')
    const dialog = await open(page, '반려')
    await dialog.getByRole('button', { name: '예약 반려', exact: true }).click()
    await dialog.getByRole('alert').filter({ hasText: '반려 사유를 입력해주세요.' }).waitFor()
    const reason = dialog.getByRole('textbox', { name: '반려 사유', exact: true })
    await reason.fill('영업 일정 조정')
    await reason.focus(); await page.keyboard.press('Shift+Tab')
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true)
    await page.screenshot({ path: join(output, `review-${width}.png`) })
    await dialog.getByRole('button', { name: '예약 반려', exact: true }).click()
    await dialog.getByText('처리 중', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await dialog.count(), 1, 'pending dialog cannot close')
    await dialog.waitFor({ state: 'detached' })
    await details(page).getByText('반려', { exact: true }).first().waitFor()
    await details(page).getByText('영업 일정 조정', { exact: true }).first().waitFor()
    assert.equal(await details(page).getByRole('button', { name: '예약 승인', exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.goto(base + '/merchant/reservations?scenario=review')
    const confirm = await open(page, '승인')
    await confirm.getByRole('button', { name: '예약 승인', exact: true }).click()
    await confirm.waitFor({ state: 'detached' })
    await details(page).getByText('확정', { exact: true }).first().waitFor()
    const log = page.getByRole('button', { name: '조회 요청 내역', exact: true })
    await log.click()
    const calls = JSON.parse(await log.innerText())
    const writes = calls.filter(call => call.method === 'post')
    assert.equal(writes.length, 1)
    assert.equal(writes[0].data, null, 'empty approval has no body')
    await guard.assertClean()
    await page.close()
    console.log(`${width}px review dialog, validation, pending lock, success and history PASS`)
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const guard = await guardBrowserPage(page, base, event =>
    event.kind === 'fixture-api' && event.path === '/merchant-owner/reservations/1/confirm' && event.status === 409
    || event.kind === 'console' && event.level === 'error' && event.text.startsWith('상점주 예약 승인·반려 실패'))
  await page.goto(base + '/merchant/reservations?scenario=review-conflict')
  const dialog = await open(page, '승인')
  await dialog.getByRole('button', { name: '예약 승인', exact: true }).click()
  await dialog.getByRole('alert').waitFor()
  await page.getByText('예약 상태 또는 접근 권한을 다시 확인해야 합니다.', { exact: false }).waitFor()
  assert.equal(await dialog.getByRole('button', { name: '예약 승인', exact: true }).isDisabled(), true)
  await dialog.getByRole('button', { name: '닫기', exact: true }).last().click()
  await details(page).getByText('확정', { exact: true }).first().waitFor()
  await guard.assertClean(); await page.close()
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
