import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { MerchantPlaceContext } = await server.ssrLoadModule('/src/app/providers/MerchantPlaceContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useMerchantPlaceOperations } = await server.ssrLoadModule('/src/hooks/useMerchantPlaceOperations.ts')
const originalFetch = globalThis.fetch
const MiB = 1024 * 1024
const mediaPath = '/merchant-owner/places/1/media'
const uploadUrl = 'https://uploads.example.invalid/synthetic-image'
const auth = { clearAuth() {} }
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces(ids) { return ids[0] ?? null } }
let root, state, requests, uploads

beforeEach(async () => {
  requests = []; uploads = []
  root = createRoot(document.getElementById('root'))
  client.defaults.adapter = async config => {
    requests.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(config.data) : null })
    let data
    if (config.method === 'get' && config.url === '/merchant-owner/me') data = { placeIds: [1] }
    else if (config.method === 'get' && config.url === '/merchant-owner/places/1') data = {}
    else if (config.method === 'get' && config.url === '/merchant-owner/places/1/operating') data = {}
    else if (config.method === 'get' && config.url === mediaPath) data = { media: [] }
    else if (config.method === 'post' && config.url === `${mediaPath}/upload-url`) data = { uploadUrl, s3Key: 'synthetic-image' }
    else if (config.method === 'post' && config.url === mediaPath) data = {}
    else throw new Error(`Unexpected synthetic request: ${config.method} ${config.url}`)
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, uploadUrl)
    uploads.push(options)
    return { ok: true, status: 200 }
  }
  function Probe() { state = useMerchantPlaceOperations(); return null }
  await act(async () => root.render(h(AuthContext.Provider, { value: auth }, h(MerchantPlaceContext.Provider, { value: places }, h(Probe)))))
  assert.equal(state.status, 'ready')
  requests = []
})
afterEach(async () => {
  await act(async () => root.unmount())
  globalThis.fetch = originalFetch
})
after(async () => { await server.close(); dom.window.close() })

for (const size of [10 * MiB + 1, 20 * MiB]) {
  test(`media image ${size} bytes is accepted through upload and registration`, async () => {
    const file = new File([new Uint8Array(size)], 'synthetic.png', { type: 'image/png' })
    let result
    await act(async () => { result = await state.uploadMedia(file) })
    assert.ok(result)
    assert.equal(state.actionErrorMessage, '')
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['post', `${mediaPath}/upload-url`], ['post', mediaPath], ['get', mediaPath],
    ])
    assert.deepEqual(requests[0].body, { fileName: 'synthetic.png', contentType: 'image/png', fileSize: size })
    assert.deepEqual(requests[1].body, { s3Key: 'synthetic-image' })
    assert.equal(uploads.length, 1)
    assert.equal(uploads[0].method, 'PUT')
    assert.equal(uploads[0].body, file)
    assert.equal(uploads[0].headers['Content-Type'], 'image/png')
  })
}

for (const [size, type, message] of [
  [20 * MiB + 1, 'image/png', '이미지는 20MB 이하의 파일만 업로드할 수 있습니다.'],
  [0, 'image/png', '이미지는 20MB 이하의 파일만 업로드할 수 있습니다.'],
  [1, 'text/plain', '이미지 파일만 업로드할 수 있습니다.'],
]) {
  test(`invalid upload (${size} bytes, ${type}) is rejected before any request`, async () => {
    let result
    await act(async () => { result = await state.uploadMedia(new File([new Uint8Array(size)], 'synthetic', { type })) })
    assert.equal(result, null)
    assert.equal(state.actionErrorMessage, message)
    assert.deepEqual(requests, [])
    assert.deepEqual(uploads, [])
  })
}

test('upload guidance states the same 20MB limit', async () => {
  const page = await readFile('src/pages/merchantPlaceOperations/MerchantPlaceOperationsPage.tsx', 'utf8')
  assert.match(page, /최대 20MB/)
  assert.doesNotMatch(page, /최대 10MB/)
})
