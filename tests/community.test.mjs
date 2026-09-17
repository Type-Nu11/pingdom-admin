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
const api = await server.ssrLoadModule('/src/api/adminCommunityApi.ts')
const { useCommunityQuery } = await server.ssrLoadModule('/src/hooks/useCommunityQuery.ts')
const { useCommunityListQuery } = await server.ssrLoadModule('/src/hooks/useCommunityListQuery.ts')
const { useCommunityReportDetail } = await server.ssrLoadModule('/src/hooks/useCommunityReportDetail.ts')
const { useCommunityReview } = await server.ssrLoadModule('/src/hooks/useCommunityReview.ts')
const { reportPostId, canReviewCommunityReport } = await server.ssrLoadModule('/src/utils/community.ts')
const { AxiosError } = await import('axios')
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const base = { reportId: 1, targetId: 9, postId: 3, targetType: 'COMMENT', status: 'PENDING' }
const bundle = { report: base, target: { postId: 3, commentId: 9 }, unavailable: '' }
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
let root, state, clears, calls
const auth = { clearAuth() { clears++ } }
async function render(Probe) { await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe)))) }
beforeEach(() => {
  clears = 0; calls = []; root = createRoot(document.getElementById('root'))
  client.defaults.adapter = async config => { calls.push(config); return response(config, {}) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('API paths, one-based pagination, false filters and bodyless review match contract', async () => {
  await api.getCommunityPosts({ page: 2, hidden: false, categoryId: 'news' })
  await api.getCommunityPost(3)
  await api.getCommunityComments(3, { page: 1, hidden: true })
  await api.getCommunityComment(3, 9)
  await api.getCommunityReports({ page: 1, status: 'PENDING', targetType: 'COMMENT' })
  await api.getCommunityReport(1)
  await api.reviewCommunityReport(1, 'accept')
  await api.reviewCommunityReport(1, 'decline')
  assert.deepEqual(calls.map(c => c.url), ['/admin/community/posts', '/admin/community/posts/3', '/admin/community/posts/3/comments', '/admin/community/posts/3/comments/9', '/admin/community-reports', '/admin/community-reports/1', '/admin/community-reports/1/accept', '/admin/community-reports/1/decline'])
  assert.deepEqual(calls[0].params, { page: 2, hidden: false, categoryId: 'news', limit: 10 })
  assert.equal(calls[2].params.limit, 10); assert.equal(calls[4].params.limit, 10)
  assert.equal(calls[6].data, undefined); assert.equal(calls[7].data, undefined)
})
test('target identity, old deployment and already processed guards', () => {
  assert.equal(reportPostId({ ...base, postId: null }), null)
  assert.equal(reportPostId({ ...base, targetType: 'POST', postId: undefined }), 9)
  assert.equal(reportPostId({ ...base, targetType: 'UNKNOWN' }), null)
  assert.equal(reportPostId({ ...base, targetType: 'POST' }), null)
  assert.equal(canReviewCommunityReport(bundle), true)
  for (const detail of [null, { ...bundle, unavailable: '403' }, { ...bundle, target: null }, { ...bundle, target: { postId: 4, commentId: 9 } }, { ...bundle, target: { postId: 3, commentId: 8 } }, { ...bundle, report: { ...base, status: 'ACCEPTED' } }]) assert.equal(canReviewCommunityReport(detail), false)
})
for (const fail of [false, true]) test(`query ignores stale ${fail ? 'error' : 'success'} and clears selection immediately`, async () => {
  const old = defer(), fresh = defer()
  const loaders = { old: () => old.promise, fresh: () => fresh.promise }
  let key = 'old'
  function Probe() { state = useCommunityQuery(key, loaders[key] || loaders.old); return h('p', {}, state.data) }
  await render(Probe)
  key = 'fresh'; await render(Probe)
  await act(async () => fresh.resolve('current'))
  await act(async () => fail ? old.reject(new Error('late')) : old.resolve('stale'))
  assert.equal(state.data, 'current'); assert.equal(state.error, '')
  key = null; await render(Probe)
  assert.equal(state.data, null); assert.equal(state.loading, false)
})
test('retry failure removes actionable old data; retry recovers', async () => {
  let fail = false
  const loader = async () => { if (fail) throw new Error('failure'); return 'ok' }
  function Probe() { state = useCommunityQuery('same', loader); return null }
  await render(Probe); assert.equal(state.data, 'ok')
  fail = true; await act(async () => { await state.refresh() })
  assert.equal(state.data, null); assert.ok(state.error)
  fail = false; await act(async () => { await state.refresh() })
  assert.equal(state.data, 'ok'); assert.equal(state.error, '')
})
for (const variant of ['valid', 'missing-parent', 'wrong-comment', 'wrong-report', '404', '403']) test(`report detail: ${variant}`, async () => {
  client.defaults.adapter = async config => {
    calls.push(config.url)
    if (config.url === '/admin/community-reports/1') return response(config, { ...base, ...(variant === 'missing-parent' ? { postId: undefined } : {}), ...(variant === 'wrong-report' ? { reportId: 2 } : {}) })
    if (variant === '404' || variant === '403') throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, {}, { ...response(config, {}), status: Number(variant) })
    return response(config, { postId: 3, commentId: variant === 'wrong-comment' ? 8 : 9 })
  }
  function Probe() { state = useCommunityReportDetail(1); return null }
  await render(Probe)
  assert.equal(canReviewCommunityReport(state.data), variant === 'valid')
  if (variant === 'missing-parent') { assert.equal(calls.length, 1); assert.match(state.data.unavailable, /원문 연결 정보/) }
  if (variant === 'valid') assert.equal(calls[1], '/admin/community/posts/3/comments/9')
  if (variant === 'wrong-report') assert.ok(state.error)
})
test('review blocks duplicate submission, keeps completed state when re-query fails', async () => {
  const pending = defer()
  client.defaults.adapter = async config => { calls.push(config); await pending.promise; return response(config, { status: 'ACCEPTED' }) }
  function Probe() { state = useCommunityReview(); return null }
  await render(Probe)
  let result
  await act(async () => { result = state.review(bundle, 1, 'accept', async () => [false, true]); void state.review(bundle, 1, 'accept', async () => [true]) })
  assert.equal(calls.length, 1); assert.equal(state.busy, true)
  await act(async () => { pending.resolve(); await result })
  assert.ok(state.success); assert.match(state.warning, /완료됐지만/); assert.equal(state.error, '')
  await act(async () => { assert.equal(await state.review(bundle, 1, 'accept', async () => [true]), false) })
  assert.equal(calls.length, 1)
})
for (const code of [401, 403, 404, 409]) test(`review ${code} refreshes status without claiming success`, async () => {
  let refreshed = 0
  client.defaults.adapter = async config => { throw new AxiosError('failure', 'ERR_BAD_REQUEST', config, {}, { ...response(config, {}), status: code }) }
  function Probe() { state = useCommunityReview(); return null }
  await render(Probe)
  await act(async () => { assert.equal(await state.review(bundle, 1, 'decline', async () => { refreshed++; return [true] }), false) })
  assert.equal(state.success, ''); assert.ok(state.error); assert.equal(state.busy, false); assert.equal(refreshed, 1)
  if (code === 401) assert.ok(clears)
})
test('review refuses mismatched selected report or missing content before API call', async () => {
  function Probe() { state = useCommunityReview(); return null }
  await render(Probe)
  await act(async () => {
    assert.equal(await state.review(bundle, 2, 'accept', async () => [true]), false)
    assert.equal(await state.review({ ...bundle, target: null }, 1, 'accept', async () => [true]), false)
  })
  assert.equal(calls.length, 0)
})

const listResult = (page, totalCount = 11) => ({ page, limit: 10, totalCount, totalPages: Math.ceil(totalCount / 10), hasNext: page * 10 < totalCount, reports: page * 10 - 10 < totalCount ? [{ reportId: page }] : [] })
test('list corrects emptied last page and refreshes the corrected page thereafter', async () => {
  let count = 11
  const pages = []
  const loader = async page => { pages.push(page); return listResult(page, count) }
  function Probe() { state = useCommunityListQuery('pending', loader); return null }
  await render(Probe)
  await act(async () => { await state.changePage(2) })
  count = 10
  await act(async () => { assert.equal(await state.refresh(), true) })
  assert.equal(state.page, 1); assert.equal(state.data.totalCount, 10); assert.equal(state.pagination.totalPages, 1)
  assert.deepEqual(pages, [1, 2, 2, 1])
  await act(async () => { await state.refresh() })
  assert.deepEqual(pages, [1, 2, 2, 1, 1])
})
test('list keeps pagination but no stale rows while loading and after failure', async () => {
  const pending = defer()
  const loader = page => page === 1 ? Promise.resolve(listResult(1)) : pending.promise
  function Probe() { state = useCommunityListQuery('all', loader); return null }
  await render(Probe)
  let work
  await act(async () => { work = state.changePage(2) })
  assert.equal(state.data, null); assert.equal(state.loading, true); assert.equal(state.pagination.totalPages, 2)
  await act(async () => { pending.reject(new Error('failed')); assert.equal(await work, false) })
  assert.equal(state.data, null); assert.ok(state.error); assert.equal(state.pagination.totalPages, 2)
})
test('list correction failure returns false and retry uses corrected page', async () => {
  let shrinking = false, fail = true
  const loader = async page => {
    if (shrinking && page === 1 && fail) throw new Error('failed')
    return listResult(page, shrinking ? 0 : 11)
  }
  function Probe() { state = useCommunityListQuery('pending', loader); return null }
  await render(Probe)
  await act(async () => { await state.changePage(2) })
  shrinking = true
  await act(async () => { assert.equal(await state.refresh(), false) })
  assert.equal(state.page, 1); assert.equal(state.data, null); assert.ok(state.error)
  fail = false
  await act(async () => { assert.equal(await state.refresh(), true) })
  assert.equal(state.page, 1); assert.equal(state.data.totalCount, 0); assert.deepEqual(state.data.reports, [])
})
for (const fail of [false, true]) test(`list filter change clears old pagination and ignores late ${fail ? 'failure' : 'success'}`, async () => {
  const old = defer(), fresh = defer()
  const loaders = { old: page => page === 1 ? Promise.resolve(listResult(1)) : old.promise, fresh: () => fresh.promise }
  let scope = 'old', work
  function Probe() { state = useCommunityListQuery(scope, loaders[scope]); return null }
  await render(Probe)
  await act(async () => { work = state.changePage(2) })
  scope = 'fresh'; await render(Probe)
  assert.equal(state.page, 1); assert.equal(state.pagination, null); assert.equal(state.data, null)
  await act(async () => fresh.resolve(listResult(1, 3)))
  await act(async () => { if (fail) old.reject(new Error('late')); else old.resolve(listResult(2)); await work })
  assert.equal(state.data.totalCount, 3); assert.equal(state.error, ''); assert.equal(state.pagination.totalPages, 1)
})
