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
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { useMerchantReservationSetup } = await server.ssrLoadModule('/src/hooks/useMerchantReservationSetup.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantReservationSetup/MerchantReservationSetupPage.tsx')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
let root, hook, adapter, clears
const item = { id: 1, placeId: 1, productId: null, productType: 'GENERAL', startsAt: '2027-10-01T10:00', endsAt: '2027-10-01T11:00', totalCapacity: 5, remainingCapacity: 5, status: 'ACTIVE' }
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const base = async config => response(config, config.url.endsWith('/me') ? { placeIds: [1, 2] } : config.url.endsWith('/availabilities') ? [item] : [])
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces(ids) { return ids[0] ?? null } }
function Probe() { hook = useMerchantReservationSetup(); return null }
async function render(child = h(Probe), value = places) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { clears++ }, user: { username: 'test' }, logout() {} } }, h(MerchantPlaceContext.Provider, { value }, h(MemoryRouter, {}, child)))))
}
beforeEach(() => { clears = 0; adapter = base; client.defaults.adapter = config => adapter(config); root = createRoot(document.getElementById('root')) })
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('product failure leaves time results available and retries independently', async () => {
  adapter = config => config.url.endsWith('/reservable-products') ? Promise.reject(new Error('offline')) : base(config)
  await render()
  assert.equal(hook.status, 'ready'); assert.equal(hook.productStatus, 'error'); assert.equal(hook.availabilityStatus, 'ready')
  await act(async () => { await hook.fetchAvailabilities() })
  assert.ok(hook.productError); assert.equal(hook.availabilities.length, 1)
  adapter = base
  await act(async () => { await hook.fetchProducts() })
  assert.equal(hook.productStatus, 'ready'); assert.equal(hook.productError, '')
})
for (const [endpoint, method, field] of [['availabilities', 'fetchAvailabilities', 'availabilities'], ['reservable-products', 'fetchProducts', 'products']]) {
  test(`${endpoint}: older response cannot overwrite a retry`, async () => {
    await render(); const gate = deferred(); let calls = 0
    adapter = async config => {
      if (config.url.endsWith('/' + endpoint)) {
        if (++calls === 1) { await gate.promise; return response(config, [{ ...item, id: 2 }]) }
        return response(config, [{ ...item, id: 3 }])
      }
      return base(config)
    }
    let old; await act(async () => { old = hook[method]() })
    await act(async () => { await hook[method]() })
    await act(async () => { gate.resolve(); await old })
    assert.equal(hook[field][0].id, 3)
  })
}
test('older profile failure cannot change a newer successful initial load', async () => {
  await render(); const gate = deferred(); let calls = 0
  adapter = async config => { if (config.url.endsWith('/me') && ++calls === 1) { await gate.promise; throw new Error('old') } return base(config) }
  let old; await act(async () => { old = hook.fetchInitialData() })
  await act(async () => { await hook.fetchInitialData() })
  await act(async () => { gate.resolve(); await old })
  assert.equal(hook.status, 'ready'); assert.equal(hook.errorMessage, '')
})
for (const status of [401, 403, 500]) test(`time HTTP ${status}: auth and retained results follow policy`, async () => {
  await render()
  adapter = async config => { throw Object.assign(new Error('failure'), { isAxiosError: true, config, response: { status, data: {}, config, headers: {} } }) }
  await act(async () => { await hook.fetchAvailabilities() })
  assert.equal(clears > 0, status === 401)
  assert.equal(hook.hasAvailabilityResult, status === 500)
  assert.equal(hook.availabilityStatus, 'error')
})
test('unmount invalidates pending queries', async () => {
  await render(); const gate = deferred(); adapter = async config => { await gate.promise; return base(config) }
  let pending; await act(async () => { pending = hook.fetchReservationSetup() })
  await act(async () => root.render(null))
  let result; await act(async () => { gate.resolve(); result = await pending })
  assert.equal(result, false)
})
test('successful save remains successful when later reload fails', async () => {
  await render()
  adapter = async config => response(config, { ...item, totalCapacity: 9 })
  await act(async () => { await hook.saveAvailability(1, {}) })
  adapter = async () => { throw new Error('offline') }
  await act(async () => { await hook.fetchAvailabilities() })
  assert.ok(hook.successMessage); assert.equal(hook.actionErrorMessage, '')
  assert.equal(hook.availabilities[0].totalCapacity, 9); assert.ok(hook.availabilityError)
})
test('draft survives retry and query loading prevents mutation', async () => {
  await render(h(Page))
  const capacity = document.querySelector('input[type="number"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(capacity, '17')
    capacity.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  const gate = deferred(); let mutations = 0
  adapter = async config => { if (config.method !== 'get') mutations++; await gate.promise; return base(config) }
  const refresh = [...document.querySelectorAll('button')].find(el => el.textContent === '새로고침')
  await act(async () => refresh.click())
  assert.equal(capacity.isConnected, true); assert.equal(capacity.value, '17'); assert.equal(capacity.disabled, true)
  await act(async () => capacity.closest('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(mutations, 0)
  await act(async () => { gate.resolve(); await new Promise(resolve => setTimeout(resolve, 0)) })
  assert.equal(document.querySelector('input[type="number"]'), capacity); assert.equal(capacity.value, '17'); assert.equal(capacity.disabled, false)
})
test('external place change clears selected editor target', async () => {
  adapter = config => config.url.endsWith('/availabilities') ? Promise.resolve(response(config, [item, { ...item, id: 2, placeId: 2 }])) : base(config)
  await render(h(Page))
  const entry = [...document.querySelectorAll('button')].find(el => el.textContent.includes('잔여 5'))
  await act(async () => entry.click())
  assert.ok(document.body.textContent.includes('시간 저장'))
  await render(h(Page), { ...places, selectedPlaceId: 2 })
  assert.ok(document.body.textContent.includes('시간 등록'))
  assert.ok(!document.body.textContent.includes('시간 저장'))
})

for (const explicitChoice of [false, true]) test(`delayed products use the displayed selection and preserve draft (explicit=${explicitChoice})`, async () => {
  const gate = deferred()
  const first = { id: 10, placeId: 1, name: 'First ticket', productType: 'TICKET', status: 'ACTIVE' }
  const second = { ...first, id: 20, name: 'Second ticket' }
  let products = [first, second]
  let submitted
  adapter = async config => {
    if (config.method !== 'get') {
      submitted = JSON.parse(config.data)
      return response(config, { ...item, ...submitted, id: 99 })
    }
    if (config.url.endsWith('/reservable-products')) { await gate.promise; return response(config, products) }
    return base(config)
  }
  await render(h(Page))
  const capacity = document.querySelector('input[type="number"]')
  assert.equal(capacity.disabled, true)
  await act(async () => { gate.resolve(); await new Promise(resolve => setTimeout(resolve, 0)) })
  const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
  const click = async el => { assert.ok(el); await act(async () => el.click()) }
  await click(document.querySelector('[aria-label="예약 대상"]'))
  await click(button('등록한 예약 상품'))
  assert.ok(document.querySelector('[aria-label="예약 상품 선택"]').textContent.includes(first.name))
  if (explicitChoice) {
    await click(document.querySelector('[aria-label="예약 상품 선택"]'))
    await click(button('Second ticket · 티켓'))
  }
  for (const [label, day] of [['예약 시작 일시', 10], ['예약 종료 일시', 11]]) {
    await click(document.querySelector(`[aria-label^="${label},"]`))
    await click(document.querySelector('[aria-label="다음 달"]'))
    const date = new Date(new Date().getFullYear(), new Date().getMonth() + 1, day)
    await click(document.querySelector(`[aria-label="${date.getFullYear()}년 ${date.getMonth() + 1}월 ${day}일"]`))
    await click(button('적용'))
  }
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(capacity, '17')
    capacity.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  const startsLabel = document.querySelector('[aria-label^="예약 시작 일시,"]').getAttribute('aria-label')
  if (explicitChoice) {
    products = [second, first]
    await click(button('새로고침'))
    assert.ok(document.querySelector('[aria-label="예약 상품 선택"]').textContent.includes(second.name))
  }
  assert.equal(document.querySelector('input[type="number"]'), capacity)
  assert.equal(capacity.value, '17')
  assert.equal(document.querySelector('[aria-label^="예약 시작 일시,"]').getAttribute('aria-label'), startsLabel)
  await click(button('시간 등록'))
  assert.equal(submitted.productId, explicitChoice ? second.id : first.id)
  assert.equal(submitted.totalCapacity, 17)
})
