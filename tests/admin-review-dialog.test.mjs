import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { useAdminMerchantPlaceApplications } = await server.ssrLoadModule('/src/hooks/useAdminMerchantPlaceApplications.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { AppDialog } = await server.ssrLoadModule('/src/components/common/AppDialog.tsx')
let root, hook, adapter
const calls = []
const auth = { clearAuth() {}, logout: async () => {}, user: { id: 99, username: 'admin', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} } }
function Probe() { hook = useAdminMerchantPlaceApplications(); return null }
async function mount(component = h(Probe)) {
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
    if (config.method === 'post') return response(config, { id: 1, version: 3, status: 'APPROVED', attachments: [] })
    if (config.url.endsWith('/attachments')) return response(config, [])
    if (Number(config.url.split('/').at(-1))) return response(config, { id: Number(config.url.split('/').at(-1)), version: 2, status: 'PENDING', attachments: [] })
    return response(config, { items: [], page: 1, total: 0, totalPages: 0, hasNext: false })
  }
  client.defaults.adapter = (config) => { calls.push(config); return adapter(config) }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })


test('dialog traps focus, handles Escape and restores trigger', async () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  let closed = 0
  await mount(h(AppDialog, { title: '심사', onClose: () => closed++, footer: h('button', {}, '승인 확정') }, h('input', { 'aria-label': '사유' })))
  await act(async () => { await new Promise(resolve => window.requestAnimationFrame(resolve)) })
  const dialog = document.querySelector('[role="dialog"]')
  const first = dialog.querySelector('button')
  const last = button('승인 확정', dialog)
  assert.equal(document.activeElement, first)
  await act(async () => first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })))
  assert.equal(document.activeElement, last)
  await act(async () => last.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
  assert.equal(document.activeElement, first)
  await act(async () => first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(closed, 1)
  await act(async () => root.render(null))
  assert.equal(document.activeElement, trigger)
  trigger.remove()
})
test('pending dialog blocks Escape, backdrop and close button', async () => {
  let closed = 0
  await mount(h(AppDialog, { title: '심사', isDismissible: false, onClose: () => closed++ }, h('button', { disabled: true }, '처리 중')))
  const dialog = document.querySelector('[role="dialog"]')
  await act(async () => {
    dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    dialog.parentElement.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))
  })
  assert.equal(dialog.querySelector('button').disabled, true)
  assert.equal(closed, 0)
})
test('review rejects changed target and version without sending mutation', async () => {
  await mount()
  await act(async () => hook.fetchDetail(2))
  for (const target of [{ id: 1, version: 2 }, { id: 2, version: 1 }]) {
    await act(async () => hook.review(target, true, '사유'))
    assert.match(hook.actionErrorMessage, /변경/)
  }
  assert.equal(calls.filter(c => c.method === 'post').length, 0)
})
test('review pins id/version and blocks duplicate submission', async () => {
  await mount()
  await act(async () => hook.fetchDetail(1))
  const pending = deferred()
  const previous = adapter
  adapter = config => config.method === 'post' ? pending.promise.then(() => previous(config)) : previous(config)
  let request
  await act(async () => {
    request = hook.review({ id: 1, version: 2 }, true, '사유')
    void hook.review({ id: 1, version: 2 }, true, '사유')
  })
  const mutations = calls.filter(c => c.method === 'post')
  assert.equal(mutations.length, 1)
  assert.ok(mutations[0].url.endsWith('/1/approve'))
  assert.deepEqual(JSON.parse(mutations[0].data), { reviewedVersion: 2, reason: '사유' })
  await act(async () => { pending.resolve(); await request })
})
