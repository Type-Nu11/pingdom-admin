import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { useMerchantPlaceMenus } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceMenus.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { clearStoredAuth } = await server.ssrLoadModule('/src/utils/authStorage.ts')
let root, hook, rows, calls, handler, place
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces() { return 1 } }
function Probe() { hook = useMerchantPlaceMenus(); return null }
async function mount() { await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() {}, user: { id: 1, role: 'MERCHANT_OWNER' } } }, h(MerchantPlaceContext.Provider, { value: { ...places, selectedPlaceId: place } }, h(Probe))))) }
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { resolve, promise } }
async function base(config) {
  let data
  if (config.url.endsWith('/me')) data = { placeIds: [1, 2] }
  else if (config.method === 'get') data = structuredClone(rows)
  else {
    const id = Number(config.url.split('/').at(-2))
    const destination = JSON.parse(config.data).displayOrder
    const [item] = rows.splice(rows.findIndex(item => item.id === id), 1)
    rows.splice(destination, 0, item); rows.forEach((item, i) => { item.displayOrder = i })
    data = item
  }
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); calls = []; place = 1
  rows = [1, 2, 3].map((id, i) => ({ id, placeId: 1, name: '메뉴 ' + id, displayOrder: i * 10, status: id === 3 ? 'INACTIVE' : 'AVAILABLE' }))
  handler = base
  client.defaults.adapter = config => { calls.push(config); return handler(config) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('one order write uses target index (not sparse displayOrder) then authoritative full list', async () => {
  await mount()
  await act(async () => assert.ok(await hook.moveMenu(hook.menus[0], 2)))
  const writes = calls.filter(item => item.method !== 'get')
  assert.equal(writes.length, 1)
  assert.deepEqual(JSON.parse(writes[0].data), { displayOrder: 2 })
  assert.deepEqual(hook.menus.map(item => item.id), [2, 3, 1])
  assert.deepEqual(hook.menus.map(item => item.displayOrder), [0, 1, 2])
  assert.equal(hook.menus[1].status, 'INACTIVE')
})
test('inactive source and invalid destinations cannot write', async () => {
  await mount()
  for (const target of [-1, 3, 0.5, NaN]) await act(async () => assert.equal(await hook.moveMenu(hook.menus[0], target), null))
  await act(async () => assert.equal(await hook.moveMenu(hook.menus[2], 0), null))
  assert.equal(calls.filter(item => item.method !== 'get').length, 0)
})
test('concurrent drops only send one write', async () => {
  await mount(); const gate = defer()
  handler = async config => { if (config.method !== 'get') await gate.promise; return base(config) }
  let pending
  await act(async () => { pending = hook.moveMenu(hook.menus[0], 2) })
  await act(async () => assert.equal(await hook.moveMenu(hook.menus[1], 0), null))
  assert.equal(calls.filter(item => item.method !== 'get').length, 1)
  await act(async () => { gate.resolve(); await pending })
})
test('failed write keeps original order without false success', async () => {
  await mount()
  handler = async config => { if (config.method !== 'get') throw new Error('synthetic order failure'); return base(config) }
  await act(async () => assert.equal(await hook.moveMenu(hook.menus[0], 2), null))
  assert.deepEqual(hook.menus.map(item => item.id), [1, 2, 3])
  assert.ok(hook.actionErrorMessage); assert.equal(hook.successMessage, '')
})
test('failed follow-up read does not claim verified order and blocks another write', async () => {
  await mount(); let written = false
  handler = async config => {
    if (written && config.method === 'get') throw new Error('synthetic read failure')
    if (config.method !== 'get') written = true
    return base(config)
  }
  await act(async () => assert.equal(await hook.moveMenu(hook.menus[0], 2), null))
  assert.equal(hook.successMessage, ''); assert.ok(hook.sectionErrorMessage)
  await act(async () => assert.equal(await hook.moveMenu(hook.menus[0], 1), null))
  assert.equal(calls.filter(item => item.method !== 'get').length, 1)
})
test('timeout after persisted order reconciles with server without another write', async () => {
  await mount()
  handler = async config => {
    if (config.method !== 'get') { await base(config); throw Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED', config }) }
    return base(config)
  }
  await act(async () => assert.equal(await hook.moveMenu(hook.menus[0], 2), null))
  assert.deepEqual(hook.menus.map(item => item.id), [2, 3, 1])
  assert.equal(calls.filter(item => item.method !== 'get').length, 1)
  assert.ok(hook.actionErrorMessage); assert.equal(hook.successMessage, '')
})
for (const transition of ['session', 'place']) test(`late order result after ${transition} change is ignored`, async () => {
  await mount(); const gate = defer()
  handler = async config => { if (config.method !== 'get') await gate.promise; return base(config) }
  let pending
  await act(async () => { pending = hook.moveMenu(hook.menus[0], 2) })
  if (transition === 'session') clearStoredAuth()
  else { place = 2; await mount() }
  const before = calls.length
  await act(async () => { gate.resolve(); assert.equal(await pending, null) })
  assert.equal(calls.length, before)
  assert.equal(hook.successMessage, '')
})
