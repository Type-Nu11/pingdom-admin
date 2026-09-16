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
const { useAdminMerchantPlaceApplications, EMPTY_HISTORY_FILTERS } = await server.ssrLoadModule('/src/hooks/useAdminMerchantPlaceApplications.ts')
let root, state, handler
const calls = []
const auth = { clearAuth() {} }
const response = (config, total = 21) => ({ config, data: { items: [], total, page: config.params.page, totalPages: Math.ceil(total / 10), hasNext: config.params.page < Math.ceil(total / 10) }, status: 200, statusText: 'OK', headers: {} })
function Probe() { state = useAdminMerchantPlaceApplications(); return null }
beforeEach(async () => {
  calls.length = 0
  handler = async config => response(config)
  client.defaults.adapter = async config => { calls.push(config.params); return handler(config) }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe))))
  await act(async () => state.changeView('history'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
test('filters combine with type, trim keywords and preserve Korean local time and server totals', async () => {
  await act(async () => state.changeApplicationType('NEW_PLACE'))
  await act(async () => state.applyHistoryFilters({ result: 'REJECTED', keyword: ' 서울 ', submittedFrom: '2026-09-01T09:00', submittedTo: '' }))
  assert.deepEqual(calls.at(-1), { status: 'REJECTED', applicationType: 'NEW_PLACE', keyword: '서울', submittedFrom: '2026-09-01T09:00', submittedTo: undefined, page: 1, limit: 10 })
  await act(async () => state.fetchApplications(2))
  assert.equal(calls.at(-1).keyword, '서울')
  assert.equal(state.page, 2)
  assert.equal(state.total, 21)
  await act(async () => state.applyHistoryFilters(EMPTY_HISTORY_FILTERS, true))
  assert.equal(calls.at(-1).page, 1)
  assert.equal(calls.at(-1).applicationType, undefined)
  assert.deepEqual(calls.at(-1).status, ['APPROVED', 'COMPLETED', 'REJECTED', 'CANCELED'])
})
test('reversed dates do not request; pending view does not leak history filters', async () => {
  const count = calls.length
  await act(async () => assert.equal(state.applyHistoryFilters({ ...EMPTY_HISTORY_FILTERS, submittedFrom: '2026-10-01T00:00', submittedTo: '2026-09-01T00:00' }), false))
  assert.equal(calls.length, count)
  await act(async () => state.applyHistoryFilters({ ...EMPTY_HISTORY_FILTERS, keyword: '검색', submittedTo: '2026-10-01T00:00' }))
  await act(async () => state.changeView('pending'))
  assert.equal(calls.at(-1).status, 'PENDING')
  assert.equal(calls.at(-1).keyword, undefined)
  await act(async () => state.changeView('history'))
  assert.equal(calls.at(-1).keyword, '검색')
})
test('late response cannot overwrite newer filters and failure is distinct from zero', async () => {
  let resolveOld
  handler = config => new Promise(resolve => { resolveOld = () => resolve(response(config, 99)) })
  await act(async () => { state.applyHistoryFilters({ ...EMPTY_HISTORY_FILTERS, keyword: 'old' }) })
  handler = async config => response(config, 0)
  await act(async () => state.applyHistoryFilters({ ...EMPTY_HISTORY_FILTERS, keyword: 'new' }))
  await act(async () => resolveOld())
  assert.equal(state.total, 0)
  assert.equal(state.historyFilters.keyword, 'new')
  assert.equal(state.errorMessage, '')
  handler = async () => { throw new Error('synthetic failure') }
  await act(async () => state.fetchApplications())
  assert.ok(state.errorMessage)
})
