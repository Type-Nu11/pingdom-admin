import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<div id="root"></div><button id="outside">다른 입력</button>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Node', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { MerchantPlaceAutocomplete } = await server.ssrLoadModule('/src/pages/merchantPlaceRegistration/MerchantPlaceAutocomplete.tsx')
let root, changes, selected, searches, cancellations, search, disabled
const candidates = [
  { kind: 'place', name: '롯데 합성 가게', roadAddress: '서울 합성로 10', jibunAddress: '', postalCode: '', latitude: 37, longitude: 127 },
  { kind: 'address', roadAddress: '서울 롯데합성로 20', jibunAddress: '서울 합성동 20', postalCode: '12345', latitude: 37.1, longitude: 127.1 },
]
function Probe() {
  const [query, setQuery] = useState('롯데')
  return h('form', { onSubmit: event => { event.preventDefault(); throw new Error('Search must not submit the registration') } },
    h(MerchantPlaceAutocomplete, {
      query, search, disabled,
      onQueryChange(value, composing) { changes.push({ value, composing }); setQuery(value) },
      onSearch() { searches++ }, onCancel() { cancellations++ }, onSelect(item) { selected.push(item) },
    }))
}
const input = () => document.querySelector('[role="combobox"]')
const options = () => [...document.querySelectorAll('[role="option"]')]
const key = value => act(async () => input().dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
const focus = () => act(async () => input().focus())
beforeEach(async () => {
  changes = []; selected = []; searches = 0; cancellations = 0; disabled = false
  search = { results: candidates, phase: 'idle', isError: false, message: '' }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(Probe)))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('focus shows named place/address options, address lines and highlighted keyword', async () => {
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  await focus()
  assert.equal(input().getAttribute('aria-expanded'), 'true')
  assert.equal(options().length, 2)
  assert.match(options()[0].textContent, /롯데 합성 가게.*서울 합성로 10/)
  assert.equal(options()[0].querySelector('mark').textContent, '롯데')
  assert.equal(document.getElementById(input().getAttribute('aria-controls')).getAttribute('role'), 'listbox')
})

test('arrow keys and Enter select a candidate without submitting the form; Escape closes', async () => {
  await focus(); await key('ArrowDown')
  assert.equal(document.getElementById(input().getAttribute('aria-activedescendant')), options()[0])
  await key('ArrowDown'); await key('Enter')
  assert.deepEqual(selected, [candidates[1]])
  assert.equal(searches, 0)
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  await act(async () => { document.getElementById('outside').focus(); input().focus() })
  await key('ArrowUp')
  assert.equal(options()[1].getAttribute('aria-selected'), 'true')
  await key('Escape')
  assert.equal(options().length, 0)
  assert.equal(cancellations, 1)
})

test('pointer selection, focus leaving, and input clearing have distinct behavior', async () => {
  await focus()
  await act(async () => options()[0].click())
  assert.deepEqual(selected, [candidates[0]])
  await act(async () => { document.getElementById('outside').focus(); input().focus() })
  await act(async () => document.getElementById('outside').focus())
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  assert.equal(cancellations, 1)
  await focus()
  await act(async () => document.querySelector('[aria-label="검색어 지우기"]').click())
  assert.equal(input().value, '')
  assert.deepEqual(changes.at(-1), { value: '', composing: false })
  assert.equal(document.activeElement, input())
})

test('typing reports Korean composition state, and composing Enter never selects or submits', async () => {
  await focus()
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true })))
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input(), '롯데마')
    input().dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.deepEqual(changes.at(-1), { value: '롯데마', composing: true })
  await key('Enter')
  assert.equal(searches, 0)
  assert.deepEqual(selected, [])
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true })))
  assert.deepEqual(changes.at(-1), { value: '롯데마', composing: false })
  await key('Enter')
  assert.equal(searches, 1)
})

test('waiting, empty results and server failure are not shown as successful place suggestions', async () => {
  await focus()
  for (const [phase, isError, message, expected] of [
    ['waiting', false, '', /검색 중/],
    ['idle', false, '검색 결과가 없습니다.', /검색 결과가 없습니다/],
    ['idle', true, '업체명 검색 서비스를 사용할 수 없습니다.', /사용할 수 없습니다/],
  ]) {
    search = { results: [], phase, isError, message }
    await act(async () => root.render(h(Probe)))
    assert.equal(options().length, 0)
    assert.match(document.querySelector(isError ? '[role="alert"]' : '[role="status"]').textContent, expected)
  }
})

test('disabled forms do not expose selectable suggestions', async () => {
  await focus(); disabled = true
  await act(async () => root.render(h(Probe)))
  assert.equal(input().disabled, true)
  assert.equal(options().length, 0)
})

test('successful suggestions contain only name/address rows without repeated hints or generic badges', async () => {
  await focus()
  assert.equal(document.querySelectorAll('[aria-label="장소·주소 검색"]').length, 1)
  assert.equal(document.querySelector('[role="status"]'), null)
  for (const option of options()) assert.equal(option.querySelectorAll('small').length, 1, 'only the address line is shown')
  const description = document.getElementById(input().getAttribute('aria-describedby'))
  assert.match(description.textContent, /방향키.*Enter.*Esc/)
  assert.equal(description.tagName, 'P')
})

test('refocusing a dismissed search queues suggestions again, but clearing ends with an empty query', async () => {
  search = { results: [], phase: 'idle', isError: false, message: '' }
  await act(async () => root.render(h(Probe)))
  await focus()
  assert.deepEqual(changes.at(-1), { value: '롯데', composing: false })
  await key('Escape')
  await act(async () => document.getElementById('outside').focus())
  await focus()
  assert.equal(changes.length, 2)
  const clear = document.querySelector('[aria-label="검색어 지우기"]')
  await act(async () => { clear.focus(); clear.click() })
  assert.deepEqual(changes.at(-1), { value: '', composing: false })
  assert.equal(input().value, '')
})
