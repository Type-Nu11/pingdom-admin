import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
window.requestAnimationFrame = callback => window.setTimeout(callback, 0)
window.cancelAnimationFrame = id => window.clearTimeout(id)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createMemoryRouter, RouterProvider, Outlet } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { UnsavedChangesProvider } = await server.ssrLoadModule('/src/components/common/UnsavedChangesProvider.tsx')
const { useUnsavedChanges } = await server.ssrLoadModule('/src/hooks/useUnsavedChanges.ts')
const dashboard = await server.ssrLoadModule('/src/pages/dashboard/DashboardPage.styles.ts')
const place = await server.ssrLoadModule('/src/pages/place/PlaceManagePage.styles.ts')
const merchant = await server.ssrLoadModule('/src/app/router/MerchantLayout.styles.ts')
let root, router, setDraft
function Draft() {
  const [draft, update] = useState('saved')
  setDraft = update
  useUnsavedChanges(draft !== 'saved')
  return h('input', { value: draft, readOnly: true })
}
beforeEach(() => { root = createRoot(document.getElementById('root')) })
afterEach(async () => { await act(async () => root.unmount()); router?.dispose() })
after(async () => { await server.close(); dom.window.close() })
const button = label => [...document.querySelectorAll('button')].find(element => element.textContent === label)
const logoCases = [
  ['admin dashboard shell', dashboard.BrandLockup, undefined, '/dashboard', '대시보드로 이동'],
  ['admin place shell', place.BrandLockup, undefined, '/dashboard', '대시보드로 이동'],
  ['merchant shell', merchant.BrandLockup, '/merchant', '/merchant', '내 가게로 이동'],
]
for (const [name, Logo, to, destination, label] of logoCases) {
  const mount = async () => {
    router = createMemoryRouter([{ element: h(UnsavedChangesProvider, {}, h(Outlet)), children: [
      { path: '/edit', element: h('div', {}, h(Logo, { to }, h('img', { alt: 'PingDom' })), h(Draft)) },
      { path: destination, element: h('h1', {}, 'home') },
    ] }], { basename: '/console', initialEntries: ['/console/edit'] })
    await act(async () => root.render(h(RouterProvider, { router })))
  }
  test(name + ': semantic logo link navigates to the correct home with deployment basename', async () => {
    await mount()
    const link = document.querySelector('a')
    assert.equal(link.getAttribute('href'), '/console' + destination)
    assert.equal(link.getAttribute('aria-label'), label)
    assert.ok(link.querySelector('img[alt="PingDom"]'))
    await act(async () => link.click())
    assert.equal(router.state.location.pathname, '/console' + destination)
  })
  test(name + ': logo navigation preserves the unsaved-input cancel and discard flow', async () => {
    await mount()
    await act(async () => setDraft('unsaved'))
    await act(async () => document.querySelector('a').click())
    assert.ok(document.querySelector('[role="dialog"]'))
    assert.equal(router.state.location.pathname, '/console/edit')
    await act(async () => button('계속 작성').click())
    assert.equal(document.querySelector('input').value, 'unsaved')
    await act(async () => document.querySelector('a').click())
    await act(async () => button('변경 버리고 이동').click())
    assert.equal(router.state.location.pathname, '/console' + destination)
    assert.equal(document.querySelector('[role="dialog"]'), null)
  })
}
