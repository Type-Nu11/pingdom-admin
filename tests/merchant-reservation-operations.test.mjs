import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { UnsavedChangesContext } = await server.ssrLoadModule('/src/components/common/UnsavedChangesContext.ts')
const { useMerchantReservationOperations } = await server.ssrLoadModule('/src/hooks/useMerchantReservationOperations.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantReservationOperations/MerchantReservationOperationsPage.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const api = await server.ssrLoadModule('/src/api/merchantStoreApi.ts')
const { clearStoredAuth } = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { reservationFilterQuery } = await server.ssrLoadModule('/src/utils/merchantReservationQuery.ts')
const { reservationReviewReason } = await server.ssrLoadModule('/src/utils/reservationReview.ts')
const row = (id = 1, status = 'PENDING') => ({ id, touristUserId: 10, availabilityId: 20, quantity: 2, status,
  reservationStartsAt: '2030-10-01T05:00:00', reservationEndsAt: '2030-10-01T06:00:00',
  createdAt: '2030-09-01T09:00:00', confirmedAt: null, reviewedBy: null, reviewedAt: null, reviewReason: null,
  rejectedAt: null, canceledAt: null, canceledBy: null, updatedAt: '2030-09-01T09:00:00', confirmation: null,
  bookerName: '테스트 예약자', bookerPhone: '010-1234-5678', requestNote: '조용한 자리 부탁드립니다.' })
const detail = id => ({ reservation: row(id), placeId: 7, placeName: '테스트 매장', statusHistory: [
  { id: 1, status: 'PENDING', changedBy: 10, reason: null, changedAt: '2030-09-01T09:00:00' },
  { id: 2, status: 'CONFIRMED', changedBy: 3, reason: '과거 처리 기록', changedAt: '2030-09-02T10:00:00' },
] })
const page = (rows, config, total = rows.length) => ({ reservations: rows, page: config.params?.page ?? 1, limit: 20, totalElements: total, totalPages: Math.ceil(total / 20), hasNext: false })
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const fail = (config, status) => Promise.reject(Object.assign(new Error('Synthetic query failure'), { isAxiosError: true, config, response: { config, status, data: { code: status === 403 ? 'RESERVATION_FORBIDDEN' : '' }, headers: {} } }))
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
let root, hook, calls, adapter, clears, identity, rows
function Probe() { hook = useMerchantReservationOperations(); return null }
async function base(config) {
  if (config.url === '/merchant-owner/me') return response(config, { placeIds: [7, 8] })
  if (config.url === '/merchant-owner/availabilities') return response(config, [{ id: 20, placeId: 7, startsAt: '2000-01-01T00:00:00', endsAt: '2000-01-02T00:00:00' }])
  if (config.url === '/merchant-owner/reservations') return response(config, page(rows, config))
  if (/\/reservations\/\d+$/.test(config.url)) return response(config, detail(Number(config.url.split('/').at(-1))))
  throw new Error('Unexpected endpoint: ' + config.url)
}
async function render(child = h(Probe), place = null, strict = false) {
  const content = h(AuthContext.Provider, { value: { user: identity, clearAuth() { clears++ }, logout() {} } },
    h(MerchantPlaceContext.Provider, { value: place }, h(MemoryRouter, {}, child)))
  await act(async () => root.render(strict ? h(StrictMode, {}, content) : content))
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); calls = []; clears = 0; rows = [row(1), row(2)]; identity = { id: 1, role: 'MERCHANT_OWNER' }; adapter = base
  client.defaults.adapter = config => { calls.push(config); return adapter(config) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

async function reviewBase(config) {
  if (config.method === 'post') {
    const id = Number(config.url.split('/').at(-2))
    const status = config.url.endsWith('/confirm') ? 'CONFIRMED' : 'REJECTED'
    rows = rows.map(item => item.id === id ? { ...item, status, reviewReason: config.data ? JSON.parse(config.data).reason : null } : item)
    return response(config, rows.find(item => item.id === id))
  }
  if (/\/reservations\/\d+$/.test(config.url)) {
    const id = Number(config.url.split('/').at(-1))
    return response(config, { ...detail(id), reservation: rows.find(item => item.id === id) ?? row(id),
      statusHistory: [{ id: 1, status: rows.find(item => item.id === id)?.status ?? 'PENDING', changedBy: 1, reason: null, changedAt: row().createdAt }] })
  }
  if (config.url.endsWith('/reservations')) return response(config, page(rows.filter(item => !config.params.status || item.status === config.params.status), config))
  return base(config)
}

test('review reason validates trimmed required/optional/500 character boundaries', () => {
  assert.equal(reservationReviewReason('confirm', '  '), undefined)
  assert.throws(() => reservationReviewReason('reject', '  '), /입력/)
  assert.equal(reservationReviewReason('reject', '  사유  '), '사유')
  assert.equal(reservationReviewReason('confirm', '가'.repeat(500)).length, 500)
  for (const action of ['confirm', 'reject']) assert.throws(() => reservationReviewReason(action, '가'.repeat(501)), /500/)
})
for (const [action, input, body] of [['confirm', '', undefined], ['confirm', '  안내 사유  ', { reason: '안내 사유' }], ['reject', '  영업 일정  ', { reason: '영업 일정' }]]) {
  test(`${action} sends exact optional/required body: ${input}`, async () => {
    adapter = reviewBase
    await api.reviewMerchantReservation(1, action, input)
    const config = calls.at(-1)
    assert.equal(config.url, `/merchant-owner/reservations/1/${action}`)
    assert.equal(config.method, 'post')
    assert.deepEqual(config.data ? JSON.parse(config.data) : undefined, body)
  })
}
test('review requires a freshly read pending detail, not just a list item', async () => {
  adapter = reviewBase; await render()
  await act(async () => assert.equal(await hook.reviewReservation(1, 'confirm', ''), null))
  assert.equal(calls.some(config => config.method === 'post'), false)
  await act(async () => hook.fetchDetail(1))
  await act(async () => assert.ok(await hook.reviewReservation(1, 'confirm', '')))
  assert.equal(hook.reservations[0].status, 'CONFIRMED')
  assert.equal(hook.detail.reservation.status, 'CONFIRMED')
  assert.equal(hook.detail.statusHistory[0].status, 'CONFIRMED')
})
test('review removes processed pending row and clears inaccessible detail under pending filter', async () => {
  adapter = reviewBase; await render()
  await act(async () => hook.fetchReservations({ status: 'PENDING' }))
  await act(async () => hook.fetchDetail(1))
  await act(async () => hook.reviewReservation(1, 'reject', '영업 일정'))
  assert.equal(hook.query.status, 'PENDING')
  assert.deepEqual(hook.reservations.map(item => item.id), [2])
  assert.equal(hook.selectedReservationId, null)
})
test('concurrent reviews send only one write', async () => {
  adapter = reviewBase; await render(); await act(async () => hook.fetchDetail(1))
  const gate = defer()
  adapter = async config => { if (config.method === 'post') await gate.promise; return reviewBase(config) }
  let pending
  await act(async () => { pending = hook.reviewReservation(1, 'confirm', '') })
  await act(async () => assert.equal(await hook.reviewReservation(1, 'reject', '사유'), null))
  assert.equal(hook.activeAction, 'confirm')
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
  await act(async () => { gate.resolve(); await pending })
  assert.equal(hook.activeAction, null)
})
for (const status of [401, 403, 404, 409, 500]) test(`review HTTP ${status} stays failure and revalidates instead of retrying write`, async () => {
  adapter = reviewBase; await render(); await act(async () => hook.fetchDetail(1))
  adapter = config => config.method === 'post' ? fail(config, status) : reviewBase(config)
  await act(async () => assert.equal(await hook.reviewReservation(1, 'confirm', ''), null))
  assert.equal(hook.successMessage, '')
  assert.ok(hook.actionErrorMessage)
  assert.equal(hook.activeAction, null)
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
  assert.equal(clears > 0, status === 401)
})
test('a timed out review can have succeeded: requery authoritative status and never retry automatically', async () => {
  adapter = reviewBase; await render(); await act(async () => hook.fetchDetail(1))
  adapter = async config => {
    if (config.method === 'post') { await reviewBase(config); throw Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED', config }) }
    return reviewBase(config)
  }
  await act(async () => assert.equal(await hook.reviewReservation(1, 'confirm', ''), null))
  assert.equal(hook.successMessage, '')
  assert.ok(hook.actionErrorMessage)
  assert.equal(hook.detail.reservation.status, 'CONFIRMED')
  await act(async () => assert.equal(await hook.reviewReservation(1, 'confirm', ''), null))
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
})
test('successful review remains successful when follow-up list read fails', async () => {
  adapter = reviewBase; await render(); await act(async () => hook.fetchDetail(1))
  let written = false
  adapter = async config => {
    if (config.method === 'post') { written = true; return reviewBase(config) }
    if (written && config.url.endsWith('/reservations')) return fail(config, 500)
    return reviewBase(config)
  }
  await act(async () => assert.ok(await hook.reviewReservation(1, 'confirm', '')))
  assert.ok(hook.successMessage)
  assert.ok(hook.sectionErrorMessage)
  assert.equal(hook.actionErrorMessage, '')
  assert.equal(hook.detail, null)
})
test('old-session review cannot publish success or trigger follow-up reads', async () => {
  adapter = reviewBase; await render(); await act(async () => hook.fetchDetail(1))
  const gate = defer()
  adapter = async config => { if (config.method === 'post') await gate.promise; return reviewBase(config) }
  let pending
  await act(async () => { pending = hook.reviewReservation(1, 'confirm', '') })
  const before = calls.length
  await act(async () => { clearStoredAuth(); gate.resolve(); assert.equal(await pending, null) })
  assert.equal(hook.successMessage, '')
  assert.equal(calls.length, before)
})
test('review pending state registers navigation protection and releases it after completion', async () => {
  adapter = reviewBase
  const protections = new Map()
  const value = { update(id, protection) { if (protection) protections.set(id, protection); else protections.delete(id) }, request(action) { action() } }
  await render(h(UnsavedChangesContext.Provider, { value }, h(Page)))
  await act(async () => document.querySelector('[aria-label="예약 #1 상세 보기"]').click())
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '예약 승인').click())
  const gate = defer()
  adapter = async config => { if (config.method === 'post') await gate.promise; return reviewBase(config) }
  await act(async () => document.querySelector('[role="dialog"] button[type="submit"]').click())
  assert.equal([...protections.values()].some(protection => protection.busy), true)
  await act(async () => { gate.resolve(); await new Promise(resolve => setTimeout(resolve, 0)) })
  assert.equal([...protections.values()].some(protection => protection.busy), false)
})

test('filter periods convert Korean wall time to UTC independent of device timezone', () => {
  const previous = process.env.TZ
  try {
    for (const zone of ['UTC', 'Asia/Seoul', 'America/New_York']) {
      process.env.TZ = zone
      assert.deepEqual(reservationFilterQuery({ status: 'PENDING', placeId: '7', from: '2030-10-01T14:00', to: '2030-10-01T15:00' }), {
        status: 'PENDING', placeId: 7, reservationFrom: '2030-10-01T05:00:00', reservationTo: '2030-10-01T06:00:00', page: 1, limit: 20,
      })
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
  for (const filters of [{ from: 'invalid' }, { placeId: '-1' }, { status: 'INVALID' }, { from: '2030-10-01T15:00', to: '2030-10-01T15:00' }]) {
    assert.equal(typeof reservationFilterQuery({ status: '', placeId: '', from: '', to: '', ...filters }), 'string')
  }
})
test('list forwards filters; detail fetch is explicit and unwraps the new DTO', async () => {
  await render()
  assert.equal(calls.some(c => /\/reservations\/\d+$/.test(c.url)), false)
  await act(async () => hook.fetchReservations({ status: 'PENDING', placeId: 7, reservationFrom: '2030-10-01T05:00:00', page: 1 }))
  assert.deepEqual(calls.at(-1).params, { status: 'PENDING', placeId: 7, reservationFrom: '2030-10-01T05:00:00', page: 1, limit: 20 })
  await act(async () => hook.fetchDetail(1))
  assert.equal(hook.detail.placeName, '테스트 매장'); assert.equal(hook.detail.statusHistory.length, 2)
  assert.equal(hook.detail.reservation.confirmation, null)
})
test('older list success/failure cannot replace the latest filter result or clear auth', async () => {
  await render(); const gate = defer()
  adapter = async config => { if (config.url.endsWith('/reservations') && config.params.status === 'PENDING') { await gate.promise; return fail(config, 401) } return base(config) }
  let old
  await act(async () => { old = hook.fetchReservations({ status: 'PENDING' }) })
  await act(async () => hook.fetchReservations({ status: 'CONFIRMED' }))
  await act(async () => { gate.resolve(); await old })
  assert.equal(hook.query.status, 'CONFIRMED'); assert.equal(hook.sectionErrorMessage, ''); assert.equal(clears, 0)
})
test('older detail cannot overwrite a later selection, including a delayed 401', async () => {
  await render(); const gate = defer()
  adapter = async config => { if (config.url.endsWith('/reservations/1')) { await gate.promise; return fail(config, 401) } return base(config) }
  let old
  await act(async () => { old = hook.fetchDetail(1) })
  await act(async () => hook.fetchDetail(2))
  await act(async () => { gate.resolve(); await old })
  assert.equal(hook.detail.reservation.id, 2); assert.equal(hook.detailErrorMessage, ''); assert.equal(clears, 0)
})
test('filter/page changes clear selected detail and ignore an outstanding detail response', async () => {
  await render(); const gate = defer()
  adapter = async config => { if (config.url.endsWith('/reservations/1')) await gate.promise; return base(config) }
  let old; await act(async () => { old = hook.fetchDetail(1) })
  await act(async () => hook.fetchReservations({ status: 'CONFIRMED' }))
  await act(async () => { gate.resolve(); await old })
  assert.equal(hook.detail, null); assert.equal(hook.selectedReservationId, null)
})
test('refresh preserves a present selection and refreshes its detail', async () => {
  await render(); await act(async () => hook.fetchDetail(1))
  await act(async () => hook.fetchReservations())
  assert.equal(hook.detail.reservation.id, 1)
  rows = [row(2)]; await act(async () => hook.fetchReservations())
  assert.equal(hook.detail, null); assert.equal(hook.selectedReservationId, null)
})
test('a late cancellation cannot modify another filter result or leave actions locked', async () => {
  rows = [row(1, 'CONFIRMED')]; await render()
  const gate = defer()
  adapter = async config => {
    if (config.url.endsWith('/1/cancel')) { await gate.promise; return response(config, row(1, 'CANCELED')) }
    return base(config)
  }
  let pending
  await act(async () => { pending = hook.cancelReservation(rows[0]) })
  rows = [row(2, 'PENDING')]
  await act(async () => hook.fetchReservations({ status: 'PENDING' }))
  await act(async () => { gate.resolve(); assert.equal(await pending, null) })
  assert.deepEqual(hook.reservations.map(item => item.id), [2])
  assert.equal(hook.activeAction, null); assert.equal(hook.successMessage, '')
})
test('a late cancellation authentication error cannot clear a different account', async () => {
  rows = [row(1, 'CONFIRMED')]; await render()
  const gate = defer()
  adapter = async config => {
    if (config.url.endsWith('/1/cancel')) { await gate.promise; return fail(config, 401) }
    return base(config)
  }
  let pending
  await act(async () => { pending = hook.cancelReservation(rows[0]) })
  identity = { id: 2, role: 'MERCHANT_OWNER' }; rows = [row(2)]; await render()
  await act(async () => { gate.resolve(); await pending })
  assert.deepEqual(hook.reservations.map(item => item.id), [2])
  assert.equal(clears, 0); assert.equal(hook.actionErrorMessage, '')
})
test('successful cancellation refreshes a status-filtered list instead of retaining an excluded row', async () => {
  rows = [row(1, 'CONFIRMED')]; await render()
  await act(async () => hook.fetchReservations({ status: 'CONFIRMED' }))
  adapter = async config => {
    if (config.url.endsWith('/1/cancel')) { rows = []; return response(config, row(1, 'CANCELED')) }
    return base(config)
  }
  await act(async () => hook.cancelReservation(hook.reservations[0]))
  assert.equal(hook.reservations.length, 0); assert.equal(hook.pageInfo.totalElements, 0)
  assert.equal(hook.query.status, 'CONFIRMED'); assert.equal(hook.activeAction, null)
})
for (const status of [401, 403, 404, 500]) test('detail HTTP ' + status + ' separates permissions/auth from temporary failure', async () => {
  await render(); await act(async () => hook.fetchDetail(1))
  adapter = config => config.url.endsWith('/reservations/1') ? fail(config, status) : base(config)
  await act(async () => hook.fetchDetail(1))
  assert.equal(hook.detail, null); assert.ok(hook.detailErrorMessage)
  assert.equal(hook.reservations.some(x => x.id === 1), status === 500)
  assert.equal(clears > 0, status === 401)
})
for (const status of [401, 403, 500]) test('list HTTP ' + status + ' retains only safe previous results', async () => {
  await render(); adapter = config => config.url.endsWith('/reservations') ? fail(config, status) : base(config)
  await act(async () => hook.fetchReservations())
  assert.equal(hook.hasListResult, status === 500)
  assert.equal(hook.reservations.length, status === 500 ? 2 : 0)
  assert.ok(hook.sectionErrorMessage); assert.equal(clears > 0, status === 401)
})
test('empty result and a failed first query are distinct', async () => {
  rows = []; await render(); assert.equal(hook.hasListResult, true); assert.equal(hook.status, 'ready')
  adapter = config => config.url.endsWith('/reservations') ? fail(config, 500) : base(config)
  await act(async () => hook.fetchReservations(1, true))
  assert.equal(hook.hasListResult, false); assert.equal(hook.status, 'error')
})
test('reference failure does not hide a usable reservation list', async () => {
  adapter = config => config.url.endsWith('/availabilities') || config.url.endsWith('/me') ? fail(config, 500) : base(config)
  await render(); assert.equal(hook.status, 'ready'); assert.equal(hook.reservations.length, 2); assert.ok(hook.referenceErrorMessage)
})
test('an out-of-range page falls back to the latest last page', async () => {
  await render(); await act(async () => hook.fetchReservations(5))
  assert.equal(hook.pageInfo.page, 1); assert.equal(calls.at(-1).params.page, 1)
})
test('account/role changes invalidate old private responses and callbacks', async () => {
  await render(); const oldFetch = hook.fetchDetail; const gate = defer()
  adapter = async config => { if (config.url.endsWith('/reservations/1')) { await gate.promise; return fail(config, 401) } return base(config) }
  let old; await act(async () => { old = hook.fetchDetail(1) })
  identity = { id: 2, role: 'MERCHANT_OWNER' }; await render()
  await act(async () => hook.fetchDetail(2))
  await act(async () => { gate.resolve(); await old; assert.equal(await oldFetch(1), null) })
  assert.equal(hook.detail.reservation.id, 2); assert.equal(clears, 0)
})
test('same-user session change/unmount invalidates in-flight private reads', async () => {
  await render(); const gate = defer(); adapter = async config => { await gate.promise; return base(config) }
  let old; await act(async () => { old = hook.fetchDetail(1) })
  await act(async () => { clearStoredAuth(); gate.resolve(); await old })
  assert.equal(hook.detail, null)
  await act(async () => { old = hook.fetchReservations() })
  await act(async () => root.render(null))
  await act(async () => { gate.resolve(); await old })
})
test('detail place/status/start-period mismatches do not display the wrong result', async () => {
  await render(); await act(async () => hook.fetchReservations({ placeId: 8 }))
  await act(async () => hook.fetchDetail(1))
  assert.equal(hook.detail, null); assert.match(hook.detailErrorMessage, /목록을 새로고침/)
  await act(async () => hook.fetchReservations({ reservationTo: '2030-10-01T05:00:00' }))
  await act(async () => hook.fetchDetail(1))
  assert.equal(hook.detail, null)
})
test('malformed lists/details and wrong detail ID fail closed', async () => {
  for (const value of ['<html>challenge</html>', {}, { reservations: [], page: 1 }]) {
    adapter = config => Promise.resolve(response(config, value))
    await assert.rejects(() => api.getMerchantReservations(), /응답/)
  }
  for (const value of [row(), { ...detail(1), statusHistory: null }, detail(2),
    ...['bookerName', 'bookerPhone', 'requestNote', 'reviewReason'].map(field => ({ ...detail(1), reservation: { ...row(1), [field]: 123 } }))]) {
    adapter = config => Promise.resolve(response(config, value))
    await assert.rejects(() => api.getMerchantReservation(1), /응답/)
  }
})
test('strict-mode effects settle and do not trigger a query loop', async () => {
  await render(h(Probe), null, true)
  assert.equal(hook.status, 'ready'); assert.ok(calls.length <= 6)
})
test('UI preserves applied filters until submit and resets page, detail and date drafts explicitly', async () => {
  await render(h(Page))
  const select = document.querySelector('[aria-label="예약 상태"]')
  const choose = async value => {
    await act(async () => select.click())
    await act(async () => [...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === value).click())
  }
  const initial = calls.filter(c => c.url.endsWith('/reservations')).length
  await choose('승인 대기')
  assert.equal(calls.filter(c => c.url.endsWith('/reservations')).length, initial)
  assert.match(document.body.textContent, /아직 적용되지 않았습니다/)
  await act(async () => [...document.querySelectorAll('button')].find(el => el.textContent === '조회').click())
  assert.equal(calls.filter(c => c.url.endsWith('/reservations')).at(-1).params.status, 'PENDING')
  await act(async () => document.querySelector('[aria-label="예약 #1 상세 보기"]').click())
  assert.match(document.querySelector('[aria-label="예약 상세와 처리 이력"]').textContent, /테스트 예약자.*010-1234-5678.*과거 처리 기록/)
  assert.doesNotMatch(document.querySelector('[aria-label="예약 상세와 처리 이력"]').textContent, /관리자 #3|상점주 #3/)
  await act(async () => [...document.querySelectorAll('button')].find(el => el.textContent === '초기화').click())
  assert.equal(calls.filter(c => c.url.endsWith('/reservations')).at(-1).params.status, undefined)
  assert.equal(document.querySelector('[aria-label="예약 상태 변경 이력"]'), null)
})
test('external selected store changes remount the workspace and remove prior detail', async () => {
  const selection = { selectedPlaceId: 7, selectPlace() {}, syncPlaces() {} }
  await render(h(Page), selection)
  await act(async () => document.querySelector('[aria-label="예약 #1 상세 보기"]').click())
  assert.match(document.body.textContent, /테스트 예약자/)
  await render(h(Page), { ...selection, selectedPlaceId: 8 })
  assert.doesNotMatch(document.body.textContent, /테스트 예약자/)
  assert.equal(calls.filter(c => c.url.endsWith('/reservations')).at(-1).params.placeId, 8)
})
