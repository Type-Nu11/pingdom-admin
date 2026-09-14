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
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useMerchantPlaceApplications } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceApplications.ts')
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
let root, state, pending
const auth = { clearAuth() {} }
function Probe() { state = useMerchantPlaceApplications(); return null }
beforeEach(async () => {
  pending = new Map()
  client.defaults.adapter = async config => {
    if (config.url === '/merchant-owner/me') return response(config, {})
    if (config.url === '/users/me/merchant-place-applications') return response(config, { items: [], hasNext: false })
    assert.equal(config.url, '/places/autocomplete')
    const keyword = config.params.keyword
    return new Promise((resolve, reject) => pending.set(keyword, {
      resolve: () => resolve(response(config, { places: [{ id: keyword, name: keyword }] })), reject,
    }))
  }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe))))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function search(keyword) { await act(async () => { void state.searchPlaces(keyword) }) }
async function finish(keyword, fail = false) {
  await act(async () => fail ? pending.get(keyword).reject(new Error('mock search failure')) : pending.get(keyword).resolve())
}
for (const fail of [false, true]) {
  test(`stale ${fail ? 'failure' : 'success'} cannot replace the latest result`, async () => {
    await search('Seoul'); await search('Busan')
    await finish('Busan'); await finish('Seoul', fail)
    assert.equal(state.suggestions[0].name, 'Busan')
    assert.equal(state.isSearching, false)
  })
  test(`stale ${fail ? 'failure' : 'success'} cannot end newer loading`, async () => {
    await search('Seoul'); await search('Busan')
    await finish('Seoul', fail)
    assert.equal(state.isSearching, true)
    await finish('Busan')
    assert.equal(state.suggestions[0].name, 'Busan')
  })
}
for (const keyword of ['', 'x', '  ']) {
  test(`short query ${JSON.stringify(keyword)} invalidates pending results`, async () => {
    await search('Seoul'); await search(keyword); await finish('Seoul')
    assert.deepEqual(state.suggestions, [])
    assert.equal(state.isSearching, false)
    assert.equal(pending.size, 1)
  })
}
test('input reset invalidates responses before the next debounced search begins', async () => {
  await search('Seoul')
  await act(async () => state.resetSearch())
  await finish('Seoul')
  assert.deepEqual(state.suggestions, [])
  assert.equal(state.isSearching, false)
  await search('Busan'); await finish('Busan')
  assert.equal(state.suggestions[0].name, 'Busan')
})
test('latest failure ends loading and a subsequent search recovers', async () => {
  await search('Seoul'); await finish('Seoul', true)
  assert.equal(state.isSearching, false)
  assert.deepEqual(state.suggestions, [])
  await search('Busan'); await finish('Busan')
  assert.equal(state.suggestions[0].name, 'Busan')
})
test('unmounted search cannot restore results after remount', async () => {
  await search('Seoul')
  await act(async () => root.render(null))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe))))
  await finish('Seoul')
  assert.deepEqual(state.suggestions, [])
  assert.equal(state.isSearching, false)
})
