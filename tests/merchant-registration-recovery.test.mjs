import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Node', 'Event']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { useMerchantPlaceRegistrations } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceRegistrations.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const base = '/users/me/merchant-place-applications'
const request = { legalName: '테스트', businessName: '테스트 가게', businessRegistrationNumber: '1234567890', placeName: '합성 장소' }
let root, state, application, calls, failUploadAt, failRecovery, failSubmit, selectedId, remaining
function Probe() { state = useMerchantPlaceRegistrations(); return null }
beforeEach(async () => {
  calls = []; application = null; failUploadAt = 1; failRecovery = true; failSubmit = false; selectedId = null
  remaining = ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'].map(documentType => ({ documentType, file: new File(['synthetic'], 'test.png', { type: 'image/png' }) }))
  client.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, documentType: config.params?.documentType })
    let data
    if (config.url === '/users/me/merchant-owner-profile') data = { status: 'PENDING' }
    else if (config.url === base && config.method === 'get') data = { items: [], page: 1, hasNext: false }
    else if (config.url === base && config.method === 'post') {
      application = { id: 50, applicantUserId: 1, applicationType: 'NEW_PLACE', status: 'DRAFT', newPlace: JSON.parse(config.data).newPlace, attachments: [] }
      data = application
    } else if (config.url === `${base}/50/attachments`) {
      assert.equal(selectedId, 50, 'parent must retain the saved draft ID before follow-up work')
      if (application.attachments.length + 1 === failUploadAt) throw new Error('synthetic upload failure')
      data = { id: application.attachments.length + 1, documentType: config.params.documentType, displayOrder: application.attachments.length }
      application = { ...application, attachments: [...application.attachments, data] }
    } else if (config.url === `${base}/50/submit`) {
      if (failSubmit) throw new Error('synthetic submit failure')
      application = { ...application, status: 'PENDING' }; data = application
    } else if (config.url === `${base}/50`) {
      if (failRecovery) throw new Error('synthetic recovery GET failure')
      data = application
    } else throw new Error(`Unexpected request: ${config.method} ${config.url}`)
    return { config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} }
  }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() {} } }, h(Probe))))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

async function submit() {
  let result
  await act(async () => {
    result = await state.requestRegistrationReview(selectedId, selectedId ? null : request, remaining,
      uploaded => { remaining = remaining.filter(item => item !== uploaded) },
      saved => { selectedId = saved.id })
  })
  return result
}
for (const failureAt of [1, 2, 3]) test(`upload ${failureAt} and recovery GET failure keep the saved draft and successful uploads`, async () => {
  failUploadAt = failureAt
  const result = await submit()
  assert.equal(result.id, 50)
  assert.equal(result.status, 'DRAFT')
  assert.equal(state.registrations[0].attachments.length, failureAt - 1)
  assert.equal(remaining.length, 4 - failureAt)
  assert.match(state.actionErrorMessage, /신청서를 저장했지만/)
  failUploadAt = 0; failRecovery = false
  assert.equal((await submit()).status, 'PENDING')
  assert.equal(calls.filter(call => call.method === 'post' && call.url === base).length, 1)
  assert.equal(application.attachments.length, 3)
  assert.equal(new Set(application.attachments.map(item => item.documentType)).size, 3)
  assert.equal(remaining.length, 0)
})
test('submit and recovery GET failure do not re-upload already successful attachments on retry', async () => {
  failUploadAt = 0; failSubmit = true
  const result = await submit()
  assert.equal(result.id, 50)
  assert.equal(result.attachments.length, 3)
  assert.equal(remaining.length, 0)
  failSubmit = false; failRecovery = false
  assert.equal((await submit()).status, 'PENDING')
  assert.equal(calls.filter(call => call.url.endsWith('/attachments')).length, 3)
  assert.equal(calls.filter(call => call.method === 'post' && call.url === base).length, 1)
})
