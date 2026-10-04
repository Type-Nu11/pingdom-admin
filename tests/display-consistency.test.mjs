import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { paymentFixture, settlementFixture } from './browser/display-consistency-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { formatMinorAmount, formatLocalDateTime, formatInstantDateTime } = await server.ssrLoadModule('/src/utils/displayFormat.ts')
const { isMissingLatestS3Report } = await server.ssrLoadModule('/src/utils/s3ReportState.ts')
const { useAdminS3Orphans } = await server.ssrLoadModule('/src/hooks/useAdminS3Orphans.ts')
const { useMerchantPayments } = await server.ssrLoadModule('/src/hooks/useMerchantPayments.ts')
const { useAdminPlaces } = await server.ssrLoadModule('/src/hooks/useAdminPlaces.ts')
const { PlaceListPanel } = await server.ssrLoadModule('/src/components/place/PlaceListPanel.tsx')
const { default: PaymentPage } = await server.ssrLoadModule('/src/pages/merchantPayments/MerchantPaymentsPage.tsx')
const { default: S3Page } = await server.ssrLoadModule('/src/pages/s3Orphan/S3OrphanPage.tsx')
const { AdminNotificationProvider } = await server.ssrLoadModule('/src/app/providers/AdminNotificationProvider.tsx')

const statusPath = '/admin/posts/s3/orphans/report/status'
const reportPath = '/admin/posts/s3/orphans/report'
const dryPath = '/admin/s3/orphan-objects'
const absentMessage = '생성된 S3 고아 파일 리포트가 없습니다.'
const status = { reportId: 'synthetic', status: 'COMPLETED', generatedAt: '2026-10-05T12:30:00', completedAt: '2026-10-05T12:31:00', dbKeyCount: 2, s3KeyCount: 3, deleteCandidateCount: 1, errorMessage: null }
const report = { ...status, deleteCandidates: [{ key: 'map/synthetic.png', reason: '합성 후보' }], page: 1, limit: 5, totalCount: 1, totalPages: 1, hasNext: false }
const pageData = { page: 1, limit: 20, totalElements: 0, totalPages: 0, hasNext: false }
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const failure = (code, data = {}) => Object.assign(new Error('Synthetic failure'), { isAxiosError: true, response: { status: code, data, headers: {}, config: {} } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
let root, state, adapter, clears, calls
function Probe({ kind }) {
  const s3 = useAdminS3Orphans
  const payments = useMerchantPayments
  const places = useAdminPlaces
  const useProbe = kind === 's3' ? s3 : kind === 'payments' ? payments : places
  state = useProbe()
  return null
}
async function mount(child = h(Probe, { kind: 's3' })) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { clears++ }, user: { username: 'synthetic' }, logout() {} } }, h(MemoryRouter, {}, child))))
}
async function call(fn) { await act(async () => { await fn() }) }
const base = async config => {
  if (config.url === statusPath) return response(config, status)
  if (config.url === reportPath) return response(config, report)
  if (config.url === dryPath) return response(config, { dbKeyCount: 2, s3ObjectCount: 3, orphanObjectCount: 1, orphanKeys: [], truncated: false })
  if (config.url === '/admin/places') return response(config, { places: [], ...pageData, totalCount: 0 })
  if (config.url === '/merchant-owner/payments') return response(config, { payments: [], ...pageData })
  if (config.url === '/merchant-owner/payments/settlements') return response(config, { entries: [], ...pageData })
  if (config.url?.includes('notifications')) return response(config, { notifications: [], unreadCount: 0, totalCount: 0 })
  throw new Error(`Unexpected fixture request: ${config.method} ${config.url}`)
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); clears = 0; calls = []; state = null; adapter = base
  client.defaults.adapter = config => { calls.push(config); return adapter(config) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

for (const [fixture, listKey, otherKey] of [[paymentFixture, 'payments', 'entries'], [settlementFixture, 'entries', 'payments']]) {
  for (const scenario of ['complete', 'empty']) test(`${listKey} browser fixture ${scenario} has endpoint-specific rows and matching pagination`, () => {
    const data = fixture(scenario)
    const count = scenario === 'empty' ? 0 : 1
    assert.equal(data[listKey].length, count)
    assert.equal(otherKey in data, false)
    assert.deepEqual({ page: data.page, limit: data.limit, totalElements: data.totalElements, totalPages: data.totalPages, hasNext: data.hasNext }, { page: 1, limit: 20, totalElements: count, totalPages: count, hasNext: false })
  })
}
for (const scenario of ['complete', 'empty']) test(`browser fixture ${scenario} renders matching payment and settlement counts after tab switch and refresh`, async () => {
  adapter = config => {
    assert.equal(config.method, 'get', 'QA must not mutate real payment state')
    if (config.url === '/merchant-owner/payments') return Promise.resolve(response(config, paymentFixture(scenario)))
    if (config.url === '/merchant-owner/payments/settlements') return Promise.resolve(response(config, settlementFixture(scenario)))
    return base(config)
  }
  await mount(h(PaymentPage))
  const assertRows = (kind) => {
    assert.match(document.body.textContent, scenario === 'empty' ? /총 0건/ : /총 1건/)
    assert.equal(document.querySelectorAll('article').length, scenario === 'empty' ? 0 : 1)
    const emptyMessage = `조회할 ${kind === 'payments' ? '결제' : '정산'} 내역이 없습니다.`
    assert.equal(document.body.textContent.includes(emptyMessage), scenario === 'empty')
  }
  assertRows('payments')
  await call(async () => [...document.querySelectorAll('[role="tab"]')].find(x => x.textContent === '정산 원장').click())
  assertRows('settlements')
  if (scenario === 'complete') {
    for (const text of ['결제 정산 #1', '정산 완료', '총액 2,050 USD (최소 단위)', '수수료 50 USD (최소 단위)', '정산액 2,000 USD (최소 단위)', '생성 2026.10.05 12:30 · 정산 2026.10.05 12:31']) assert.ok(document.body.textContent.includes(text), text)
  }
  const ledgerCalls = calls.filter(c => c.url === '/merchant-owner/payments/settlements').length
  await call(async () => [...document.querySelectorAll('button')].find(x => x.textContent === '새로고침').click())
  assert.equal(calls.filter(c => c.url === '/merchant-owner/payments/settlements').length, ledgerCalls + 1)
  assertRows('settlements')
})

test('minor units require explicit precision; signed ledger values and null are distinct', () => {
  for (const [amount, currency, digits, expected] of [[2050, 'KRW', 0, '2,050 KRW'], [2050, 'USD', 2, '20.50 USD'], [2050, 'KWD', 3, '2.050 KWD'], [-5, 'USD', 2, '-0.05 USD'], [0, 'USD', 2, '0.00 USD']]) assert.equal(formatMinorAmount(amount, currency, digits), expected)
  assert.equal(formatMinorAmount(2050, 'USD'), '2,050 USD (최소 단위)')
  assert.equal(formatMinorAmount(Number.MAX_SAFE_INTEGER, 'USD', 2), '90,071,992,547,409.91 USD')
  for (const args of [[null, 'KRW'], [NaN, 'USD'], [Infinity, 'USD'], [Number.MAX_SAFE_INTEGER + 1, 'USD'], [10, null], [10, 'krw'], [10, 'USD', -1]]) assert.equal(formatMinorAmount(...args), '금액 정보 없음')
})
test('local timestamps preserve server wall-clock fields across browser timezones', () => {
  const old = process.env.TZ
  try {
    for (const tz of ['Asia/Seoul', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = tz
      assert.equal(formatLocalDateTime('2026-10-05T00:05:10.123456789'), '2026.10.05 00:05')
      assert.equal(formatLocalDateTime('2024-02-29T10:20'), '2024.02.29 10:20')
    }
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old }
  for (const value of [null, 'bad', '2026-02-29T10:20', '2026-02-30T10:20', '2026-10-05T24:00', '2026-10-05T00:00Z']) assert.equal(formatLocalDateTime(value), '시각 정보 없음')
})
test('instants use explicit offset and timezone; ambiguous or invalid dates are rejected', () => {
  assert.match(formatInstantDateTime('2026-09-30T15:00:00Z', 'Asia/Seoul'), /2026.*10.*01.*00:00.*Asia\/Seoul/)
  assert.equal(formatInstantDateTime('2026-10-01T00:00:00+09:00', 'Asia/Seoul'), formatInstantDateTime('2026-09-30T15:00:00Z', 'Asia/Seoul'))
  for (const value of [null, 'bad', '2026-02-30T00:00:00Z', '2026-10-01T00:00:00']) assert.equal(formatInstantDateTime(value, 'Asia/Seoul'), '시각 정보 없음')
  assert.equal(formatInstantDateTime('2026-10-01T00:00:00Z', 'invalid'), '시각 정보 없음')
})
test('only the latest endpoint known absence is accepted, never generic/auth 404', () => {
  assert.equal(isMissingLatestS3Report(failure(404, { message: absentMessage })), true)
  assert.equal(isMissingLatestS3Report(failure(404, { detail: absentMessage })), true)
  for (const error of [failure(404), failure(404, { message: 'No resource' }), failure(401, { message: absentMessage }), failure(500, { message: absentMessage }), { ...failure(404, { message: absentMessage }), isRefreshFailure: true }]) assert.equal(isMissingLatestS3Report(error), false)
  assert.equal(isMissingLatestS3Report(failure(404, { message: absentMessage }), 'explicit-id'), false)
})
for (const missing of ['known-404', 'not-found-status']) test(`S3 ${missing} is empty without generation/deletion`, async () => {
  adapter = config => config.url === statusPath ? missing === 'known-404' ? Promise.reject(failure(404, { message: absentMessage })) : Promise.resolve(response(config, { ...status, status: 'NOT_FOUND' })) : base(config)
  await mount(); assert.equal(state.statusState, 'empty'); assert.equal(state.report, null); assert.equal(state.errorMessage, '')
  assert.ok(calls.every(config => config.method === 'get'))
})
for (const code of [404, 401, 403, 500]) test(`S3 unrelated HTTP ${code} remains an error`, async () => {
  adapter = config => config.url === statusPath ? Promise.reject(failure(code)) : base(config)
  await mount(); assert.equal(state.statusState, 'error'); assert.ok(state.errorMessage); assert.equal(clears > 0, code === 401)
})
test('explicit missing report ID stays an error', async () => {
  await mount(); adapter = config => config.url === statusPath ? Promise.resolve(response(config, { ...status, status: 'NOT_FOUND' })) : base(config)
  await call(() => state.fetchStatus('wrong-id'))
  assert.equal(state.statusState, 'error'); assert.ok(state.errorMessage); assert.equal(state.report, null)
})
test('S3 independent errors, stale requests and retained results are not overwritten', async () => {
  adapter = config => config.url === dryPath ? Promise.reject(new Error('dry failed')) : base(config)
  await mount(); assert.equal(state.dryRunState, 'error'); assert.equal(state.statusState, 'ready'); assert.match(state.errorMessage, /파일 비교/)
  const gate = deferred(); adapter = async config => { if (config.url === statusPath) { await gate.promise; throw failure(500) }; return base(config) }
  let pending; await act(async () => { pending = state.fetchStatus() })
  assert.equal(state.statusState, 'loading'); assert.equal(state.report.reportId, 'synthetic')
  adapter = base; await call(() => state.fetchStatus()); await act(async () => { gate.resolve(); await pending })
  assert.equal(state.statusState, 'ready'); assert.match(state.errorMessage, /파일 비교/)
  adapter = config => config.url === reportPath ? Promise.reject(failure(500)) : base(config)
  await call(() => state.fetchReport('synthetic', 2)); assert.equal(state.reportState, 'error'); assert.equal(state.report.page, 1)
  await call(() => state.remove(['map/synthetic.png'])); assert.ok(calls.every(config => config.method === 'get'))
})
test('S3 loading and empty page copy never says zero before a completed report', async () => {
  const gate = deferred(); adapter = async config => { if (config.url === statusPath) { await gate.promise; throw failure(404, { message: absentMessage }) }; return base(config) }
  await mount(h(AdminNotificationProvider, {}, h(S3Page)))
  assert.match(document.body.textContent, /리포트 상태를 조회하는 중/)
  assert.ok(!document.body.textContent.includes('0개 후보'))
  await act(async () => { gate.resolve(); await new Promise(r => setTimeout(r, 0)) })
  assert.match(document.body.textContent, /미생성 또는 보관 기간/)
  assert.equal(document.querySelectorAll('[role="alert"]').length, 0)
  assert.ok(calls.every(config => config.method === 'get'))
})
for (const lifecycle of ['RUNNING', 'FAILED']) test(`S3 ${lifecycle} keeps incomplete counts unknown and candidates unavailable`, async () => {
  adapter = config => config.url === statusPath ? Promise.resolve(response(config, { ...status, status: lifecycle, deleteCandidateCount: 0 })) : base(config)
  await mount(h(AdminNotificationProvider, {}, h(S3Page)))
  assert.match(document.body.textContent, /후보 수 미확인/)
  assert.ok(!document.body.textContent.includes('0개 후보'))
  assert.equal(document.querySelectorAll('input[type="checkbox"]').length, 0)
  assert.ok(calls.every(config => config.method === 'get'))
})
test('status retry cannot clear a file comparison failure', async () => {
  adapter = config => [dryPath, statusPath].includes(config.url) ? Promise.reject(failure(500)) : base(config)
  await mount(); assert.equal(state.dryRunState, 'error'); assert.equal(state.statusState, 'error')
  adapter = base; await call(() => state.fetchStatus()); assert.equal(state.statusState, 'ready'); assert.equal(state.dryRunState, 'error'); assert.ok(state.errorMessage)
})
for (const lifecycle of ['FAILED', 'NOT_FOUND']) test(`manual generation ${lifecycle} is never announced as successful`, async () => {
  await mount()
  adapter = config => config.method === 'post' ? Promise.resolve(response(config, { ...status, status: lifecycle })) : base(config)
  await call(() => state.refresh())
  assert.equal(state.successMessage, '')
  assert.equal(state.statusState, lifecycle === 'NOT_FOUND' ? 'empty' : 'ready')
  assert.equal(state.report, null)
  assert.equal(state.activeAction, null)
})
test('unmount invalidates outstanding status responses before auth/state changes', async () => {
  await mount(); const gate = deferred()
  adapter = async () => { await gate.promise; throw failure(401) }
  let pending; await act(async () => { pending = state.fetchStatus() })
  await act(async () => root.render(null))
  await act(async () => { gate.resolve(); await pending })
  assert.equal(clears, 0)
})
for (const kind of ['payments', 'settlements']) test(`first ${kind} failure is not a successful empty result; retry and stale zero remain distinct`, async () => {
  const path = kind === 'payments' ? '/merchant-owner/payments' : '/merchant-owner/payments/settlements'
  adapter = config => config.url === path ? Promise.reject(failure(500)) : base(config)
  await mount(h(Probe, { kind: 'payments' }))
  const loaded = kind === 'payments' ? 'hasLoadedPayments' : 'hasLoadedSettlements'
  const fetch = () => kind === 'payments' ? state.fetchPayments() : state.fetchSettlements()
  assert.equal(state[loaded], false)
  adapter = base; await call(fetch); assert.equal(state[loaded], true)
  adapter = config => config.url === path ? Promise.reject(failure(500)) : base(config)
  await call(fetch); assert.equal(state[loaded], true)
})
test('payment page excludes zero count on first failure, labels retained empty results', async () => {
  adapter = config => config.url === '/merchant-owner/payments' ? Promise.reject(failure(500)) : base(config)
  await mount(h(PaymentPage)); assert.match(document.body.textContent, /결제 목록을 불러오지 못했습니다/); assert.ok(!document.body.textContent.includes('총 0건'))
  adapter = base; await call(async () => [...document.querySelectorAll('button')].find(x => x.textContent === '새로고침').click())
  assert.match(document.body.textContent, /총 0건/)
  adapter = config => config.url === '/merchant-owner/payments' ? Promise.reject(failure(500)) : base(config)
  await call(async () => [...document.querySelectorAll('button')].find(x => x.textContent === '새로고침').click())
  assert.match(document.body.textContent, /총 0건 \(이전 결과\)/)
})
test('place hook tracks only successful responses as results, including real zero', async () => {
  adapter = () => Promise.reject(failure(500)); await mount(h(Probe, { kind: 'places' })); assert.equal(state.hasListResult, false)
  adapter = base; await call(() => state.fetchAdminPlaces()); assert.equal(state.hasListResult, true); assert.equal(state.totalCount, 0)
  adapter = () => Promise.reject(failure(500)); await call(() => state.fetchAdminPlaces()); assert.equal(state.hasListResult, true); assert.equal(state.isError, true)
})
test('place count separates loading, failed first query and genuine zero', async () => {
  const props = { listRef: { current: null }, collapsed: false, places: [], selectedPlaceId: null, searchQuery: '', sortParam: 'LATEST', category: '', page: 1, totalCount: 0, totalPages: 1, hasNext: false, isLoading: true, isError: false, hasListResult: false, errorMessage: '', pageRangeLabel: '조회 중', visiblePageNumbers: [1], hasActiveFilter: false }
  for (const key of ['onCollapse', 'onSearchChange', 'onClearSearch', 'onSortChange', 'onCategoryChange', 'onRefresh', 'onClearFilters', 'onSelectPlace', 'onPageChange']) props[key] = () => {}
  await mount(h(PlaceListPanel, props)); assert.ok(!document.body.textContent.includes('0개')); assert.match(document.body.textContent, /조회 중/)
  await mount(h(PlaceListPanel, { ...props, isLoading: false, isError: true, errorMessage: '합성 조회 실패', pageRangeLabel: '조회 결과 없음' })); assert.ok(!document.body.textContent.includes('0개'))
  await mount(h(PlaceListPanel, { ...props, isLoading: false, hasListResult: true, pageRangeLabel: '0개' })); assert.match(document.body.textContent, /0개/)
  await mount(h(PlaceListPanel, { ...props, isLoading: false, hasListResult: true, isError: true, errorMessage: '합성 조회 실패', pageRangeLabel: '0개' })); assert.match(document.body.textContent, /이전 결과/)
})
