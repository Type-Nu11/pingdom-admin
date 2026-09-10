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
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { useAdminScouts } = await server.ssrLoadModule('/src/hooks/useAdminScouts.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { default: ScoutPage } = await server.ssrLoadModule('/src/pages/scout/ScoutPage.tsx')
let root, hook, adapter
const calls = []
const auth = { clearAuth() {}, logout: async () => {}, user: { id: 99, username: 'admin', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const profile = (userId, extra = {}) => ({ userId, displayName: `Scout ${userId}`, profileStatus: 'ACTIVE', activityEligibilityStatus: 'ELIGIBLE', ...extra })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} } }
function Probe() { hook = useAdminScouts(); return null }
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
function selectButton(id) { return [...document.querySelectorAll('button')].find((item) => item.textContent.includes(`Scout ${id}`) && item.textContent.includes('사용자 #')) }
beforeEach(() => {
  calls.length = 0
  adapter = async (config) => {
    if (config.url === '/admin/scout-profiles') return response(config, { profiles: [profile(1), profile(2)], page: 1, totalCount: 2, totalPages: 1, hasNext: false })
    if (config.url === '/admin/scout-field-reports') return response(config, { reports: [], page: 1, totalElements: 0, totalPages: 1, hasNext: false })
    if (/\/admin\/scout-profiles\/\d+$/.test(config.url)) return response(config, profile(Number(config.url.split('/').at(-1))))
    if (config.method === 'post') return response(config, profile(1))
    // Ancillary notification requests remain local to the test adapter.
    return response(config, { notifications: [], unreadCount: 0 })
  }
  client.defaults.adapter = (config) => { calls.push(config); return adapter(config) }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

for (const outcome of ['success', 'failure']) {
  test(`old detail ${outcome} cannot overwrite a newer selection`, async () => {
    await mount()
    const old = deferred()
    const base = adapter
    adapter = (config) => config.url === '/admin/scout-profiles/1' ? old.promise.then(() => {
      if (outcome === 'failure') throw new Error('old failure')
      return response(config, profile(1))
    }) : base(config)
    let pending
    await act(async () => { pending = hook.fetchProfile(1) })
    await act(async () => { await hook.fetchProfile(2) })
    await act(async () => { old.resolve(); await pending })
    assert.equal(hook.selectedUserId, 2)
    assert.equal(hook.profile.userId, 2)
    assert.equal(hook.errorMessage, '')
    assert.equal(hook.isDetailLoading, false)
  })
}
test('old completion cannot stop a newer detail loading indicator', async () => {
  await mount()
  const gates = [deferred(), deferred()]
  adapter = (config) => gates[Number(config.url.split('/').at(-1)) - 1].promise.then(() => response(config, profile(Number(config.url.split('/').at(-1)))))
  let first, second
  await act(async () => { first = hook.fetchProfile(1); second = hook.fetchProfile(2) })
  await act(async () => { gates[0].resolve(); await first })
  assert.equal(hook.profile, null)
  assert.equal(hook.isDetailLoading, true)
  await act(async () => { gates[1].resolve(); await second })
  assert.equal(hook.profile.userId, 2)
})
test('clearing selection invalidates pending detail', async () => {
  await mount()
  const gate = deferred()
  adapter = (config) => gate.promise.then(() => response(config, profile(1)))
  let pending
  await act(async () => { pending = hook.fetchProfile(1) })
  await act(async () => hook.clearProfile())
  await act(async () => { gate.resolve(); await pending })
  assert.equal(hook.selectedUserId, null)
  assert.equal(hook.profile, null)
  assert.equal(hook.isDetailLoading, false)
})
test('mismatched server detail is not displayed', async () => {
  await mount()
  adapter = async (config) => response(config, profile(2))
  await act(async () => { await hook.fetchProfile(1) })
  assert.equal(hook.profile, null)
  assert.ok(hook.errorMessage)
})

const actions = [
  ['프로필 승인', 'approve', { profileStatus: 'PENDING' }],
  ['프로필 정지', 'suspend', {}],
  ['프로필 회수', 'revoke', {}],
  ['활동 자격 부여', 'eligibility/grant', { activityEligibilityStatus: 'SUSPENDED' }],
  ['자격 정지', 'eligibility/suspend', {}],
  ['자격 회수', 'eligibility/revoke', {}],
]
for (const [label, path, extra] of actions) {
  test(`${label}: dialog keeps its target after selection changes`, async () => {
    const base = adapter
    adapter = (config) => config.url === '/admin/scout-profiles/1' ? Promise.resolve(response(config, profile(1, extra))) : base(config)
    await mount(h(ScoutPage))
    await click(selectButton(1))
    await click(button(label))
    const dialog = document.querySelector('[aria-labelledby="scout-action-title"]')
    assert.ok(dialog.textContent.includes('Scout 1 · 사용자 #1'))
    // Even a selection event arriving while the modal is open must not retarget it.
    await click(selectButton(2))
    assert.ok(dialog.textContent.includes('Scout 1 · 사용자 #1'))
    const input = dialog.querySelector('textarea')
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'test reason')
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    })
    if (path === 'eligibility/grant') {
      await click(dialog.querySelector('[aria-label^="탐색 후보 활동 시작,"]'))
      await click(document.querySelector('[data-admin-picker-layer] button[aria-pressed]'))
      await click(button('적용'))
    }
    await click(button('확정', dialog))
    const mutations = calls.filter((config) => config.method === 'post')
    assert.equal(mutations.length, 1)
    assert.equal(mutations[0].url, `/admin/scout-profiles/1/${path}`)
    assert.equal(document.querySelector('[aria-labelledby="scout-action-title"]'), null)
    assert.ok(document.body.textContent.includes('Scout 2'))
    assert.equal(calls.filter((config) => config.url === '/admin/scout-profiles/1').length, 1)
  })
}

test('mutation finishing after selection change does not reload its old target', async () => {
  await mount()
  await act(async () => { await hook.fetchProfile(1) })
  const gate = deferred()
  const base = adapter
  adapter = (config) => config.method === 'post' ? gate.promise.then(() => response(config, profile(1))) : base(config)
  let mutation
  await act(async () => { mutation = hook.reviewProfile(1, 'approve', 'test') })
  await act(async () => { await hook.fetchProfile(2) })
  await act(async () => { gate.resolve(); await mutation })
  assert.equal(hook.selectedUserId, 2)
  assert.equal(hook.profile.userId, 2)
  assert.equal(calls.filter((config) => config.url === '/admin/scout-profiles/1').length, 1)
})
