import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { join } from 'node:path'
import { startReservationSetupServer } from './reservation-setup-server.mjs'
import { startReservationContextServer } from './reservation-context-server.mjs'
const { server, base, output } = await startReservationSetupServer()
const admin = await startReservationContextServer()
let browser
try {
  browser = await chromium.launch()
  for (const timezoneId of ['Asia/Seoul', 'UTC', 'America/New_York']) {
    for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
      const context = await browser.newContext({ timezoneId, viewport: { width, height } })
      const page = await context.newPage(), errors = [], forbidden = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.pathname.startsWith('/api/')) forbidden.push(url.pathname)
        return url.origin === base && !url.pathname.startsWith('/api/') ? route.continue() : route.abort()
      })
      await page.goto(`${base}/merchant/reservations/setup?timezone-qa=1`)
      await page.getByRole('button').filter({ hasText: '예약 가능 시간 #7' }).click()
      const start = page.getByRole('button', { name: '예약 시작 일시, 2030. 3. 10. 14:00', exact: true })
      await start.waitFor()
      const capacity = page.locator('input[type="number"]').first()
      await capacity.fill('8')
      await page.getByRole('button', { name: '시간 저장', exact: true }).click()
      await page.getByRole('status').filter({ hasText: '예약 가능 시간을 저장했습니다' }).waitFor()
      let calls = JSON.parse(await page.getByLabel('합성 요청 기록').textContent())
      assert.equal(calls.filter(call => call.method === 'put').at(-1).body.startsAt, '2030-03-10T05:00:17.123456789')
      // March 10 02:30 is a missing civil time in New York, but valid in Korea.
      await start.click()
      await page.getByRole('button', { name: '2030년 3월 10일', exact: true }).click()
      await page.getByRole('button', { name: '시간 선택, 14:00', exact: true }).click()
      await page.getByRole('listbox', { name: '시 선택' }).getByRole('option', { name: '02', exact: true }).click()
      await page.getByRole('listbox', { name: '분 선택' }).getByRole('option', { name: '30', exact: true }).click()
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: '적용', exact: true }).click()
      await page.getByRole('button', { name: '예약 시작 일시, 2030. 3. 10. 02:30', exact: true }).waitFor()
      await page.getByRole('button', { name: '시간 저장', exact: true }).click()
      await page.waitForFunction(() => JSON.parse(document.querySelector('[aria-label="합성 요청 기록"]').textContent).filter(call => call.method === 'put').length === 2)
      calls = JSON.parse(await page.getByLabel('합성 요청 기록').textContent())
      assert.equal(calls.filter(call => call.method === 'put').at(-1).body.startsAt, '2030-03-09T17:30:00')
      await page.getByRole('button', { name: '새로고침', exact: true }).click()
      await page.getByRole('button', { name: '예약 시작 일시, 2030. 3. 10. 02:30', exact: true }).waitFor()
      await page.getByRole('button', { name: '새 시간', exact: true }).click()
      const koreaNow = new Date(Date.now() + 9 * 3600000)
      const nextMonth = new Date(Date.UTC(koreaNow.getUTCFullYear(), koreaNow.getUTCMonth() + 1, 10))
      for (const [label, hour] of [['예약 시작 일시', '14'], ['예약 종료 일시', '15']]) {
        await page.getByRole('button', { name: `${label}, 일시 선택`, exact: true }).click()
        await page.getByRole('button', { name: '다음 달', exact: true }).click()
        await page.getByRole('button', { name: `${nextMonth.getUTCFullYear()}년 ${nextMonth.getUTCMonth() + 1}월 10일`, exact: true }).click()
        await page.getByRole('button', { name: '시간 선택, 00:00', exact: true }).click()
        await page.getByRole('listbox', { name: '시 선택' }).getByRole('option', { name: hour, exact: true }).click()
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: '적용', exact: true }).click()
      }
      await page.getByRole('button', { name: '시간 등록', exact: true }).click()
      await page.getByRole('status').filter({ hasText: '예약 가능 시간을 등록했습니다' }).waitFor()
      calls = JSON.parse(await page.getByLabel('합성 요청 기록').textContent())
      const created = calls.filter(call => call.method === 'post').at(-1).body
      const day = nextMonth.toISOString().slice(0, 10)
      assert.equal(created.startsAt, `${day}T05:00:00`)
      assert.equal(created.endsAt, `${day}T06:00:00`)
      const schedule = page.getByRole('button').filter({ hasText: '예약 가능 시간 #7' }).locator('p').first()
      assert.equal(await schedule.evaluate(el => getComputedStyle(el).whiteSpace), 'normal')
      assert.equal(await schedule.evaluate(el => el.scrollWidth <= el.clientWidth), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.deepEqual(errors, []); assert.deepEqual(forbidden, [])
      await page.screenshot({ path: join(output, `timezone-${timezoneId.replaceAll('/', '-')}-${width}.png`), fullPage: true })
      await context.close()
    }
  }
  for (const timezoneId of ['Asia/Seoul', 'UTC', 'America/New_York']) {
    const context = await browser.newContext({ timezoneId, viewport: { width: 1920, height: 1080 } })
    const page = await context.newPage()
    await page.route('**/*', route => new URL(route.request().url()).origin === admin.base && !new URL(route.request().url()).pathname.startsWith('/api/') ? route.continue() : route.abort())
    await page.goto(`${admin.base}/reservations/review?reservationId=1`)
    await page.getByText(/예약 #1 · 신청/).waitFor()
    assert.ok((await page.getByText(/2026\.10\.06 19:00 \(한국 시각\)/).count()) > 0)
    // The same offset-less UTC schedule as the merchant slot must show 14:00.
    await page.evaluate(() => { window.reservationQA.detailOverride = { reservationStartsAt: '2030-03-10T05:00:00', reservationEndsAt: '2030-03-10T06:00:00' } })
    await page.getByRole('button', { name: /예약 #1 · 합성 예약자/ }).click()
    await page.getByText(/2030\.03\.10 14:00 \(한국 시각\)/).waitFor()
    assert.ok((await page.evaluate(() => window.reservationQA.calls)).every(call => call.method === 'get'))
    await context.close()
  }
  console.log(`PASS timezone UI: Seoul/UTC/New York, 3 viewports, nanosecond-preserving edits, DST-gap civil selection, UTC body/KST reload and read-only admin detail. ${output}`)
} finally { await browser?.close(); await server.close(); await admin.server.close() }
