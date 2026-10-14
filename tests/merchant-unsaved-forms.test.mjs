import assert from 'node:assert/strict'
import { test, beforeEach, afterEach, after } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { createMerchantUnsavedData, merchantUnsavedPages } from './browser/merchant-unsaved-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useState, useCallback, useMemo } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createMemoryRouter, RouterProvider, Outlet, useNavigate } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { UnsavedChangesProvider } = await server.ssrLoadModule('/src/components/common/UnsavedChangesProvider.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const pages = {}
for (const [kind, path] of Object.entries(merchantUnsavedPages)) pages[kind] = (await server.ssrLoadModule(`/src/pages/${path}.tsx`)).default
let root, router, calls, failure, queryFailure, gate, data
const button = (text, scope = document) => [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === text)
const confirmation = () => [...document.querySelectorAll('[role="dialog"]')].find(element => element.textContent.includes('저장하지 않은 변경'))
const click = async element => { assert.ok(element); await act(async () => element.click()) }
async function fill(element, value) {
  assert.ok(element)
  await act(async () => {
    const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value)
    element.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}
function Layout() {
  const [id, setId] = useState(1)
  const [account, setAccount] = useState(99)
  const navigate = useNavigate()
  const syncPlaces = useCallback(() => 1, [])
  const selection = useMemo(() => ({ selectedPlaceId: id, selectPlace: setId, syncPlaces }), [id, syncPlaces])
  const auth = useMemo(() => ({ user: { id: account, username: '합성 QA', role: 'MERCHANT_OWNER' }, clearAuth() {}, logout() {} }), [account])
  return h(AuthContext.Provider, { value: auth },
    h(MerchantPlaceContext.Provider, { value: selection }, h(UnsavedChangesProvider, { key: account },
      h('button', { onClick: () => navigate('/other') }, '화면 이동'),
      h('button', { onClick: () => setAccount(value => value + 1) }, '계정 변경'),
      h(Outlet))))
}
async function mount(kind) {
  router = createMemoryRouter([{ element: h(Layout), children: [{ path: '/form', element: h(pages[kind]) }, { path: '/other', element: h('p', null, 'other') }, { path: '/login', element: h('p', null, 'login') }] }], { initialEntries: ['/form'] })
  await act(async () => root.render(h(RouterProvider, { router })))
  if (kind === 'availability') await click([...document.querySelectorAll('button')].find(element => element.textContent.startsWith('일반 장소 예약') && element.textContent.includes('잔여')))
  if (kind === 'notices') await click([...document.querySelectorAll('button')].find(element => element.textContent.startsWith('합성 공지 1')))
  if (kind === 'response') await click(button('응답 작성'))
}
async function dirty(kind) {
  if (kind === 'products') await fill(document.querySelector('input[maxlength="100"]'), '합성 상품 수정')
  if (kind === 'availability') await fill(document.querySelector('input[type="number"]'), '7')
  if (kind === 'notices' || kind === 'response') await fill(document.querySelector('textarea'), '합성 입력 수정')
  if (kind === 'operations') await click(button('일정 추가'))
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); data = createMerchantUnsavedData(); calls = []; failure = false; queryFailure = false; gate = null
  client.defaults.adapter = async config => {
    calls.push(config)
    if (gate && config.method !== 'get') await gate.promise
    if ((failure && config.method !== 'get') || (queryFailure && config.method === 'get')) throw Object.assign(new Error('Synthetic failure'), { isAxiosError: true, config, response: { config, status: 500, data: { message: '합성 저장 실패' }, headers: {} } })
    const value = config.method === 'get' ? data.read(config.url) : data.write(config.url, config.data ? JSON.parse(config.data) : {})
    return { config, data: value, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()); router?.dispose() })
after(async () => { await server.close(); dom.window.close() })

for (const kind of Object.keys(pages)) {
  test(`${kind}: unchanged, continue/discard and beforeunload protect the actual form`, async () => {
    await mount(kind)
    const event = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(event)
    assert.equal(event.defaultPrevented, false)
    await dirty(kind)
    const changed = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(changed)
    assert.equal(changed.defaultPrevented, true)
    await click(button('화면 이동')); assert.ok(confirmation())
    await click(button('계속 작성')); assert.equal(router.state.location.pathname, '/form')
    await click(button('화면 이동')); await click(button('변경 버리고 이동'))
    assert.equal(router.state.location.pathname, '/other')
    assert.ok(calls.every(call => call.method === 'get'))
  })
  test(`${kind}: account remount and login redirect never retain private input`, async () => {
    await mount(kind); await dirty(kind); await click(button('계정 변경'))
    assert.equal(confirmation(), undefined)
    assert.ok(!document.body.textContent.includes('합성 입력 수정'))
    if (kind === 'response') await click(button('응답 작성'))
    await dirty(kind)
    await act(async () => router.navigate('/login', { replace: true }))
    assert.equal(router.state.location.pathname, '/login'); assert.equal(confirmation(), undefined)
  })
}
for (const [kind, submit] of [['products', '상품 등록'], ['availability', '시간 저장'], ['notices', '공지 저장'], ['response', '응답 제출']]) {
  test(`${kind}: failed save keeps input and busy guard; successful retry clears the baseline`, async () => {
    await mount(kind); await dirty(kind)
    let resolve; gate = { promise: new Promise(r => { resolve = r }) }; failure = true
    await click(button(submit))
    await click(button('화면 이동')); assert.ok(confirmation()); assert.equal(button('변경 버리고 이동').disabled, true)
    await click(button('계속 작성'))
    await act(async () => { resolve(); await new Promise(r => setTimeout(r, 0)) }); gate = null
    assert.match(document.body.textContent, /합성 저장 실패/)
    await click(button('화면 이동')); assert.ok(confirmation()); await click(button('계속 작성'))
    failure = false; await click(button(submit)); await click(button('화면 이동'))
    assert.equal(router.state.location.pathname, '/other'); assert.equal(confirmation(), undefined)
    assert.equal(calls.filter(call => call.method !== 'get').length, 2)
  })
}
test('operations: restoring a schedule ignores regenerated row IDs; status save preserves another dirty form', async () => {
  await mount('operations'); await click(button('일정 추가'))
  await click(document.querySelector('button[aria-label="예외 일정 삭제"]'))
  let event = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); assert.equal(event.defaultPrevented, false)
  await click(button('일정 추가'))
  await click(document.querySelector('input[value="TEMPORARILY_CLOSED"]'))
  await click(button('상태 저장'))
  assert.ok(document.querySelector('button[aria-label="예외 일정 삭제"]'))
  await click(button('화면 이동')); assert.ok(confirmation())
})
test('operations: successful and failed schedule saves keep a stable editor and clean only saved input', async () => {
  await mount('operations'); await click(document.querySelector('input[type="checkbox"]'))
  failure = true; await click(button('영업시간 저장')); assert.match(document.body.textContent, /합성 저장 실패/)
  assert.equal(document.querySelector('input[type="checkbox"]').checked, true)
  await click(button('화면 이동')); await click(button('계속 작성'))
  failure = false; await click(button('영업시간 저장'))
  assert.equal(document.querySelector('input[type="checkbox"]').checked, true)
  await click(button('화면 이동')); assert.equal(router.state.location.pathname, '/other')
})
test('response: close/Escape/backdrop confirmation leaves the parent draft intact until discard', async () => {
  await mount('response'); await dirty('response')
  const parent = document.querySelector('[role="dialog"]')
  for (const action of [() => button('취소', parent).click(), () => parent.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), () => parent.parentElement.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))]) {
    await act(async () => action()); assert.ok(confirmation())
    await click(button('계속 작성')); assert.equal(parent.querySelector('textarea').value, '합성 입력 수정')
  }
  await click(button('취소', parent)); await click(button('변경 버리고 이동'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  await click(button('응답 작성')); assert.equal(document.querySelector('textarea').value, '')
})

for (const kind of ['products', 'availability', 'notices', 'operations']) {
  test(`${kind}: canceled store switch retains input; confirmed switch starts another store cleanly`, async () => {
    await mount(kind); await dirty(kind)
    const select = document.querySelector('[role="combobox"][aria-label$="장소 선택"]')
    const selectStore = async () => { await click(select); await click([...document.querySelectorAll('[role="option"]')].find(element => element.textContent.includes('연결 장소 #2'))) }
    await selectStore(); assert.ok(confirmation())
    await click(button('계속 작성')); assert.match(select.textContent, /#1/)
    await selectStore(); await click(button('변경 버리고 이동'))
    assert.match(select.textContent, /#2/)
    const event = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(event)
    assert.equal(event.defaultPrevented, false)
    assert.ok(calls.every(call => call.method === 'get'))
  })
  test(`${kind}: approved refresh resets only after success; query failure keeps editable draft protected`, async () => {
    await mount(kind); await dirty(kind); await click(button('새로고침')); assert.ok(confirmation())
    await click(button('계속 작성'))
    queryFailure = true; await click(button('새로고침')); await click(button('변경 버리고 이동'))
    const event = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(event)
    assert.equal(event.defaultPrevented, true)
    await click(button('화면 이동')); assert.ok(confirmation())
    assert.equal(button('변경 버리고 이동').disabled, false, 'query failure must not trap the user as saving')
    await click(button('계속 작성'))
    queryFailure = false; await click(button('새로고침')); await click(button('변경 버리고 이동'))
    const clean = new window.Event('beforeunload', { cancelable: true }); window.dispatchEvent(clean)
    assert.equal(clean.defaultPrevented, false)
  })
}
test('products: selecting CLASS then saving clears the name without a stale dirty baseline', async () => {
  await mount('products')
  const select = document.querySelector('[role="combobox"][aria-label="예약 상품 유형"]')
  await click(select); await click([...document.querySelectorAll('[role="option"]')].find(element => element.textContent.includes('클래스')))
  await dirty('products'); await click(button('상품 등록'))
  assert.match(select.textContent, /클래스/); assert.equal(document.querySelector('input[maxlength="100"]').value, '')
  await click(button('화면 이동')); assert.equal(router.state.location.pathname, '/other')
})
test('notices: filtering does not discard edited text and scoped cancel-reason close does not discard parent input', async () => {
  await mount('notices'); await dirty('notices'); await click(button('노출 중'))
  assert.equal(confirmation(), undefined); assert.equal(document.querySelector('textarea').value, '합성 입력 수정')
  await click(button('공지 취소'))
  const parent = document.querySelector('[role="dialog"]')
  await fill(parent.querySelector('textarea'), '합성 취소 사유'); await click(button('돌아가기', parent)); assert.ok(confirmation())
  await click(button('계속 작성')); assert.equal(parent.querySelector('textarea').value, '합성 취소 사유')
  await click(button('돌아가기', parent)); await click(button('변경 버리고 이동'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(document.querySelector('textarea').value, '합성 입력 수정')
  await click(button('화면 이동')); assert.ok(confirmation())
})
for (const kind of ['products', 'availability', 'notices']) test(`${kind}: restoring the original value does not leave a warning`, async () => {
  await mount(kind); await dirty(kind)
  const field = kind === 'products' ? document.querySelector('input[maxlength="100"]') : kind === 'availability' ? document.querySelector('input[type="number"]') : document.querySelector('textarea')
  await fill(field, kind === 'products' ? '' : kind === 'availability' ? '5' : '합성 공지 1')
  await click(button('화면 이동')); assert.equal(router.state.location.pathname, '/other'); assert.equal(confirmation(), undefined)
})
test('notices: expired notices remain read-only and do not block navigation', async () => {
  data.write('/merchant-owner/places/1/operating-notices/1', { status: 'EXPIRED' })
  await mount('notices'); assert.equal(document.querySelector('textarea').disabled, true)
  await click(button('화면 이동')); assert.equal(router.state.location.pathname, '/other')
})
