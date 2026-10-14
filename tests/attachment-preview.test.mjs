import assert from 'node:assert/strict'
import { test, beforeEach, afterEach, after } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { useApplicationAttachmentPreview } = await server.ssrLoadModule('/src/hooks/useApplicationAttachmentPreview.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL
let root, state, adapter, counter = 0
const created = [], revoked = [], requests = []
URL.createObjectURL = () => { const url = 'blob:test-' + ++counter; created.push(url); return url }
URL.revokeObjectURL = url => revoked.push(url)
function Probe({ id = 1 }) { state = useApplicationAttachmentPreview(1, id, 0); return null }
function response(config, type = 'image/png', content = 'synthetic') {
  return { config, data: new Blob([content], { type }), headers: { 'content-type': type }, status: 200, statusText: 'OK' }
}
async function mount(id = 1) { await act(async () => root.render(h(Probe, { key: id, id }))) }
beforeEach(() => {
  created.length = 0; revoked.length = 0; requests.length = 0
  adapter = config => response(config)
  client.defaults.adapter = async config => { requests.push(config); return adapter(config) }
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; await server.close(); dom.window.close() })

for (const [type, kind] of [['image/png', 'image'], ['application/pdf', 'pdf']]) {
  test(type + ' uses authenticated content and cleans URL on close', async () => {
    adapter = config => response(config, type)
    await mount()
    assert.equal(state.status, 'ready')
    assert.equal(state.kind, kind)
    assert.ok(requests[0].url.endsWith('/1/attachments/1/content'))
    await act(async () => root.render(null))
    assert.deepEqual(revoked, created)
    assert.equal(requests[0].signal.aborted, true)
  })
}
for (const type of ['text/html', 'image/svg+xml', 'application/octet-stream']) {
  test(type + ' is never rendered', async () => {
    adapter = config => response(config, type)
    await mount()
    assert.equal(state.status, 'unsupported')
    assert.equal(created.length, 0)
  })
}
test('empty supported file displays error', async () => {
  adapter = config => response(config, 'image/png', '')
  await mount()
  assert.equal(state.status, 'error')
})
test('late old response cannot create or overwrite a preview', async () => {
  let resolve
  adapter = config => new Promise(done => { resolve = () => done(response(config)) })
  await mount()
  const first = resolve
  await mount(2)
  const second = resolve
  await act(async () => first())
  assert.equal(created.length, 0)
  assert.equal(state.status, 'loading')
  await act(async () => second())
  assert.equal(state.status, 'ready')
  assert.equal(created.length, 1)
})
test('permission error offers an explicit explanation', async () => {
  adapter = config => Promise.reject({ isAxiosError: true, config, response: { status: 403, data: {} } })
  await mount()
  assert.equal(state.status, 'error')
  assert.match(state.message, /권한/)
})
