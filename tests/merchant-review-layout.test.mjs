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
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { default: Page } = await server.ssrLoadModule('/src/pages/merchantPlaceReview/MerchantPlaceReviewPage.tsx')
const auth = { clearAuth() {}, logout: async () => {}, user: { id: 99, username: 'test-merchant', role: 'MERCHANT' }, isAuthenticated: true, isAuthReady: true }
const selection = { selectedPlaceId: 1, selectPlace() {}, syncPlaces: () => 1 }
const base = { placeId: 1, userId: 2, recommendReason: null, recommendReasons: ['CLEAN'], imageUrls: [], createdAt: '2026-09-30T04:35:00+09:00' }
let root, reviews, calls

beforeEach(() => {
  reviews = [
    { ...base, reviewId: 1, content: '첫 리뷰\n둘째 줄', visibilityStatus: 'VISIBLE', deletionRequest: null },
    { ...base, reviewId: 2, content: '대기 리뷰', visibilityStatus: 'HIDDEN', deletionRequest: { status: 'PENDING' } },
    { ...base, reviewId: 3, content: '반려 리뷰', visibilityStatus: 'VISIBLE', deletionRequest: { status: 'REJECTED', reviewNote: '정책 위반 근거가 부족합니다.' } },
    { ...base, reviewId: 4, content: null, visibilityStatus: 'DELETED', deletionRequest: { status: 'APPROVED' } },
  ]
  calls = []
  client.defaults.adapter = async config => {
    calls.push(config)
    assert.equal(config.method, 'get', 'layout verification never mutates review data')
    const data = config.url.endsWith('/me') ? { placeIds: [1] }
      : config.url.endsWith('/reviews') ? { reviews, page: 1, totalElements: reviews.length, totalPages: 1, hasNext: false }
        : { placeId: 1, placeName: '테스트 매장' }
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function mount() {
  await act(async () => root.render(h(AuthContext.Provider, { value: auth },
    h(MerchantPlaceContext.Provider, { value: selection }, h(MemoryRouter, {}, h(Page))))))
}

test('each review has a named card, separate identity, full content and scoped action', async () => {
  await mount()
  const cards = [...document.querySelectorAll('article')]
  assert.equal(cards.length, 4)
  for (const [index, card] of cards.entries()) {
    const heading = card.querySelector('h3')
    assert.equal(heading.textContent, `리뷰 #${index + 1}`)
    assert.equal(card.getAttribute('aria-labelledby'), heading.id)
    assert.ok(card.querySelector('time[datetime]'))
    assert.match(card.querySelector('time').textContent, /^작성일 /)
    assert.match(card.textContent, /추천 이유/)
  }
  assert.match(cards[0].textContent, /첫 리뷰\n둘째 줄/)
  assert.equal(cards[0].querySelector('button').getAttribute('aria-label'), '리뷰 #1 삭제 요청')
  assert.match(cards[0].textContent, /공개/)
  assert.match(cards[3].textContent, /작성된 리뷰 내용이 없습니다/)
})

test('pending and approved requests remain read-only; rejection reason is distinct', async () => {
  await mount()
  const cards = [...document.querySelectorAll('article')]
  assert.equal(cards[1].querySelectorAll('button').length, 0)
  assert.match(cards[1].textContent, /숨김.*삭제 요청 심사 대기/s)
  assert.equal(cards[3].querySelectorAll('button').length, 0)
  assert.match(cards[3].textContent, /삭제됨.*삭제 완료/s)
  assert.equal(cards[2].querySelector('button').textContent, '다시 요청')
  assert.equal(cards[2].querySelector('strong').textContent, '관리자 반려 사유')
  assert.match(cards[2].textContent, /정책 위반 근거가 부족합니다/)
})

test('request action opens the existing dialog without submitting; empty lists remain empty', async () => {
  await mount()
  await act(async () => document.querySelector('article button').click())
  const dialog = document.querySelector('[role="dialog"]')
  assert.ok(dialog)
  assert.match(dialog.textContent, /리뷰 삭제 요청/)
  assert.equal(calls.some(call => call.method !== 'get'), false)
  await act(async () => root.render(null))
  reviews = []
  await mount()
  assert.equal(document.querySelectorAll('article').length, 0)
  assert.match(document.body.textContent, /현재 등록된 리뷰가 없습니다/)
})
