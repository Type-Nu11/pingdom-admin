import assert from 'node:assert/strict'
import { test, after, beforeEach, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true })
for (const key of ['window', 'document', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { PlaceInformationEvidencePanel: Evidence } = await server.ssrLoadModule('/src/components/placeVerification/PlaceInformationEvidencePanel.tsx')
const { PlaceInformationReverificationPanel: Reverification } = await server.ssrLoadModule('/src/components/placeVerification/PlaceInformationReverificationPanel.tsx')
const labels = await server.ssrLoadModule('/src/components/placeVerification/placeVerificationLabels.ts')
const formats = await server.ssrLoadModule('/src/pages/userBan/userBan.format.ts')
let root, reads
beforeEach(() => { root = createRoot(document.getElementById('root')); reads = [] })
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
const hook = overrides => ({ evidences: [], reverificationRequests: [], activeAction: null,
  isEvidenceLoading: false, isReverificationLoading: false, evidenceErrorMessage: '', reverificationErrorMessage: '',
  actionErrorMessage: '', actionSuccessMessage: '', reverificationPage: 1, reverificationTotalPages: 0,
  fetchEvidence: id => reads.push(['evidence', id]), fetchReverificationRequests: (id, page) => reads.push(['reverification', id, page]),
  dismissActionError() {}, ...overrides })
async function render(Component, props = {}, overrides = {}) {
  await act(async () => root.render(h(Component, { verificationHook: hook(overrides), loadedPlaceId: null, ...props })))
}
for (const [Component, errorKey, emptyText, expectedRead] of [
  [Evidence, 'evidenceErrorMessage', '등록된 증빙이 없습니다.', ['evidence', 7]],
  [Reverification, 'reverificationErrorMessage', '재확인 요청이 없습니다.', ['reverification', 7, 1]],
]) {
  test(`${errorKey}: no selection and selected-but-not-queried are distinct`, async () => {
    await render(Component)
    assert.match(document.body.textContent, /확인할 장소를 선택해주세요/)
    await render(Component, { hasSelectedPlace: true })
    assert.match(document.body.textContent, /선택한 장소의 정보를 조회해주세요/)
    assert.doesNotMatch(document.body.textContent, /장소 ID를 조회/)
    assert.deepEqual(reads, [])
  })
  test(`${errorKey}: successful empty and failed read are distinct, retry stays read-only`, async () => {
    await render(Component, { loadedPlaceId: 7 })
    assert.ok(document.body.textContent.includes(emptyText))
    await render(Component, { loadedPlaceId: 7 }, { [errorKey]: '합성 조회 실패' })
    assert.ok(document.querySelector('[role="alert"]'))
    assert.ok(!document.body.textContent.includes(emptyText))
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === '다시 시도').click())
    assert.deepEqual(reads, [expectedRead])
  })
}
test('new display labels preserve server enum keys and unknown formatter values', () => {
  assert.equal(labels.VERIFICATION_STATUS_LABELS.ADMIN_VERIFIED, '관리자 검증')
  assert.equal(labels.VERIFICATION_STATUS_LABELS.REJECTED, '반려')
  assert.equal(labels.SOURCE_TYPE_LABELS.MERCHANT_OWNER, '상점주 제출')
  assert.equal(formats.formatBanType('PERMANENT'), '영구 밴')
  assert.equal(formats.formatBanType('TEMPORARY'), '기간 밴')
  assert.equal(formats.formatBanType('FUTURE_STATUS'), 'FUTURE_STATUS')
})
