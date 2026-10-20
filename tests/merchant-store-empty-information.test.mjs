import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, mock, test } from 'node:test'
import { AxiosError } from 'axios'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { useMerchantStore } = await server.ssrLoadModule('/src/hooks/useMerchantStore.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const informationPath = '/merchant-owner/places/1/information'
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces() { return 1 } }
let root, state, failure, requests, cleared, errorLog

function Probe() {
  state = useMerchantStore()
  return h('div', null, state.sectionErrorMessage ? h('p', { role: 'alert' }, state.sectionErrorMessage) : null)
}
async function mount() {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { cleared++ } } },
    h(MerchantPlaceContext.Provider, { value: places }, h(Probe)))))
}
beforeEach(() => {
  root = createRoot(document.getElementById('root'))
  state = null; failure = null; requests = []; cleared = 0
  errorLog = mock.method(console, 'error', () => {})
  client.defaults.adapter = async config => {
    requests.push({ method: config.method, url: config.url, data: config.data })
    if (failure && config.url === failure.path && config.method === 'get') {
      const response = { status: failure.status, data: failure.data, headers: {}, config }
      const error = new AxiosError('synthetic failure', 'ERR_BAD_RESPONSE', config, null, response)
      error.isRefreshFailure = failure.refreshFailure
      throw error
    }
    let data = {}
    if (config.url.endsWith('/me')) data = { placeIds: [1] }
    else if (config.url === informationPath) data = { placeId: 1, description: '저장한 소개' }
    else if (config.url.endsWith('/campaigns')) data = { items: [{ id: 1, placeId: 1 }] }
    else if (config.url.endsWith('/offers')) data = { offers: [{ id: 2, placeId: 1 }] }
    else if (config.url.endsWith('/availabilities')) data = [{ id: 3, placeId: 1 }]
    else if (config.url.endsWith('/operating-notices')) data = { notices: [{ id: 4 }] }
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()); errorLog.mock.restore() })
after(async () => { await server.close(); dom.window.close() })

test('unregistered extra information is an empty state without alert, debug error or automatic write', async () => {
  failure = { path: informationPath, status: 404, data: { code: 'PLACE_INFORMATION_NOT_FOUND' } }
  await mount()
  assert.equal(state.status, 'ready')
  assert.equal(state.placeInformation, null)
  assert.equal(state.sectionErrorMessage, '')
  assert.equal(document.querySelector('[role="alert"]'), null)
  assert.equal(errorLog.mock.callCount(), 0)
  assert.equal(cleared, 0)
  assert.equal(state.campaigns.length, 1)
  assert.equal(state.offers.length, 1)
  assert.equal(state.reservationAvailabilities.length, 1)
  assert.equal(state.operatingNotices.length, 1)
  assert.ok(requests.every(request => request.method === 'get'))
  await act(async () => assert.equal(await state.saveInformation({ description: '새 소개', contactPhone: '', websiteUrl: '', reservationUrl: '' }), true))
  assert.equal(state.placeInformation.description, '저장한 소개')
  assert.equal(requests.filter(request => request.method === 'put').length, 1)
})

for (const [name, status, data, refreshFailure] of [
  ['unknown 404', 404, {}],
  ['missing actual place', 404, { code: 'PLACE_NOT_FOUND' }],
  ['gateway HTML 404', 404, '<html>Not found</html>'],
  ['unauthorized', 401, { code: 'PLACE_INFORMATION_NOT_FOUND' }],
  ['forbidden', 403, { code: 'PLACE_INFORMATION_NOT_FOUND' }],
  ['server failure', 500, { code: 'PLACE_INFORMATION_NOT_FOUND' }],
  ['refresh failure', 404, { code: 'PLACE_INFORMATION_NOT_FOUND' }, true],
]) {
  test(`${name} remains a visible failure`, async () => {
    failure = { path: informationPath, status, data, refreshFailure }
    await mount()
    assert.ok(state.sectionErrorMessage)
    assert.ok(document.querySelector('[role="alert"]'))
    assert.equal(cleared, status === 401 ? 1 : 0)
  })
}

for (const suffix of ['campaigns', 'offers', 'availabilities', 'places/1/operating-notices']) {
  test(`missing-information code on ${suffix} must not hide a real failure`, async () => {
    failure = { path: `/merchant-owner/${suffix}`, status: 404, data: { code: 'PLACE_INFORMATION_NOT_FOUND' } }
    await mount()
    assert.ok(state.sectionErrorMessage)
    assert.equal(state.placeInformation.placeId, 1)
  })
}

test('retry clears a genuine prior warning when only optional information is unregistered', async () => {
  failure = { path: informationPath, status: 500, data: {} }
  await mount()
  assert.ok(state.sectionErrorMessage)
  failure = { path: informationPath, status: 404, data: { code: 'PLACE_INFORMATION_NOT_FOUND' } }
  await act(async () => state.fetchPlaceData(1))
  assert.equal(state.sectionErrorMessage, '')
  assert.equal(state.placeInformation, null)
  assert.equal(document.querySelector('[role="alert"]'), null)
})
