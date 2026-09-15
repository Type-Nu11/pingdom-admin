import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useMerchantPlaceOperations } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceOperations.ts')
const { useMerchantReservationSetup } = await server.ssrLoadModule('/src/hooks/useMerchantReservationSetup.ts')
let root, state, failures, placeIds, requests
const auth = { clearAuth() {} }
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces(ids) { return ids[0] ?? null } }
beforeEach(() => {
  failures = new Set(); placeIds = [1]; requests = []
  root = createRoot(document.getElementById('root'))
  client.defaults.adapter = async config => {
    requests.push(config.url)
    if (failures.has(config.url)) throw new Error('mock load failure')
    let data = {}
    if (config.url.endsWith('/me')) data = { placeIds }
    else if (config.url.endsWith('/media')) data = { media: [] }
    else if (config.url.endsWith('/reservable-products') || config.url.endsWith('/availabilities')) data = []
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function mount(hook) {
  function Probe() { state = hook(); return null }
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(MerchantPlaceContext.Provider, { value: places }, h(Probe)))))
}
for (const [name, hook, core, optional, refresh] of [
  ['operations', useMerchantPlaceOperations, '/merchant-owner/places/1/operating', '/merchant-owner/places/1/media', () => state.fetchPlaceOperations(1)],
  ['reservation', useMerchantReservationSetup, '/merchant-owner/availabilities', '/merchant-owner/reservable-products', () => state.fetchReservationSetup()],
]) {
  test(`${name}: initial core failure has a message and retry recovers`, async () => {
    failures.add(core)
    await mount(hook)
    assert.equal(state.status, 'error')
    assert.ok(state.errorMessage.trim())
    assert.equal(state.isLoading, false)
    failures.clear()
    await act(async () => state.fetchInitialData())
    assert.equal(state.status, 'ready')
    assert.equal(state.errorMessage, '')
    assert.equal(state.sectionErrorMessage, '')
  })
  test(`${name}: optional failure preserves ready screen and section warning`, async () => {
    failures.add(optional)
    await mount(hook)
    assert.equal(state.status, 'ready')
    assert.equal(state.errorMessage, '')
    assert.ok(state.sectionErrorMessage)
    failures.clear()
    await act(async () => refresh())
    assert.equal(state.sectionErrorMessage, '')
  })
  test(`${name}: later section failure does not become an initial error`, async () => {
    await mount(hook)
    failures.add(core)
    await act(async () => refresh())
    assert.equal(state.status, 'ready')
    assert.equal(state.errorMessage, '')
    assert.ok(state.sectionErrorMessage)
  })
  test(`${name}: no linked place clears old errors without detail requests`, async () => {
    failures.add(core)
    await mount(hook)
    placeIds = []; requests = []
    await act(async () => state.fetchInitialData())
    assert.equal(state.status, 'ready')
    assert.equal(state.errorMessage, '')
    assert.equal(state.sectionErrorMessage, '')
    assert.deepEqual(requests, ['/merchant-owner/me'])
  })
  test(`${name}: profile failure has an initial error`, async () => {
    failures.add('/merchant-owner/me')
    await mount(hook)
    assert.equal(state.status, 'error')
    assert.ok(state.errorMessage)
    assert.deepEqual(requests, ['/merchant-owner/me'])
  })
}
