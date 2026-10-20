import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useMerchantReservationOperations } = await server.ssrLoadModule('/src/hooks/useMerchantReservationOperations.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantReservationOperations/MerchantReservationOperationsPage.tsx')
const { reservationConditionTime, reservationCancellationRestriction, reservationCancellationDeadlineNotice } = await server.ssrLoadModule('/src/utils/reservationConditions.ts')
const { ReservationConditions } = await server.ssrLoadModule('/src/components/merchant/ReservationConditions.tsx')
const conditions = {
  placeId: 1, placeName: '수락 당시 매장', availabilityId: 2,
  quantity: 2, timezone: 'Asia/Seoul', startsAt: '2099-10-01T00:00:00Z', endsAt: '2099-10-01T01:00:00Z',
  cancellable: true, cancellationDeadline: '2099-09-30T23:00:00Z',
  conditionsVersion: 1, expiresAt: '2020-01-01T00:00:00Z',
}
const reservation = { id: 1, availabilityId: 2, quantity: 2, status: 'CONFIRMED', createdAt: '2026-10-01T00:00:00Z', confirmation: conditions }
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
let root, state, rows, handler, calls, clears
function Probe() { state = useMerchantReservationOperations(); return null }
async function mount(child = h(Probe)) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { clears++ }, user: { username: 'test' }, logout() {} } }, h(MemoryRouter, {}, child))))
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); rows = [reservation]; calls = []; clears = 0
  handler = async config => response(config, { ...reservation, status: 'CANCELED' })
  client.defaults.adapter = async config => {
    calls.push(config)
    if (config.method !== 'get') return handler(config)
    if (config.url.endsWith('/reservations')) return response(config, { reservations: rows, page: 1, limit: 20, totalElements: rows.length, totalPages: 1, hasNext: false })
    if (config.url.endsWith('/availabilities')) return response(config, [{ id: 2, startsAt: '2020-01-01T00:00:00', endsAt: '2020-01-02T00:00:00' }])
    if (config.url === '/merchant-owner/me') return response(config, { placeIds: [1] })
    throw new Error(`Unexpected read ${config.url}`)
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('condition dates use offset and explicit timezone, not client local time', () => {
  assert.match(reservationConditionTime('2026-09-30T15:00:00Z', 'Asia/Seoul'), /2026.*10.*01.*00:00.*Asia\/Seoul/)
  assert.equal(reservationConditionTime('2026-10-01T00:00:00', 'Asia/Seoul'), '시각 정보 없음')
  assert.equal(reservationConditionTime('2026-10-01T00:00:00Z', 'invalid'), '시각 정보 없음')
})
test('accepted policy blocks locally, but deadline and missing conditions need server judgment', () => {
  const deadline = Date.parse(conditions.cancellationDeadline)
  assert.equal(reservationCancellationRestriction(conditions), null)
  assert.equal(reservationCancellationDeadlineNotice(conditions, deadline - 1), null)
  assert.match(reservationCancellationDeadlineNotice(conditions, deadline), /기기 시각.*취소 요청/)
  assert.match(reservationCancellationRestriction({ ...conditions, cancellable: false }), /정책/)
  for (const confirmation of [null, { ...conditions, cancellable: undefined }, { ...conditions, cancellationDeadline: null }, { ...conditions, cancellationDeadline: 'invalid' }]) assert.equal(reservationCancellationRestriction(confirmation), null)
})
test('null conditions and explicit noncancellable conditions remain distinct without inventing prices', async () => {
  await mount(h(ReservationConditions, { confirmation: null, now: 0 }))
  assert.match(document.body.textContent, /이 예약의 취소 조건을 확인할 수 없습니다/)
  assert.ok(!document.body.textContent.includes('결제 불필요'))
  await mount(h(ReservationConditions, { confirmation: { ...conditions, cancellable: false }, now: 0 }))
  assert.doesNotMatch(document.body.textContent, /금액|총액|무료|0원|결제 불필요|상품/)
  assert.match(document.body.textContent, /취소할 수 없습니다/)
})
test('current response renders accepted place/time/quantity without retired fields and disables forbidden cancellation', async () => {
  rows = [reservation, { ...reservation, id: 2, confirmation: { ...conditions, cancellable: false } }]
  await mount(h(Page))
  assert.match(document.body.textContent, /수락 당시 매장.*2명.*예약 당시 적용된 조건.*버전 1/)
  assert.match(document.body.textContent, /2099.*10.*01.*09:00.*Asia\/Seoul/)
  assert.doesNotMatch(document.body.textContent, /상품|금액|총액|무료|0원|결제 불필요|undefined/)
  const buttons = [...document.querySelectorAll('button')].filter(button => button.textContent === '예약 취소')
  assert.equal(buttons[0].disabled, false); assert.equal(buttons[1].disabled, true)
  assert.ok(calls.every(config => !config.url.includes('reservable-products')))
})
test('missing cancellation deadline stays unknown rather than unlimited cancellation', async () => {
  await mount(h(ReservationConditions, { confirmation: { ...conditions, cancellationDeadline: null }, now: 0 }))
  assert.match(document.body.textContent, /이 예약의 취소 기한을 확인할 수 없습니다/)
  assert.doesNotMatch(document.body.textContent, /언제든|무제한|무료|결제 불필요/)
})
test('pending, confirmed, rejected and canceled reservations remain distinct without product fields', async () => {
  rows = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELED'].map((status, i) => ({ ...reservation, id: i + 1, status, reviewReason: status === 'REJECTED' ? '합성 반려 사유' : null }))
  await mount(h(Page))
  assert.match(document.body.textContent, /승인 대기/)
  assert.match(document.body.textContent, /확정/)
  assert.match(document.body.textContent, /반려.*합성 반려 사유/)
  assert.doesNotMatch(document.body.textContent, /관리자 심사|관리자 승인|관리자 반려/)
  assert.equal([...document.querySelectorAll('button')].filter(button => button.textContent === '예약 취소').length, 1)
  assert.doesNotMatch(document.body.textContent, /상품|결제 불필요|금액 정보 없음/)
})
test('legacy reservation schedule uses its UTC snapshot before a changed availability in every client zone', async () => {
  const previous = process.env.TZ
  try {
    for (const timezone of ['Asia/Seoul', 'UTC', 'America/New_York']) {
      process.env.TZ = timezone
      rows = [{ ...reservation, confirmation: null, reservationStartsAt: '2030-03-10T05:00:00', reservationEndsAt: '2030-03-10T06:00:00' }]
      await mount(h(Page))
      assert.match(document.body.textContent, /2030\.03\.10 14:00 \(한국 시각\)/)
      assert.doesNotMatch(document.body.textContent, /2020\.01\.01/)
      await act(async () => root.render(null))
    }
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
for (const [status, code, kind] of [[409, 'CANCELLATION_NOT_ALLOWED', 'policy'], [409, 'RESERVATION_REFUND_REQUIRED', 'refund'], [409, 'INVALID_RESERVATION_STATE', null], [401, 'EXPIRED_TOKEN', null], [403, 'ACCESS_DENIED', null], [500, '', null]]) {
  test(`cancel ${status}/${code}: retains row, separates auth and guidance`, async () => {
    await mount()
    handler = async config => { throw Object.assign(new Error('mock'), { isAxiosError: true, response: { status, data: { code }, config, headers: {} }, config }) }
    await act(async () => state.cancelReservation(reservation))
    assert.equal(state.reservations[0].status, 'CONFIRMED')
    assert.equal(state.actionErrorKind, kind); assert.ok(state.actionErrorMessage)
    assert.equal(clears > 0, status === 401)
    assert.equal(calls.filter(config => config.method === 'post').length, 1)
  })
}
test('network failure retains reservation without automatic retry', async () => {
  await mount(); handler = async () => { throw new Error('offline') }
  await act(async () => state.cancelReservation(reservation))
  assert.equal(state.reservations[0].status, 'CONFIRMED'); assert.equal(clears, 0)
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
})
test('pending request is single flight, commits only after success and refresh failure preserves it', async () => {
  await mount(); let resolve
  handler = config => new Promise(r => { resolve = () => r(response(config, { ...reservation, status: 'CANCELED' })) })
  let pending; await act(async () => { pending = state.cancelReservation(reservation) })
  assert.equal(state.reservations[0].status, 'CONFIRMED')
  await act(async () => state.cancelReservation(reservation))
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
  await act(async () => { resolve(); await pending })
  assert.equal(state.reservations[0].status, 'CANCELED')
  client.defaults.adapter = async () => { throw new Error('refresh failure') }
  await act(async () => state.fetchReservations())
  assert.equal(state.reservations[0].status, 'CANCELED')
})
test('request-time guard blocks noncancellable policies and stale confirmed targets', async () => {
  rows = [{ ...reservation, confirmation: { ...conditions, cancellable: false } }]
  await mount()
  await act(async () => state.cancelReservation(reservation))
  assert.equal(calls.filter(config => config.method === 'post').length, 0)
  assert.match(state.actionErrorMessage, /정책/)
  rows = [{ ...reservation, status: 'CANCELED' }]
  await act(async () => state.fetchReservations())
  await act(async () => state.cancelReservation(reservation))
  assert.equal(calls.filter(config => config.method === 'post').length, 0)
})

test('a fast device clock cannot block a cancellation that the server accepts', async () => {
  const serverNow = Date.now()
  const confirmation = { ...conditions, cancellationDeadline: new Date(serverNow + 60_000).toISOString() }
  rows = [{ ...reservation, confirmation }]
  const originalNow = Date.now
  Date.now = () => serverNow + 120_000
  try {
    await mount(h(Page))
    assert.match(document.body.textContent, /기기 시각.*취소 요청/)
    const button = [...document.querySelectorAll('button')].find(button => button.textContent === '예약 취소')
    assert.equal(button.disabled, false)
    await act(async () => button.click())
    const dialog = document.querySelector('[role="dialog"]')
    const confirm = [...dialog.querySelectorAll('button')].find(button => button.textContent === '예약 취소')
    assert.equal(confirm.disabled, false)
    await act(async () => confirm.click())
    assert.equal(calls.filter(config => config.method === 'post').length, 1)
    assert.equal(document.querySelector('[role="dialog"]'), null)
    assert.match(document.body.textContent, /예약을 취소했습니다/)
  } finally { Date.now = originalNow }
})

test('deadline rejection from the server retains the reservation even when the device is behind', async () => {
  const serverNow = Date.now()
  rows = [{ ...reservation, confirmation: { ...conditions, cancellationDeadline: new Date(serverNow - 60_000).toISOString() } }]
  const originalNow = Date.now
  Date.now = () => serverNow - 120_000
  try {
    await mount()
    handler = async config => { throw Object.assign(new Error('server deadline'), { isAxiosError: true, response: { status: 409, data: { code: 'CANCELLATION_NOT_ALLOWED' }, config, headers: {} }, config }) }
    await act(async () => state.cancelReservation(reservation))
    assert.equal(calls.filter(config => config.method === 'post').length, 1)
    assert.equal(state.reservations[0].status, 'CONFIRMED')
    assert.equal(state.actionErrorKind, 'policy')
    assert.match(state.actionErrorMessage, /취소 정책 또는 기한/)
  } finally { Date.now = originalNow }
})
