import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useAdminPlaceDuplicateCandidates } = await server.ssrLoadModule('/src/hooks/useAdminPlaceDuplicateCandidates.ts')
const { useAdminPlaceMerge } = await server.ssrLoadModule('/src/hooks/useAdminPlaceMerge.ts')
const { default: CandidatePage } = await server.ssrLoadModule('/src/pages/placeDuplicateCandidate/PlaceDuplicateCandidatePage.tsx')
const { default: MergePage } = await server.ssrLoadModule('/src/pages/placeMerge/PlaceMergePage.tsx')
const auth = { clearAuth() {}, logout: async () => {}, user: { username: 'admin', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkEntries: [], pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
let root, requests, total, override, state, gate
function item(id, groups) {
  return groups ? { representativePlaceId: id, duplicatePlaceIds: [id, id + 100], reasons: ['동일 주소'] }
    : { candidateId: id, leftPlaceId: id, rightPlaceId: id + 100, matchReason: '동일 주소', confidenceScore: 0.9, status: 'PENDING' }
}
function pageData(config) {
  const page = config.params.page
  const limit = config.params.limit
  const groups = config.url === '/admin/places/duplicates'
  return {
    [groups ? 'groups' : 'candidates']: Array.from({ length: Math.max(0, Math.min(limit, total - (page - 1) * limit)) }, (_, i) => item((page - 1) * limit + i + 1, groups)),
    page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total,
    ...override,
  }
}
beforeEach(() => {
  requests = []; total = 25; override = {}; gate = null
  client.defaults.adapter = async config => {
    requests.push(config)
    assert.equal(config.method, 'get', 'verification must not mutate operating data')
    let data
    if (config.url.endsWith('/merge-histories')) data = { histories: [] }
    else if (config.url === '/admin/places/duplicates' || config.url === '/admin/places/duplicate-candidates') {
      data = pageData(config)
      if (gate && config.params.page === 2) await gate.promise
    } else if (config.url.startsWith('/admin/places/duplicate-candidates/')) {
      data = { ...item(Number(config.url.split('/').at(-1)), false), distanceMeters: 10 }
    } else if (config.url.startsWith('/admin/places/duplicates/')) {
      const id = Number(config.url.split('/').at(-1))
      data = { id, name: '테스트 장소', address: '테스트 주소', kakaoPlaceId: '', latitude: 37, longitude: 127, userId: 1, registrant: '테스트', photoCount: 0, candidates: [] }
    } else data = { id: Number(config.url.split('/').at(-1)), name: '테스트 장소', address: '테스트 주소', latitude: 37, longitude: 127, username: '테스트' }
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
function Probe({ groups }) { state = groups ? useAdminPlaceMerge() : useAdminPlaceDuplicateCandidates(); return null }
async function mount(Component, props = {}) {
  await act(async () => root.render(h(AuthContext.Provider, { value: auth },
    h(AdminNotificationContext.Provider, { value: notifications }, h(MemoryRouter, {}, h(Component, props))))))
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label)
  assert.ok(button, label)
  await act(async () => button.click())
}
for (const groups of [false, true]) {
  const label = groups ? 'groups' : 'candidates'
  const fetch = page => groups ? state.fetchDuplicateGroups(page) : state.fetchCandidates(state.status, page)
  const info = () => groups ? state.duplicatePageInfo : state.pageInfo
  const count = () => groups ? state.duplicateTotalCount : state.totalCount
  test(label + ': total-only contract, 25 records, current-page refresh and page fallback', async () => {
    await mount(Probe, { groups })
    assert.equal(count(), 25)
    assert.equal(info().page, 1)
    await act(async () => { await fetch(2) })
    assert.equal(info().page, 2)
    assert.equal((groups ? state.duplicateGroups : state.candidates).length, 5)
    await act(async () => { await fetch() })
    assert.equal(requests.at(-1).params.page, 2)
    total = 20
    await act(async () => { await fetch() })
    assert.equal(info().page, 1)
    assert.equal(count(), 20)
  })
  test(label + ': stale response cannot overwrite a newer page', async () => {
    await mount(Probe, { groups })
    let resolve
    gate = { promise: new Promise(r => { resolve = r }) }
    let pending
    await act(async () => { pending = fetch(2) })
    await act(async () => { await fetch(1) })
    await act(async () => { resolve(); await pending })
    assert.equal(info().page, 1)
    assert.equal((groups ? state.duplicateGroups[0].representativePlaceId : state.candidates[0].candidateId), 1)
  })
  for (const invalid of [undefined, -1, '25', 1.5]) test(label + ': invalid total ' + invalid + ' is not a successful empty list', async () => {
    override = { total: invalid }
    await mount(Probe, { groups })
    assert.ok(state.errorMessage)
  })
  test(label + ': valid zero is an empty list without an error', async () => {
    total = 0
    await mount(Probe, { groups })
    assert.equal(state.errorMessage, '')
    assert.equal(count(), 0)
  })
  test(label + ': missing pagination is an error, not a usable list', async () => {
    override = { totalPages: undefined }
    await mount(Probe, { groups })
    assert.ok(state.errorMessage)
  })
  test(label + ': page controls show all records and clear old detail selection', async () => {
    await mount(groups ? MergePage : CandidatePage)
    assert.match(document.body.textContent, /25(?:건|개)/)
    const first = [...document.querySelectorAll('button')].find(b => b.textContent.startsWith(groups ? '중복 후보 #1' : '후보 #1'))
    await act(async () => first.click())
    assert.ok(document.querySelector('[aria-pressed="true"]'))
    await click('2페이지로 이동')
    assert.equal(document.querySelector('[aria-current="page"]').textContent, '2')
    assert.equal(document.querySelector('[aria-pressed="true"]'), null)
    assert.match(document.body.textContent, /#21/)
    assert.equal([...document.querySelectorAll('button')].filter(b => b.textContent.startsWith(groups ? '중복 후보 #' : '후보 #')).length, 5)
  })
}
test('changing candidate status returns to page one; refreshing preserves the status', async () => {
  await mount(Probe)
  await act(async () => { await state.fetchCandidates('PENDING', 2) })
  await act(async () => { await state.fetchCandidates('CONFIRMED') })
  assert.deepEqual(requests.at(-1).params, { status: 'CONFIRMED', page: 1, limit: 20 })
  await act(async () => { await state.fetchCandidates() })
  assert.equal(requests.at(-1).params.status, 'CONFIRMED')
})
