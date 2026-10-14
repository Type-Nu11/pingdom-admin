import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/operator/places?placeId=8' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node', 'Event']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const { BrowserRouter, Routes, Route, useLocation } = await import('react-router-dom')
const server = await createServer({ base: '/operator/', server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const returns = await server.ssrLoadModule('/src/utils/authReturn.ts')
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { AuthProvider } = await server.ssrLoadModule('/src/app/providers/AuthProvider.tsx')
const { useAuth } = await server.ssrLoadModule('/src/hooks/useAuth.ts')
const { default: LoginPage } = await server.ssrLoadModule('/src/pages/login/LoginPage.tsx')
const { MerchantProtectedRoute, ProtectedRoute } = await server.ssrLoadModule('/src/app/router/ProtectedRoute.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
let root, context
const user = role => ({ id: 1, role, username: 'synthetic', accessToken: 'synthetic-token' })
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  window.history.replaceState(null, '', '/operator/places?placeId=8&keyword=private')
  client.defaults.adapter = async config => ({ config, data: { notifications: [], unreadCount: 0, items: [], reports: [], requests: [], candidates: [], groups: [], profiles: [], reservations: [], applications: [], anomalies: [], total: 0, totalCount: 0, totalElements: 0, totalPages: 0, page: 1, limit: 20, hasNext: false }, status: 200, headers: {}, statusText: 'OK' })
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
function Work() { context = useAuth(); const location = useLocation(); return h('p', null, location.pathname + location.search) }
async function mount() {
  await act(async () => root.render(h(StrictMode, null, h(AuthProvider, null, h(BrowserRouter, { basename: '/operator/' },
    h(Routes, null,
      h(Route, { path: '/login', element: h(LoginPage) }),
      h(Route, { element: h(ProtectedRoute) },
        h(Route, { path: '/places', element: h(Work) }), h(Route, { path: '/dashboard', element: h(Work) })),
      h(Route, { element: h(MerchantProtectedRoute) },
        h(Route, { path: '/merchant', element: h(Work) }), h(Route, { path: '/merchant/menus', element: h(Work) }))))))))
}

for (const [role, path, expected] of [['ADMIN', '/places?placeId=8&keyword=private', '/places?placeId=8'], ['MERCHANT_OWNER', '/merchant/menus?page=2&keyword=private', '/merchant/menus?page=2']]) {
  test(`${role}: browser expiry strips basename, preserves allowed conditions, and login restores once`, async () => {
    window.history.replaceState(null, '', '/operator' + path)
    auth.saveLoginAuth(user(role))
    await mount()
    await act(async () => context.clearAuth())
    assert.equal(window.location.pathname, '/operator/login')
    assert.equal(returns.readLoginReturn().target, expected)
    assert.match(document.body.textContent, /로그인 인증/)
    assert.doesNotMatch(sessionStorage.getItem('pingdom-login-return'), /keyword|private|operator/)
    await act(async () => auth.saveLoginAuth(user(role)))
    assert.equal(window.location.pathname + window.location.search, '/operator' + expected)
    assert.equal(returns.readLoginReturn(), null)
    await act(async () => context.logout())
    assert.equal(window.location.pathname, '/operator/login')
    assert.equal(returns.readLoginReturn().target, null)
  })
}

test('guest redirects retain internal paths without duplicate prefixes and discard selected target IDs', async () => {
  await mount()
  assert.equal(window.location.pathname, '/operator/login')
  assert.equal(returns.readLoginReturn().target, '/places')
  await act(async () => auth.saveLoginAuth(user('ADMIN')))
  assert.equal(window.location.pathname, '/operator/places')
})

test('out-of-base and lookalike browser paths cannot create a return target', () => {
  for (const path of ['/places', '/operators/places', '/operator/operator/places', '/operator/api/users/me', '/operator/merchant/menus']) {
    window.history.replaceState(null, '', path)
    returns.rememberAuthExit(user('ADMIN'), 'expired')
    assert.equal(returns.readLoginReturn().target, null, path)
  }
  returns.rememberAuthExit(user('ADMIN'), 'expired', '/places?placeId=8')
  assert.equal(returns.readLoginReturn().target, '/places?placeId=8', 'explicit Router paths stay basename-free')
})

test('another account or role cannot restore a previous operator work target', () => {
  returns.rememberAuthExit(user('ADMIN'), 'expired')
  assert.equal(returns.consumeLoginReturn({ ...user('ADMIN'), id: 2 }), '/dashboard')
  returns.rememberAuthExit(user('ADMIN'), 'expired')
  assert.equal(returns.consumeLoginReturn(user('MERCHANT_OWNER')), '/merchant')
})
