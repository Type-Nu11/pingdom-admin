import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node', 'Event']) {
  globalThis[key] = dom.window[key]
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useMerchantOnboarding } = await server.ssrLoadModule('/src/hooks/useMerchantOnboarding.ts')
const originalAdapter = axios.defaults.adapter
const originalClientAdapter = client.defaults.adapter
const profile = { id: 1, status: 'ACTIVE', businessName: '기존 사업자' }
const verification = { id: 2, identityStatus: 'APPROVED', businessStatus: 'APPROVED' }
const context = { clearAuth: () => auth.clearStoredAuth() }
let root, latest, failedPath, directNotFound, refreshes

function response(config, data, status = 200) {
  return { config, data, status, statusText: 'OK', headers: {} }
}
function httpError(config, status) {
  return new axios.AxiosError('mock HTTP failure', 'ERR_BAD_REQUEST', config, {}, response(config, {}, status))
}
function Probe() {
  latest = useMerchantOnboarding()
  return null
}
async function mount() {
  await act(async () => root.render(h(AuthContext.Provider, { value: context }, h(Probe))))
}

beforeEach(() => {
  auth.saveLoginAuth({ accessToken: 'A', id: 1, username: 'merchant' })
  failedPath = null
  directNotFound = false
  refreshes = 0
  client.defaults.adapter = async config => {
    if (directNotFound) throw httpError(config, 404)
    if (failedPath && config.url.includes(failedPath)) throw httpError(config, 401)
    return response(config, config.url.endsWith('/merchant-owner-profile') ? profile : verification)
  }
  axios.defaults.adapter = async config => {
    assert.equal(config.url, '/auth/token/refresh')
    refreshes++
    throw httpError(config, 404)
  }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => {
  axios.defaults.adapter = originalAdapter
  client.defaults.adapter = originalClientAdapter
  await server.close()
  dom.window.close()
})

test('initial refresh 404 is a load error, not an empty onboarding result', async () => {
  failedPath = '/users/me/'
  await mount()
  assert.equal(latest.status, 'error')
  assert.ok(latest.errorMessage)
  assert.ok(refreshes > 0)
  assert.equal(auth.getStoredAccessToken(), 'A')
})

test('refresh 404 preserves loaded onboarding data and allows retry', async () => {
  await mount()
  assert.deepEqual(latest.profile, profile)
  failedPath = '/users/me/'
  await act(async () => latest.fetchOnboarding())
  assert.equal(latest.status, 'error')
  assert.ok(latest.errorMessage)
  assert.deepEqual(latest.profile, profile)
  assert.equal(auth.getStoredAccessToken(), 'A')
  failedPath = null
  await act(async () => latest.fetchOnboarding())
  assert.equal(latest.status, 'ready')
  assert.equal(latest.errorMessage, '')
  assert.deepEqual(latest.profile, profile)
})

for (const path of ['merchant-owner-profile']) {
  test(`${path} refresh 404 preserves data and reports a partial failure`, async () => {
    await mount()
    failedPath = path
    await act(async () => latest.fetchOnboarding())
    assert.equal(latest.status, 'error')
    assert.ok(latest.errorMessage)
    assert.deepEqual(latest.profile, profile)
  })
}

test('generic GET 404 is not treated as a new application', async () => {
  await mount()
  directNotFound = true
  await act(async () => latest.fetchOnboarding())
  assert.equal(latest.status, 'error')
  assert.ok(latest.errorMessage)
  assert.deepEqual(latest.profile, profile)
  assert.equal(refreshes, 0)
})

test('only PROFILE_NOT_FOUND allows a new application; legacy API is never requested', async () => {
  client.defaults.adapter = async config => {
    assert.equal(config.url, '/users/me/merchant-owner-profile')
    const error = httpError(config, 404)
    error.response.data = { code: 'PROFILE_NOT_FOUND' }
    throw error
  }
  await mount()
  assert.equal(latest.status, 'ready')
  assert.equal(latest.profile, null)
})
