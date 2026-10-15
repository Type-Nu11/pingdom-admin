import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'
import { installAuthLocks, loginData, token } from './helpers/auth-session.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'Event']) globalThis[key] = dom.window[key]
const locks = installAuthLocks(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useContext, useState, useEffect, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const servers = await Promise.all([0, 1].map(() => createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })))
const [auth, other] = await Promise.all(servers.map(server => server.ssrLoadModule('/src/utils/authStorage.ts')))
const [api, otherApi] = await Promise.all(servers.map(server => server.ssrLoadModule('/src/api/authSessionApi.ts')))
const { AuthProvider } = await servers[0].ssrLoadModule('/src/app/providers/AuthProvider.tsx')
const { AuthContext } = await servers[0].ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await servers[0].ssrLoadModule('/src/api/customAxios.ts')
const CONTROL = 'pingdom-auth-control'
let root, context, setSelection, mounts, owner, calls, mode
const originalAdapter = axios.defaults.adapter
function response(config, data = {}) { return { config, data, status: 200, statusText: 'OK', headers: {} } }
function failure(config, status) { return new axios.AxiosError('synthetic failure', 'ERR_BAD_RESPONSE', config, {}, { ...response(config), status }) }
function event(newValue = localStorage.getItem(CONTROL), key = CONTROL) {
  window.dispatchEvent(new dom.window.StorageEvent('storage', { key, storageArea: localStorage, newValue }))
}
function Probe() {
  context = useContext(AuthContext)
  const [selection, update] = useState('empty')
  setSelection = update
  useEffect(() => { mounts++ }, [])
  return h('div', {}, `${context.user?.id ?? 'guest'}:${selection}`)
}
async function mount() {
  await act(async () => root.render(h(StrictMode, {}, h(AuthProvider, {}, h(Probe)))))
  await act(async () => api.restoreAuthSession())
}
beforeEach(() => {
  installAuthLocks(window, locks)
  localStorage.clear(); sessionStorage.clear(); owner = 1; mode = 'ok'; calls = []; mounts = 0
  localStorage.setItem(CONTROL, JSON.stringify({ id: crypto.randomUUID(), blocked: false }))
  root = createRoot(document.getElementById('root'))
  axios.defaults.adapter = async config => {
    calls.push(config.url)
    assert.equal(config.withCredentials, true)
    if (mode === '503') throw failure(config, 503)
    if (mode === '401') throw failure(config, 401)
    if (config.url === '/auth/token/refresh') {
      await new Promise(resolve => setTimeout(resolve, 1))
      return response(config, { accessToken: mode === 'mismatch' ? token(99) : token(owner) })
    }
    assert.equal(config.url, '/users/me')
    return response(config, { ...loginData(owner, mode === 'role' ? 'UNKNOWN' : 'MERCHANT_OWNER'), accessToken: undefined })
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { axios.defaults.adapter = originalAdapter; await Promise.all(servers.map(server => server.close())); dom.window.close() })

test('cold start and StrictMode use one cookie refresh then authoritative profile', async () => {
  await mount()
  assert.deepEqual(calls, ['/auth/token/refresh', '/users/me'])
  assert.equal(context.user.role, 'MERCHANT_OWNER')
  assert.equal(context.user.id, 1)
  assert.equal(context.isAuthReady, true)
})
test('two independent tab memories serialize cookie rotation without sharing tokens', async () => {
  await act(async () => Promise.all([api.restoreAuthSession(), otherApi.restoreAuthSession()]))
  assert.equal(auth.getStoredAuthState().user.id, 1)
  assert.equal(other.getStoredAuthState().user.id, 1)
  assert.equal(locks.maxActive, 1)
  assert.equal(calls.filter(path => path === '/auth/token/refresh').length, 2)
  assert.equal(localStorage.getItem('accessToken'), null)
  assert.equal(localStorage.getItem('pingdom-auth-storage-commit'), null)
})
test('other-tab login invalidates private selection and revalidates rather than trusting event identity', async () => {
  await mount(); await act(async () => setSelection('private-A'))
  owner = 2
  await act(async () => { other.saveLoginAuth(loginData(2, 'MERCHANT_OWNER')); event('{"accessToken":"evil","role":"ADMIN"}') })
  await act(async () => api.restoreAuthSession())
  assert.equal(context.user.id, 2)
  assert.equal(document.getElementById('root').textContent, '2:empty')
  assert.ok(calls.filter(path => path === '/users/me').length >= 2)
})
test('remote logout clears private state and never refreshes a surviving cookie', async () => {
  await mount(); const before = calls.length
  await act(async () => { other.clearStoredAuth(undefined, 'logout'); event() })
  assert.equal(context.isAuthenticated, false)
  assert.equal(document.getElementById('root').textContent, 'guest:empty')
  await api.restoreAuthSession()
  assert.equal(calls.length, before)
  assert.match(auth.getAuthSessionNotice(), /세션이 변경/)
})
test('failed HTTP logout tombstone survives a new tab module and prevents resurrection', async () => {
  await mount()
  client.defaults.adapter = async config => { throw failure(config, 503) }
  await act(async () => context.logout())
  const before = calls.length
  await otherApi.restoreAuthSession()
  assert.equal(other.getStoredAuthState(), null)
  assert.equal(other.isAuthRestoreBlocked(), true)
  assert.equal(calls.length, before)
  assert.equal(JSON.parse(localStorage.getItem(CONTROL)).blocked, true)
})
test('normal local refresh and profile edit preserve current screen state', async () => {
  await mount(); await act(async () => setSelection('private-A'))
  const before = mounts
  await act(async () => {
    assert.equal(auth.saveRefreshedAuthTokens({ accessToken: token(1, '-new') }, auth.getAuthSessionId()), true)
    context.updateUser({ name: 'Updated' })
  })
  assert.equal(context.accessToken, token(1, '-new'))
  assert.equal(document.getElementById('root').textContent, '1:private-A')
  assert.equal(mounts, before)
})
for (const errorMode of ['503', 'mismatch', 'role']) test(`bootstrap ${errorMode} does not mount private UI or grant authentication`, async () => {
  mode = errorMode; await mount()
  assert.equal(document.querySelector('[role="alert"]') !== null, true)
  assert.equal(auth.getStoredAccessToken(), '')
  assert.equal(auth.getStoredAuthSnapshot().status, 'error')
  mode = 'ok'
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '다시 확인').click())
  await act(async () => api.restoreAuthSession())
  assert.equal(context.user.id, 1)
})
test('expired cookie becomes a guest, not a retryable server outage', async () => {
  mode = '401'; await mount()
  assert.equal(context.isAuthenticated, false)
  assert.equal(context.isAuthReady, true)
  assert.equal(auth.getStoredAuthSnapshot().error, '')
  assert.equal(calls.length, 1)
})
test('duplicate, unrelated, or delayed events cannot roll back the current control record', async () => {
  await mount(); const old = localStorage.getItem(CONTROL)
  await act(async () => { other.clearStoredAuth(undefined, 'logout'); event(); event(old); event('evil', 'unrelated') })
  assert.equal(context.isAuthenticated, false)
  assert.equal(JSON.parse(localStorage.getItem(CONTROL)).blocked, true)
})
test('legacy sensitive keys are deleted in both stores while preferences survive', () => {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of ['accessToken', 'refreshToken', 'userId', 'email', 'username', 'birthYear', 'role', 'pingdom-auth-storage-commit']) storage.setItem(key, 'sensitive')
    storage.setItem('theme', 'keep')
  }
  auth.cleanupLegacyAuthStorage()
  for (const storage of [localStorage, sessionStorage]) {
    assert.equal(storage.getItem('accessToken'), null)
    assert.equal(storage.getItem('pingdom-auth-storage-commit'), null)
    assert.equal(storage.getItem('theme'), 'keep')
  }
})
test('login signals contain only random control ID and boolean, not token or profile', () => {
  auth.saveLoginAuth(loginData(1))
  assert.deepEqual(Object.keys(JSON.parse(localStorage.getItem(CONTROL))).sort(), ['blocked', 'id'])
  assert.doesNotMatch(localStorage.getItem(CONTROL), /accessToken|username|email|role|synthetic|signature/)
  other.getStoredAuthSnapshot()
  assert.equal(other.getStoredAccessToken(), '')
})
test('requests during cookie recovery are canceled without retrying a stale write', async () => {
  let release, started
  const gate = new Promise(resolve => { release = resolve })
  const begin = new Promise(resolve => { started = resolve })
  axios.defaults.adapter = async config => { started(); await gate; return response(config, config.url === '/users/me' ? loginData(1) : { accessToken: token(1) }) }
  const pending = api.restoreAuthSession(); await begin
  let writes = 0
  client.defaults.adapter = async config => { writes++; return response(config) }
  assert.ok(axios.isCancel(await client.post('/never-send').catch(error => error)))
  release(); await pending
  assert.equal(writes, 0)
})

test('logout during pending profile recovery cannot resurrect the prior identity', async () => {
  let release, started
  const gate = new Promise(resolve => { release = resolve })
  const begin = new Promise(resolve => { started = resolve })
  axios.defaults.adapter = async config => {
    if (config.url === '/users/me') { started(); await gate; return response(config, loginData(1)) }
    return response(config, { accessToken: token(1) })
  }
  const pending = api.restoreAuthSession(); await begin
  other.clearStoredAuth(undefined, 'logout'); event()
  release(); await pending
  assert.equal(auth.getStoredAuthState(), null)
  assert.equal(auth.isAuthRestoreBlocked(), true)
})

test('unsupported shared locks fail closed without a storage token fallback', async () => {
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: undefined })
  await mount()
  assert.equal(auth.getStoredAuthSnapshot().status, 'error')
  assert.match(document.body.textContent, /최신 브라우저.*HTTPS/)
  assert.equal(calls.length, 0)
})

test('write-denied storage cannot silently refresh a cookie even when its control record is readable', async () => {
  const previous = globalThis.localStorage
  globalThis.localStorage = { getItem: key => previous.getItem(key), removeItem() {}, setItem() { throw new Error('denied') } }
  try {
    await api.restoreAuthSession()
    assert.equal(auth.getStoredAccessToken(), '')
    assert.equal(auth.getStoredAuthSnapshot().status, 'error')
    assert.match(auth.getStoredAuthSnapshot().error, /저장소/)
    assert.equal(calls.length, 0)
  } finally { globalThis.localStorage = previous }
})

test('a queued stale logout does not delete a newer login cookie', async () => {
  await mount()
  let release
  locks.tail = new Promise(resolve => { release = resolve })
  let logouts = 0
  client.defaults.adapter = async config => { logouts++; return response(config) }
  let pending
  await act(async () => { pending = context.logout(); owner = 2; other.saveLoginAuth(loginData(2, 'MERCHANT_OWNER')); event() })
  release()
  await act(async () => { await pending; await api.restoreAuthSession() })
  assert.equal(logouts, 0)
  assert.equal(context.user.id, 2)
})
