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
const { useMerchantOffers } = await server.ssrLoadModule('/src/hooks/useMerchantOffers.ts')
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
let root, state, pending, selectedPlace
const auth = { clearAuth() {} }
const places = { selectedPlaceId: 1, selectPlace(id) { selectedPlace = id }, syncPlaces() { return 1 } }
function Probe() {
  state = useMerchantOffers()
  return h('div', {}, state.isDetailLoading ? 'loading' : state.selectedOffer ? `detail-${state.selectedOffer.id}` : 'editor')
}
beforeEach(async () => {
  pending = new Map()
  selectedPlace = 1
  client.defaults.adapter = async config => {
    if (config.url === '/merchant-owner/me') return response(config, { placeIds: [1, 2] })
    if (config.url === '/merchant-owner/offers') return response(config, { offers: [], totalPages: 1 })
    assert.match(config.url, /^\/merchant-owner\/offers\/\d+$/)
    return new Promise((resolve, reject) => pending.set(Number(config.url.split('/').at(-1)), {
      resolve: () => resolve(response(config, { id: Number(config.url.split('/').at(-1)) })), reject,
    }))
  }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(MerchantPlaceContext.Provider, { value: places }, h(Probe)))))
  assert.equal(state.status, 'ready')
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function start(id) {
  await act(async () => { void state.fetchOfferDetail(id) })
  assert.equal(state.isDetailLoading, true)
}
async function finish(id, fail = false) {
  await act(async () => fail ? pending.get(id).reject(new Error('mock detail failure')) : pending.get(id).resolve())
}

for (const action of ['new', 'place']) {
  for (const fail of [false, true]) {
    test(`${action} clears loading and ignores stale ${fail ? 'failure' : 'success'}`, async () => {
      await start(10)
      await act(async () => action === 'new' ? state.clearSelectedOffer() : state.selectPlace(2))
      assert.equal(state.isDetailLoading, false)
      assert.equal(document.getElementById('root').textContent, 'editor')
      if (action === 'place') assert.equal(selectedPlace, 2)
      await finish(10, fail)
      assert.equal(state.selectedOffer, null)
      assert.equal(state.detailErrorMessage, '')
      assert.equal(state.isDetailLoading, false)
      assert.deepEqual(state.offers, [])
    })
  }
}
test('stale completion cannot stop a newer detail loading or replace its result', async () => {
  await start(10)
  await act(async () => state.clearSelectedOffer())
  await start(20)
  await finish(10)
  assert.equal(state.isDetailLoading, true)
  assert.equal(state.selectedOffer, null)
  await finish(20)
  assert.equal(state.isDetailLoading, false)
  assert.equal(state.selectedOffer.id, 20)
})
test('normal detail failure ends loading and selection reset clears the error', async () => {
  await start(10)
  await finish(10, true)
  assert.equal(state.isDetailLoading, false)
  assert.ok(state.detailErrorMessage)
  await act(async () => state.clearSelectedOffer())
  assert.equal(state.detailErrorMessage, '')
  await start(20)
  await finish(20)
  assert.equal(state.selectedOffer.id, 20)
})
test('invalid or unchanged place does not invalidate a valid pending detail', async () => {
  await start(10)
  await act(async () => { state.selectPlace(1); state.selectPlace(999) })
  assert.equal(state.isDetailLoading, true)
  await finish(10)
  assert.equal(state.selectedOffer.id, 10)
})
