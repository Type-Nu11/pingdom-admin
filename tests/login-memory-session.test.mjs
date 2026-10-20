import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'
import { installAuthLocks, loginData, token } from './helpers/auth-session.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/console/login' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
installAuthLocks(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { useLogin } = await server.ssrLoadModule('/src/hooks/useLogin.ts')
const { default: LoginPage } = await server.ssrLoadModule('/src/pages/login/LoginPage.tsx')
const originalAdapter = axios.defaults.adapter
let root, latest, profile, calls, profileAction
function response(config, data) { return { config, data, status: 200, statusText: 'OK', headers: {} } }
function Probe() { latest = useLogin('admin'); return null }
beforeEach(async () => {
  auth.clearStoredAuth(undefined, 'logout'); sessionStorage.clear()
  profile = { ...loginData(1), email: 'synthetic@example.invalid' }; calls = []; profileAction = null
  client.defaults.adapter = async config => {
    calls.push(config.url)
    assert.equal(config.url, '/auth/admin/login')
    return response(config, { ...loginData(1), role: 'UNTRUSTED_LOGIN_ROLE' })
  }
  axios.defaults.adapter = async config => {
    calls.push(config.url)
    assert.equal(config.url, '/users/me')
    assert.equal(config.headers.Authorization, `Bearer ${token(1)}`)
    if (profileAction) await profileAction(config)
    return response(config, profile)
  }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: { login: auth.saveLoginAuth } }, h(Probe))))
  await act(async () => { latest.setUsername('synthetic'); latest.setPassword('synthetic-password') })
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { axios.defaults.adapter = originalAdapter; await server.close(); dom.window.close() })

test('login waits for authoritative profile and publishes no persistent credentials', async () => {
  let result
  await act(async () => { result = await latest.handleLogin() })
  assert.equal(result, 'success')
  assert.deepEqual(calls, ['/auth/admin/login', '/users/me'])
  assert.equal(auth.getStoredAuthState().user.role, 'ADMIN')
  assert.equal(auth.getStoredAuthState().user.email, 'synthetic@example.invalid')
  assert.equal(localStorage.getItem('accessToken'), null)
  assert.equal(localStorage.getItem('email'), null)
})
for (const change of [{ id: 2 }, { role: 'USER' }, { role: 'UNKNOWN' }]) test(`invalid login profile fails closed: ${JSON.stringify(change)}`, async () => {
  Object.assign(profile, change)
  let result
  await act(async () => { result = await latest.handleLogin() })
  assert.equal(result, 'failed')
  assert.equal(auth.getStoredAuthState(), null)
  assert.equal(auth.isAuthRestoreBlocked(), true)
})
test('logout while login profile is pending rejects the old successful response', async () => {
  let release, started
  const gate = new Promise(resolve => { release = resolve })
  const begin = new Promise(resolve => { started = resolve })
  profileAction = async () => { started(); await gate }
  let pending
  await act(async () => { pending = latest.handleLogin(); await begin; auth.clearStoredAuth(undefined, 'logout'); release(); await pending })
  assert.equal(await pending, 'failed')
  assert.equal(auth.getStoredAuthState(), null)
  assert.equal(auth.isAuthRestoreBlocked(), true)
})
test('temporary profile outage permits a later explicit login without trusting partial login data', async () => {
  profileAction = async config => { throw new axios.AxiosError('synthetic unavailable', 'ERR_BAD_RESPONSE', config, {}, { ...response(config, {}), status: 503 }) }
  await act(async () => { assert.equal(await latest.handleLogin(), 'failed') })
  assert.equal(auth.getStoredAuthState(), null)
  profileAction = null
  await act(async () => { assert.equal(await latest.handleLogin(), 'success') })
  assert.equal(auth.getStoredAuthState().user.id, 1)
})

test('both login modes link support to Gmail compose in a safe new tab', async () => {
  await act(async () => root.render(h(AuthContext.Provider, {
    value: { login: auth.saveLoginAuth, clearAuth() {}, isAuthReady: true, isAuthenticated: false, user: null },
  }, h(MemoryRouter, null, h(LoginPage)))))
  const assertSupportLink = () => {
    const link = [...document.querySelectorAll('a')].find(element => element.textContent === '고객센터에 문의하기')
    assert.ok(link)
    assert.equal(link.href, 'https://mail.google.com/mail/?view=cm&fs=1&to=azunox9%40gmail.com')
    assert.equal(link.target, '_blank')
    assert.equal(link.rel, 'noopener noreferrer')
  }
  assertSupportLink()
  const merchantMode = [...document.querySelectorAll('button')].find(element => element.textContent.endsWith('상점주'))
  await act(async () => merchantMode.click())
  assert.match(document.querySelector('h1').textContent, /상점주 로그인/)
  assertSupportLink()
  assert.deepEqual(calls, [])
})
