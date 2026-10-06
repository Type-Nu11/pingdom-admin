import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { createMerchantDialogData } from './browser/merchant-dialog-data.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useRef, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { AppDialog } = await server.ssrLoadModule('/src/components/common/AppDialog.tsx')
const pages = {}
for (const [kind, path] of [['refund', 'merchantPayments/MerchantPaymentsPage'], ['review', 'merchantPlaceReview/MerchantPlaceReviewPage'], ['response', 'merchantPlaceReverification/MerchantPlaceReverificationPage'], ['selection', 'merchantVerifiedBoost/MerchantVerifiedBoostPage']]) pages[kind] = (await server.ssrLoadModule(`/src/pages/${path}.tsx`)).default
pages.stop = pages.selection
const scenarios = [
  ['refund', '전액 환불', '전액 환불', '닫기', '/merchant-owner/payments/1/refund'],
  ['review', '삭제 요청', '삭제 요청 제출', '취소', '/merchant-owner/places/1/reviews/1/deletion-requests'],
  ['response', '응답 작성', '응답 제출', '취소', '/merchant-owner/place-information-reverification-requests/1/responses'],
  ['selection', '상품 선택', '선택 완료', '취소', '/merchant-owner/verified-boost-selections'],
  ['stop', '집행 중단', '집행 중단', '돌아가기', '/merchant-owner/verified-boost-executions/1/stop'],
]
let root, data, gate, failureStatus, calls, cleared
const response = (config, value) => ({ config, data: value, status: 200, statusText: 'OK', headers: {} })
function deferred() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const dialog = () => document.querySelector('[role="dialog"]')
const button = (text, scope = document) => [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === text)
async function click(element) { assert.ok(element); await act(async () => element.click()) }
async function settle() { await act(async () => { await new Promise(resolve => window.requestAnimationFrame(resolve)) }) }
async function mount(child) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { cleared++ }, logout() {}, user: { id: 99, username: '합성 QA', role: 'MERCHANT_OWNER' } } },
    h(MerchantPlaceContext.Provider, { value: { selectedPlaceId: 1, syncPlaces: () => 1, selectPlace() {} } }, h(MemoryRouter, {}, child)))))
}
async function open([kind, opener]) {
  await mount(h(pages[kind]))
  const trigger = button(opener)
  trigger.focus()
  await click(trigger); await settle()
  const input = dialog().querySelector('textarea')
  if (input) await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(input, '합성 응답 내용')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  return trigger
}
beforeEach(() => {
  root = createRoot(document.getElementById('root')); data = createMerchantDialogData(); gate = null; failureStatus = null; calls = []; cleared = 0
  client.defaults.adapter = async config => {
    calls.push(config)
    if (config.method === 'get') return response(config, data.read(config.url))
    assert.equal(config.method, 'post')
    if (gate) await gate.promise
    if (failureStatus) throw Object.assign(new Error('Synthetic failure'), { isAxiosError: true, config, response: { config, status: failureStatus, data: { message: '합성 처리 실패' }, headers: {} } })
    return response(config, data.write(config.url, config.data ? JSON.parse(config.data) : {}))
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

for (const scenario of scenarios) {
  const [kind, , submitText, cancelText, path] = scenario
  test(`${kind}: named dialog traps keyboard focus, escapes safely and restores opener`, async () => {
    const trigger = await open(scenario)
    const current = dialog()
    assert.ok(document.getElementById(current.getAttribute('aria-labelledby'))?.textContent)
    assert.ok(document.getElementById(current.getAttribute('aria-describedby'))?.textContent)
    const first = current.querySelector('button[aria-label="닫기"]'), last = button(submitText, current)
    first.focus()
    await act(async () => first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })))
    assert.equal(document.activeElement, last)
    await act(async () => last.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
    assert.equal(document.activeElement, first)
    await act(async () => first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    assert.equal(dialog(), null); assert.equal(document.activeElement, trigger)
    assert.ok(calls.every(c => c.method === 'get'))
  })
  test(`${kind}: delayed request blocks every dismiss path, preserves failure input and retries once`, async () => {
    const trigger = await open(scenario)
    const current = dialog(), input = current.querySelector('textarea'), submit = button(submitText, current)
    const selected = [...current.querySelectorAll('select')].map(x => x.value)
    gate = deferred(); failureStatus = 500
    await click(submit); await click(submit); await settle()
    await click(current.querySelector('button[aria-label="닫기"]')); await click(button(cancelText, current))
    await act(async () => {
      const backdropEvent = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true })
      current.parentElement.dispatchEvent(backdropEvent)
      assert.equal(backdropEvent.defaultPrevented, true, 'blocked backdrop clicks retain dialog focus')
      current.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      current.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    })
    assert.equal(dialog(), current); assert.equal(document.activeElement, current)
    assert.ok([...current.querySelectorAll('button,select,textarea')].every(x => x.disabled))
    assert.equal(calls.filter(c => c.method === 'post').length, 1)
    assert.equal(calls.find(c => c.method === 'post').url, path)
    await act(async () => { gate.resolve(); await new Promise(r => setTimeout(r, 0)) }); gate = null
    assert.match(current.querySelector('[role="alert"]').textContent, /합성 처리 실패/)
    assert.equal(dialog(), current); assert.equal(trigger.isConnected, true)
    if (input) assert.equal(input.value, '합성 응답 내용')
    assert.deepEqual([...current.querySelectorAll('select')].map(x => x.value), selected)
    assert.equal(current.querySelector('button[aria-label="닫기"]').disabled, false)
    failureStatus = null
    await click(button(submitText, current)); await settle()
    assert.equal(dialog(), null)
    const mutations = calls.filter(c => c.method === 'post')
    assert.equal(mutations.length, 2)
    if (kind === 'selection') assert.equal(JSON.parse(mutations[0].data).idempotencyKey, JSON.parse(mutations[1].data).idempotencyKey)
    if (kind === 'review') assert.equal(JSON.parse(mutations[1].data).requestReason, '합성 응답 내용')
    if (kind === 'response') assert.equal(JSON.parse(mutations[1].data).responseNote, '합성 응답 내용')
    assert.equal(document.activeElement, kind === 'selection' ? trigger : document.querySelector('h1'))
  })
  test(`${kind}: action error persists without a timer and a new dialog clears it without retrying`, async () => {
    const trigger = await open(scenario)
    const originalTimer = window.setTimeout
    const delays = []
    window.setTimeout = (...args) => { delays.push(args[1]); return originalTimer.apply(window, args) }
    try {
      failureStatus = 500
      await click(button(submitText, dialog()))
      assert.match(dialog().querySelector('[role="alert"]').textContent, /합성 처리 실패/)
      assert.equal(delays.includes(5000), false, 'modal errors must not silently expire after five seconds')
      await click(button(cancelText, dialog()))
      await click(trigger)
      assert.equal(dialog().querySelector('[role="alert"]'), null)
      assert.equal(calls.filter(c => c.method === 'post').length, 1)
    } finally { window.setTimeout = originalTimer }
  })
}
test('selection: long description keeps server failure in the non-scrolling action footer', async () => {
  await open(scenarios[3]); failureStatus = 500
  const current = dialog(), form = current.querySelector('form'), submit = button('선택 완료', current)
  assert.ok(form.textContent.length > 500, 'exercise the long product description fixture')
  const selected = [...form.querySelectorAll('select')].map(element => element.value)
  await click(submit)
  const alert = current.querySelector('[role="alert"]'), footer = submit.closest('footer')
  assert.match(alert.textContent, /합성 처리 실패/)
  assert.ok(footer.contains(alert), 'failure feedback stays outside the scrollable description body')
  assert.equal(form.contains(alert), false)
  assert.ok(alert.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.deepEqual([...form.querySelectorAll('select')].map(element => element.value), selected)
  assert.equal(submit.disabled, false)
})
test('selection: duplicate pair validation is shown beside actions without a request', async () => {
  await open(scenarios[3])
  const current = dialog(), product = current.querySelector('select')
  await act(async () => {
    product.value = '1'
    product.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  const submit = button('선택 완료', current)
  await click(submit)
  const alert = current.querySelector('[role="alert"]')
  assert.match(alert.textContent, /이미 선택된 상품과 장소 조합/)
  assert.ok(submit.closest('footer').contains(alert))
  assert.equal(calls.filter(config => config.method === 'post').length, 0)
})
for (const code of [401, 403, 409]) test(`refund HTTP ${code} keeps target visible and existing auth/permission handling`, async () => {
  await open(scenarios[0]); failureStatus = code
  await click(button('전액 환불', dialog()))
  assert.ok(dialog()); assert.match(dialog().textContent, /결제 #1.*2,050 USD/s)
  assert.ok(dialog().querySelector('[role="alert"]'))
  assert.equal(cleared > 0, code === 401)
  assert.equal(calls.filter(c => c.method === 'post').length, 1)
})
test('nested dialog consumes Escape without also dismissing its parent', async () => {
  let outerClosed = 0
  function Nested() {
    const [open, setOpen] = useState(false)
    const fallback = useRef(null)
    return h(AppDialog, { title: '바깥', onClose: () => outerClosed++ }, h('button', { ref: fallback, onClick: () => setOpen(true) }, '안쪽 열기'), open ? h(AppDialog, { title: '안쪽', onClose: () => setOpen(false), fallbackFocusRef: fallback }, '합성 확인') : null)
  }
  await mount(h(Nested)); await settle(); const trigger = button('안쪽 열기'); trigger.focus(); await click(trigger); await settle()
  const inner = [...document.querySelectorAll('[role="dialog"]')].at(-1)
  await act(async () => inner.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1); assert.equal(outerClosed, 0); assert.equal(document.activeElement, trigger)
})
