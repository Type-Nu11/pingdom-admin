import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { startMerchantReservationQueryServer } from './merchant-reservation-query-server.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const { server, base, output } = await startMerchantReservationQueryServer()
let browser
const readCalls = async page => {
  const log = page.getByRole('button', { name: '조회 요청 내역', exact: true })
  await log.click()
  return JSON.parse(await log.innerText())
}
const select = async (page, label, option) => {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
const detail = page => page.locator('[aria-label="예약 상세와 처리 이력"]')
const assertFits = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow')
try {
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, timezoneId: 'America/Los_Angeles' })
    const guard = await guardBrowserPage(page, base)
    await page.goto(base + '/merchant/reservations')
    await page.getByText('총 24건 · 1페이지', { exact: true }).waitFor()
    const filterColors = await page.locator('[aria-label="예약 조회 필터"]').evaluate(element => {
      const parent = getComputedStyle(element).backgroundColor
      return [...element.querySelectorAll('[role="combobox"], button[aria-haspopup="dialog"]')].map(control => ({
        parent, background: getComputedStyle(control).backgroundColor, border: getComputedStyle(control).borderTopWidth,
      }))
    })
    assert.equal(filterColors.length, 4)
    assert.ok(filterColors.every(color => color.background !== color.parent && color.border === '1px'), 'Filter controls remain distinct from their panel')
    const placePicker = page.getByRole('combobox', { name: '예약 조회 매장', exact: true })
    await placePicker.click()
    await page.getByRole('option', { name: '전체 소유 매장', exact: true }).waitFor()
    assert.equal(await page.getByRole('option', { name: '핑덤 테스트 카페 · #8', exact: true }).count(), 1)
    assert.doesNotMatch(await page.getByRole('listbox', { name: '예약 조회 매장', exact: true }).innerText(), /테스트로/)
    await page.screenshot({ path: join(output, `place-options-${width}.png`), fullPage: false })
    await placePicker.press('Escape')
    assert.equal((await readCalls(page)).filter(call => /\/reservations\/\d+$/.test(call.path)).length, 0, 'No detail fetch before selection')
    await page.getByRole('button', { name: '예약 #2 상세 보기', exact: true }).click()
    await detail(page).getByText('테스트 예약자 2', { exact: true }).waitFor()
    if (width <= 980) {
      await page.waitForFunction(() => document.activeElement?.textContent === '예약 상세')
      const bounds = await detail(page).getByRole('heading', { name: '예약 상세', exact: true }).boundingBox()
      assert.ok(bounds.y >= 0 && bounds.y < height, 'Selected detail is brought into view')
      await detail(page).getByRole('button', { name: '목록으로', exact: true }).click()
      await page.waitForFunction(() => document.activeElement?.textContent === '예약 신청 목록')
    }
    assert.match(await detail(page).innerText(), /2030.10.24 14:00.*2030.10.24 15:00/s)
    assert.match(await detail(page).innerText(), /사용자 #3/)
    assert.doesNotMatch(await detail(page).innerText(), /관리자|결제 불필요|상품 정보/)
    await assertFits(page)
    await detail(page).screenshot({ path: join(output, `detail-${width}.png`) })
    await select(page, '예약 상태', '승인 대기')
    await page.getByText('입력한 조건이 아직 적용되지 않았습니다. 조회를 눌러주세요.', { exact: true }).waitFor()
    assert.match(await page.locator('[aria-label="적용된 예약 조회 조건"]').innerText(), /전체 상태/)
    assert.equal((await readCalls(page)).filter(call => call.path === '/merchant-owner/reservations').length, 1)
    // Refresh must use applied conditions while preserving the unsubmitted draft.
    await page.getByRole('button', { name: '새로고침', exact: true }).click()
    await page.getByText('총 24건 · 1페이지', { exact: true }).waitFor()
    assert.match(await page.getByRole('combobox', { name: '예약 상태', exact: true }).innerText(), /승인 대기/)
    await page.getByRole('button', { name: '조회', exact: true }).click()
    await page.getByText('총 6건 · 1페이지', { exact: true }).waitFor()
    assert.equal(await detail(page).getByText('테스트 예약자 2', { exact: true }).count(), 0)
    assert.equal(await page.getByRole('navigation', { name: '상점주 예약 신청 목록 페이지네이션' }).count(), 0)
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    await page.getByText('총 24건 · 1페이지', { exact: true }).waitFor()
    await page.getByRole('button', { name: '다음 페이지로 이동', exact: true }).click()
    await page.getByText('총 24건 · 2페이지', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '예약 #1 상세 보기', exact: true }).count(), 0)
    await select(page, '예약 상태', '확정')
    await page.getByRole('button', { name: '조회', exact: true }).click()
    await page.getByText('총 6건 · 1페이지', { exact: true }).waitFor()
    const calls = await readCalls(page)
    assert.deepEqual(calls.filter(call => call.path === '/merchant-owner/reservations').at(-1).params, { page: 1, limit: 20, status: 'CONFIRMED' })
    await page.getByRole('button', { name: '예약 #2 상세 보기', exact: true }).click()
    await detail(page).getByText('테스트 예약자 2', { exact: true }).waitFor()
    await page.getByRole('button', { name: '외부 매장 전환', exact: true }).click()
    await page.getByText('총 12건 · 1페이지', { exact: true }).waitFor()
    assert.match(await page.getByRole('combobox', { name: '예약 조회 매장', exact: true }).innerText(), /핑덤 테스트 카페 · #8/)
    assert.doesNotMatch(await page.getByRole('combobox', { name: '예약 조회 매장', exact: true }).innerText(), /테스트로/)
    await page.getByText('서울 중구 테스트로 34', { exact: true }).waitFor()
    assert.equal(await detail(page).getByText('테스트 예약자 2', { exact: true }).count(), 0)
    assert.match(await page.locator('[aria-label="적용된 예약 조회 조건"]').innerText(), /전체 상태.*매장 #8/)
    assert.equal((await readCalls(page)).every(call => call.method === 'get'), true)
    await assertFits(page)
    await page.getByRole('heading', { name: '예약 신청 조회', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: join(output, `filters-${width}.png`), fullPage: false })
    guard.assertClean()
    await page.close()
  }
  for (const scenario of ['empty', 'list-error', 'detail-error', 'forbidden']) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    const expected = event => {
      const status = scenario === 'forbidden' ? 403 : 500
      const pathMatches = path => scenario === 'list-error' ? path === '/merchant-owner/reservations' : path === '/merchant-owner/reservations/2'
      return event.kind === 'fixture-api' && event.method === 'GET' && event.status === status && pathMatches(event.path)
        || event.kind === 'console' && event.level === 'error' && event.text.includes('Synthetic query failure') && event.text.startsWith('상점주 예약 ')
    }
    const guard = await guardBrowserPage(page, base, expected)
    await page.goto(base + '/merchant/reservations?scenario=' + scenario)
    if (scenario === 'empty') {
      await page.getByText('조건에 맞는 예약 신청이 없습니다.', { exact: true }).waitFor()
      assert.equal(await page.getByRole('alert').count(), 0)
    } else if (scenario === 'list-error') {
      await page.getByRole('alert').filter({ hasText: '서버 오류가 발생했습니다.' }).waitFor()
      assert.equal(await page.getByText('조건에 맞는 예약 신청이 없습니다.', { exact: true }).count(), 0)
    } else {
      await page.getByRole('button', { name: '예약 #2 상세 보기', exact: true }).click()
      await detail(page).getByRole('alert').waitFor()
      assert.equal(await detail(page).getByText('테스트 예약자 2', { exact: true }).count(), 0)
      if (scenario === 'forbidden') assert.equal(await page.getByRole('button', { name: '예약 #2 상세 보기', exact: true }).count(), 0)
    }
    await assertFits(page)
    await page.screenshot({ path: join(output, `${scenario}.png`), fullPage: false })
    guard.assertClean()
    await page.close()
  }
  console.log('PASS merchant reservation filters, explicit detail/history, pagination, scope changes and failure states at desktop/laptop/mobile; synthetic GET only. ' + output)
} finally { await browser?.close(); await server.close() }
