import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
import { reporter, historyPage } from './helpers/trust-score-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await vite.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await vite.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: client } = await vite.ssrLoadModule('/src/api/customAxios.ts')
const { useAdminTrustScore } = await vite.ssrLoadModule('/src/hooks/useAdminTrustScore.ts')
const { default: Page } = await vite.ssrLoadModule('/src/pages/trustScore/TrustScorePage.tsx')
const { clearStoredAuth } = await vite.ssrLoadModule('/src/utils/authStorage.ts')
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
function reject(config, status) { throw new AxiosError('합성 이력 조회 실패', 'ERR_BAD_RESPONSE', config, undefined, { config, data: {}, status, statusText: 'Synthetic', headers: {} }) }
let root, state, adapter, calls, auth, clears
function Probe() { state = useAdminTrustScore(); return null }
function standard(config) {
  assert.equal(config.method, 'get', 'Writes are forbidden unless a test explicitly replaces this adapter')
  const match = config.url.match(/^\/admin\/trust-score\/reporters\/(\d+)(\/history)?$/)
  if (match) return response(config, match[2] ? historyPage(Number(match[1]), config.params.page, config.params.limit) : reporter(Number(match[1])))
  if (config.url.endsWith('/anomalies')) return response(config, { anomalies: [], page: 1, limit: 10, totalCount: 0, totalPages: 0 })
  if (config.url.endsWith('/intervention-rules')) return response(config, { rules: [] })
  throw Error(`Unexpected API ${config.url}`)
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); calls = []; clears = 0; adapter = standard
  auth = { user: { id: 99, username: '합성 QA', role: 'ADMIN' }, clearAuth() { clears++ }, logout() {}, isAuthenticated: true, isAuthReady: true }
  client.defaults.adapter = async config => { calls.push(config); return adapter(config) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await vite.close(); dom.window.close() })
async function settle() { await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function mount(child = h(Probe)) {
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(AdminNotificationContext.Provider, { value: notifications }, h(MemoryRouter, {}, child)))))
  await settle()
}
async function fetch(id = 1) { await act(async () => state.fetchReporter(id)); await settle() }
async function page(number) { await act(async () => state.fetchHistory(number)); await settle() }
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text)
function change(input, value) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
}

test('page contract stores only items and navigates first/middle/last with server totals', async () => {
  await mount(); await fetch()
  assert.equal(state.history.length, 20); assert.equal(state.historyPageInfo.total, 45)
  assert.equal(state.historyPageInfo.page, 1); assert.equal(state.historyPageInfo.hasNext, true)
  const scoreReads = () => calls.filter(c => /reporters\/1$/.test(c.url)).length
  await page(2); assert.equal(state.history[0].reason, '합성 이력 1-21')
  await page(3); assert.equal(state.history.length, 5); assert.equal(state.historyPageInfo.hasNext, false)
  assert.equal(scoreReads(), 1, 'history paging must not re-evaluate or fetch score')
  assert.ok(calls.filter(c => c.url.endsWith('/history')).every(c => c.params.limit === 20))
})

for (const malformed of [[], {}, { ...historyPage(), items: null }, { ...historyPage(), total: '45' }, { ...historyPage(), page: 0 }, { ...historyPage(), hasNext: null }, historyPage(2)]) {
  test(`malformed/legacy history response ${JSON.stringify(malformed).slice(0, 65)} is an error, not empty`, async () => {
    adapter = config => config.url.endsWith('/history') ? response(config, malformed) : standard(config)
    await mount(); await fetch()
    assert.equal(state.reporter.reporterUserId, 1)
    assert.equal(state.historyPhase, 'error'); assert.equal(state.historyPageInfo, null)
    assert.ok(state.historyError); assert.equal(state.history.length, 0)
  })
}

test('empty history is a successful zero, not an initial count or failure', async () => {
  adapter = config => config.url.endsWith('/history') ? response(config, historyPage(1, 1, 20, 0)) : standard(config)
  await mount(); assert.equal(state.historyPhase, 'idle'); assert.equal(state.historyPageInfo, null)
  await fetch(); assert.equal(state.historyPhase, 'success'); assert.equal(state.historyPageInfo.total, 0)
  assert.equal(state.historyError, '')
})

for (const status of [401, 403, 500]) test(`history ${status} keeps score and distinguishes permission from previous results`, async () => {
  await mount(); await fetch()
  adapter = config => config.url.endsWith('/history') ? reject(config, status) : standard(config)
  await page(2)
  assert.equal(state.reporter.reporterUserId, 1)
  assert.equal(state.historyPhase, 'error'); assert.ok(state.historyError)
  assert.equal(state.historyPageInfo?.page ?? null, status === 500 ? 1 : null)
  assert.equal(state.history.length, status === 500 ? 20 : 0)
  assert.equal(clears > 0, status === 401)
  assert.equal(state.requestedHistoryPage, 2)
  adapter = standard; await page(state.requestedHistoryPage)
  assert.equal(state.historyPageInfo.page, 2)
})

test('history and score complete independently and history failure does not discard the score', async () => {
  let release
  adapter = config => config.url.endsWith('/history') ? new Promise(resolve => { release = () => resolve(response(config, historyPage())) }) : standard(config)
  await mount(); await fetch()
  assert.equal(state.reporterPhase, 'success'); assert.equal(state.historyPhase, 'loading')
  await act(async () => release()); assert.equal(state.historyPhase, 'success')
})

test('new reporter clears page/previous history immediately and ignores late old score/history', async () => {
  const releases = []
  adapter = config => /reporters\/1(?:\/history)?$/.test(config.url)
    ? new Promise(resolve => releases.push(() => resolve(standard(config)))) : standard(config)
  await mount()
  let pending; await act(async () => { pending = state.fetchReporter(1) })
  await fetch(2)
  assert.equal(state.reporter.reporterUserId, 2); assert.equal(state.history[0].reporterUserId, 2)
  await act(async () => { releases.forEach(release => release()); await pending })
  assert.equal(state.reporter.reporterUserId, 2); assert.equal(state.history[0].reporterUserId, 2)
  adapter = standard; await page(3)
  const latestReleases = []
  adapter = config => /reporters\/3(?:\/history)?$/.test(config.url) ? new Promise(resolve => { latestReleases.push(() => resolve(standard(config))) }) : standard(config)
  await act(async () => { void state.fetchReporter(3) })
  assert.equal(state.reporter, null); assert.equal(state.historyPageInfo, null); assert.equal(state.history.length, 0)
  await act(async () => latestReleases.forEach(release => release()))
})

test('late page and late failure never replace the newer page or its loading state', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.url.endsWith('/history') && config.params.page === 2
    ? new Promise(resolve => { release = () => resolve(response(config, historyPage(1, 2))) }) : standard(config)
  let pending; await act(async () => { pending = state.fetchHistory(2) })
  await page(3)
  await act(async () => { release(); await pending })
  assert.equal(state.historyPageInfo.page, 3); assert.equal(state.historyPhase, 'success')
  let rejectLate
  adapter = config => config.url.endsWith('/history') && config.params.page === 2
    ? new Promise((_resolve, rejectPromise) => { rejectLate = () => rejectPromise(new Error('Synthetic late failure')) }) : standard(config)
  await act(async () => { pending = state.fetchHistory(2) }); await page(1)
  await act(async () => { rejectLate(); await pending })
  assert.equal(state.historyPageInfo.page, 1); assert.equal(state.historyError, '')
})

test('account/role change hides previous results and invalidates in-flight reads', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.url.endsWith('/history') ? new Promise(resolve => { release = () => resolve(response(config, historyPage())) }) : standard(config)
  let pending; await act(async () => { pending = state.fetchHistory(2) })
  auth = { ...auth, user: { ...auth.user, id: 100 } }; await mount()
  assert.equal(state.reporter, null); assert.equal(state.historyPageInfo, null)
  await act(async () => { release(); await pending })
  assert.equal(state.reporter, null); assert.equal(state.historyPhase, 'idle')
  adapter = standard; await fetch(2); auth = { ...auth, user: { ...auth.user, role: 'USER' } }; await mount()
  assert.equal(state.reporter, null); assert.equal(state.history.length, 0)
})

test('authentication session rotation discards late reads without treating cancellation as empty', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.url.endsWith('/history') ? new Promise(resolve => { release = () => resolve(response(config, historyPage())) }) : standard(config)
  let pending; await act(async () => { pending = state.fetchHistory(2) })
  await act(async () => clearStoredAuth())
  await mount()
  await act(async () => { release(); await pending })
  assert.equal(state.historyPageInfo, null); assert.equal(state.historyPhase, 'idle')
})

test('deleted last page re-reads the current last page rather than inventing its contents', async () => {
  await mount(); await fetch()
  adapter = config => config.url.endsWith('/history')
    ? response(config, historyPage(1, config.params.page, 20, 21)) : standard(config)
  await page(3)
  assert.equal(state.historyPageInfo.page, 2)
  assert.equal(state.historyPageInfo.total, 21)
  assert.equal(state.history[0].reason, '합성 이력 1-21')
  assert.deepEqual(calls.filter(c => c.url.endsWith('/history')).slice(-2).map(c => c.params.page), [3, 2])
})

test('network error retains verified history, and first score failure is not an empty/zero result', async () => {
  await mount(); await fetch()
  adapter = config => config.url.endsWith('/history') ? Promise.reject(new Error('Synthetic offline')) : standard(config)
  await page(2)
  assert.equal(state.historyPageInfo.page, 1); assert.equal(state.historyPhase, 'error')
  assert.equal(clears, 0)
  adapter = config => /reporters\/2$/.test(config.url) ? reject(config, 500) : standard(config)
  await fetch(2)
  assert.equal(state.reporter, null); assert.equal(state.reporterPhase, 'error')
  assert.ok(state.reporterError)
})

test('late denied response for an old reporter cannot clear the new reporter or authentication', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.url.endsWith('/reporters/1/history')
    ? new Promise((_resolve, rejectPromise) => { release = () => { try { reject(config, 401) } catch (error) { rejectPromise(error) } } }) : standard(config)
  let pending; await act(async () => { pending = state.fetchHistory(2) })
  await fetch(2)
  await act(async () => { release(); await pending })
  assert.equal(state.reporter.reporterUserId, 2); assert.equal(clears, 0)
})

test('late unmounted requests cannot update state or report errors', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.url.endsWith('/history') ? new Promise(resolve => { release = () => resolve(standard(config)) }) : standard(config)
  let pending; await act(async () => { pending = state.fetchHistory(2) })
  await act(async () => root.render(null))
  await act(async () => { release(); await pending })
  assert.equal(clears, 0)
})

test('score permission failure clears previous score/history and blocks a late successful history', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.url.endsWith('/history')
    ? new Promise(resolve => { release = () => resolve(standard(config)) })
    : /reporters\/1$/.test(config.url) ? reject(config, 403) : standard(config)
  await fetch()
  assert.equal(state.reporter, null); assert.equal(state.historyPageInfo, null)
  assert.match(state.reporterError, /관리자 권한/)
  await act(async () => release())
  assert.equal(state.history.length, 0); assert.equal(state.historyPhase, 'idle')
})

test('failed score refresh labels retained score and disables actions based on stale score', async () => {
  await mount(h(Page))
  await act(async () => change(document.querySelector('input'), '1'))
  await act(async () => button('조회').click()); await settle()
  adapter = config => /reporters\/1$/.test(config.url) ? reject(config, 500) : standard(config)
  await act(async () => button('조회').click()); await settle()
  assert.match(document.body.textContent, /표시된 점수는 이전 결과입니다/)
  assert.equal(button('개입 규칙 평가').disabled, true)
  assert.equal(button('전체 점수 재계산').disabled, true)
})

for (const [name, method, path, action] of [
  ['resolve', 'patch', '/anomalies/1/resolve', s => s.resolveAnomaly(1, '합성 해결 사유')],
  ['create rule', 'post', '/intervention-rules', s => s.saveRule(null, { ruleName: '합성 규칙' })],
  ['update rule', 'put', '/intervention-rules/3', s => s.saveRule(3, { ruleName: '합성 규칙' })],
  ['toggle rule', 'patch', '/intervention-rules/3/enable', s => s.toggleRule(3, true)],
  ['evaluate', 'post', '/reporters/1/interventions/evaluate', s => s.evaluateReporter(1)],
  ['batch', 'post', '/batch/recalculate', s => s.recalculate()],
]) test(`existing ${name} action remains connected with synthetic mutations only`, async () => {
  await mount(); await fetch()
  adapter = config => {
    if (config.method === 'get') return standard(config)
    assert.equal(config.method, method); assert.equal(config.url, `/admin/trust-score${path}`)
    return response(config, name === 'evaluate' ? { reporterUserId: 1, message: '합성 평가' } : { processedCount: 1, changedCount: 1 })
  }
  await act(async () => action(state)); await settle()
  assert.equal(calls.filter(c => c.method !== 'get').length, 1)
  assert.ok(state.successMessage)
  assert.equal(state.activeAction, null)
  if (name === 'evaluate') assert.equal(state.evaluation.reporterUserId, 1)
})

test('late evaluation cannot refresh or restore the previously selected reporter', async () => {
  await mount(); await fetch()
  let release
  adapter = config => config.method === 'post'
    ? new Promise(resolve => { release = () => resolve(response(config, { reporterUserId: 1, message: '합성 평가' })) }) : standard(config)
  let pending; await act(async () => { pending = state.evaluateReporter(1) })
  await fetch(2)
  const previousCount = calls.filter(c => /reporters\/1$/.test(c.url)).length
  await act(async () => { release(); await pending })
  assert.equal(state.reporter.reporterUserId, 2); assert.equal(state.evaluation, null)
  assert.equal(calls.filter(c => /reporters\/1$/.test(c.url)).length, previousCount)
})

test('actual page shows pagination and preserves a failed page attempt without claiming zero', async () => {
  await mount(h(Page))
  assert.doesNotMatch(document.body.textContent, /전체 0건|변경 이력이 없습니다/)
  await act(async () => change(document.querySelector('input'), '1'))
  await act(async () => button('조회').click()); await settle()
  assert.match(document.body.textContent, /전체 45건 · 1 \/ 3페이지/)
  adapter = config => config.url.endsWith('/history') && config.params.page === 2 ? reject(config, 500) : standard(config)
  const nav = document.querySelector('[aria-label="점수 변경 이력 페이지네이션"]')
  await act(async () => nav.querySelector('[aria-label="다음 페이지로 이동"]').click()); await settle()
  assert.match(document.body.textContent, /1 \/ 3페이지 \(이전 결과\)/)
  assert.doesNotMatch(document.body.textContent, /전체 0건|변경 이력이 없습니다/)
  adapter = standard; await act(async () => button('이력 다시 시도').click()); await settle()
  assert.match(document.body.textContent, /전체 45건 · 2 \/ 3페이지/)
})
