import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'Event']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useContext, useState, useEffect } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { AuthProvider } = await server.ssrLoadModule('/src/app/providers/AuthProvider.tsx')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const COMMIT = 'pingdom-auth-storage-commit'
let root, context, setSelection, mounts
function Probe() {
  context = useContext(AuthContext)
  const [selection, update] = useState('empty')
  setSelection = update
  useEffect(() => { mounts++ }, [])
  return h('div', {}, `${context.user?.id ?? 'guest'}:${selection}`)
}
function storageEvent(key = COMMIT, storageArea = localStorage) {
  window.dispatchEvent(new dom.window.StorageEvent('storage', { key, storageArea, newValue: key ? localStorage.getItem(key) : null }))
}
function remoteWrite(action) {
  // Another tab writes shared storage but does not dispatch its custom event here.
  const original = window.dispatchEvent
  window.dispatchEvent = () => true
  try { action() } finally { window.dispatchEvent = original }
  return localStorage.getItem(COMMIT)
}
function remote(action) {
  remoteWrite(action)
  storageEvent()
}
function login(id) { auth.saveLoginAuth({ id, accessToken: `token-${id}`, username: `user-${id}`, role: 'MERCHANT_OWNER' }) }
beforeEach(async () => {
  localStorage.clear(); login(1); mounts = 0
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthProvider, {}, h(Probe))))
  await act(async () => setSelection('private-A'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('remote account switch updates identity and resets previous screen state', async () => {
  await act(async () => remote(() => login(2)))
  assert.equal(context.user.id, 2)
  assert.equal(context.accessToken, 'token-2')
  assert.equal(document.getElementById('root').textContent, '2:empty')
  assert.equal(mounts, 2)
})
test('remote logout removes authenticated state and private selection', async () => {
  await act(async () => remote(() => auth.clearStoredAuth()))
  assert.equal(context.isAuthenticated, false)
  assert.equal(document.getElementById('root').textContent, 'guest:empty')
})
test('normal token refresh updates token without remounting screen', async () => {
  const token = `header.${Buffer.from(JSON.stringify({ sub: '1', type: 'access' })).toString('base64url')}.signature`
  await act(async () => remote(() => assert.equal(auth.saveRefreshedAuthTokens({ accessToken: token }, auth.getAuthSessionId()), true)))
  assert.equal(context.accessToken, token)
  assert.equal(document.getElementById('root').textContent, '1:private-A')
  assert.equal(mounts, 1)
})
test('field writes alone do not publish an incomplete identity', async () => {
  await act(async () => {
    localStorage.setItem('accessToken', 'token-2')
    storageEvent('accessToken')
  })
  assert.equal(context.user.id, 1)
  assert.equal(context.accessToken, 'token-1')
  await act(async () => remote(() => login(2)))
  assert.equal(context.user.id, 2)
})
test('duplicate commit notifications do not repeat synchronization or write back', async () => {
  let changes = 0
  const unsubscribe = auth.subscribeAuthStorageChange(() => changes++)
  await act(async () => remote(() => login(2)))
  const commit = localStorage.getItem(COMMIT)
  await act(async () => { storageEvent(); storageEvent(); storageEvent('unrelated'); storageEvent(COMMIT, window.sessionStorage) })
  assert.equal(changes, 1)
  assert.equal(localStorage.getItem(COMMIT), commit)
  unsubscribe()
})
test('remote storage clear signs out', async () => {
  await act(async () => { localStorage.clear(); storageEvent(null) })
  assert.equal(context.isAuthenticated, false)
})
test('local login and profile updates notify without changing session on profile edit', async () => {
  await act(async () => context.login({ id: 2, accessToken: 'token-2', role: 'MERCHANT_OWNER' }))
  const session = auth.getAuthSessionId()
  await act(async () => context.updateUser({ name: 'Updated' }))
  assert.equal(context.user.name, 'Updated')
  assert.equal(auth.getAuthSessionId(), session)
  assert.equal(mounts, 2)
})
test('subscription cleanup stops remote notifications', async () => {
  let count = 0
  const unsubscribe = auth.subscribeAuthStorageChange(() => count++)
  unsubscribe()
  await act(async () => remote(() => login(2)))
  assert.equal(count, 0)
})

function delayedCommit(value) {
  window.dispatchEvent(new dom.window.StorageEvent('storage', { key: COMMIT, storageArea: localStorage, newValue: value }))
}
function beginNextLogin() {
  localStorage.setItem('pingdom-auth-session', 'unfinished-session-2')
  localStorage.setItem('accessToken', 'token-2')
}

test('delayed commit never combines the next login token with the previous identity', async () => {
  const session = auth.getAuthSessionId()
  const commit = remoteWrite(() => auth.updateStoredAuthUser({ name: 'Updated A' }))
  beginNextLogin()
  await act(async () => delayedCommit(commit))
  assert.equal(context.user.id, 1)
  assert.equal(context.user.name, 'Updated A')
  assert.equal(context.accessToken, 'token-1')
  assert.equal(auth.getStoredAccessToken(), 'token-1')
  assert.equal(auth.getAuthSessionId(), session)
  assert.equal(document.getElementById('root').textContent, '1:private-A')
  await act(async () => remote(() => login(2)))
  assert.equal(context.user.id, 2)
  assert.equal(context.accessToken, 'token-2')
  assert.equal(document.getElementById('root').textContent, '2:empty')
})

test('an old event cannot roll back a newer completed account switch', async () => {
  const oldCommit = remoteWrite(() => auth.updateStoredAuthUser({ name: 'Updated A' }))
  await act(async () => remote(() => login(2)))
  await act(async () => delayedCommit(oldCommit))
  assert.equal(context.user.id, 2)
  assert.equal(context.accessToken, 'token-2')
  assert.equal(mounts, 2)
})

test('committed logout is not resurrected by unfinished login fields', async () => {
  const commit = remoteWrite(() => auth.clearStoredAuth())
  beginNextLogin()
  await act(async () => delayedCommit(commit))
  assert.equal(context.isAuthenticated, false)
  assert.equal(auth.getStoredAuthState(), null)
  assert.equal(auth.getStoredAccessToken(), '')
  assert.equal(document.getElementById('root').textContent, 'guest:empty')
})

test('provider initialization also reads one complete snapshot during a pending write', async () => {
  const snapshot = auth.getStoredAuthSnapshot()
  await act(async () => root.render(null))
  beginNextLogin()
  await act(async () => root.render(h(AuthProvider, {}, h(Probe))))
  assert.equal(context.user.id, 1)
  assert.equal(context.accessToken, 'token-1')
  assert.deepEqual(auth.getStoredAuthSnapshot(), snapshot)
})

test('legacy storage without a snapshot is readable and migrates on publication', async () => {
  localStorage.removeItem(COMMIT)
  assert.equal(auth.getStoredAuthState().user.id, 1)
  assert.equal(auth.getStoredAccessToken(), 'token-1')
  await act(async () => auth.updateStoredAuthUser({ name: 'Migrated' }))
  const committed = JSON.parse(localStorage.getItem(COMMIT))
  assert.equal(committed.authState.user.name, 'Migrated')
  assert.equal(committed.sessionId, auth.getAuthSessionId())
})

test('malformed snapshots fail closed rather than reading stale individual fields', async () => {
  localStorage.setItem(COMMIT, '{invalid')
  await act(async () => storageEvent())
  assert.equal(context.isAuthenticated, false)
  assert.equal(auth.getStoredAccessToken(), '')
})
