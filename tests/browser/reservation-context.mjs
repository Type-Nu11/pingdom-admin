import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { startReservationContextServer } from './reservation-context-server.mjs'

const { server, base, output } = await startReservationContextServer()
let browser
try {
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const errors = [], unexpected = []
    const allowedFailures = new Set()
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      const text = message.text()
      if (message.type() !== 'error' && message.type() !== 'warning') return
      if (allowedFailures.has('list') && text.startsWith('관리자 예약 목록 조회 실패') && text.includes('합성 조회 실패')) return
      if (allowedFailures.has('detail') && text.startsWith('관리자 예약 상세 조회 실패') && text.includes('합성 조회 실패')) return
      errors.push(text)
    })
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname)) return route.fulfill({ contentType: 'text/css', body: '' })
      if (url.origin === base && !url.pathname.startsWith('/api/')) return route.continue()
      unexpected.push(url.pathname)
      return route.abort()
    })
    const target = `${base}/reservations/review?placeId=7&page=2&reservationId=11`
    await page.goto(target)
    await page.getByText(/예약 #11 · 신청/).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `restored-${width}.png`) })
    const link = page.getByRole('link', { name: '합성 장소 7 · #7', exact: true })
    await link.focus()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/places?placeId=7')
    await page.getByRole('complementary').getByRole('heading', { name: '합성 장소 7', exact: true }).waitFor()
    await page.goBack()
    await page.getByText(/예약 #11 · 신청/).waitFor()
    assert.equal(page.url(), target)
    await page.reload()
    await page.getByText(/예약 #11 · 신청/).waitFor()
    assert.equal(page.url(), target)

    // A draft remains local, and page changes still use the applied query.
    const input = page.getByRole('textbox', { name: '장소 ID', exact: true })
    await input.fill('invalid')
    await page.getByLabel('예약 조회 조건').filter({ hasText: '미적용 변경 있음' }).waitFor()
    assert.equal(page.url(), target)
    await page.getByRole('button', { name: '3페이지로 이동', exact: true }).click()
    await page.waitForURL('**/reservations/review?placeId=7&page=3')
    await page.getByText('21–21 / 21개').waitFor()
    assert.equal(await input.inputValue(), 'invalid')
    await page.getByRole('button', { name: '조회', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '장소 ID는 1 이상의 정수' }).waitFor()
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    await page.waitForURL('**/reservations/review')
    await page.getByText('1–10 / 21개').waitFor()
    assert.equal(await input.inputValue(), '')

    await page.getByRole('button', { name: /예약 #1 · 합성 예약자/ }).click()
    await page.getByText(/예약 #1 · 신청/).waitFor()
    const selected = page.url()
    await page.evaluate(() => { window.reservationQA.listStatus = 500 })
    allowedFailures.add('list')
    await page.getByRole('button', { name: '목록 새로고침', exact: true }).click()
    await page.getByRole('button', { name: '목록 다시 시도', exact: true }).waitFor()
    assert.equal(page.url(), selected)
    assert.equal(await page.getByRole('button', { name: '승인', exact: true }).count(), 0)
    await page.evaluate(() => { window.reservationQA.listStatus = 0 })
    await page.getByRole('button', { name: '목록 다시 시도', exact: true }).click()
    await page.getByText(/예약 #1 · 신청/).waitFor()
    allowedFailures.delete('list')

    await page.evaluate(() => { window.reservationQA.detailStatus = 403 })
    allowedFailures.add('detail')
    await page.getByRole('button', { name: /예약 #1 · 합성 예약자/ }).click()
    await page.getByRole('status').filter({ hasText: /삭제되었거나 조회 권한이 변경/ }).waitFor()
    assert.ok(!page.url().includes('reservationId'))
    assert.equal(await page.getByRole('button', { name: '승인', exact: true }).count(), 0)
    await page.evaluate(() => { window.reservationQA.detailStatus = 0 })
    allowedFailures.delete('detail')

    await page.getByRole('button', { name: /예약 #2 · 합성 예약자/ }).click()
    await page.getByText(/예약 #2 · 신청/).waitFor()
    await page.evaluate(() => { window.reservationQA.omitSelected = true })
    await page.getByRole('button', { name: '목록 새로고침', exact: true }).click()
    await page.getByRole('status').filter({ hasText: /현재 조회 조건 또는 페이지에 없어/ }).waitFor()
    await page.getByText('조건에 맞는 결과가 없습니다.').waitFor()
    assert.ok(!page.url().includes('reservationId'))

    await page.evaluate(() => {
      window.reservationQA.omitSelected = false
      history.replaceState({ ...history.state, usr: { reservationReviewOwner: { userId: 100, role: 'ADMIN' } } }, '', '/reservations/review?placeId=7&page=2&reservationId=11')
    })
    await page.reload()
    await page.getByRole('status').filter({ hasText: /계정 또는 역할이 변경/ }).waitFor()
    await page.getByText('1–10 / 21개').waitFor()
    assert.equal(page.url(), `${base}/reservations/review`)
    assert.ok(!(await page.evaluate(() => window.reservationQA.calls)).some(call => call.url === '/admin/reservations/11'))
    assert.deepEqual(errors, [])
    assert.deepEqual(unexpected, [])
    assert.ok((await page.evaluate(() => window.reservationQA.calls)).every(call => call.method === 'get'))
    console.log(`Reservation context/back/reload/filter/error/permission/account/empty: ${width}×${height} PASS`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; no real API or mutations.`)
} finally {
  await browser?.close()
  await server.close()
}
