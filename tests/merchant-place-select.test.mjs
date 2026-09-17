import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { PlaceSelect } = await server.ssrLoadModule('/src/pages/merchantStore/MerchantStorePage.styles.ts')
let root, selected
async function render(props = {}) {
  await act(async () => root.render(h(PlaceSelect, {
    'aria-label': '관리할 장소 선택', value: 70095,
    onChange: event => { selected = Number(event.target.value) }, ...props,
  }, [70095, 70096].map(id => h('option', { key: id, value: id }, `연결 장소 #${id}`)))))
}
const trigger = () => document.querySelector('[role="combobox"]')
async function key(value) {
  await act(async () => trigger().dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true })))
}
beforeEach(() => { root = createRoot(document.getElementById('root')); selected = null })
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('shared merchant selector uses a custom list and preserves place IDs', async () => {
  await render()
  assert.equal(document.querySelector('select'), null)
  await act(async () => trigger().click())
  assert.equal(document.querySelectorAll('[role="option"]').length, 2)
  assert.match(document.querySelector('[aria-selected="true"]').textContent, /70095/)
  await act(async () => document.querySelectorAll('[role="option"]')[1].click())
  assert.equal(selected, 70096)
  assert.equal(trigger().getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, trigger())
})

test('keyboard selection and Escape preserve selection semantics', async () => {
  await render()
  await key('ArrowDown')
  await key('ArrowDown')
  await key('Enter')
  assert.equal(selected, 70096)
  selected = null
  await key('ArrowDown')
  await key('Escape')
  assert.equal(selected, null)
  assert.equal(trigger().getAttribute('aria-expanded'), 'false')
})

test('disabled selector cannot change place; outside click dismisses the list', async () => {
  await render({ disabled: true })
  await act(async () => trigger().click())
  assert.equal(document.querySelector('[role="listbox"]'), null)
  assert.equal(selected, null)
  await render()
  await act(async () => trigger().click())
  await act(async () => document.body.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true })))
  assert.equal(document.querySelector('[role="listbox"]'), null)
})
