import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { AxiosError } from 'axios'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from './helpers/isolated-vite.mjs'
import { qualityIssue, qualityPage } from './helpers/data-quality-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter, useLocation } = await import('react-router-dom')
const cacheDir = await mkdtemp(join(tmpdir(), 'pingdom-301-unit-'))
const vite = await createServer({ cacheDir, server: { middlewareMode: true, ws: false },
  appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await vite.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await vite.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: client } = await vite.ssrLoadModule('/src/api/customAxios.ts')
const { getAdminDataQualityIssues: getIssues } = await vite.ssrLoadModule('/src/api/adminDataQualityApi.ts')
const { useAdminDataQualityIssues } = await vite.ssrLoadModule('/src/hooks/useAdminDataQualityIssues.ts')
const { default: Page } = await vite.ssrLoadModule('/src/pages/dataQuality/DataQualityPage.tsx')
const { clearStoredAuth } = await vite.ssrLoadModule('/src/utils/authStorage.ts')
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [],
  pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
let root, state, auth, clears, calls, adapter, showPage, location
function Location() { location = useLocation().pathname; return null }
function Probe() { state = useAdminDataQualityIssues(); return null }
const response = (config, data) => ({ config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} })
const standard = config => response(config, qualityPage(config.params.page, config.params.limit))
function fail(config, status = 500) {
  throw new AxiosError('합성 품질 조회 실패', 'ERR_BAD_RESPONSE', config, undefined,
    { config, data: {}, status, statusText: 'Synthetic', headers: {} })
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
beforeEach(() => {
  root = createRoot(document.getElementById('root')); clears = 0; calls = []; adapter = standard; showPage = false
  auth = { user: { id: 99, username: '합성 QA', role: 'ADMIN' }, clearAuth() { clears++ }, logout() {}, isAuthenticated: true, isAuthReady: true }
  client.defaults.adapter = async config => {
    assert.equal(config.method, 'get', 'All mutations are forbidden')
    assert.equal(config.url, '/admin/data-quality/issues')
    assert.deepEqual(Object.keys(config.params).sort(), ['limit', 'page'], 'No invented server filters')
    calls.push(config); return adapter(config)
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await vite.close(); dom.window.close() })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) }
async function mount() {
  await act(async () => root.render(h(AuthContext.Provider, { value: auth },
    h(AdminNotificationContext.Provider, { value: notifications }, h(MemoryRouter, {},
      h(Location), showPage ? h(Page) : h(Probe))))))
  await settle()
}
async function fetch(page) { await act(async () => state.fetchIssues(page)); await settle() }
const button = name => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === name)

test('exact page object, defaults and first/middle/last metadata are preserved without IDs', async () => {
  await mount(); assert.equal(state.total, 45); assert.equal(state.issues.length, 20)
  assert.equal(state.page, 1); assert.equal(state.hasNext, true); assert.equal(state.phase, 'success')
  await fetch(2); assert.equal(state.issues[0].entityId, 21); assert.equal(state.page, 2)
  await fetch(3); assert.equal(state.issues.length, 5); assert.equal(state.hasNext, false)
  assert.ok(calls.every(c => c.params.limit === 20)); assert.ok(!('id' in state.issues[0]))
})
for (const args of [[0, 20], [-1, 20], [NaN, 20], [1, 0], [1, 101], [1, 1.5]]) {
  test(`invalid request ${args} does not call API`, async () => {
    await assert.rejects(getIssues(...args), /페이지와 크기/); assert.equal(calls.length, 0)
  })
}
const malformed = [
  [], null, {}, { ...qualityPage(), items: null }, { ...qualityPage(), page: 0 },
  { ...qualityPage(), limit: 10 }, { ...qualityPage(), total: '45' },
  { ...qualityPage(), totalPages: 9 }, { ...qualityPage(), hasNext: false },
  { ...qualityPage(), items: [] },
  ...[{ entityType: null }, { entityId: 0 }, { ruleCode: '' }, { severity: 'OTHER' },
    { status: 'RESOLVED' }, { details: 5 }, { detectedAt: null }].map(patch => ({
      ...qualityPage(1, 20, 1), items: [qualityIssue(1, patch)],
    })),
]
for (const [index, data] of malformed.entries()) test(`malformed/legacy response ${index} is not normalized into success`, async () => {
  adapter = config => response(config, data)
  await mount(); assert.equal(state.phase, 'error'); assert.equal(state.result, null)
  assert.equal(state.total, null); assert.ok(state.errorMessage)
})

test('nullable details is accepted without an issue ID and LocalDateTime stays unchanged', async () => {
  adapter = config => response(config, { ...qualityPage(1, 20, 1), items: [qualityIssue(1, { details: null })] })
  showPage = true; await mount()
  assert.match(document.body.textContent, /상세 사유가 제공되지 않았습니다/)
  assert.match(document.body.textContent, /2026.10.19 09:30/)
  assert.doesNotMatch(document.body.textContent, /Asia\/Seoul|UTC|KST/)
})
for (const status of [401, 403, 500, 'network']) test(`first ${status} failure leaves counts unknown, not zero`, async () => {
  adapter = config => status === 'network' ? Promise.reject(new Error('Synthetic offline')) : fail(config, status)
  await mount(); assert.equal(state.result, null); assert.equal(state.total, null)
  assert.equal(state.phase, 'error'); assert.equal(state.isLoading, false)
  assert.equal(clears > 0, status === 401)
})
test('actual page distinguishes initial loading, first failure, retry and successful zero', async () => {
  showPage = true; const gate = deferred()
  adapter = config => gate.promise.then(() => fail(config))
  await mount(); assert.match(document.body.textContent, /1페이지 조회 중/)
  assert.doesNotMatch(document.body.textContent, /미해결 이슈가 없습니다|전체 0건/)
  await act(async () => gate.resolve()); await settle()
  assert.match(document.body.textContent, /미해결 건수는 확인되지 않았습니다/)
  assert.doesNotMatch(document.body.textContent, /미해결 이슈가 없습니다|전체 0건/)
  adapter = config => response(config, qualityPage(1, 20, 0))
  await act(async () => button('다시 조회').click()); await settle()
  assert.match(document.body.textContent, /미해결 이슈가 없습니다/)
  assert.match(document.body.textContent, /전체 0건 · 1 \/ 1페이지/)
})
test('failed later page retains verified result and retries the requested page, not page one', async () => {
  await mount()
  adapter = config => config.params.page === 2 ? fail(config) : standard(config)
  await fetch(2)
  assert.equal(state.page, 1); assert.equal(state.total, 45)
  assert.equal(state.requestedPage, 2); assert.equal(state.isPreviousResult, true)
  adapter = standard; await fetch()
  assert.equal(state.page, 2); assert.equal(state.isPreviousResult, false)
})
for (const status of [401, 403]) test(`later ${status} failure hides previous results`, async () => {
  await mount(); adapter = config => fail(config, status); await fetch(2)
  assert.equal(state.result, null); assert.equal(state.issues.length, 0); assert.equal(state.total, null)
})
test('reversed success and late unauthorized failure do not replace new page or clear auth', async () => {
  await mount(); let gate = deferred()
  adapter = config => config.params.page === 2 ? gate.promise.then(() => standard(config)) : standard(config)
  let pending; await act(async () => { pending = state.fetchIssues(2) }); await fetch(3)
  await act(async () => { gate.resolve(); await pending }); assert.equal(state.page, 3)
  gate = deferred()
  adapter = config => config.params.page === 2 ? gate.promise : standard(config)
  await act(async () => { pending = state.fetchIssues(2) }); await fetch(1)
  await act(async () => { try { fail(calls.findLast(c => c.params.page === 2), 401) } catch (e) { gate.reject(e) }; await pending })
  assert.equal(state.page, 1); assert.equal(state.errorMessage, ''); assert.equal(clears, 0)
})
for (const change of ['account', 'role', 'session', 'unmount']) test(`${change} invalidates old reads`, async () => {
  await mount(); const gate = deferred()
  adapter = config => config.params.page === 2 ? gate.promise.then(() => standard(config))
    : response(config, qualityPage(1, 20, 0))
  let pending; await act(async () => { pending = state.fetchIssues(2) })
  if (change === 'unmount') await act(async () => root.render(null))
  else if (change === 'session') { clearStoredAuth(); await mount() }
  else { auth = { ...auth, user: { ...auth.user, ...(change === 'account' ? { id: 100 } : { role: 'USER' }) } }; await mount() }
  await act(async () => { gate.resolve(); await pending })
  if (change !== 'unmount') { assert.equal(state.total, 0); assert.equal(state.page, 1) }
  assert.equal(clears, 0)
})
test('shrinking last page reads the real last page exactly once', async () => {
  await mount(); adapter = config => response(config, qualityPage(config.params.page, 20, 21))
  await fetch(3); assert.equal(state.page, 2); assert.equal(state.total, 21); assert.equal(state.issues.length, 1)
  assert.deepEqual(calls.slice(-2).map(c => c.params.page), [3, 2])
})
test('duplicate composite fields have separate selectable rows and filter is page-local', async () => {
  showPage = true
  adapter = config => response(config, { ...qualityPage(1, 20, 2), items: [
    qualityIssue(1, { severity: 'ERROR', details: '첫째 합성 사유' }),
    qualityIssue(1, { severity: 'WARNING', details: '둘째 합성 사유' }),
  ] })
  await mount()
  const rows = () => [...document.querySelectorAll('button')].filter(node => node.textContent.includes('장소 #'))
  await act(async () => rows()[1].click())
  assert.equal(document.body.textContent.match(/둘째 합성 사유/g).length, 2)
  await act(async () => document.querySelector('[role="combobox"][aria-label="심각도 필터"]').click())
  await act(async () => [...document.querySelectorAll('[role="option"]')].find(n => n.textContent.trim() === '오류').click())
  assert.equal(rows().length, 1); assert.match(document.body.textContent, /목록에서 문제를 선택해주세요/)
  assert.match(document.body.textContent, /전체 2건/); assert.equal(calls.length, 1)
  await act(async () => document.querySelector('[role="combobox"][aria-label="심각도 필터"]').click())
  await act(async () => [...document.querySelectorAll('[role="option"]')].find(n => n.textContent.trim() === '안내').click())
  assert.equal(rows().length, 0); assert.match(document.body.textContent, /현재 페이지에 선택한 심각도의 이슈가 없습니다/)
  assert.match(document.body.textContent, /전체 2건/); assert.equal(calls.length, 1)
  await act(async () => document.querySelector('[role="combobox"][aria-label="심각도 필터"]').click())
  await act(async () => [...document.querySelectorAll('[role="option"]')].find(n => n.textContent.trim() === '오류').click())
  await act(async () => rows()[0].click()); await act(async () => button('대상 관리 열기').click())
  assert.equal(location, '/places')
})
test('refresh result revision clears old selection instead of rebinding it to a changed row', async () => {
  showPage = true; await mount()
  await act(async () => [...document.querySelectorAll('button')].find(n => n.textContent.includes('합성 품질 이슈 1') && n.textContent.includes('장소 #')).click())
  assert.ok(document.querySelector('dt'))
  adapter = config => response(config, qualityPage(1, 20, 1))
  await act(async () => document.querySelector('[aria-label="이슈 목록 새로고침"]').click()); await settle()
  assert.match(document.body.textContent, /목록에서 문제를 선택해주세요/); assert.equal(document.querySelector('dt'), null)
})
