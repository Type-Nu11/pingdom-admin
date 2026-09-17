import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceProvider } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceProvider.tsx')
const { useMerchantOffers } = await server.ssrLoadModule('/src/hooks/useMerchantOffers.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { getMerchantOffers, getMerchantOwnerProfile } = await server.ssrLoadModule('/src/api/merchantStoreApi.ts')
let root, hook, calls, pending, handler, profile
const auth = { clearAuth() {} }
const item = (id, placeId = 1, status = 'DRAFT') => ({ id, placeId, status, title: `Offer ${id}` })
const page = (offers = [item(1)], totalElements = 101, number = 1) => ({ offers, totalElements, totalPages: Math.ceil(totalElements / 20), page: number, limit: 20, hasNext: number * 20 < totalElements })
function Probe() { hook = useMerchantOffers(); return null }
beforeEach(() => {
  calls = []; pending = []; profile = { placeIds: [1, 2] }
  handler = config => page([item(config.params.page)], 101, config.params.page)
  client.defaults.adapter = async config => {
    calls.push(config)
    const data = config.url === '/merchant-owner/me' ? profile : await handler(config)
    return { config, status: 200, statusText: 'OK', headers: {}, data }
  }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function render() { await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(MerchantPlaceProvider, null, h(Probe))))) }
const lists = () => calls.filter(c => c.url === '/merchant-owner/offers' && c.method === 'get')

test('initial query fetches only selected place and one page, preserving server total', async () => {
  await render()
  assert.equal(lists().length, 1)
  assert.deepEqual(lists()[0].params, { page: 1, limit: 20, placeId: 1, status: undefined })
  assert.equal(hook.totalElements, 101); assert.equal(hook.totalPages, 6)
  await act(async () => hook.setPage(3))
  assert.equal(lists().length, 2); assert.equal(lists()[1].params.page, 3)
  await act(async () => hook.setStatusFilter('CLOSED'))
  assert.equal(hook.page, 1); assert.equal(lists().at(-1).params.status, 'CLOSED')
  await act(async () => hook.selectPlace(2))
  assert.equal(lists().at(-1).params.placeId, 2); assert.equal(hook.page, 1)
})
test('no owned place does not issue an unfiltered offers query', async () => {
  profile = { placeIds: [] }; await render()
  assert.equal(lists().length, 0); assert.equal(hook.selectedPlaceId, null)
})
test('identical queries do not fetch or reset editor; list filters preserve draft version', async () => {
  await render()
  const version = hook.editorVersion
  const count = lists().length
  await act(async () => { hook.setStatusFilter('ALL'); hook.setPage(1) })
  assert.equal(lists().length, count)
  assert.equal(hook.editorVersion, version)
  await act(async () => hook.setPage(2))
  await act(async () => hook.setStatusFilter('DRAFT'))
  assert.equal(hook.editorVersion, version)
  await act(async () => hook.selectPlace(2))
  assert.notEqual(hook.editorVersion, version)
})
test('pagination survives a same-filter pending or failed request without exposing stale rows', async () => {
  await render()
  handler = () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
  await act(async () => hook.setPage(2))
  assert.equal(hook.totalPages, 6)
  assert.equal(hook.isListLoading, true)
  assert.deepEqual(hook.offers, [])
  assert.equal(hook.totalElements, undefined)
  await act(async () => pending[0].reject(new Error('synthetic failed page')))
  assert.equal(hook.totalPages, 6)
  assert.ok(hook.errorMessage)
  await act(async () => hook.setStatusFilter('CLOSED'))
  assert.equal(hook.totalPages, 0)
  await act(async () => pending[1].resolve(page([], 0)))
  assert.equal(hook.totalPages, 0)
})
test('reversed page and place responses cannot overwrite the latest query', async () => {
  await render()
  handler = config => new Promise(resolve => pending.push({ config, resolve }))
  await act(async () => hook.setPage(2))
  await act(async () => hook.selectPlace(2))
  await act(async () => pending[1].resolve(page([item(8, 2)], 1)))
  await act(async () => pending[0].resolve(page([item(9)], 101, 2)))
  assert.deepEqual(hook.offers.map(x => x.id), [8]); assert.equal(hook.totalElements, 1)
})
test('list failure is not an empty result and retry keeps query', async () => {
  await render()
  handler = () => { throw new Error('synthetic failure') }
  await act(async () => hook.setStatusFilter('PUBLISHED'))
  assert.ok(hook.errorMessage); assert.equal(hook.totalElements, undefined)
  handler = () => page([], 0)
  await act(async () => hook.fetchOffers())
  assert.equal(hook.errorMessage, ''); assert.equal(hook.totalElements, 0)
  assert.equal(lists().at(-1).params.status, 'PUBLISHED')
})
test('detail lookup neither inserts an off-page row nor survives target change', async () => {
  await render()
  handler = config => config.url.endsWith('/99') ? item(99) : page([], 0)
  await act(async () => hook.fetchOfferDetail(99))
  assert.equal(hook.selectedOffer.id, 99); assert.deepEqual(hook.offers.map(x => x.id), [1])
  await act(async () => hook.setStatusFilter('CLOSED'))
  assert.equal(hook.selectedOffer, null); assert.equal(hook.selectedOfferId, null)
})
test('mutation refresh corrects an emptied final page with only one bounded retry', async () => {
  await render()
  await act(async () => hook.setStatusFilter('PUBLISHED'))
  await act(async () => hook.setPage(6))
  handler = config => config.method === 'post' ? item(101, 1, 'CLOSED') : page(config.params.page === 6 ? [] : [item(80, 1, 'PUBLISHED')], 100, config.params.page)
  const before = lists().length
  await act(async () => hook.closeOffer(101))
  assert.equal(hook.page, 5); assert.equal(hook.totalElements, 100)
  assert.deepEqual(lists().slice(before).map(c => c.params.page), [6, 5])
  assert.equal(hook.selectedOfferId, null); assert.ok(hook.successMessage)
})
test('successful mutation remains successful when refresh fails; duplicate requests and target switches blocked', async () => {
  await render()
  handler = config => config.method === 'post' ? new Promise(resolve => pending.push({ resolve })) : Promise.reject(new Error('refresh failure'))
  let first, second
  await act(async () => { first = hook.publishOffer(1); second = hook.publishOffer(1); hook.selectPlace(2) })
  assert.equal(hook.selectedPlaceId, 1); assert.equal(await second, null)
  await act(async () => { pending[0].resolve(item(1, 1, 'PUBLISHED')); await first })
  assert.ok(hook.successMessage); assert.ok(hook.errorMessage); assert.equal(hook.actionErrorMessage, '')
  assert.equal(calls.filter(c => c.method === 'post').length, 1)
})

test('large synthetic dataset measures legacy fan-out against current-page readiness', async () => {
  const dataset = Array.from({ length: 5000 }, (_, index) => ({ ...item(index + 1, index % 2 + 1), description: 'synthetic '.repeat(50) }))
  let count = 0, bytes = 0
  client.defaults.adapter = async config => {
    let data
    if (config.url === '/merchant-owner/me') data = profile
    else {
      ++count
      const { page: number, limit, placeId } = config.params
      const filtered = dataset.filter(value => !placeId || value.placeId === placeId)
      data = { offers: filtered.slice((number - 1) * limit, number * limit), totalElements: filtered.length, totalPages: Math.ceil(filtered.length / limit), page: number, limit }
      bytes += Buffer.byteLength(JSON.stringify(data))
    }
    await new Promise(resolve => setTimeout(resolve, 20))
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
  const legacyStarted = performance.now()
  // The previous implementation fetched every page before filtering and rendering.
  await Promise.all([getMerchantOwnerProfile(), (async () => {
    const first = await getMerchantOffers({ page: 1, limit: 100 })
    const rest = await Promise.all(Array.from({ length: first.totalPages - 1 }, (_, i) => getMerchantOffers({ page: i + 2, limit: 100 })))
    return [first, ...rest].flatMap(value => value.offers).filter(value => value.placeId === 1).slice(0, 20)
  })()])
  const legacy = { requests: count, bytes, readyMs: Math.round(performance.now() - legacyStarted) }
  count = 0; bytes = 0
  const started = performance.now()
  await render()
  for (let i = 0; hook.isListLoading || hook.status === 'loading'; i++) {
    if (i >= 100) throw new Error('readiness timeout')
    await act(async () => new Promise(resolve => setTimeout(resolve, 5)))
  }
  const current = { requests: count, bytes, readyMs: Math.round(performance.now() - started) }
  console.log('Offer benchmark (5000 rows, fixed 20ms/request, uncompressed JSON):', JSON.stringify({ legacy, current }))
  assert.equal(legacy.requests, 50); assert.equal(current.requests, 1)
  assert.equal(hook.offers.length, 20); assert.equal(hook.totalElements, 2500)
  assert.ok(current.bytes < legacy.bytes / 100)
})
