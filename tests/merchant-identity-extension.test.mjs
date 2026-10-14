import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { AxiosError } from 'axios'
import { createIdentityExtensionData } from './browser/merchant-identity-extension-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceProvider } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceProvider.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { default: Boost } = await server.ssrLoadModule('/src/pages/merchantVerifiedBoost/MerchantVerifiedBoostPage.tsx')
const { default: Reverification } = await server.ssrLoadModule('/src/pages/merchantPlaceReverification/MerchantPlaceReverificationPage.tsx')
let root, data, calls, failing, gate, mutationGate, cleared
const dialog = () => document.querySelector('[role="dialog"]')
const buttons = (text, scope = document) => [...scope.querySelectorAll('button')].filter(element => element.textContent.trim() === text)
const info = (id, scope = document) => scope.querySelector(`[aria-label="장소 #${id} 정보"]`)
const details = () => calls.filter(config => /^\/merchant-owner\/places\/\d+$/.test(config.url))
const writes = () => calls.filter(config => config.method === 'post')
function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
async function click(element) { assert.ok(element); await act(async () => element.click()) }
async function mount(Page, userId = 99) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { user: { id: userId, username: `synthetic${userId}`, role: 'MERCHANT_OWNER' }, clearAuth() { cleared++ }, logout() {} } },
    h(MerchantPlaceProvider, {}, h(MemoryRouter, {}, h(Page))))))
}
beforeEach(() => {
  localStorage.clear()
  root = createRoot(document.getElementById('root')); data = createIdentityExtensionData(); calls = []; failing = new Map(); gate = null; mutationGate = null; cleared = 0
  client.defaults.adapter = async config => {
    calls.push(config)
    const id = /^\/merchant-owner\/places\/(\d+)$/.exec(config.url)?.[1]
    const result = config.method === 'get' ? data.read(config.url) : null
    if (id && gate) await gate.promise
    if (id && failing.has(Number(id))) throw new AxiosError('Synthetic detail failure', 'ERR_BAD_RESPONSE', config, null, { status: failing.get(Number(id)), data: {}, config, headers: {} })
    if (config.method === 'post' && mutationGate) await mutationGate.promise
    return { config, data: config.method === 'get' ? result : data.write(config.url, JSON.parse(config.data || '{}')), status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

for (const Page of [Boost, Reverification]) {
  for (const count of [0, 1, 3]) test(`${Page.name}: ${count} places show name/address/ID without duplicate detail reads`, async () => {
    data = createIdentityExtensionData(count)
    await mount(Page)
    assert.equal(details().length, count)
    for (let id = 1; id <= count; id++) {
      assert.match(info(id).textContent, /같은 매장명/)
      assert.ok(info(id).textContent.includes(data.address(id)))
      assert.match(info(id).textContent, new RegExp(`장소 #${id}`))
    }
    assert.equal(writes().length, 0)
    if (count === 0) assert.match(document.body.textContent, Page === Boost ? /관리 권한이 연결된 장소가 없어/ : /현재 확인할 재확인 요청이 없습니다/)
  })
  test(`${Page.name}: partial identity failure and retry preserve other places and target`, async () => {
    failing.set(2, 403); await mount(Page)
    assert.match(info(1).textContent, /같은 매장명/)
    assert.match(info(2).textContent, /장소 #2 · 조회 실패/)
    assert.equal(cleared, 0)
    await click(buttons(Page === Boost ? '집행 중단' : '응답 작성')[1])
    assert.match(info(2, dialog()).textContent, /조회 실패/)
    failing.clear()
    await click(info(2, dialog()).querySelector('button'))
    assert.ok(info(2, dialog()).textContent.includes(data.address(2)))
    assert.equal(details().filter(config => config.url.endsWith('/1')).length, 1)
    assert.equal(details().filter(config => config.url.endsWith('/2')).length, 2)
    assert.equal(writes().length, 0)
  })
  test(`${Page.name}: late details update the matching open dialog without changing its ID`, async () => {
    gate = deferred(); await mount(Page)
    assert.match(info(2).textContent, /장소 #2 · 확인 중/)
    await click(buttons(Page === Boost ? '집행 중단' : '응답 작성')[1])
    assert.ok(info(2, dialog())); assert.equal(info(1, dialog()), null)
    await act(async () => gate.resolve()); gate = null
    assert.ok(info(2, dialog()).textContent.includes(data.address(2)))
    assert.equal(details().length, 2)
  })
}

test('boost selection keeps the selected place ID and idempotency key while locked', async () => {
  await mount(Boost); await click(buttons('상품 선택')[0])
  const current = dialog(), product = current.querySelector('select')
  await act(async () => { product.value = '2'; product.dispatchEvent(new window.Event('change', { bubbles: true })) })
  await click(current.querySelector('[role="combobox"]'))
  const options = [...document.querySelectorAll('[role="option"]')]
  assert.equal(options.length, 2); assert.ok(options[1].textContent.includes(data.address(2)))
  await click(options[1])
  mutationGate = deferred()
  await click(buttons('선택 완료', current)[0])
  assert.equal(current.querySelector('[role="combobox"]').disabled, true)
  await click(buttons('취소', current)[0]); assert.equal(dialog(), current)
  assert.deepEqual({ ...JSON.parse(writes()[0].data), idempotencyKey: 'exists' }, { productId: 2, placeId: 2, idempotencyKey: 'exists' })
  assert.ok(JSON.parse(writes()[0].data).idempotencyKey)
  await act(async () => mutationGate.resolve()); mutationGate = null
  assert.equal(dialog(), null); assert.equal(writes().length, 1); assert.equal(details().length, 2)
})

test('boost stop submits the execution matching the displayed place, not another row', async () => {
  await mount(Boost); await click(buttons('집행 중단')[1])
  assert.ok(info(2, dialog()).textContent.includes(data.address(2)))
  await click(buttons('집행 중단', dialog())[0])
  assert.equal(writes()[0].url, '/merchant-owner/verified-boost-executions/22/stop')
})

test('boost start submits the selection matching the displayed place, not its place ID', async () => {
  const read = data.read
  data.read = url => {
    const result = read(url)
    if (url.endsWith('/verified-boost-executions')) result.executions = result.executions.map(item => ({ ...item, status: 'EXPIRED' }))
    return result
  }
  await mount(Boost)
  assert.ok(info(2).textContent.includes(data.address(2)))
  await click(buttons('집행 시작')[1])
  assert.equal(writes()[0].url, '/merchant-owner/verified-boost-executions')
  assert.deepEqual(JSON.parse(writes()[0].data), { selectionId: 12 })
})

test('reverification response submits the request matching the displayed place and retains pending lock', async () => {
  await mount(Reverification); await click(buttons('응답 작성')[1])
  const current = dialog(), input = current.querySelector('textarea')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, '합성 응답')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  mutationGate = deferred(); await click(buttons('응답 제출', current)[0])
  assert.ok(info(2, current).textContent.includes(data.address(2)))
  await click(buttons('취소', current)[0]); assert.equal(dialog(), current)
  assert.equal(input.disabled, true)
  assert.equal(writes()[0].url, '/merchant-owner/place-information-reverification-requests/32/responses')
  assert.deepEqual(JSON.parse(writes()[0].data), { responseNote: '합성 응답' })
  await act(async () => mutationGate.resolve()); mutationGate = null
  assert.equal(dialog(), null)
})

test('boost disconnected profile removes picker option and marks historical records without inventing a name', async () => {
  data.profile.placeIds = [1]; failing.set(2, 404)
  await mount(Boost)
  assert.match(info(2).textContent, /조회 실패.*현재 관리 장소 목록에 없는 장소/s)
  await click(buttons('상품 선택')[0]); await click(dialog().querySelector('[role="combobox"]'))
  const options = [...document.querySelectorAll('[role="option"]')]
  assert.equal(options.length, 1); assert.match(options[0].textContent, /#1/)
  assert.equal(cleared, 0); assert.equal(writes().length, 0)
})

test('the two pages share cached identities across navigation', async () => {
  await mount(Boost); await mount(Reverification)
  assert.equal(details().length, 2)
  await click(buttons('응답 작성')[0]); assert.ok(info(1, dialog()).textContent.includes(data.address(1)))
  assert.equal(details().length, 2)
})

test('an account change discards late identity results from the previous session', async () => {
  gate = deferred(); await mount(Boost)
  localStorage.setItem('pingdom-auth-session', 'synthetic-second-session')
  data = createIdentityExtensionData(2, true)
  await mount(Boost, 100)
  await act(async () => gate.resolve()); gate = null
  assert.equal(details().length, 4)
  assert.ok(info(2).textContent.includes(data.address(2)))
  assert.ok(info(2).textContent.includes(data.name))
  assert.doesNotMatch(info(2).textContent, /같은 매장명/)
  assert.equal(writes().length, 0)
})
