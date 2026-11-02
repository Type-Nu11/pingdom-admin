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
const { useAdminPlaceReviewDeletionRequests } = await server.ssrLoadModule('/src/hooks/useAdminPlaceReviewDeletionRequests.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const auth = { clearAuth() {} }
let root, hook, calls, adapter
const response = (config, totalPages = 2) => ({ config, status: 200, statusText: 'OK', headers: {}, data: {
  deletionRequests: totalPages && config.params.page <= totalPages ? [{ id: config.params.page, status: config.params.status }] : [],
  page: config.params.page, totalElements: totalPages * 10, totalPages, hasNext: config.params.page < totalPages,
} })
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }
function Probe() { hook = useAdminPlaceReviewDeletionRequests(); return null }
beforeEach(async () => {
  calls = []; adapter = async config => response(config)
  client.defaults.adapter = config => { calls.push(config.params); return adapter(config) }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe))))
  calls.length = 0
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('page shrink retries the last page with the original status filter', async () => {
  await act(async () => assert.equal(await hook.fetchItems('APPROVED', 5), true))
  assert.deepEqual(calls.map(query => [query.status, query.page]), [['APPROVED', 5], ['APPROVED', 2]])
  assert.equal(hook.page, 2)
  assert.deepEqual(hook.items, [{ id: 2, status: 'APPROVED' }])
  assert.equal(hook.isLoading, false)
  assert.equal(hook.listState.phase, 'success')
})

test('outer completion cannot clear loading while the corrected page is pending', async () => {
  const gate = deferred()
  adapter = config => config.params.page === 2 ? gate.promise.then(() => response(config)) : Promise.resolve(response(config))
  let pending
  await act(async () => { pending = hook.fetchItems('PENDING', 5) })
  assert.equal(hook.page, 2)
  assert.equal(hook.isLoading, true)
  await act(async () => { gate.resolve(); assert.equal(await pending, true) })
  assert.equal(hook.isLoading, false)
})

test('late out-of-range response cannot restart an obsolete filter', async () => {
  const gate = deferred()
  adapter = config => config.params.page === 5 ? gate.promise.then(() => response(config)) : Promise.resolve(response(config))
  let pending
  await act(async () => { pending = hook.fetchItems('PENDING', 5) })
  await act(async () => hook.fetchItems('REJECTED', 1))
  const requests = calls.length
  await act(async () => { gate.resolve(); assert.equal(await pending, false) })
  assert.equal(calls.length, requests)
  assert.equal(hook.status, 'REJECTED')
  assert.deepEqual(hook.items, [{ id: 1, status: 'REJECTED' }])
})

test('an empty list corrects to page one without an endless retry', async () => {
  adapter = async config => response(config, 0)
  await act(async () => assert.equal(await hook.fetchItems('', 5), true))
  assert.deepEqual(calls.map(query => query.page), [5, 1])
  assert.equal(hook.page, 1)
  assert.deepEqual(hook.items, [])
  assert.equal(hook.isLoading, false)
})
