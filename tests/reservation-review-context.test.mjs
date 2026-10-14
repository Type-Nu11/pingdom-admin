import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
import { reservation, reservationPage } from './helpers/reservation-review-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node', 'Event']) globalThis[key] = dom.window[key]
dom.window.HTMLElement.prototype.scrollTo = function ({ top = 0 } = {}) { this.scrollTop = top }
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter, Routes, Route, useNavigate, useLocation } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/adminReservationReview/AdminReservationReviewPage.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const context = await server.ssrLoadModule('/src/utils/reservationReviewContext.ts')
const returns = await server.ssrLoadModule('/src/utils/authReturn.ts')
const user = { id: 99, username: '합성 QA', role: 'ADMIN' }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
let root, navigate, location, adapter, auth, generation = 0
const calls = []
function Probe() { navigate = useNavigate(); location = useLocation(); return null }
const respond = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
function reject(config, status) { throw new AxiosError('합성 조회 실패', 'ERR_BAD_RESPONSE', config, undefined, { config, data: {}, status, statusText: 'Synthetic', headers: {} }) }
function defaultAdapter(config) {
  assert.equal(config.method, 'get', 'No real or synthetic mutation permitted')
  if (config.url === '/admin/reservations') return respond(config, reservationPage(config.params))
  if (/^\/admin\/reservations\/\d+$/.test(config.url)) return respond(config, reservation(Number(config.url.split('/').at(-1))))
  throw Error(`Unexpected API ${config.url}`)
}
beforeEach(() => {
  calls.length = 0
  sessionStorage.clear(); localStorage.clear()
  auth = { user, clearAuth() {}, logout: async () => {}, isAuthenticated: true, isAuthReady: true }
  adapter = defaultAdapter
  client.defaults.adapter = async config => { calls.push(config); return adapter(config) }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) }
async function mount(entry = '/reservations/review', newRouter = true) {
  if (newRouter) generation++
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(AdminNotificationContext.Provider, { value: notifications },
    h(MemoryRouter, { key: generation, initialEntries: [entry] }, h(Probe), h(Routes, null,
      h(Route, { path: '/reservations/review', element: h(Page) }),
      h(Route, { path: '/places', element: h('h1', null, '연결 장소 상세') })))))))
  await settle()
}
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text)
async function click(node) { assert.ok(node); await act(async () => node.click()); await settle() }
async function move(to, options) { await act(async () => navigate(to, options)); await settle() }
function change(input, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new window.Event('input', { bubbles: true }))
}
const owner = { reservationReviewOwner: { userId: 99, role: 'ADMIN' } }

test('query parser rejects ambiguous, malformed, unsafe and unknown values', () => {
  const parsed = context.readReservationReviewContext('?status=bad&page=-1&placeId=0&reservationId=9007199254740992&email=private')
  assert.deepEqual(parsed, { query: { status: 'PENDING', placeId: undefined, page: 1 }, selectedReservationId: null })
  assert.equal(context.writeReservationReviewContext(parsed), '')
  for (const search of ['?page=2&page=3', '?page=1000000', '?reservationId=1e2', '?placeId=01']) {
    assert.deepEqual(context.readReservationReviewContext(search), parsed)
  }
  const valid = context.readReservationReviewContext('?status=ALL&placeId=7&page=2&reservationId=11&reason=private')
  assert.equal(context.writeReservationReviewContext(valid), '?status=ALL&placeId=7&page=2&reservationId=11')
})

test('applied query and selected detail survive place navigation, back and remount', async () => {
  await mount('/reservations/review?placeId=7&page=2&reservationId=11')
  assert.equal(calls[0].params.page, 2)
  assert.equal(calls[0].params.placeId, 7)
  assert.match(document.body.textContent, /예약 #11 · 신청/)
  const saved = { pathname: location.pathname, search: location.search, state: location.state }
  const link = document.querySelector('a[href="/places?placeId=7"]')
  await act(async () => link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
  assert.equal(location.pathname, '/places')
  await move(-1)
  assert.match(document.body.textContent, /예약 #11 · 신청/)
  assert.equal(location.search, saved.search)
  assert.equal(calls.filter(c => c.url === '/admin/reservations').length, 2)
  await mount(saved)
  assert.match(document.body.textContent, /예약 #11 · 신청/)
  assert.equal(calls.at(-1).url, '/admin/reservations/11')
})

test('unapplied place input never changes the URL, selection or page requests', async () => {
  await mount('/reservations/review?placeId=7&reservationId=1')
  await act(async () => change(document.querySelector('input'), 'invalid'))
  assert.match(document.body.textContent, /미적용 변경 있음/)
  assert.equal(location.search, '?placeId=7&reservationId=1')
  assert.match(document.body.textContent, /예약 #1 · 신청/)
  await click(document.querySelector('[aria-label="2페이지로 이동"]'))
  assert.equal(document.querySelector('input').value, 'invalid')
  assert.equal(calls.at(-1).params.placeId, 7)
  assert.equal(calls.at(-1).params.page, 2)
  assert.doesNotMatch(location.search, /reservationId/)
  await click(button('조회'))
  assert.match(document.body.textContent, /장소 ID는 1 이상의 정수/)
  await click(button('초기화'))
  assert.equal(location.search, '')
  assert.equal(document.querySelector('input').value, '')
})

test('restored selection outside the current list is cleared without guessing deletion', async () => {
  await mount('/reservations/review?reservationId=31')
  assert.equal(location.search, '')
  assert.match(document.body.textContent, /현재 조회 조건 또는 페이지에 없어/)
  assert.equal(calls.length, 1)
})

for (const status of [404, 403]) test(`confirmed detail ${status} clears selection with an honest notice`, async () => {
  adapter = config => config.url === '/admin/reservations/1' ? reject(config, status) : defaultAdapter(config)
  await mount('/reservations/review?reservationId=1')
  assert.equal(location.search, '')
  assert.match(document.body.textContent, /삭제되었거나 조회 권한이 변경/)
})

test('a changed status between list and detail clears the pending selection', async () => {
  adapter = config => config.url === '/admin/reservations/1' ? respond(config, reservation(1, { status: 'CONFIRMED' })) : defaultAdapter(config)
  await mount('/reservations/review?reservationId=1')
  assert.equal(location.search, '')
  assert.match(document.body.textContent, /예약 상태 또는 연결 장소가 조회 조건과 달라져/)
})

test('list failure retains context and retries, rather than claiming absent data', async () => {
  adapter = config => config.url === '/admin/reservations' ? reject(config, 500) : defaultAdapter(config)
  await mount('/reservations/review?placeId=7&page=2&reservationId=11')
  assert.equal(location.search, '?placeId=7&page=2&reservationId=11')
  assert.match(document.body.textContent, /선택은 유지/)
  assert.equal(calls.length, 1)
  adapter = defaultAdapter
  await click(button('목록 다시 시도'))
  assert.match(document.body.textContent, /예약 #11 · 신청/)
})

test('detail server failure retains selection and can retry safely', async () => {
  adapter = config => config.url === '/admin/reservations/1' ? reject(config, 500) : defaultAdapter(config)
  await mount('/reservations/review?reservationId=1')
  assert.equal(location.search, '?reservationId=1')
  assert.match(document.body.textContent, /서버 오류가 발생/)
  assert.equal(button('승인'), undefined)
  adapter = defaultAdapter
  await click(button('다시 시도'))
  assert.match(document.body.textContent, /예약 #1 · 신청/)
})

test('late detail response cannot replace a newer selected reservation', async () => {
  let release
  adapter = config => config.url === '/admin/reservations/1'
    ? new Promise(resolve => { release = () => resolve(respond(config, reservation(1))) }) : defaultAdapter(config)
  await mount('/reservations/review?reservationId=1')
  await move('/reservations/review?reservationId=2', { state: owner })
  assert.match(document.body.textContent, /예약 #2 · 신청/)
  await act(async () => release())
  assert.match(document.body.textContent, /예약 #2 · 신청/)
  assert.doesNotMatch(document.body.textContent, /예약 #1 · 신청/)
})

test('back to another account history never restores its old selection or query', async () => {
  auth = { ...auth, user: { ...user, id: 100 } }
  await mount({ pathname: '/reservations/review', search: '?placeId=7&page=2&reservationId=11', state: owner })
  assert.equal(location.search, '')
  assert.equal(calls[0].params.page, 1)
  assert.equal(calls[0].params.placeId, undefined)
  assert.match(document.body.textContent, /계정 또는 역할이 변경/)
  assert.ok(!calls.some(c => c.url === '/admin/reservations/11'))
})

test('login return preserves only safe reservation context for the same account', () => {
  returns.rememberAuthExit(user, 'expired', '/reservations/review?status=ALL&placeId=7&page=2&reservationId=11&reason=private')
  assert.equal(returns.consumeLoginReturn(user), '/reservations/review?status=ALL&placeId=7&page=2&reservationId=11')
  returns.rememberAuthExit(user, 'expired', '/reservations/review?reservationId=1')
  assert.equal(returns.consumeLoginReturn({ ...user, id: 100 }), '/dashboard')
  returns.rememberGuestReturn('/reservations/review?status=ALL&placeId=7&page=2&reservationId=11', 'ADMIN')
  assert.equal(returns.consumeLoginReturn(user), '/reservations/review?status=ALL&page=2')
})

test('late list response cannot restore an old page or clear the new selection', async () => {
  let release
  adapter = config => config.url === '/admin/reservations' && config.params.page === 2
    ? new Promise(resolve => { release = () => resolve(respond(config, reservationPage(config.params))) }) : defaultAdapter(config)
  await mount('/reservations/review?page=2&reservationId=11')
  await move('/reservations/review?reservationId=2', { state: owner })
  assert.match(document.body.textContent, /예약 #2 · 신청/)
  await act(async () => release())
  assert.equal(location.search, '?reservationId=2')
  assert.match(document.body.textContent, /예약 #2 · 신청/)
})

test('server-clamped page is canonicalized instead of restoring an empty last page', async () => {
  adapter = config => config.url === '/admin/reservations'
    ? respond(config, reservationPage(config.params, { reservations: config.params.page > 1 ? [] : [reservation(1)], totalElements: 1, totalPages: 1, hasNext: false }))
    : defaultAdapter(config)
  await mount('/reservations/review?page=3&reservationId=21')
  assert.equal(location.search, '')
  assert.match(document.body.textContent, /현재 조회 조건 또는 페이지에 없어/)
  assert.ok(calls.some(c => c.params?.page === 1))
})

test('list permission failure clears selection but retains the error, not a zero count', async () => {
  adapter = config => config.url === '/admin/reservations' ? reject(config, 403) : defaultAdapter(config)
  await mount('/reservations/review?reservationId=1')
  assert.equal(location.search, '')
  assert.match(document.body.textContent, /관리자 권한이 필요/)
  assert.doesNotMatch(document.body.textContent, /1–0|0개|조건에 맞는 결과가 없습니다/)
})

test('selecting the already-selected row refreshes its detail instead of leaving it loading', async () => {
  await mount('/reservations/review?reservationId=1')
  await click([...document.querySelectorAll('button')].find(node => /예약 #1 · 합성 예약자/.test(node.textContent)))
  assert.match(document.body.textContent, /예약 #1 · 신청/)
  assert.equal(calls.filter(c => c.url === '/admin/reservations/1').length, 2)
})

test('review failure keeps its dialog error and blocks closing while the synthetic request is pending', async () => {
  let release
  adapter = config => config.method === 'post'
    ? new Promise((_resolve, rejectPromise) => { release = () => { try { reject(config, 409) } catch (error) { rejectPromise(error) } } })
    : defaultAdapter(config)
  await mount('/reservations/review?reservationId=1')
  await click(button('승인'))
  await click(button('승인 확정'))
  const dialog = document.querySelector('[role="dialog"]')
  assert.equal(dialog.querySelector('[aria-label="닫기"]').disabled, true)
  await act(async () => dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.ok(document.querySelector('[role="dialog"]'))
  assert.equal(calls.filter(c => c.method === 'post').length, 1)
  await act(async () => release())
  await settle()
  assert.match(document.querySelector('[role="dialog"]').textContent, /예약 상태가 이미 변경/)
  assert.equal(location.search, '?reservationId=1')
})

test('successful synthetic review keeps the target and clears a selection no longer in the applied pending list', async () => {
  let reviewed = false
  adapter = config => {
    if (config.method === 'post') {
      assert.equal(config.url, '/admin/reservations/1/confirm')
      reviewed = true
      return respond(config, reservation(1, { status: 'CONFIRMED' }))
    }
    if (reviewed && config.url === '/admin/reservations') return respond(config, reservationPage(config.params, { reservations: [reservation(2)] }))
    if (reviewed && config.url === '/admin/reservations/1') return respond(config, reservation(1, { status: 'CONFIRMED' }))
    return defaultAdapter(config)
  }
  await mount('/reservations/review?reservationId=1')
  await click(button('승인'))
  await click(button('승인 확정'))
  assert.equal(location.search, '')
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match(document.body.textContent, /예약을 승인했습니다/)
  assert.equal(calls.filter(c => c.method === 'post').length, 1)
})
