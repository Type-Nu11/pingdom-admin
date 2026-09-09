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
const { default: Page } = await server.ssrLoadModule('/src/pages/verifiedBoostProduct/VerifiedBoostProductPage.tsx')
const auth = { clearAuth() {}, logout: async () => {}, user: { id: 99, username: 'admin', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
let root, productStatus, mutationCount
const product = id => ({ id, name: `Product ${id}`, description: 'Test product', priceAmount: 1000, durationDays: 5, status: productStatus })
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const dialog = () => document.querySelector('[role="dialog"]')
const button = (label, scope = document) => [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === label)
async function click(element) {
  assert.ok(element, 'button must exist')
  await act(async () => element.click())
}
async function selectProduct(id) {
  await click([...document.querySelectorAll('button')].find(element => element.textContent.includes(`Product ${id}`) && element.textContent.includes('상품 #')))
}
beforeEach(async () => {
  mutationCount = 0
  productStatus = 'DRAFT'
  client.defaults.adapter = async config => {
    if (config.method === 'post') {
      mutationCount++
      throw new Error('mock status failure')
    }
    if (config.url === '/admin/verified-boost-products') return response(config, { products: [product(1), product(2)], page: 1, totalElements: 2, totalPages: 1, hasNext: false })
    if (config.url.startsWith('/admin/verified-boost-products/')) return response(config, product(Number(config.url.split('/').at(-1))))
    return response(config, {})
  }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: auth },
    h(AdminNotificationContext.Provider, { value: notifications }, h(MemoryRouter, {}, h(Page))))))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

for (const [label, status] of [['활성화', 'DRAFT'], ['비활성화', 'ACTIVE']]) {
  test(`${label}: a new product dialog clears the previous action error`, async () => {
    productStatus = status
    await selectProduct(1)
    await click(button(label))
    await click(button('상태 변경', dialog()))
    assert.match(dialog().textContent, /상품 상태를 변경하지 못했습니다/)
    await click(button('취소', dialog()))
    await selectProduct(2)
    await click(button(label))
    assert.match(dialog().textContent, /Product 2/)
    assert.doesNotMatch(document.body.textContent, /상품 상태를 변경하지 못했습니다/)
    assert.equal(mutationCount, 1, 'opening a new dialog must not retry the failed request')
    await click(button('상태 변경', dialog()))
    assert.match(dialog().textContent, /상품 상태를 변경하지 못했습니다/, 'a new failure must still be displayed')
    assert.equal(mutationCount, 2)
  })
}

test('status dialog clears validation errors left by the create form', async () => {
  await click(button('상품 등록'))
  await click(button('등록', dialog()))
  assert.match(dialog().textContent, /상품명과 설명을 입력해주세요/)
  await click(button('취소', dialog()))
  await selectProduct(1)
  await click(button('활성화'))
  assert.doesNotMatch(dialog().textContent, /상품명과 설명을 입력해주세요/)
  assert.equal(mutationCount, 0)
})
