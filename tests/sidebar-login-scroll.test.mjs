import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter, useNavigate } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AdminNavigationMenu } = await server.ssrLoadModule('/src/components/navigation/AdminNavigationMenu.tsx')
const { MerchantNavigationMenu } = await server.ssrLoadModule('/src/components/navigation/MerchantNavigationMenu.tsx')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { beginLoginAttempt, getAuthSessionId } = await server.ssrLoadModule('/src/utils/authStorage.ts')
let root, navigate, revealed, user
HTMLElement.prototype.scrollIntoView = function () { revealed.push(this.textContent) }
function RouteProbe() { navigate = useNavigate(); return null }
async function mount(Menu, path, generation = 0) {
  await act(async () => root.render(h(StrictMode, null,
    h(AuthContext.Provider, { value: { user } }, h(MemoryRouter, { initialEntries: [path] },
      h(RouteProbe), h('div', { key: generation, 'data-testid': 'scroll' }, h(Menu)))))))
}
const container = () => document.querySelector('[data-testid="scroll"]')
function scroll(top, left) {
  container().scrollTop = top; container().scrollLeft = left
  container().dispatchEvent(new window.Event('scroll'))
}
beforeEach(() => {
  window.sessionStorage.clear(); beginLoginAttempt(); revealed = []
  user = { id: 1, role: 'ADMIN' }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

for (const [scope, Menu, path, role] of [
  ['admin', AdminNavigationMenu, '/operations/history', 'ADMIN'],
  ['merchant', MerchantNavigationMenu, '/merchant/payments', 'MERCHANT_OWNER'],
]) {
  test(`${scope}: first entry including deep link starts at top, not active item`, async () => {
    user.role = role
    await mount(Menu, path)
    assert.equal(container().scrollTop, 0)
    assert.equal(container().scrollLeft, 0)
    assert.deepEqual(revealed, [])
  })
  test(`${scope}: remount in same session restores both axes`, async () => {
    user.role = role
    await mount(Menu, path); scroll(120, 160)
    await mount(Menu, path, 1)
    assert.equal(container().scrollTop, 120)
    assert.equal(container().scrollLeft, 160)
    assert.deepEqual(revealed, [])
  })
  test(`${scope}: new login by same account resets existing sidebar`, async () => {
    user.role = role
    await mount(Menu, path); scroll(120, 160)
    beginLoginAttempt()
    await mount(Menu, path)
    assert.equal(container().scrollTop, 0)
    assert.equal(container().scrollLeft, 0)
    assert.deepEqual(revealed, [])
  })
  test(`${scope}: account switch resets but ordinary auth rerender does not`, async () => {
    user.role = role
    await mount(Menu, path); scroll(120, 160)
    const session = getAuthSessionId()
    user = { ...user }
    await mount(Menu, path)
    assert.equal(container().scrollTop, 120)
    assert.equal(getAuthSessionId(), session)
    user = { ...user, id: 2 }
    await mount(Menu, path)
    assert.equal(container().scrollTop, 0)
    assert.equal(container().scrollLeft, 0)
  })
  test(`${scope}: relogin after leaving protected layout discards old position`, async () => {
    user.role = role
    await mount(Menu, path); scroll(120, 160)
    await act(async () => root.render(null))
    beginLoginAttempt()
    await mount(Menu, path)
    assert.equal(container().scrollTop, 0)
    assert.equal(container().scrollLeft, 0)
  })
}
test('merchant: subsequent navigation still reveals the selected item', async () => {
  user.role = 'MERCHANT_OWNER'
  await mount(MerchantNavigationMenu, '/merchant')
  await act(async () => navigate('/merchant/payments'))
  assert.equal(revealed.length, 1)
  assert.match(revealed[0], /결제 · 정산/)
})
