import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
dom.window.HTMLElement.prototype.scrollTo = function () { this.scrollTop = 0 }
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({
  server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] },
  plugins: [{ name: 'application-state', enforce: 'pre', load(id) {
    if (id.endsWith('/hooks/useAdminMerchantPlaceApplications.ts')) return 'export const APPLICATION_REVIEW_PAGE_SIZE=10; export function useAdminMerchantPlaceApplications(){return globalThis.applicationState}'
  } }],
})
const { formatListRange } = await server.ssrLoadModule('/src/utils/listRange.ts')
const { ListPane } = await server.ssrLoadModule('/src/components/common/ListPane.tsx')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage.tsx')
let root, calls
beforeEach(() => {
  root = createRoot(document.getElementById('root'))
  calls = []
  globalThis.applicationState = {
    items: [{ id: 7, placeName: '테스트 가게', businessName: '테스트 가게', merchantDisplayName: '홍길동', applicantUserId: 9, status: 'PENDING', applicationType: 'NEW_PLACE', submittedAt: '2026-09-14T09:00:00' }],
    page: 1, total: 32, totalPages: 4, hasNext: true, view: 'pending', applicationType: 'ALL', attachments: [], detail: null,
    isLoading: false, isReviewing: false, errorMessage: '',
    dismissActionError() {}, fetchDetail(id) { calls.push(['detail', id]) },
    fetchApplications(page) { calls.push(['page', page]) }, changeView(view) { calls.push(['view', view]) },
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { delete globalThis.applicationState; await server.close(); dom.window.close() })
async function render(extra = {}) {
  Object.assign(globalThis.applicationState, extra)
  await act(async () => root.render(h(AuthContext.Provider, { value: { user: { username: 'admin' }, logout() {} } },
    h(AdminNotificationContext.Provider, { value: { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' } }, h(MemoryRouter, {}, h(Page))))))
}
const button = (label) => [...document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label || el.textContent === label)

test('range uses requested size and actual result length, including partial last page', () => {
  assert.equal(formatListRange({ page: 1, pageSize: 10, itemCount: 10, total: 32 }), '1–10 / 32개')
  assert.equal(formatListRange({ page: 4, pageSize: 10, itemCount: 2, total: 32 }), '31–32 / 32개')
  assert.equal(formatListRange({ page: 2, pageSize: 5, itemCount: 5, total: 32 }), '6–10 / 32개')
})
test('empty and unknown totals do not invent a total or a false range', () => {
  assert.equal(formatListRange({ page: 1, pageSize: 10, itemCount: 0, total: 0 }), '0개')
  assert.equal(formatListRange({ page: 4, pageSize: 10, itemCount: 0, total: 29 }), '표시할 항목 없음')
  assert.equal(formatListRange({ page: 2, pageSize: 10, itemCount: 3 }), '11–13개 표시')
  assert.equal(formatListRange({ page: 2, pageSize: 10, itemCount: 3, total: 12 }), '11–13개 표시')
})
test('list resets scroll on page change, keeping the footer outside the scrolling area', async () => {
  const props = { title: '목록', footer: h('button', {}, '다음'), range: { page: 1, pageSize: 10, itemCount: 10, total: 32 } }
  await act(async () => root.render(h(ListPane, { ...props, page: 1 }, '내용')))
  const list = document.querySelector('[aria-label="목록 목록"]')
  list.scrollTop = 200
  await act(async () => root.render(h(ListPane, { ...props, page: 2 }, '내용')))
  assert.equal(list.scrollTop, 0)
  assert.equal(list.contains(button('다음')), false)
})
test('application cards avoid duplicate business name and preserve selection and page actions', async () => {
  await render()
  const list = document.querySelector('[aria-label="장소 신청 목록"]')
  assert.equal(list.textContent.split('테스트 가게').length - 1, 1)
  assert.match(list.textContent, /홍길동/)
  await act(async () => list.querySelector('button').click())
  await act(async () => button('다음 페이지로 이동').click())
  await act(async () => button('처리 이력').click())
  assert.deepEqual(calls, [['detail', 7], ['page', 2], ['view', 'history']])
})
test('loading and errors hide definitive totals and loading disables pagination', async () => {
  await render({ isLoading: true })
  assert.doesNotMatch(document.body.textContent, /\/ 32개/)
  assert.equal(button('다음 페이지로 이동').disabled, true)
  await render({ isLoading: false, errorMessage: '조회 실패' })
  assert.doesNotMatch(document.body.textContent, /\/ 32개/)
  assert.match(document.body.textContent, /조회 실패/)
})
test('different business name is preserved and zero result hides pagination', async () => {
  globalThis.applicationState.items[0].businessName = '별도 사업장'
  await render()
  assert.match(document.querySelector('[aria-label="장소 신청 목록"]').textContent, /별도 사업장/)
  await render({ items: [], total: 0, totalPages: 0, hasNext: false })
  assert.match(document.body.textContent, /0개/)
  assert.equal(button('다음 페이지로 이동'), undefined)
})
