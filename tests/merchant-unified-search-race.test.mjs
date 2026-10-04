import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { useMerchantUnifiedPlaceSearch } = await server.ssrLoadModule('/src/hooks/useMerchantUnifiedPlaceSearch.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const item = { name: '합성 장소', roadAddress: '합성로 1', jibunAddress: '합성동 1', latitude: 37.5, longitude: 127 }
let root, state, pending
function Probe() { state = useMerchantUnifiedPlaceSearch(); return null }
beforeEach(async () => {
  pending = []
  client.defaults.adapter = config => new Promise((resolve, reject) => pending.push({ config, resolve: (items = [{ ...item, name: config.params.query }]) => resolve({ config, data: { items }, status: 200, statusText: 'OK', headers: {} }), reject }))
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(Probe)))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
const search = query => act(async () => { void state.search(query) })

for (const fail of [false, true]) {
  test(`old ${fail ? 'failure' : 'success'} cannot replace a newer search or end loading`, async () => {
    await search('서울 업체'); await search('부산 업체')
    assert.equal(pending[0].config.signal.aborted, true)
    await act(async () => fail ? pending[0].reject(new Error('stale')) : pending[0].resolve())
    assert.equal(state.phase, 'search')
    assert.equal(state.message, '')
    await act(async () => pending[1].resolve())
    assert.equal(state.results[0].name, '부산 업체')
    assert.equal(state.phase, 'idle')
  })
}
test('input edit/reset prevents fallback and stale result resurrection', async () => {
  await search('서울 업체')
  await act(async () => state.reset())
  await act(async () => pending[0].resolve([]))
  assert.equal(pending.length, 1)
  assert.deepEqual(state.results, [])
  assert.equal(state.phase, 'idle')
})
test('duplicate in-flight Enter calls issue only one request', async () => {
  await search('서울 업체'); await search(' 서울 업체 ')
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve())
})
test('editing while completing a candidate cannot overwrite the form with late postal data', async () => {
  let selection
  await act(async () => { selection = state.prepareSelection({ ...item, kind: 'place', postalCode: '' }) })
  assert.equal(state.phase, 'complete')
  await act(async () => state.reset())
  await act(async () => pending[0].resolve([{ ...item, postalCode: '12345' }]))
  assert.equal(await selection, null)
  assert.equal(state.message, '')
})
test('unmount invalidates selection and search responses', async () => {
  await search('서울 업체')
  await act(async () => root.render(null))
  await act(async () => root.render(h(Probe)))
  await act(async () => pending[0].resolve())
  assert.deepEqual(state.results, [])
})
