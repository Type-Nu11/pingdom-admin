import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
dom.window.HTMLElement.prototype.scrollTo = function () {}
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage.tsx')
let root, adapter
const calls = []
const auth = { clearAuth() {}, logout: async () => {}, user: { id: 99, username: 'admin', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} } }
async function mount(component = h(Page)) {
  const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
  await act(async () => root.render(h(AuthContext.Provider, { value: auth },
    h(AdminNotificationContext.Provider, { value: notifications }, h(MemoryRouter, {}, component)))))
}
async function click(button) {
  assert.ok(button, 'button exists')
  await act(async () => button.click())
}
function button(text, scope = document) { return [...scope.querySelectorAll('button')].find((item) => item.textContent.trim() === text) }
beforeEach(() => {
  calls.length = 0
  adapter = async (config) => {
    if (config.url.includes('/merchant-owners/')) return response(config, { status: 'ACTIVE', businessName: '가게' })
    if (config.url.endsWith('/attachments')) return response(config, [])
    if (Number(config.url.split('/').at(-1))) return response(config, application(Number(config.url.split('/').at(-1))))
    return response(config, { items: [application(1), application(2)], page: 1, total: 2, totalPages: 1, hasNext: false })
  }
  client.defaults.adapter = async (config) => { calls.push(config); return adapter(config) }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })



function application(id, status = 'PENDING') {
  return { id, status, version: 1, applicantUserId: 20, businessName: '가게', legalName: '신청자', placeName: '장소 ' + id, applicationType: 'NEW_PLACE', attachments: [] }
}
function actions() { return document.querySelector('footer[aria-label="장소 신청 심사 작업"]') }
function select(id) { return [...document.querySelectorAll('button')].find(b => b.textContent.includes('장소 ' + id) && b.textContent.includes('신청자 #')) }
test('actions are outside scrolling content and open existing confirmation', async () => {
  await mount()
  assert.equal(actions(), null)
  await click(select(1))
  assert.ok(actions())
  assert.match(actions().textContent, /신청 #1/)
  assert.ok(actions().previousElementSibling.textContent.includes('제출 증빙'))
  assert.equal(actions().previousElementSibling.querySelector('button'), null)
  await click(button('승인', actions()))
  assert.match(document.querySelector('[role="dialog"]').textContent, /장소 1/)
  assert.equal(calls.filter(c => c.method === 'post').length, 0)
})
test('old actions disappear while another detail is loading', async () => {
  await mount()
  await click(select(1))
  const pending = deferred(), previous = adapter
  adapter = config => config.url.endsWith('/2') ? pending.promise.then(() => previous(config)) : previous(config)
  await click(select(2))
  assert.equal(actions(), null)
  await act(async () => pending.resolve())
  assert.match(actions().textContent, /신청 #2/)
})
for (const status of ['APPROVED', 'COMPLETED', 'REJECTED', 'CANCELED', 'DRAFT']) {
  test(status + ' is read only', async () => {
    const previous = adapter
    adapter = config => config.url.endsWith('/1') ? response(config, application(1, status)) : previous(config)
    await mount()
    await click(select(1))
    assert.match(actions().textContent, /읽기 전용/)
    assert.equal(actions().querySelectorAll('button').length, 0)
  })
}
test('approval blocker is visible and linked to disabled approval', async () => {
  const previous = adapter
  adapter = config => config.url.includes('/merchant-owners/') ? response(config, { status: 'ACTIVE', businessName: '다른 가게' }) : previous(config)
  await mount()
  await click(select(1))
  const approve = button('승인', actions())
  assert.equal(approve.disabled, true)
  assert.ok(document.getElementById(approve.getAttribute('aria-describedby')).textContent.includes('달라'))
  assert.equal(button('반려', actions()).disabled, false)
})
