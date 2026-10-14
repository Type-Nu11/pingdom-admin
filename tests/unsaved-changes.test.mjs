import assert from 'node:assert/strict'
import { test, beforeEach, afterEach, after } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
window.requestAnimationFrame = callback => window.setTimeout(callback, 0)
window.cancelAnimationFrame = id => window.clearTimeout(id)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createMemoryRouter, RouterProvider, Outlet, useNavigate, useLocation } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { UnsavedChangesProvider } = await server.ssrLoadModule('/src/components/common/UnsavedChangesProvider.tsx')
const { useSavedDraft } = await server.ssrLoadModule('/src/hooks/useSavedDraft.ts')
const { useUnsavedNavigation, useUnsavedChanges } = await server.ssrLoadModule('/src/hooks/useUnsavedChanges.ts')
let root, router, state, transitions
function Form() {
  const [input, setInput] = useState('saved')
  const [busy, setBusy] = useState(false)
  const [attachment, setAttachment] = useState(false)
  const draft = useSavedDraft(input, { busy })
  const file = useUnsavedChanges(attachment)
  const request = useUnsavedNavigation()
  const navigate = useNavigate()
  state = { setInput, setBusy, setAttachment, draft, file, request, navigate }
  return h('div', null, h('button', { onClick: () => request(() => transitions++) }, '항목 이동'), h('input', { value: input, onChange: event => setInput(event.target.value) }))
}
function Root() {
  const [session, setSession] = useState(1)
  const location = useLocation()
  return h('div', null, h('output', null, location.pathname + location.search), h('button', { onClick: () => setSession(value => value + 1) }, 'account'), h(UnsavedChangesProvider, { key: session }, h(Outlet)))
}
beforeEach(async () => {
  transitions = 0
  root = createRoot(document.getElementById('root'))
  router = createMemoryRouter([{ element: h(Root), children: [{ path: '/form', element: h(Form) }, { path: '/other', element: h('p', null, 'other') }, { path: '/login', element: h('p', null, 'login') }] }], { initialEntries: ['/other', '/form'], initialIndex: 1 })
  await act(async () => root.render(h(RouterProvider, { router })))
})
afterEach(async () => { await act(async () => root.unmount()); router.dispose() })
after(async () => { await server.close(); dom.window.close() })
const button = label => [...document.querySelectorAll('button')].find(element => element.textContent === label)
const click = async label => { await act(async () => button(label).click()) }
const change = async value => { await act(async () => state.setInput(value)) }
const dialog = () => document.querySelector('[role="dialog"]')

test('pristine and restored fields do not block transitions or reload', async () => {
  await act(async () => state.request(() => transitions++))
  assert.equal(transitions, 1)
  await change('changed')
  await change('saved')
  const event = new window.Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  assert.equal(event.defaultPrevented, false)
  await act(async () => state.navigate('/other'))
  assert.equal(router.state.location.pathname, '/other')
  assert.equal(dialog(), null)
})
test('dirty local transition can be canceled or confirmed exactly once', async () => {
  await change('changed')
  await act(async () => { state.request(() => transitions++); state.request(() => transitions += 100) })
  assert.ok(dialog())
  await click('계속 작성')
  assert.equal(transitions, 0)
  assert.equal(document.querySelector('input').value, 'changed')
  await act(async () => state.request(() => transitions++))
  await click('변경 버리고 이동')
  assert.equal(transitions, 1)
  assert.equal(dialog(), null)
})
test('back navigation preserves location until consent', async () => {
  await change('changed')
  await act(async () => router.navigate(-1))
  assert.equal(router.state.location.pathname, '/form')
  await click('계속 작성')
  await act(async () => router.navigate(-1))
  await click('변경 버리고 이동')
  assert.equal(router.state.location.pathname, '/other')
})
test('confirmed local query transition does not ask twice', async () => {
  await change('changed')
  await act(async () => state.request(() => state.navigate('/form?tab=evidence')))
  await click('변경 버리고 이동')
  assert.equal(router.state.location.search, '?tab=evidence')
  assert.equal(dialog(), null)
})
test('saving marks the baseline clean synchronously, failure does not', async () => {
  await change('changed')
  await act(async () => state.request(() => transitions++))
  assert.ok(dialog())
  await click('계속 작성')
  await act(async () => { state.draft.markSaved(); state.request(() => transitions++) })
  assert.equal(transitions, 1)
  assert.equal(dialog(), null)
  assert.equal(state.draft.isDirty, false)
})
test('pending files remain protected after field save and scoped close ignores other forms', async () => {
  await act(async () => { state.setAttachment(true); state.setInput('changed') })
  await act(async () => state.draft.markSaved())
  await act(async () => state.draft.request(() => transitions++))
  assert.equal(transitions, 1)
  await act(async () => state.request(() => transitions++))
  assert.ok(dialog())
  const event = new window.Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  assert.equal(event.defaultPrevented, true)
})
test('save in progress cannot be discarded but can remain on the screen', async () => {
  await change('changed')
  await act(async () => state.setBusy(true))
  await act(async () => state.navigate('/other'))
  assert.ok(dialog())
  assert.equal(button('변경 버리고 이동').disabled, true)
  await click('계속 작성')
  assert.equal(router.state.location.pathname, '/form')
})
test('login redirect bypasses the guard and account remount discards sensitive input', async () => {
  await change('private input')
  await act(async () => state.navigate('/other'))
  assert.ok(dialog())
  await click('account')
  assert.equal(dialog(), null)
  assert.equal(document.querySelector('input').value, 'saved')
  await change('private input')
  await act(async () => state.navigate('/login', { replace: true }))
  assert.equal(router.state.location.pathname, '/login')
  assert.equal(dialog(), null)
  assert.equal(document.querySelector('input'), null)
})

test('a successful save releases a previously blocked route without another warning', async () => {
  await change('changed')
  await act(async () => state.navigate('/other'))
  assert.ok(dialog())
  await act(async () => state.draft.markSaved())
  assert.equal(router.state.location.pathname, '/other')
  assert.equal(dialog(), null)
})
