import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node', 'Event']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { shouldClearAuth } = await server.ssrLoadModule('/src/api/authError.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const storage = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { useAdminScouts } = await server.ssrLoadModule('/src/hooks/useAdminScouts.ts')
const { useMerchantOnboarding } = await server.ssrLoadModule('/src/hooks/useMerchantOnboarding.ts')
const { AdminNotificationProvider } = await server.ssrLoadModule('/src/app/providers/AdminNotificationProvider.tsx')
const originalAdapter = axios.defaults.adapter
let root, clears
const context = { clearAuth: () => { clears++ }, isAuthenticated: true, isAuthReady: true }

function failure(status, config, code = 'INVALID_TOKEN') {
  return new axios.AxiosError('test failure', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config, {},
    status ? { status, data: { code }, headers: {}, statusText: 'test', config } : undefined)
}
function Probe({ useHook }) { useHook(); return null }
async function mount(useHook) {
  const child = useHook ? h(Probe, { useHook }) : h(AdminNotificationProvider)
  await act(async () => root.render(h(AuthContext.Provider, { value: context }, child)))
}
beforeEach(() => {
  localStorage.clear()
  clears = 0
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => {
  axios.defaults.adapter = originalAdapter
  await server.close()
  dom.window.close()
})

for (const refresh of [false, true]) {
  for (const status of [400, 401, 403, 404, 409, 429, 500, 503]) {
    test(`policy: ${refresh ? 'refresh' : 'resource'} ${status} overrides conflicting code and category`, () => {
      const error = failure(status)
      error.isRefreshFailure = refresh
      error.category = status === 401 ? 'server' : 'unauthorized'
      assert.equal(shouldClearAuth(error), status === 401 || (refresh && status === 403))
    })
  }
}

test('policy: missing HTTP status uses normalized category, not INVALID_TOKEN alone', () => {
  for (const category of ['network', 'offline', 'timeout', 'request-blocked', 'server', 'unknown', 'forbidden']) {
    const error = failure(undefined)
    error.category = category
    assert.equal(shouldClearAuth(error), false)
  }
  const error = failure(undefined)
  error.category = 'unauthorized'
  assert.equal(shouldClearAuth(error), true)
  error.category = 'forbidden'
  error.isRefreshFailure = true
  assert.equal(shouldClearAuth(error), true)
  error.status = 503
  assert.equal(shouldClearAuth(error), false)
  assert.equal(shouldClearAuth({ isAxiosError: true, response: { data: { code: 'INVALID_TOKEN' } } }), false)
})

test('policy: canceled and non-API errors never clear auth', () => {
  const canceled = new axios.CanceledError('old session')
  canceled.category = 'unauthorized'
  canceled.status = 401
  for (const error of [canceled, null, undefined, new Error('failure'), { status: 401 }]) {
    assert.equal(shouldClearAuth(error), false)
  }
})

for (const [name, useHook] of [['admin', useAdminScouts], ['merchant', useMerchantOnboarding], ['notifications', null]]) {
  for (const refresh of [false, true]) {
    for (const status of [401, 403, 400, 429, 500, undefined]) {
      test(`${name}: ${refresh ? 'refresh' : 'resource'} ${status ?? 'network'} uses shared logout policy`, async () => {
        if (refresh) storage.saveLoginAuth({ accessToken: 'A', id: 1, username: 'test' })
        client.defaults.adapter = async config => { throw failure(refresh ? 401 : status, config) }
        axios.defaults.adapter = async config => {
          assert.equal(config.url, '/auth/token/refresh')
          throw failure(status, config)
        }
        await mount(useHook)
        const expired = status === 401 || (refresh && status === 403)
        assert.equal(clears > 0, expired)
        if (refresh) assert.equal(Boolean(storage.getStoredAccessToken()), !expired)
      })
    }
  }

  test(`${name}: late previous-session 401 cannot clear the new account`, async () => {
    storage.saveLoginAuth({ accessToken: 'A', id: 1, username: 'first' })
    let release
    const gate = new Promise(resolve => { release = resolve })
    client.defaults.adapter = async config => { await gate; throw failure(401, config) }
    axios.defaults.adapter = async () => { assert.fail('old session must not refresh') }
    await mount(useHook)
    storage.saveLoginAuth({ accessToken: 'B', id: 2, username: 'second' })
    await act(async () => { release(); await gate })
    assert.equal(clears, 0)
    assert.equal(storage.getStoredAccessToken(), 'B')
  })
}
