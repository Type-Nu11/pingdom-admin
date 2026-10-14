import assert from 'node:assert/strict'
import { test, after, beforeEach, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const name of ['window', 'document', 'HTMLElement', 'Node', 'localStorage']) globalThis[name] = dom.window[name]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AccessibleTabList } = await server.ssrLoadModule('/src/components/common/AccessibleTabList.tsx')
const { default: VisitorPage } = await server.ssrLoadModule('/src/pages/visitorVerification/VisitorVerificationPage.tsx')
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { AdminNotificationContext } = await server.ssrLoadModule('/src/app/providers/AdminNotificationContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
let root, selected, calls
beforeEach(() => { root = createRoot(document.getElementById('root')); selected = []; calls = [] })
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
const buttons = () => [...document.querySelectorAll('[role="tab"]')]
const key = async value => act(async () => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
const focus = async element => act(async () => element.focus())

function Fixture({ guarded = false, disabled = -1, orientation = 'horizontal' }) {
  const [active, setActive] = useState(0)
  return h('section', null, h(AccessibleTabList, { panelId: 'panel', 'aria-label': '작업', 'aria-orientation': orientation },
    [0, 1, 2].map(index => h('button', { key: index, type: 'button', role: 'tab', 'aria-selected': index === active,
      disabled: index === disabled, onClick: () => { selected.push(index); if (!guarded) setActive(index) } }, `작업 ${index}`))),
  h('div', { id: 'panel', role: 'tabpanel', 'aria-labelledby': `panel-tab-${active}`, tabIndex: 0 }, `내용 ${active}`),
  h('button', null, '다음 작업'))
}
test('selected state, roving focus and panel links agree; arrows do not activate', async () => {
  await act(async () => root.render(h(Fixture)))
  assert.deepEqual(buttons().map(x => x.tabIndex), [0, -1, -1])
  assert.deepEqual(buttons().map(x => x.getAttribute('aria-selected')), ['true', 'false', 'false'])
  for (const tab of buttons()) assert.equal(tab.getAttribute('aria-controls'), 'panel')
  await focus(buttons()[0]); await key('ArrowRight')
  assert.equal(document.activeElement, buttons()[1]); assert.deepEqual(selected, [])
  assert.deepEqual(buttons().map(x => x.tabIndex), [-1, 0, -1])
  assert.equal(document.querySelector('[role="tabpanel"]').textContent, '내용 0')
  await act(async () => buttons()[1].click())
  assert.equal(document.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby'), buttons()[1].id)
  assert.equal(buttons()[1].getAttribute('aria-selected'), 'true')
})
test('Home/End, wrap-around and disabled tabs are handled', async () => {
  await act(async () => root.render(h(Fixture, { disabled: 1 })))
  await focus(buttons()[0]); await key('ArrowRight'); assert.equal(document.activeElement, buttons()[2])
  await key('ArrowRight'); assert.equal(document.activeElement, buttons()[0])
  await key('End'); assert.equal(document.activeElement, buttons()[2])
  await key('Home'); assert.equal(document.activeElement, buttons()[0])
  await key('ArrowLeft'); assert.equal(document.activeElement, buttons()[2])
  await key('ArrowDown'); assert.equal(document.activeElement, buttons()[2])
  assert.deepEqual(selected, [])
})
test('vertical navigation only uses Up/Down and leaving the list restores its entry point', async () => {
  await act(async () => root.render(h(Fixture, { orientation: 'vertical' })))
  await focus(buttons()[0]); await key('ArrowDown'); assert.equal(document.activeElement, buttons()[1])
  await key('ArrowRight'); assert.equal(document.activeElement, buttons()[1])
  await focus(document.querySelector('[role="tabpanel"]'))
  assert.deepEqual(buttons().map(x => x.tabIndex), [0, -1, -1])
})
test('disabled selected tab falls back to an enabled entry; all-disabled lists have no tab stop', async () => {
  await act(async () => root.render(h(Fixture, { disabled: 0 })))
  assert.deepEqual(buttons().map(x => x.tabIndex), [-1, 0, -1])
  await act(async () => root.render(h(AccessibleTabList, { panelId: 'disabled-panel' },
    [0, 1].map(index => h('button', { key: index, role: 'tab', disabled: true, 'aria-selected': index === 0 }, '대기')))))
  assert.deepEqual(buttons().map(x => x.tabIndex), [-1, -1])
})
test('modified shortcuts and a consumer-prevented event do not move focus', async () => {
  await act(async () => root.render(h(Fixture)))
  await focus(buttons()[0])
  await act(async () => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true, cancelable: true })))
  assert.equal(document.activeElement, buttons()[0])
  await act(async () => root.render(h(AccessibleTabList, { panelId: 'prevented-panel', onKeyDown: event => event.preventDefault() },
    [0, 1].map(index => h('button', { key: index, role: 'tab', 'aria-selected': index === 0 }, '작업')))))
  await focus(buttons()[0]); await key('ArrowRight')
  assert.equal(document.activeElement, buttons()[0])
})
test('a screen guard can refuse activation without the tab announcing an unselected panel', async () => {
  await act(async () => root.render(h(Fixture, { guarded: true })))
  await focus(buttons()[0]); await key('ArrowRight'); await act(async () => buttons()[1].click())
  assert.deepEqual(selected, [1]); assert.equal(buttons()[0].getAttribute('aria-selected'), 'true')
  assert.equal(document.querySelector('[role="tabpanel"]').textContent, '내용 0')
})
test('real visitor page links both tabs, keeps selection passive and issues no mutations', async () => {
  client.defaults.adapter = async config => {
    calls.push(config)
    assert.equal(config.method, 'get')
    return { config, data: { reports: [], corrections: [], page: 1, limit: 10, totalElements: 0, totalPages: 0, hasNext: false }, status: 200, statusText: 'OK', headers: {} }
  }
  const notifications = { unreadCount: 0, pendingWorkCount: 0, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkStatus: 'success', pendingWorkErrorMessage: '', status: 'success', notifications: [], isUnreadCountLoading: false, isActionLoading: false, refreshUnreadCount: async () => {}, refreshPendingWork: async () => {}, fetchNotifications: async () => {} }
  await act(async () => root.render(h(AuthContext.Provider, { value: { user: { role: 'ADMIN' }, logout() {}, clearAuth() {} } },
    h(AdminNotificationContext.Provider, { value: notifications }, h(MemoryRouter, null, h(VisitorPage))))))
  assert.equal(buttons().length, 2); assert.equal(calls.length, 2)
  await focus(buttons()[0]); await key('ArrowRight')
  assert.equal(buttons()[0].getAttribute('aria-selected'), 'true'); assert.equal(calls.length, 2)
  await act(async () => buttons()[1].click())
  assert.equal(buttons()[1].getAttribute('aria-selected'), 'true')
  const panel = document.getElementById(buttons()[1].getAttribute('aria-controls'))
  assert.equal(panel.getAttribute('aria-labelledby'), buttons()[1].id)
  assert.match(panel.textContent, /정정 요청/)
  assert.ok(calls.every(call => call.method === 'get'))
})
