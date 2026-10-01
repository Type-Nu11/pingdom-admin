import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { AxiosError } from 'axios'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceProvider } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceProvider.tsx')
const { useMerchantPlaceIdentity } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceIdentity.ts')
const { useMerchantStore } = await server.ssrLoadModule('/src/hooks/useMerchantStore.ts')
const { getMerchantPlaceDetail } = await server.ssrLoadModule('/src/api/merchantStoreApi.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
let root, identity, store, handler, calls, cleared, ids
const auth = { user: { id: 1, username: 'synthetic' }, clearAuth() { cleared++ } }
const detail = id => ({ id, name: '같은 매장명', roadAddress: `주소 ${id}` })
function Probe() { identity = useMerchantPlaceIdentity(ids); return null }
function StoreProbe() { store = useMerchantStore(); return h(Probe) }
async function mount({ user = auth.user, strict = false, home = false } = {}) {
  const content = h(AuthContext.Provider, { value: { ...auth, user } }, h(MerchantPlaceProvider, null, h(home ? StoreProbe : Probe)))
  await act(async () => root.render(strict ? h(StrictMode, null, content) : content))
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); calls = []; cleared = 0; ids = [1, 2]
  handler = async config => detail(Number(config.url.split('/').at(-1)))
  client.defaults.adapter = async config => {
    calls.push(config.url)
    return { config, data: await handler(config), status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('zero, one and duplicate place IDs request only valid distinct identities', async () => {
  ids = []; await mount(); assert.equal(calls.length, 0)
  ids = [1, 1, 0, -1]; await mount()
  assert.deepEqual(calls, ['/merchant-owner/places/1'])
  assert.equal(identity.label(1, true), '같은 매장명 · 주소 1 · #1')
  ids = [1, 2]; await mount()
  assert.equal(calls.length, 2)
  assert.notEqual(identity.label(1, true), identity.label(2, true))
})

test('StrictMode replay completes identities without leaving loading entries', async () => {
  await mount({ strict: true })
  assert.equal(identity.places[1].status, 'ready')
  assert.equal(identity.places[2].status, 'ready')
})

test('partial failure keeps successful names and supports explicit retry', async () => {
  handler = async config => {
    if (config.url.endsWith('/2')) throw new Error('synthetic failure')
    return detail(1)
  }
  await mount()
  assert.equal(identity.places[1].status, 'ready')
  assert.equal(identity.label(2), '장소 #2 · 조회 실패')
  assert.equal(cleared, 0)
  handler = async () => detail(2)
  await act(async () => identity.retry(2))
  assert.equal(identity.label(2), '같은 매장명 · #2')
})

for (const status of [401, 403, 404, 500]) {
  test(`identity HTTP ${status} only clears authentication for 401`, async () => {
    ids = [1]
    handler = async config => { throw new AxiosError('synthetic HTTP failure', 'ERR_BAD_RESPONSE', config, null, { status, data: {}, headers: {}, config }) }
    await mount()
    assert.equal(identity.places[1].status, 'error')
    assert.equal(cleared, status === 401 ? 1 : 0)
  })
}

test('account switch resets identity cache and ignores old account responses', async () => {
  const pending = []
  handler = config => new Promise(resolve => pending.push({ config, resolve }))
  await mount()
  localStorage.setItem('pingdom-auth-session', 'second-session')
  await mount({ user: { id: 2, username: 'second' } })
  await act(async () => pending.slice(2).forEach(({ config, resolve }) => resolve({ ...detail(Number(config.url.split('/').at(-1))), name: '두 번째 계정' })))
  await act(async () => pending.slice(0, 2).forEach(({ config, resolve }) => resolve(detail(Number(config.url.split('/').at(-1))))))
  assert.equal(identity.places[1].status, 'ready')
  assert.equal(identity.places[1].name, '두 번째 계정')
  handler = async () => ({ ...detail(1), name: '다른 계정 매장' })
  await mount({ user: { id: 3, username: 'third' } })
  assert.equal(identity.places[1].name, '다른 계정 매장')
})

test('concurrent details are deduplicated but subsequent refresh remains fresh', async () => {
  let resolve
  handler = () => new Promise(done => { resolve = done })
  const first = getMerchantPlaceDetail(7), second = getMerchantPlaceDetail(7)
  assert.equal(first, second)
  await new Promise(done => setTimeout(done, 0))
  resolve(detail(7)); await first
  handler = async () => ({ ...detail(7), name: '변경된 매장' })
  assert.equal((await getMerchantPlaceDetail(7)).name, '변경된 매장')
  assert.equal(calls.length, 2)
})

test('home ignores late prior place data without changing global performance', async () => {
  let resolveOld
  handler = async config => {
    if (config.url.endsWith('/me')) return { placeIds: [1, 2] }
    if (config.url.endsWith('/performance')) return { placeCount: 2, totalViews: 99 }
    if (config.url.endsWith('/campaigns')) return { items: [] }
    if (config.url.endsWith('/offers')) return { offers: [] }
    if (config.url.endsWith('/availabilities')) return []
    if (config.url.endsWith('/operating-notices')) return { notices: [] }
    if (config.url.endsWith('/1/information')) return new Promise(resolve => { resolveOld = resolve })
    if (config.url.endsWith('/2/information')) return { placeId: 2, description: '두 번째 매장' }
    return detail(Number(config.url.split('/').at(-1)))
  }
  await mount({ home: true })
  await act(async () => store.selectPlace(2))
  assert.equal(store.placeInformation.placeId, 2)
  await act(async () => resolveOld({ placeId: 1, description: '늦은 응답' }))
  assert.equal(store.placeInformation.placeId, 2)
  assert.equal(store.performance.totalViews, 99)
  assert.equal(calls.filter(url => url.endsWith('/performance')).length, 1)
})
