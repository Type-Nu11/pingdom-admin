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
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { useMerchantReservationSetup } = await server.ssrLoadModule('/src/hooks/useMerchantReservationSetup.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantReservationSetup/MerchantReservationSetupPage.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
let root, hook, adapter, clears
const item = { id: 1, placeId: 1, productId: null, productType: 'GENERAL', startsAt: '2027-10-01T10:00', endsAt: '2027-10-01T11:00', totalCapacity: 5, remainingCapacity: 5, status: 'ACTIVE' }
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const base = async config => response(config, config.url.endsWith('/me') ? { placeIds: [1, 2] } : config.url.endsWith('/availabilities') ? [item] : [])
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces(ids) { return ids[0] ?? null } }
function Probe() { hook = useMerchantReservationSetup(); return null }
async function render(child = h(Probe), value = places) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { clears++ }, user: { username: 'test' }, logout() {} } }, h(MerchantPlaceContext.Provider, { value }, h(MemoryRouter, {}, child)))))
}
beforeEach(() => { clears = 0; adapter = base; client.defaults.adapter = config => adapter(config); root = createRoot(document.getElementById('root')) })
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('product failure leaves time results available and retries independently', async () => {
  adapter = config => config.url.endsWith('/reservable-products') ? Promise.reject(new Error('offline')) : base(config)
  await render()
  assert.equal(hook.status, 'ready'); assert.equal(hook.productStatus, 'error'); assert.equal(hook.availabilityStatus, 'ready')
  await act(async () => { await hook.fetchAvailabilities() })
  assert.ok(hook.productError); assert.equal(hook.availabilities.length, 1)
  adapter = base
  await act(async () => { await hook.fetchProducts() })
  assert.equal(hook.productStatus, 'ready'); assert.equal(hook.productError, '')
})
for (const [endpoint, method, field] of [['availabilities', 'fetchAvailabilities', 'availabilities'], ['reservable-products', 'fetchProducts', 'products']]) {
  test(`${endpoint}: older response cannot overwrite a retry`, async () => {
    await render(); const gate = deferred(); let calls = 0
    adapter = async config => {
      if (config.url.endsWith('/' + endpoint)) {
        if (++calls === 1) { await gate.promise; return response(config, [{ ...item, id: 2 }]) }
        return response(config, [{ ...item, id: 3 }])
      }
      return base(config)
    }
    let old; await act(async () => { old = hook[method]() })
    await act(async () => { await hook[method]() })
    await act(async () => { gate.resolve(); await old })
    assert.equal(hook[field][0].id, 3)
  })
}
test('older profile failure cannot change a newer successful initial load', async () => {
  await render(); const gate = deferred(); let calls = 0
  adapter = async config => { if (config.url.endsWith('/me') && ++calls === 1) { await gate.promise; throw new Error('old') } return base(config) }
  let old; await act(async () => { old = hook.fetchInitialData() })
  await act(async () => { await hook.fetchInitialData() })
  await act(async () => { gate.resolve(); await old })
  assert.equal(hook.status, 'ready'); assert.equal(hook.errorMessage, '')
})
for (const status of [401, 403, 500]) test(`time HTTP ${status}: auth and retained results follow policy`, async () => {
  await render()
  adapter = async config => { throw Object.assign(new Error('failure'), { isAxiosError: true, config, response: { status, data: {}, config, headers: {} } }) }
  await act(async () => { await hook.fetchAvailabilities() })
  assert.equal(clears > 0, status === 401)
  assert.equal(hook.hasAvailabilityResult, status === 500)
  assert.equal(hook.availabilityStatus, 'error')
})
test('unmount invalidates pending queries', async () => {
  await render(); const gate = deferred(); adapter = async config => { await gate.promise; return base(config) }
  let pending; await act(async () => { pending = hook.fetchReservationSetup() })
  await act(async () => root.render(null))
  let result; await act(async () => { gate.resolve(); result = await pending })
  assert.equal(result, false)
})
test('successful save remains successful when later reload fails', async () => {
  await render()
  adapter = async config => response(config, { ...item, totalCapacity: 9 })
  await act(async () => { await hook.saveAvailability(1, {}) })
  adapter = async () => { throw new Error('offline') }
  await act(async () => { await hook.fetchAvailabilities() })
  assert.ok(hook.successMessage); assert.equal(hook.actionErrorMessage, '')
  assert.equal(hook.availabilities[0].totalCapacity, 9); assert.ok(hook.availabilityError)
})
