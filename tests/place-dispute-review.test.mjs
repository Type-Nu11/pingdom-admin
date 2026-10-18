import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { AxiosError } from 'axios'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from './helpers/isolated-vite.mjs'
import { report, list } from './helpers/place-dispute-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const cacheDir = await mkdtemp(join(tmpdir(), 'pingdom-300-unit-'))
const vite = await createServer({ cacheDir, server: { middlewareMode: true, ws: false },
  appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await vite.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await vite.ssrLoadModule('/src/api/customAxios.ts')
const { useAdminPlaceInformationReports } = await vite.ssrLoadModule('/src/hooks/useAdminPlaceInformationReports.ts')
const { PlaceInformationReportPanel } = await vite.ssrLoadModule('/src/components/placeVerification/PlaceInformationReportPanel.tsx')
const { clearStoredAuth } = await vite.ssrLoadModule('/src/utils/authStorage.ts')
const path = '/admin/place-information-reports'
const response = (config, data) => ({ config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} })
function fail(config, status = 500) {
  throw new AxiosError('합성 검토 API 실패', 'ERR_BAD_RESPONSE', config, undefined,
    { config, data: {}, status, statusText: 'Synthetic', headers: {} })
}
let root, state, auth, clears, calls, adapter, records, showPanel
function Probe() { state = useAdminPlaceInformationReports(); return showPanel ? h(PlaceInformationReportPanel, { reportHook: state }) : null }
function standard(config) {
  if (config.method === 'get' && config.url === path) return response(config, list([...records.values()]))
  const detail = config.url.match(/^\/admin\/place-information-reports\/(\d+)$/)
  if (config.method === 'get' && detail) return response(config, records.get(Number(detail[1])))
  const review = config.url.match(/^\/admin\/place-information-reports\/(\d+)(?:\/disputes\/(\d+))?\/review$/)
  assert.ok(config.method === 'post' && review, `Unexpected/unsafe API ${config.method} ${config.url}`)
  const body = JSON.parse(config.data)
  const current = records.get(Number(review[1]))
  if (review[2]) {
    const target = current.disputes.find(d => d.disputeId === Number(review[2]))
    Object.assign(target, body, { reviewedByAdminUserId: 99, reviewedAt: '2026-10-19T10:00:00Z' })
    current.status = 'UNDER_REVIEW'
    return response(config, target)
  }
  Object.assign(current, body)
  return response(config, current)
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); calls = []; clears = 0; showPanel = false
  records = new Map([[1, report(1)], [2, report(2)], [3, report(3)]])
  adapter = standard
  auth = { user: { id: 99, username: '합성 QA', role: 'ADMIN' }, clearAuth() { clears++ }, isAuthenticated: true, isAuthReady: true }
  client.defaults.adapter = async config => { calls.push(config); return adapter(config) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await vite.close(); dom.window.close() })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) }
async function mount() { await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(Probe)))); await settle() }
async function select(id = 1) { await act(async () => state.fetchReportDetail(id)); await settle() }
async function review() { let result; await act(async () => { result = await state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 판정 근거' }) }); return result }
const writes = () => calls.filter(c => c.method !== 'get')
function deferred() {
  let resolve, reject
  const promise = new Promise((a, b) => { resolve = a; reject = b })
  return { promise, resolve, reject }
}

test('single dispute POST preserves the parent and other disputes, then reads canonical report', async () => {
  await mount(); await select()
  const other = structuredClone(state.reportDetail.disputes[1])
  const gate = deferred()
  adapter = config => {
    if (config.method === 'get' && config.url === path + '/1') return gate.promise.then(() => standard(config))
    return standard(config)
  }
  let pending
  await act(async () => { pending = state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 근거' }) })
  await settle()
  assert.equal(state.reportDetail.reportId, 1)
  assert.equal(state.reportDetail.description, '합성 신고 본문 1')
  assert.equal(state.reportDetail.disputes[0].status, 'ACCEPTED')
  assert.deepEqual(state.reportDetail.disputes[1], other)
  assert.equal(state.canReview, false)
  await act(async () => { gate.resolve(); await pending })
  assert.equal(state.reportDetail.status, 'UNDER_REVIEW')
  assert.equal(state.canReview, true)
  assert.equal(writes().length, 1)
  assert.deepEqual(JSON.parse(writes()[0].data), { status: 'ACCEPTED', reviewReason: '합성 근거' })
})

test('whole-report review keeps its full response contract and refreshes detail', async () => {
  await mount(); await select()
  let result; await act(async () => { result = await state.reviewReport(1, { status: 'RESOLVED', reviewReason: '합성 완료' }) })
  assert.deepEqual(result, { saved: true, refreshed: true })
  assert.equal(state.reportDetail.status, 'RESOLVED'); assert.equal(state.reportDetail.disputes.length, 2)
  assert.equal(writes()[0].url, path + '/1/review')
})

for (const status of [401, 403, 409, 500, 'network']) test(`POST ${status} is a save error, not success`, async () => {
  await mount(); await select()
  adapter = config => config.method === 'post'
    ? status === 'network' ? Promise.reject(new Error('Synthetic offline')) : fail(config, status) : standard(config)
  assert.equal(await review(), null)
  assert.ok(state.actionErrorMessage); assert.equal(state.actionSuccessMessage, '')
  assert.equal(state.actionNotice, ''); assert.equal(state.activeAction, null)
  assert.equal(clears > 0, status === 401)
  if (status === 401 || status === 403) assert.equal(state.reportDetail, null)
  else assert.equal(state.reportDetail.disputes[0].status, 'SUBMITTED')
})

for (const mode of ['list', 'detail', 'both']) test(`save success with ${mode} refresh failure never permits duplicate POST`, async () => {
  await mount(); await select()
  let saved = false
  adapter = config => {
    if (config.method === 'post') { const value = standard(config); saved = true; return value }
    if (saved && (mode === 'both' || (mode === 'list' ? config.url === path : config.url === path + '/1'))) return fail(config)
    return standard(config)
  }
  assert.deepEqual(await review(), { saved: true, refreshed: false })
  assert.ok(state.actionSuccessMessage); assert.equal(state.actionErrorMessage, '')
  assert.ok(state.actionNotice); assert.equal(state.canReview, false)
  assert.equal(state.reportDetail.disputes[0].status, 'ACCEPTED')
  await act(async () => state.reviewDispute(1, 12, { status: 'REJECTED', reviewReason: '합성 근거' }))
  assert.equal(writes().length, 1)
  adapter = standard
  await act(async () => state.retryRefresh())
  assert.equal(state.actionNotice, ''); assert.equal(state.canReview, true)
  assert.equal(writes().length, 1, 'retry only issues GETs')
})

for (const malformed of [null, {}, report(2), { ...report(1), disputes: null }, { ...report(1), disputes: [{}] }]) {
  test(`malformed initial detail ${JSON.stringify(malformed).slice(0, 35)} is an error, never a render crash`, async () => {
    adapter = config => config.url === path + '/1' ? response(config, malformed) : standard(config)
    showPanel = true; await mount(); await select()
    assert.equal(state.reportDetail, null); assert.ok(state.detailErrorMessage); assert.equal(state.canReview, false)
    assert.doesNotMatch(document.body.textContent, /접수된 반박이 없습니다/)
  })
}

test('malformed successful POST is confirmed by canonical GET without falsely reporting save failure', async () => {
  await mount(); await select()
  adapter = config => config.method === 'post' ? (standard(config), response(config, {})) : standard(config)
  assert.deepEqual(await review(), { saved: true, refreshed: true })
  assert.equal(state.reportDetail.disputes[0].status, 'ACCEPTED')
  assert.equal(state.actionErrorMessage, '')
})
test('malformed successful POST plus failed refresh preserves parent read-only and blocks resubmit', async () => {
  await mount(); await select()
  adapter = config => config.method === 'post' ? response(config, {})
    : config.url === path + '/1' ? fail(config) : standard(config)
  assert.deepEqual(await review(), { saved: true, refreshed: false })
  assert.equal(state.reportDetail.reportId, 1); assert.equal(state.reportDetail.disputes.length, 2)
  assert.equal(state.canReview, false); assert.ok(state.actionNotice); assert.equal(state.actionErrorMessage, '')
})

for (const mode of ['list', 'detail']) test(`save success followed by ${mode} 403 hides denied detail but preserves save outcome`, async () => {
  await mount(); await select()
  let saved = false
  adapter = config => {
    if (config.method === 'post') { saved = true; return standard(config) }
    if (saved && config.url === (mode === 'list' ? path : path + '/1')) return fail(config, 403)
    return standard(config)
  }
  assert.deepEqual(await review(), { saved: true, refreshed: false })
  assert.ok(state.actionSuccessMessage); assert.match(state.actionNotice, /저장됐지만/)
  assert.equal(state.actionErrorMessage, ''); assert.equal(state.reportDetail, null)
  assert.equal(state.canReview, false); assert.equal(clears, 0)
  adapter = standard; await act(async () => state.retryRefresh())
  assert.equal(state.actionNotice, ''); assert.equal(state.reportDetail.disputes[0].status, 'ACCEPTED')
  assert.equal(writes().length, 1)
})

test('single-flight lock blocks double clicks before a rerender', async () => {
  await mount(); await select()
  const gate = deferred()
  adapter = config => config.method === 'post' ? gate.promise.then(() => standard(config)) : standard(config)
  let pending, duplicate
  await act(async () => {
    pending = state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 근거' })
    duplicate = state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 근거' })
  })
  assert.equal(await duplicate, null); assert.equal(writes().length, 1)
  await act(async () => { gate.resolve(); await pending })
  assert.equal(state.activeAction, null)
})

for (const phase of ['POST', 'refresh']) test(`selection change during ${phase} cannot overwrite or lock new detail`, async () => {
  await mount(); await select()
  const gate = deferred()
  adapter = config => (phase === 'POST' ? config.method === 'post' : config.method === 'get' && config.url === path + '/1')
    ? gate.promise.then(() => standard(config)) : standard(config)
  let pending
  await act(async () => { pending = state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 근거' }) })
  await settle(); await select(2)
  assert.equal(state.reportDetail.reportId, 2); assert.equal(state.canReview, true)
  await act(async () => { gate.resolve(); await pending })
  assert.equal(state.reportDetail.reportId, 2); assert.equal(state.canReview, true)
  assert.equal(state.actionNotice, ''); assert.equal(state.actionSuccessMessage, '')
})

test('late failure from old selection neither logs out nor changes the new selection', async () => {
  await mount(); await select()
  const gate = deferred()
  adapter = config => config.method === 'post' ? gate.promise : standard(config)
  let pending
  await act(async () => { pending = state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 근거' }) })
  await select(2)
  await act(async () => { try { fail(writes()[0], 401) } catch (e) { gate.reject(e) }; await pending })
  assert.equal(state.reportDetail.reportId, 2); assert.equal(clears, 0); assert.equal(state.actionErrorMessage, '')
})

for (const change of ['account', 'role', 'session', 'unmount']) test(`${change} invalidates late action without restoring old data`, async () => {
  await mount(); await select()
  const gate = deferred()
  adapter = config => config.method === 'post' ? gate.promise.then(() => standard(config)) : standard(config)
  let pending; await act(async () => { pending = state.reviewDispute(1, 11, { status: 'ACCEPTED', reviewReason: '합성 근거' }) })
  if (change === 'session') { clearStoredAuth(); await mount() }
  else if (change === 'unmount') await act(async () => root.render(null))
  else { auth = { ...auth, user: { ...auth.user, ...(change === 'account' ? { id: 100 } : { role: 'USER' }) } }; await mount() }
  await act(async () => { gate.resolve(); await pending })
  if (change !== 'unmount') {
    assert.equal(state.reportDetail, null); assert.equal(state.actionSuccessMessage, ''); assert.equal(state.activeAction, null)
  }
  assert.equal(clears, 0)
})

test('reversed detail requests and filter changes invalidate old selection', async () => {
  await mount()
  const gate = deferred()
  adapter = config => config.url === path + '/1' ? gate.promise.then(() => standard(config)) : standard(config)
  let pending; await act(async () => { pending = state.fetchReportDetail(1) })
  await select(2)
  await act(async () => { gate.resolve(); await pending })
  assert.equal(state.reportDetail.reportId, 2)
  await act(async () => state.fetchReports('ACCEPTED', 1))
  assert.equal(state.selectedReportId, null); assert.equal(state.canReview, false)
})

test('list failure retains prior counts but a first failure is not displayed as empty', async () => {
  showPanel = true; adapter = config => config.url === path ? fail(config) : standard(config)
  await mount()
  assert.ok(state.errorMessage); assert.equal(state.hasListResult, false)
  assert.doesNotMatch(document.body.textContent, /조건에 맞는 신고가 없습니다/)
  adapter = standard; await act(async () => state.fetchReports()); await select()
  adapter = config => config.url === path ? fail(config) : standard(config)
  await act(async () => state.fetchReports())
  assert.equal(state.totalCount, 3); assert.equal(state.hasListResult, true)
  assert.match(document.body.textContent, /이전에 조회한 목록/)
})

test('denied list invalidates pending detail so stale data cannot reappear', async () => {
  await mount(); await select()
  const gate = deferred()
  adapter = config => config.url === path + '/2' ? gate.promise.then(() => standard(config))
    : config.url === path ? fail(config, 403) : standard(config)
  let pending; await act(async () => { pending = state.fetchReportDetail(2) })
  await act(async () => state.fetchReports())
  await act(async () => { gate.resolve(); await pending })
  assert.equal(state.reportDetail, null); assert.equal(state.reports.length, 0); assert.equal(state.canReview, false)
})

test('actual panel requires reason and closes after save even when detail refresh fails', async () => {
  showPanel = true; await mount(); await select()
  const button = name => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === name)
  await act(async () => button('반박 검토').click())
  await act(async () => button('반박 수용').click())
  assert.match(document.body.textContent, /판정 근거를 입력해주세요/); assert.equal(writes().length, 0)
  const input = document.querySelector('textarea')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, '합성 판정 근거')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  adapter = config => config.method === 'get' && config.url === path + '/1' ? fail(config) : standard(config)
  await act(async () => button('반박 수용').click()); await settle()
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match(document.body.textContent, /저장했습니다/); assert.match(document.body.textContent, /최신 정보 다시 조회/)
  assert.equal(button('반박 검토').disabled, true)
  assert.equal(writes().length, 1)
})

test('an old account save cannot close a new account dialog or erase its input', async () => {
  showPanel = true; await mount(); await select()
  const button = name => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === name)
  const inputReason = async text => act(async () => {
    const input = document.querySelector('textarea')
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, text)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => button('반박 검토').click()); await inputReason('이전 계정의 합성 근거')
  const gate = deferred()
  adapter = config => config.method === 'post' ? gate.promise.then(() => standard(config)) : standard(config)
  await act(async () => button('반박 수용').click())
  auth = { ...auth, user: { ...auth.user, id: 100 } }; await mount(); await select(2)
  await act(async () => button('반박 검토').click()); await inputReason('새 계정의 합성 근거')
  await act(async () => gate.resolve()); await settle()
  assert.match(document.querySelector('[role="dialog"]').textContent, /반박 #21 검토/)
  assert.equal(document.querySelector('textarea').value, '새 계정의 합성 근거')
  assert.equal(state.actionSuccessMessage, '')
})

for (const change of ['account', 'session', 'unmount']) test(`late detail after ${change} is ignored`, async () => {
  await mount()
  const gate = deferred()
  adapter = config => config.url === path + '/1' ? gate.promise.then(() => standard(config)) : standard(config)
  let pending; await act(async () => { pending = state.fetchReportDetail(1) })
  if (change === 'session') { clearStoredAuth(); await mount() }
  else if (change === 'unmount') await act(async () => root.render(null))
  else { auth = { ...auth, user: { ...auth.user, id: 100 } }; await mount() }
  await act(async () => { gate.resolve(); await pending })
  if (change !== 'unmount') assert.equal(state.reportDetail, null)
  assert.equal(clears, 0)
})
