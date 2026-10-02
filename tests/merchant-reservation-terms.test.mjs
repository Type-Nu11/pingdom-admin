import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node', 'Event']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { useMerchantReservationSetup } = await server.ssrLoadModule('/src/hooks/useMerchantReservationSetup.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { parseReservationTerms, reservationTermsDraft } = await server.ssrLoadModule('/src/utils/merchantReservationTerms.ts')
const { clearStoredAuth } = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { ReservationTermsEditor } = await server.ssrLoadModule('/src/components/merchant/ReservationTermsEditor.tsx')
const terms = { unitAmountMinor: 1000, additionalAmountMinor: 50, currency: 'USD', timezone: 'Asia/Seoul', cancellable: true, cancellationCutoffMinutes: 60 }
const slot = { id: 7, placeId: 1, productId: null, productName: null, productType: 'GENERAL', startsAt: '2099-10-01T10:00', endsAt: '2099-10-01T11:00', totalCapacity: 5, remainingCapacity: 5, status: 'ACTIVE', conditionsVersion: 0, reservationTerms: null }
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
let root, state, adapter, calls, clears, rows
function Probe() { state = useMerchantReservationSetup(); return null }
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces(ids) { return ids[0] ?? null } }
async function mount(child = h(Probe), context = places) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { clears++ }, user: { username: 'test' } } }, h(MerchantPlaceContext.Provider, { value: context }, child))))
}
beforeEach(() => {
  rows = [slot]; calls = []; clears = 0; root = createRoot(document.getElementById('root'))
  adapter = async config => {
    if (config.method === 'put') { const next = JSON.parse(config.data); rows = [{ ...slot, reservationTerms: next, conditionsVersion: 1 }]; return response(config, next) }
    return response(config, config.url.endsWith('/me') ? { placeIds: [1, 2] } : config.url.endsWith('/availabilities') ? rows : [])
  }
  client.defaults.adapter = config => { calls.push(config); return adapter(config) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('unset, zero/free, and noncancellable are distinct and serialized exactly', () => {
  const empty = reservationTermsDraft(null)
  assert.equal(empty.unitAmountMinor, ''); assert.equal(empty.cancellation, '')
  assert.equal(typeof parseReservationTerms(empty), 'string')
  assert.deepEqual(parseReservationTerms(reservationTermsDraft(terms)), terms)
  const free = { ...terms, unitAmountMinor: 0, additionalAmountMinor: 0, cancellable: false, cancellationCutoffMinutes: null }
  assert.deepEqual(parseReservationTerms({ ...reservationTermsDraft(free), cancellationCutoffMinutes: '99' }), free)
})
test('validation rejects missing, fractional, negative, unsafe amounts, currency, timezone and cutoff', () => {
  const valid = reservationTermsDraft(terms)
  for (const key of ['unitAmountMinor', 'additionalAmountMinor']) for (const value of ['', '-1', '1.5', '1e3', '9007199254740992']) assert.equal(typeof parseReservationTerms({ ...valid, [key]: value }), 'string')
  for (const value of ['', 'usd', 'US', 'USDD']) assert.equal(typeof parseReservationTerms({ ...valid, currency: value }), 'string')
  for (const value of ['', 'invalid', '+09:00']) assert.equal(typeof parseReservationTerms({ ...valid, timezone: value }), 'string')
  for (const value of ['', '-1', '0.5', '2147483648']) assert.equal(typeof parseReservationTerms({ ...valid, cancellationCutoffMinutes: value }), 'string')
  assert.equal(parseReservationTerms({ ...valid, cancellationCutoffMinutes: '0' }).cancellationCutoffMinutes, 0)
})
test('successful PUT uses fixed target, reloads stored values and version, survives another reload', async () => {
  await mount()
  let result; await act(async () => { result = await state.saveReservationTerms(7, terms) })
  assert.ok(result); assert.equal(state.availabilities[0].conditionsVersion, 1)
  assert.deepEqual(state.availabilities[0].reservationTerms, terms)
  const write = calls.find(config => config.method === 'put')
  assert.equal(write.url, '/merchant-owner/availabilities/7/reservation-terms')
  assert.deepEqual(JSON.parse(write.data), terms)
  await act(async () => state.fetchAvailabilities())
  assert.deepEqual(state.availabilities[0].reservationTerms, terms)
})
for (const status of [400, 401, 403, 500]) test(`PUT ${status} retains values and separates authentication`, async () => {
  await mount(); adapter = async config => { throw Object.assign(new Error('mock'), { isAxiosError: true, config, response: { status, data: {}, headers: {}, config } }) }
  let result; await act(async () => { result = await state.saveReservationTerms(7, terms) })
  assert.equal(result, null); assert.equal(state.availabilities[0].reservationTerms, null)
  assert.ok(state.actionErrorMessage); assert.equal(clears > 0, status === 401)
  assert.equal(calls.filter(config => config.method === 'put').length, 1)
})
test('PUT success + reload failure retains saved conditions, blocks more writes until retry', async () => {
  await mount(); const base = adapter
  adapter = config => config.method === 'get' ? Promise.reject(new Error('offline')) : base(config)
  let result; await act(async () => { result = await state.saveReservationTerms(7, terms) })
  assert.ok(result); assert.deepEqual(state.availabilities[0].reservationTerms, terms)
  assert.equal(state.availabilityStatus, 'error'); assert.equal(state.actionErrorMessage, '')
  assert.match(state.availabilityError, /조건은 저장/)
  await act(async () => state.saveReservationTerms(7, terms))
  assert.equal(calls.filter(config => config.method === 'put').length, 1)
  adapter = base; await act(async () => state.fetchAvailabilities())
  assert.equal(state.availabilities[0].conditionsVersion, 1)
})
test('double click and wrong-place/stale targets cannot write', async () => {
  await mount(); let release; const base = adapter
  adapter = config => config.method === 'put' ? new Promise(resolve => { release = () => resolve(base(config)) }) : base(config)
  let pending; await act(async () => { pending = state.saveReservationTerms(7, terms) })
  await act(async () => state.saveReservationTerms(7, terms))
  assert.equal(calls.filter(config => config.method === 'put').length, 1)
  await act(async () => { release(); await pending })
  await mount(h(Probe), { ...places, selectedPlaceId: 2 })
  await act(async () => { await state.saveReservationTerms(7, terms); await state.saveReservationTerms(999, terms) })
  assert.equal(calls.filter(config => config.method === 'put').length, 1)
})
test('session change during PUT does not query or apply in the next account', async () => {
  await mount(); let release; const base = adapter
  adapter = config => config.method === 'put' ? new Promise(resolve => { release = () => resolve(base(config)) }) : base(config)
  let pending; await act(async () => { pending = state.saveReservationTerms(7, terms) })
  const count = calls.length
  await act(async () => { clearStoredAuth(); release(); await pending })
  assert.equal(calls.length, count); assert.equal(state.availabilities[0].reservationTerms, null)
})
test('schedule/status mutations retain returned terms without putting terms into time edits', async () => {
  rows = [{ ...slot, reservationTerms: terms, conditionsVersion: 4 }]
  await mount()
  adapter = config => response(config, { ...rows[0], totalCapacity: 6 })
  await act(async () => state.saveAvailability(7, { placeId: 1, startsAt: slot.startsAt, endsAt: slot.endsAt, totalCapacity: 6 }))
  assert.deepEqual(state.availabilities[0].reservationTerms, terms)
  assert.equal(state.availabilities[0].conditionsVersion, 4)
  const request = JSON.parse(calls.find(config => config.method === 'put').data)
  assert.equal('reservationTerms' in request, false)
  await act(async () => state.setAvailabilityActive(state.availabilities[0], false))
  assert.deepEqual(state.availabilities[0].reservationTerms, terms)
})
test('editor preloads persisted values, preserves input on failed save and closes only on success', async () => {
  let succeed = false, closed = 0, writes = []
  const child = () => h(ReservationTermsEditor, { availability: { ...slot, reservationTerms: terms }, busy: false, error: '', onClose() { closed++ }, async onSave(id, value) { writes.push({ id, value }); return succeed ? {} : null } })
  await mount(child())
  assert.equal(document.querySelector('[aria-label="1인당 가격"]').value, '1000')
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(closed, 0); assert.deepEqual(writes[0], { id: 7, value: terms })
  assert.equal(document.querySelector('[aria-label="1인당 가격"]').value, '1000')
  succeed = true
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(closed, 1)
})
