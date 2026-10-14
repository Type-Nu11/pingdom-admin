import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/places?placeId=8', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node', 'Event']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const returns = await server.ssrLoadModule('/src/utils/authReturn.ts')
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { AuthProvider } = await server.ssrLoadModule('/src/app/providers/AuthProvider.tsx')
const { useAuth } = await server.ssrLoadModule('/src/hooks/useAuth.ts')
const { default: LoginPage } = await server.ssrLoadModule('/src/pages/login/LoginPage.tsx')
const { MerchantProtectedRoute } = await server.ssrLoadModule('/src/app/router/ProtectedRoute.tsx')
const { BrowserRouter, Routes, Route, useLocation } = await import('react-router-dom')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const USER = { id: 1, role: 'ADMIN' }
const KEY = 'pingdom-login-return'
let root, context
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  window.history.replaceState(null, '', '/places?placeId=8')
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('same account restores allowed details once and removes private/unknown query data', () => {
  returns.rememberAuthExit(USER, 'expired', '/places?placeId=8&keyword=private&password=secret&returnTo=https://evil.invalid#secret')
  assert.equal(returns.readLoginReturn().target, '/places?placeId=8')
  assert.doesNotMatch(sessionStorage.getItem(KEY), /private|password|secret|evil/)
  assert.equal(returns.consumeLoginReturn(USER), '/places?placeId=8')
  assert.equal(returns.consumeLoginReturn(USER), '/dashboard')
})

test('another account or changed role returns to its own home', () => {
  returns.rememberAuthExit(USER, 'expired', '/places?placeId=8')
  assert.equal(returns.consumeLoginReturn({ id: 2, role: 'ADMIN' }), '/dashboard')
  returns.rememberAuthExit(USER, 'expired', '/places?placeId=8')
  assert.equal(returns.consumeLoginReturn({ id: 1, role: 'MERCHANT_OWNER' }), '/merchant')
})

test('role allowlists reject external, malformed, login and unknown routes', () => {
  for (const path of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/login', '/unknown', '/merchant/menus', '/places\n', '/places/%2f%2fevil']) {
    assert.equal(returns.safeReturnTarget(path, 'ADMIN'), null, path)
  }
  assert.equal(returns.safeReturnTarget('/places', 'USER'), null)
  assert.equal(returns.safeReturnTarget('/merchant/place-registration', 'USER'), '/merchant/place-registration')
  assert.equal(returns.safeReturnTarget('/places?placeId=9007199254740992', 'ADMIN'), '/places')
  assert.equal(returns.safeReturnTarget('/scouts?tab=reports&email=private', 'ADMIN'), '/scouts?tab=reports')
})

test('expired, future and malformed stored returns fail closed', () => {
  returns.rememberAuthExit(USER, 'expired', '/places')
  const valid = returns.readLoginReturn()
  for (const modified of [{ ...valid, createdAt: Date.now() - 31 * 60 * 1000 }, { ...valid, createdAt: Date.now() + 10000 }, { ...valid, target: '//evil.invalid' }, { ...valid, role: 'UNKNOWN' }, { ...valid, reason: 'server-text' }, { ...valid, userId: null, target: '/places' }]) {
    sessionStorage.setItem(KEY, JSON.stringify(modified))
    assert.equal(returns.readLoginReturn(), null)
    assert.equal(sessionStorage.getItem(KEY), null)
  }
})

test('guest entry strips selected target IDs and preserves a safe tab', () => {
  returns.rememberGuestReturn('/places/information-verification?placeId=9&tab=reverification', 'ADMIN')
  assert.equal(returns.consumeLoginReturn(USER), '/places/information-verification?tab=reverification')
})

test('explicit logout suppresses guest return and session notice', () => {
  auth.saveLoginAuth({ ...USER, accessToken: 'token' })
  auth.clearStoredAuth()
  assert.match(auth.getAuthSessionNotice(), /만료/)
  auth.clearStoredAuth(undefined, 'logout')
  returns.rememberGuestReturn('/places?placeId=8', 'ADMIN')
  assert.equal(returns.readLoginReturn().target, null)
  assert.equal(auth.getAuthSessionNotice(), '')
  assert.equal(returns.consumeLoginReturn(USER), '/dashboard')
})

test('repeated auth cleanup retains reason, identity and original work route', () => {
  auth.saveLoginAuth({ ...USER, accessToken: 'token' })
  auth.clearStoredAuth('test mismatch', 'session-changed')
  window.history.replaceState(null, '', '/login')
  auth.clearStoredAuth()
  assert.equal(returns.readLoginReturn().reason, 'session-changed')
  assert.match(auth.getAuthSessionNotice(), /세션/)
  assert.equal(returns.consumeLoginReturn(USER), '/places?placeId=8')
})

test('dismissing reason removes both persisted and in-memory notice', () => {
  auth.saveLoginAuth({ ...USER, accessToken: 'token' })
  auth.clearStoredAuth()
  auth.dismissAuthSessionNotice()
  assert.equal(auth.getAuthSessionNotice(), '')
  assert.equal(returns.readLoginReturn(), null)
})

test('denied sessionStorage still allows login home fallback', () => {
  const previous = globalThis.sessionStorage
  globalThis.sessionStorage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() { throw new Error('denied') } }
  try {
    returns.rememberAuthExit(USER, 'expired', '/places')
    assert.equal(returns.consumeLoginReturn(USER), '/dashboard')
  } finally { globalThis.sessionStorage = previous }
})

function Marker() {
  context = useAuth()
  return h('p', null, useLocation().pathname + useLocation().search)
}
async function mountRoutes() {
  await act(async () => root.render(h(StrictMode, null, h(AuthProvider, null, h(BrowserRouter, null,
    h(Routes, null,
      h(Route, { path: '/login', element: h(LoginPage) }),
      h(Route, { element: h(MerchantProtectedRoute) },
        h(Route, { path: '/merchant', element: h(Marker) }),
        h(Route, { path: '/merchant/menus', element: h(Marker) })),
      h(Route, { path: '/dashboard', element: h(Marker) }),
      h(Route, { path: '/places', element: h(Marker) })))))))
}

test('StrictMode login restores saved target once despite effect replay', async () => {
  returns.rememberAuthExit(USER, 'expired', '/places?placeId=8')
  auth.saveLoginAuth({ ...USER, accessToken: 'token' })
  window.history.replaceState(null, '', '/login')
  await mountRoutes()
  assert.equal(window.location.pathname + window.location.search, '/places?placeId=8')
  assert.equal(returns.readLoginReturn(), null)
})

test('protected guest redirect persists destination and selects merchant login', async () => {
  window.history.replaceState(null, '', '/merchant/menus')
  await mountRoutes()
  assert.equal(window.location.pathname, '/login')
  assert.equal(returns.readLoginReturn().target, '/merchant/menus')
  assert.match(document.body.textContent, /상점주 로그인/)
})

test('provider logout goes to login and leaves no return target', async () => {
  window.history.replaceState(null, '', '/merchant/menus')
  auth.saveLoginAuth({ id: 1, role: 'MERCHANT_OWNER', accessToken: 'token' })
  client.defaults.adapter = async config => ({ config, data: {}, status: 200, headers: {}, statusText: 'OK' })
  await mountRoutes()
  await act(async () => context.logout())
  assert.equal(window.location.pathname, '/login')
  assert.equal(returns.readLoginReturn().target, null)
  assert.doesNotMatch(document.body.textContent, /만료/)
})

test('other-tab logout explains session change without retaining target identity', async () => {
  window.history.replaceState(null, '', '/merchant/menus')
  auth.saveLoginAuth({ id: 1, role: 'MERCHANT_OWNER', accessToken: 'token' })
  await mountRoutes()
  const dispatch = window.dispatchEvent
  window.dispatchEvent = () => true
  auth.clearStoredAuth(undefined, 'logout')
  window.dispatchEvent = dispatch
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: 'pingdom-auth-storage-commit', storageArea: localStorage })))
  assert.equal(window.location.pathname, '/login')
  assert.match(document.body.textContent, /세션이 변경/)
  assert.equal(returns.readLoginReturn().userId, null)
  assert.equal(returns.readLoginReturn().target, null)
})

test('remote account switch clears a pending return from the previous identity', async () => {
  window.history.replaceState(null, '', '/merchant/menus')
  auth.saveLoginAuth({ id: 1, role: 'MERCHANT_OWNER', accessToken: 'token' })
  await mountRoutes()
  returns.rememberAuthExit({ id: 1, role: 'MERCHANT_OWNER' }, 'expired', '/merchant/menus')
  const dispatch = window.dispatchEvent
  window.dispatchEvent = () => true
  auth.saveLoginAuth({ id: 2, role: 'MERCHANT_OWNER', accessToken: 'other' })
  window.dispatchEvent = dispatch
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: 'pingdom-auth-storage-commit', storageArea: localStorage })))
  assert.equal(context.user.id, 2)
  assert.equal(returns.readLoginReturn(), null)
})
