import assert from 'node:assert/strict'
import { test, beforeEach, afterEach, after } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AdminNavigationMenu } = await server.ssrLoadModule('/src/components/navigation/AdminNavigationMenu.tsx')
const { readNavigationState, saveNavigationState, NAVIGATION_STATE_KEY: key } = await server.ssrLoadModule('/src/components/navigation/adminNavigationState.ts')
let root
beforeEach(() => { window.sessionStorage.clear(); root = createRoot(document.getElementById('root')) })
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
async function mount(path = '/dashboard') { await act(async () => root.render(h(MemoryRouter, { initialEntries: [path] }, h(AdminNavigationMenu)))) }
const button = label => [...document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label || [...el.querySelectorAll('span:not([aria-hidden])')].some(span => span.textContent === label))
async function click(el) { await act(async () => el.click()) }
const group = id => document.querySelector(`[aria-controls="admin-navigation-group-${id}"]`)

test('first visit expands every group', async () => {
  await mount()
  for (const el of document.querySelectorAll('[aria-expanded]')) assert.equal(el.getAttribute('aria-expanded'), 'true')
})
test('collapsed group persists through route changes and remount', async () => {
  await mount()
  await click(group('growth'))
  await click(button('운영 이력'))
  assert.equal(group('growth').getAttribute('aria-expanded'), 'false')
  await act(async () => root.render(null))
  await mount('/merchant-owners')
  assert.equal(group('growth').getAttribute('aria-expanded'), 'false')
  assert.match(group('growth').getAttribute('aria-label'), /현재 페이지 포함/)
  assert.equal(document.getElementById(group('growth').getAttribute('aria-controls')).children.length > 0, true)
})
test('place link does not expand a deliberately collapsed submenu', async () => {
  await mount()
  await click(button('장소 관리 하위 메뉴 접기'))
  await click(button('장소 관리'))
  assert.equal(button('장소 관리 하위 메뉴 펼치기').getAttribute('aria-expanded'), 'false')
  await act(async () => root.render(null))
  await mount('/places/events')
  assert.equal(button('장소 관리 하위 메뉴 펼치기').getAttribute('aria-expanded'), 'false')
})
test('malformed stored values fall back safely', () => {
  window.sessionStorage.setItem(key, '{')
  assert.deepEqual(readNavigationState(), { closedGroups: [], placeManagementOpen: true })
  window.sessionStorage.setItem(key, JSON.stringify({ closedGroups: [null, 1, 'growth'], placeManagementOpen: 'false' }))
  assert.deepEqual(readNavigationState(), { closedGroups: ['growth'], placeManagementOpen: true })
})
test('unavailable storage does not block navigation', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw Error('blocked') } })
  try {
    assert.deepEqual(readNavigationState(), { closedGroups: [], placeManagementOpen: true })
    assert.doesNotThrow(() => saveNavigationState({ closedGroups: ['growth'], placeManagementOpen: false }))
  } finally { Object.defineProperty(window, 'sessionStorage', descriptor) }
})

test('sidebar scroll position survives remount with saved group state', async () => {
  await mount()
  await click(group('growth'))
  const container = document.getElementById('root')
  container.scrollTop = 120
  container.scrollLeft = 160
  container.dispatchEvent(new window.Event('scroll'))
  await act(async () => root.render(null))
  container.scrollTop = 0
  container.scrollLeft = 0
  await mount()
  assert.equal(container.scrollTop, 120)
  assert.equal(container.scrollLeft, 160)
  assert.equal(group('growth').getAttribute('aria-expanded'), 'false')
})
