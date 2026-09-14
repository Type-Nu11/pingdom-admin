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
const { useAdminNotificationOperations } = await server.ssrLoadModule('/src/hooks/useAdminNotificationOperations.ts')
let root, state, requests
const auth = { clearAuth() {} }
function Probe() { state = useAdminNotificationOperations(); return null }
beforeEach(async () => {
  requests = []
  client.defaults.adapter = config => new Promise((resolve, reject) => requests.push({ config, resolve, reject }))
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe))))
  assert.equal(requests.length, 3)
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function finish(index, fail = false) {
  const { config, resolve, reject } = requests[index]
  await act(async () => {
    if (fail) { reject(new Error('mock failure')); return }
    const item = { id: index }
    resolve({ config, status: 200, statusText: 'OK', headers: {}, data: {
      notifications: [item], deliveries: [item], events: [item], page: config.params?.page ?? 1,
      totalCount: 100, totalPages: 10, hasNext: true,
    } })
  })
}
async function initialized() { for (let i = 0; i < 3; i++) await finish(i) }
async function fetch(tab, page, status) { await act(async () => { void state.fetchTab(tab, page, status) }) }

test('initial parallel loading lasts until all tabs settle', async () => {
  await finish(0); assert.equal(state.isLoading, true)
  await finish(1); assert.equal(state.isLoading, true)
  await finish(2); assert.equal(state.isLoading, false)
})
for (const tab of ['delivery', 'outbox']) {
  test(`${tab} filters and pagination do not restart initialization`, async () => {
    await initialized()
    const other = tab === 'delivery' ? 'outbox' : 'delivery'
    await fetch(other, 4); await finish(3)
    await fetch(tab, 1, tab === 'delivery' ? 'SENT' : 'SUCCEEDED'); await finish(4)
    await fetch(tab, 2); await finish(5)
    assert.equal(state.pages[other], 4)
    assert.equal(state.pages[tab], 2)
    assert.equal(requests[5].config.params.status, tab === 'delivery' ? 'SENT' : 'SUCCEEDED')
    await fetch(tab, 1, ''); await finish(6)
    assert.equal(state[`${tab === 'delivery' ? 'delivery' : 'outbox'}Status`], '')
    assert.equal(requests[6].config.params.status, undefined)
    assert.equal(requests.length, 7)
  })
}
for (const fail of [false, true]) {
  test(`stale ${fail ? 'failure' : 'success'} cannot reset latest filter or loading`, async () => {
    await initialized()
    await fetch('delivery', 1, 'SENT')
    await fetch('delivery', 2, '')
    await finish(3, fail)
    assert.equal(state.isLoading, true)
    assert.equal(state.deliveryStatus, '')
    assert.equal(state.errorMessage, '')
    await finish(4)
    assert.equal(state.pages.delivery, 2)
    assert.equal(state.deliveries[0].id, 4)
    assert.equal(state.isLoading, false)
  })
}
for (const id of [undefined, 12]) {
  test(`read ${id ?? 'all'} refreshes the latest inbox page`, async () => {
    await initialized()
    await act(async () => { void state.read(id) })
    await fetch('inbox', 3); await finish(4)
    await finish(3)
    assert.equal(requests[5].config.params.page, 3)
    await finish(5)
    assert.equal(state.pages.inbox, 3)
    assert.equal(requests.length, 6)
  })
}
test('retry refreshes latest outbox conditions and blocks duplicate submission', async () => {
  await initialized()
  await act(async () => { void state.retry('event-1', 'reason'); void state.retry('event-1', 'reason') })
  assert.equal(requests.length, 4)
  await fetch('outbox', 3, ''); await finish(4)
  await finish(3)
  assert.equal(requests[5].config.params.page, 3)
  assert.equal(requests[5].config.params.status, undefined)
  await finish(5)
  assert.equal(state.retryingId, '')
  assert.equal(state.pages.outbox, 3)
})
test('latest failure preserves chosen filter and can be retried', async () => {
  await initialized()
  await fetch('delivery', 1, 'SENT'); await finish(3, true)
  assert.equal(state.deliveryStatus, 'SENT')
  assert.ok(state.errorMessage)
  assert.equal(state.isLoading, false)
  await fetch('delivery', 1); await finish(4)
  assert.equal(requests[4].config.params.status, 'SENT')
  assert.equal(state.errorMessage, '')
})
