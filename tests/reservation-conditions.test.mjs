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
const { reservationAmount, reservationConditionTime, reservationCancellationRestriction } = await server.ssrLoadModule('/src/utils/reservationConditions.ts')
const { ReservationConditions } = await server.ssrLoadModule('/src/components/merchant/ReservationConditions.tsx')
const conditions = {
  placeId: 1, placeName: '수락 당시 매장', productId: 3, productName: '수락 당시 상품', productType: 'TICKET', availabilityId: 2,
  quantity: 2, timezone: 'Asia/Seoul', startsAt: '2099-10-01T00:00:00Z', endsAt: '2099-10-01T01:00:00Z',
  unitAmountMinor: 1000, additionalAmountMinor: 50, totalAmountMinor: 2050, currency: 'USD', currencyFractionDigits: 2,
  paymentRequired: true, cancellable: true, cancellationDeadline: '2099-09-30T23:00:00Z',
  cancellationFeeMinor: 0, refundableAmountMinor: 2050, conditionsVersion: 1, productVersion: 2, expiresAt: '2020-01-01T00:00:00Z',
}
const reservation = { id: 1, productId: 3, productType: 'TICKET', availabilityId: 2, quantity: 2, status: 'CONFIRMED', createdAt: '2026-10-01T00:00:00Z', confirmation: conditions }
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
    return response(config, config.url.endsWith('/reservable-products') ? [{ id: 3, name: '현재 상품' }] : [{ id: 2, startsAt: '2020-01-01T00:00:00', endsAt: '2020-01-02T00:00:00' }])
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('minor-unit currencies use supplied precision without rounding or exchange', () => {
  assert.equal(reservationAmount(2050, 'USD', 2), '20.50 USD')
  assert.equal(reservationAmount(2050, 'KRW', 0), '2,050 KRW')
  assert.equal(reservationAmount(2050, 'JPY', 0), '2,050 JPY')
  assert.equal(reservationAmount(2050, 'KWD', 3), '2.050 KWD')
  assert.equal(reservationAmount(Number.MAX_SAFE_INTEGER, 'USD', 2), '90,071,992,547,409.91 USD')
  assert.equal(reservationAmount(0, 'USD', 2), '0.00 USD')
  for (const args of [[NaN, 'USD', 2], [Number.MAX_SAFE_INTEGER + 1, 'USD', 2], [-1, 'USD', 2], [1, '', 2], [1, 'USD', -1]]) assert.equal(reservationAmount(...args), '금액 정보 없음')
})
test('condition dates use offset and explicit timezone, not client local time', () => {
  assert.match(reservationConditionTime('2026-09-30T15:00:00Z', 'Asia/Seoul'), /2026.*10.*01.*00:00.*Asia\/Seoul/)
  assert.equal(reservationConditionTime('2026-10-01T00:00:00', 'Asia/Seoul'), '시각 정보 없음')
  assert.equal(reservationConditionTime('2026-10-01T00:00:00Z', 'invalid'), '시각 정보 없음')
})
test('policy blocks from deadline inclusively, but legacy and missing deadline are not guessed', () => {
  const deadline = Date.parse(conditions.cancellationDeadline)
  assert.equal(reservationCancellationRestriction(conditions, deadline - 1), null)
  assert.match(reservationCancellationRestriction(conditions, deadline), /기한/)
  assert.match(reservationCancellationRestriction({ ...conditions, cancellable: false }, 0), /정책/)
  for (const confirmation of [null, { ...conditions, cancellationDeadline: null }, { ...conditions, cancellationDeadline: 'invalid' }]) assert.equal(reservationCancellationRestriction(confirmation), null)
})
test('null conditions and explicit free/noncancellable conditions remain distinct', async () => {
  await mount(h(ReservationConditions, { confirmation: null, now: 0 }))
  assert.match(document.body.textContent, /수락 조건 정보 없음/)
  assert.ok(!document.body.textContent.includes('결제 불필요'))
  await mount(h(ReservationConditions, { confirmation: { ...conditions, totalAmountMinor: 0, paymentRequired: false, cancellable: false }, now: 0 }))
  assert.match(document.body.textContent, /총액 0.00 USD/)
  assert.match(document.body.textContent, /취소할 수 없습니다/)
})
test('page prefers accepted snapshot over changed product/availability and disables forbidden cancellation', async () => {
  rows = [reservation, { ...reservation, id: 2, confirmation: { ...conditions, cancellable: false } }]
  await mount(h(Page))
  assert.ok(document.body.textContent.includes('수락 당시 상품'))
  assert.ok(!document.body.textContent.includes('현재 상품'))
  assert.match(document.body.textContent, /20.50 USD/)
  const buttons = [...document.querySelectorAll('button')].filter(button => button.textContent === '예약 취소')
  assert.equal(buttons[0].disabled, false); assert.equal(buttons[1].disabled, true)
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
test('request-time guard blocks expired policies and stale confirmed targets', async () => {
  rows = [{ ...reservation, confirmation: { ...conditions, cancellationDeadline: '2000-01-01T00:00:00Z' } }]
  await mount()
  await act(async () => state.cancelReservation(reservation))
  assert.equal(calls.filter(config => config.method === 'post').length, 0)
  assert.match(state.actionErrorMessage, /기한/)
  rows = [{ ...reservation, status: 'CANCELED' }]
  await act(async () => state.fetchReservations())
  await act(async () => state.cancelReservation(reservation))
  assert.equal(calls.filter(config => config.method === 'post').length, 0)
})
