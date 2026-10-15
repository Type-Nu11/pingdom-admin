import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<button id="trigger">정보 보정</button><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { AxiosError } = await import('axios')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { PlaceDataCorrectionDialog } = await server.ssrLoadModule('/src/components/place/PlaceDataCorrectionDialog.tsx')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { useAdminPlaces } = await server.ssrLoadModule('/src/hooks/useAdminPlaces.ts')
const api = await server.ssrLoadModule('/src/api/adminPlaceApi.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const place = { id: 1, name: '합성 장소', address: '합성 주소 123', category: 'CAFE', latitude: 37, longitude: 127, kakaoPlaceId: 'legacy-id-not-for-display' }
let root, calls, requests, closeCount, state, failed
beforeEach(() => {
  calls = []; requests = []; closeCount = 0; failed = false
  root = createRoot(document.getElementById('root'))
  client.defaults.adapter = async config => {
    requests.push(config)
    assert.doesNotMatch(config.url, /kakao/i)
    let data
    if (config.method === 'get') {
      data = config.url === '/admin/places'
        ? { places: [place], page: 1, limit: 10, totalCount: 1, totalPages: 1, hasNext: false }
        : place
    } else {
      assert.equal(config.method, 'patch', 'only synthetic correction requests are supported')
      const response = { config, data: { code: 'SERVICE_UNAVAILABLE' }, status: 503, statusText: 'Unavailable', headers: {} }
      if (failed) throw new AxiosError('Synthetic failure', 'ERR_BAD_RESPONSE', config, {}, response)
      data = { ...JSON.parse(config.data), placeId: 1, geocodingSource: 'ADMIN', modifiedAt: '2026-10-15T00:00:00Z', message: '합성 보정 완료' }
    }
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function renderDialog(extra = {}) {
  const update = action => async payload => { calls.push({ action, payload }); return false }
  await act(async () => root.render(h(PlaceDataCorrectionDialog, {
    place, updatingAction: null, errorMessages: { 'basic-information': '', geocoding: '', coordinates: '' },
    onClearError() {}, onClose() { closeCount++ },
    onUpdateBasicInformation: update('basic-information'), onUpdateGeocoding: update('geocoding'),
    onUpdateCoordinates: update('coordinates'), ...extra,
  })))
}
const tabs = () => [...document.querySelectorAll('[role="tab"]')]
async function selectTab(text) { await act(async () => tabs().find(tab => tab.textContent === text).click()) }
async function fill(text, value) {
  const label = [...document.querySelectorAll('label')].find(label => label.querySelector('span')?.textContent === text)
  assert.ok(label, text)
  const input = label.querySelector('input, textarea')
  const prototype = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}
async function submit() {
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
}
test('three correction tabs retain keyboard/panel semantics without a Kakao operation', async () => {
  await renderDialog()
  assert.deepEqual(tabs().map(tab => tab.textContent), ['기본 정보', '주소·좌표', '좌표만'])
  assert.doesNotMatch(document.body.textContent, /Kakao|legacy-id-not-for-display/)
  for (const tab of tabs()) {
    await act(async () => tab.click())
    assert.equal(tab.getAttribute('aria-selected'), 'true')
    assert.equal(document.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby'), tab.id)
  }
  const last = tabs().at(-1)
  last.focus()
  await act(async () => last.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  assert.equal(document.activeElement, tabs()[0])
  assert.equal(last.getAttribute('aria-selected'), 'true', 'arrow focus alone does not submit or activate')
  assert.deepEqual(calls, [])
})
test('basic information retains required reason and its original payload', async () => {
  await renderDialog()
  await fill('장소명 *', '수정된 합성 장소')
  await submit()
  assert.match(document.querySelector('[role="alert"]').textContent, /보정 사유/)
  assert.deepEqual(calls, [])
  await fill('보정 사유 *', '합성 검증')
  await submit()
  assert.deepEqual(calls, [{ action: 'basic-information', payload: { name: '수정된 합성 장소', category: 'CAFE', reason: '합성 검증' } }])
})
test('address and coordinate correction preserves its validation and payload', async () => {
  await renderDialog()
  await selectTab('주소·좌표')
  await fill('대표 주소 *', '수정된 합성 주소')
  await submit()
  assert.match(document.querySelector('[role="alert"]').textContent, /보정 사유/)
  await fill('보정 사유 *', '합성 주소 확인')
  await submit()
  assert.deepEqual(calls, [{ action: 'geocoding', payload: { address: '수정된 합성 주소', roadAddress: '', jibunAddress: '', postalCode: '', latitude: 37, longitude: 127, reason: '합성 주소 확인' } }])
})
test('coordinate-only correction rejects invalid/unchanged coordinates and keeps other fields out', async () => {
  await renderDialog()
  await selectTab('좌표만')
  await submit()
  assert.match(document.querySelector('[role="alert"]').textContent, /현재 좌표와 다른/)
  await fill('위도 *', '91')
  await submit()
  assert.match(document.querySelector('[role="alert"]').textContent, /위도는 -90 이상 90 이하/)
  await fill('위도 *', '37.5')
  await submit()
  assert.deepEqual(calls, [{ action: 'coordinates', payload: { latitude: 37.5, longitude: 127 } }])
})
test('busy state prevents all tab changes, cancellation and duplicate submissions', async () => {
  await renderDialog({ updatingAction: 'coordinates' })
  assert.ok(tabs().every(tab => tab.disabled))
  await submit()
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })))
  assert.deepEqual(calls, [])
  assert.equal(closeCount, 0)
})
test('failure message remains visible and cancel/Escape does not submit changes', async () => {
  await renderDialog({ errorMessages: { 'basic-information': '합성 API 조회 실패', geocoding: '', coordinates: '' } })
  assert.match(document.querySelector('[role="alert"]').textContent, /API 조회 실패/)
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '취소').click())
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })))
  assert.equal(closeCount, 2)
  assert.deepEqual(calls, [])
})
function Probe() { state = useAdminPlaces(); return null }
async function mountHook() {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() {} } }, h(Probe))))
  await act(async () => { await state.fetchAdminPlaceDetail(1) })
}
const corrections = [
  ['basic-information', 'updatePlaceBasicInformation', { name: '수정된 장소', category: 'RESTAURANT', reason: '합성 검증' }, { name: '수정된 장소' }],
  ['geocoding', 'updatePlaceGeocoding', { address: '새 주소', roadAddress: '새 도로명', jibunAddress: '', postalCode: '12345', latitude: 37.5, longitude: 127.5, reason: '합성 검증' }, { address: '새 주소', latitude: 37.5, longitude: 127.5 }],
  ['coordinates', 'updatePlaceCoordinates', { latitude: 37.6, longitude: 127.6 }, { latitude: 37.6, longitude: 127.6 }],
]
for (const [action, method, payload, patch] of corrections) {
  test(`${action}: synthetic API updates list and detail without changing legacy IDs`, async () => {
    await mountHook()
    assert.equal(api.updateAdminPlaceKakaoPlaceId, undefined)
    assert.equal(state.updatePlaceKakaoPlaceId, undefined)
    let result
    await act(async () => { result = await state[method](1, payload) })
    assert.equal(result, true)
    const request = requests.find(request => request.method === 'patch')
    assert.equal(request.url, `/admin/places/1/${action}`)
    assert.deepEqual(JSON.parse(request.data), payload)
    for (const current of [state.placeDetail, state.places[0]]) {
      for (const [key, value] of Object.entries(patch)) assert.equal(current[key], value)
      assert.equal(current.kakaoPlaceId, place.kakaoPlaceId)
    }
    assert.equal(state.updatingPlaceIds[action], null)
    assert.equal(state.updateErrorMessages[action], '')
    assert.equal('kakao-place-id' in state.updatingPlaceIds, false)
  })
  test(`${action}: synthetic API failure preserves data and resets busy state`, async () => {
    await mountHook()
    failed = true
    let result
    await act(async () => { result = await state[method](1, payload) })
    assert.equal(result, false)
    assert.equal(state.placeDetail.name, place.name)
    assert.equal(state.placeDetail.latitude, place.latitude)
    assert.equal(state.places[0].address, place.address)
    assert.equal(state.updatingPlaceIds[action], null)
    assert.ok(state.updateErrorMessages[action])
  })
}
