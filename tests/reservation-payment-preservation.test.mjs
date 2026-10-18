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
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantPayments/MerchantPaymentsPage.tsx')
const { useMerchantPayments } = await server.ssrLoadModule('/src/hooks/useMerchantPayments.ts')
const payment = { id: 10, reservationId: 7, amountMinor: null, currency: null, status: 'PAID', provider: 'SYNTHETIC', createdAt: '2026-10-01T00:00:00' }
const settlement = { id: 20, paymentTransactionId: 10, entryType: 'PAYMENT', status: 'PENDING', grossAmountMinor: null, feeAmountMinor: null, netAmountMinor: null, currency: null, createdAt: '2026-10-01T00:00:00' }
const pageData = (key, rows) => ({ [key]: rows, page: 1, limit: 20, totalElements: rows.length, totalPages: 1, hasNext: false })
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
let root, state, calls, rows, handler
function Probe() { state = useMerchantPayments(); return null }
async function mount(child = h(Probe)) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() {}, logout() {}, user: { username: 'synthetic' } } }, h(MemoryRouter, {}, child))))
}
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text)
beforeEach(() => {
  root = createRoot(document.getElementById('root')); calls = []; rows = [payment]
  handler = config => response(config, { ...payment, status: 'REFUNDED' })
  client.defaults.adapter = async config => {
    calls.push(config)
    if (config.method !== 'get') {
      assert.equal(config.method, 'post')
      assert.equal(config.url, '/merchant-owner/payments/10/refund')
      return handler(config)
    }
    if (config.url === '/merchant-owner/payments') return response(config, pageData('payments', rows))
    if (config.url === '/merchant-owner/payments/settlements') return response(config, pageData('entries', [settlement]))
    throw Error(`Unexpected API ${config.url}`)
  }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('payment/settlement null amounts stay unknown and their existing identifiers stay visible', async () => {
  await mount(h(Page))
  assert.match(document.body.textContent, /결제 #10.*예약 #7 · 금액 정보 없음/)
  assert.doesNotMatch(document.body.textContent, /0원|0 KRW|0 USD/)
  await act(async () => button('정산 원장').click())
  assert.match(document.body.textContent, /결제 정산 #20.*결제 #10 · 총액 금액 정보 없음/s)
  assert.match(document.body.textContent, /수수료 금액 정보 없음 · 정산액 금액 정보 없음/)
  assert.ok(calls.every(call => call.method === 'get' && call.params.page === 1))
})

test('REFUND_PROCESSING is not complete and cannot initiate another refund', async () => {
  rows = [{ ...payment, status: 'REFUND_PROCESSING' }]
  await mount(h(Page))
  assert.match(document.body.textContent, /환불 처리 중/)
  assert.doesNotMatch(document.body.textContent, /환불 완료|전액 환불했습니다/)
  assert.equal(button('전액 환불'), undefined)
  await act(async () => root.render(null))
  await mount()
  assert.equal(await state.refundPayment(rows[0]), null)
  assert.ok(calls.every(call => call.method === 'get'))
})

for (const status of ['REFUND_PROCESSING', 'REFUNDED', 'PAID']) test(`synthetic refund response ${status} does not claim premature completion`, async () => {
  handler = config => response(config, { ...payment, status })
  await mount()
  await act(async () => state.refundPayment(payment))
  assert.equal(state.payments[0].status, status)
  if (status === 'REFUNDED') assert.equal(state.successMessage, '결제를 전액 환불했습니다.')
  else {
    assert.doesNotMatch(state.successMessage, /전액 환불했습니다/)
    assert.match(state.successMessage, status === 'REFUND_PROCESSING' ? /환불 처리 중/ : /완료는 확인되지 않았습니다/)
  }
  assert.equal(calls.filter(call => call.method === 'post').length, 1)
})

test('refund rejection keeps the paid row and reports failure without a success notice', async () => {
  handler = config => { throw Object.assign(new Error('Synthetic refund conflict'), { isAxiosError: true, config, response: { status: 409, data: { code: 'INVALID_PAYMENT_STATUS' }, config, headers: {} } }) }
  await mount()
  await act(async () => state.refundPayment(payment))
  assert.equal(state.payments[0].status, 'PAID')
  assert.equal(state.successMessage, '')
  assert.match(state.actionErrorMessage, /현재 상태에서는 환불할 수 없습니다/)
})
