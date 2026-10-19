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
const { useMerchantUnifiedPlaceSearch } = await server.ssrLoadModule('/src/hooks/useMerchantUnifiedPlaceSearch.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { adminColors } = await server.ssrLoadModule('/src/styles/theme.ts')
let root, changes, selected, searches, cancellations, search, disabled, liveSearch, liveState
const candidates = [
  { kind: 'place', name: '롯데 합성 가게', roadAddress: '서울 합성로 10', jibunAddress: '', postalCode: '', latitude: 37, longitude: 127 },
  { kind: 'address', roadAddress: '서울 롯데합성로 20', jibunAddress: '서울 합성동 20', postalCode: '12345', latitude: 37.1, longitude: 127.1 },
]
function Probe() {
  const [query, setQuery] = useState('롯데')
  liveState = useMerchantUnifiedPlaceSearch()
  return h('form', { onSubmit: event => { event.preventDefault(); throw new Error('Search must not submit the registration') } },
    h(MerchantPlaceAutocomplete, {
      query, search: liveSearch ? liveState : search, disabled,
      onQueryChange(value) { changes.push(value); setQuery(value); if (liveSearch) liveState.scheduleSearch(value) },
      onSearch() { searches++; if (liveSearch) void liveState.search(query) },
      onCancel() { cancellations++; if (liveSearch) liveState.reset() }, onSelect(item) { selected.push(item) },
    }))
}
const input = () => document.querySelector('[role="combobox"]')
const options = () => [...document.querySelectorAll('[role="option"]')]
const key = value => act(async () => input().dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
const focus = () => act(async () => input().focus())
beforeEach(async () => {
  changes = []; selected = []; searches = 0; cancellations = 0; disabled = false; liveSearch = false
  search = { results: candidates, phase: 'idle', isError: false, message: '' }
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(Probe)))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })

test('partial search failures are accessible warnings, not ordinary empty results', async () => {
  search = { results: [], phase: 'idle', isError: false, isWarning: true, message: '업체명 검색 결과는 0건입니다. 추가 주소 검색을 완료하지 못했습니다.' }
  await act(async () => root.render(h(Probe)))
  await focus()
  const alert = document.querySelector('[role="alert"]')
  assert.match(alert.textContent, /업체명 검색 결과는 0건.*추가 주소 검색/)
  assert.equal(options().length, 0)
  assert.equal(input().getAttribute('aria-expanded'), 'true')
})

test('focus shows named place/address options, address lines and highlighted keyword', async () => {
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  await focus()
  assert.equal(input().getAttribute('aria-expanded'), 'true')
  assert.equal(options().length, 2)
  assert.match(options()[0].textContent, /롯데 합성 가게.*서울 합성로 10/)
  assert.equal(options()[0].querySelector('mark').textContent, '롯데')
  assert.equal(document.getElementById(input().getAttribute('aria-controls')).getAttribute('role'), 'listbox')
})

test('place and address suggestion markers use the PingDom primary color', async () => {
  await focus()
  const expected = document.createElement('span')
  expected.style.color = adminColors.primary
  document.body.append(expected)
  try {
    assert.equal(options().length, 2)
    for (const option of options()) {
      const marker = option.querySelector('[aria-hidden="true"]')
      assert.equal(marker.textContent, 'location_on')
      assert.equal(window.getComputedStyle(marker).color, window.getComputedStyle(expected).color)
    }
  } finally { expected.remove() }
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
  assert.equal(changes.at(-1), '')
  assert.equal(document.activeElement, input())
})

test('Korean input updates the query during composition; Enter does not select or submit, and compositionend does not repeat the value', async () => {
  await focus()
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true })))
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input(), '롯데마')
    input().dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(changes.at(-1), '롯데마')
  await key('Enter')
  assert.equal(searches, 0)
  assert.deepEqual(selected, [])
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true })))
  assert.deepEqual(changes, ['롯데마'])
  await key('Enter')
  assert.equal(searches, 1)
})

for (const immediate of [false, true]) test(`real search hook: ${immediate ? 'first click survives late IME completion' : '200ms pause during Korean composition triggers search without a click'}`, async t => {
  const pending = []
  client.defaults.adapter = config => new Promise(resolve => pending.push({ config, resolve: () => resolve({ config, status: 200, statusText: 'OK', headers: {}, data: { items: [{ name: '롯데마 합성 가게', roadAddress: '서울 합성로 10', jibunAddress: '', latitude: 37, longitude: 127 }] } }) }))
  liveSearch = true
  await act(async () => root.render(h(Probe)))
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await focus()
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true })))
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input(), '롯데마')
    input().dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  if (immediate) {
    await act(async () => document.querySelector('[aria-label="장소·주소 검색"]').click())
  } else {
    await act(async () => t.mock.timers.tick(199))
    assert.equal(pending.length, 0)
    await act(async () => t.mock.timers.tick(1))
  }
  assert.equal(pending.length, 1)
  assert.equal(pending[0].config.params.query, '롯데마')
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true })))
  assert.equal(pending[0].config.signal.aborted, false)
  await act(async () => t.mock.timers.tick(500))
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve())
  assert.equal(options().length, 1)
  assert.match(options()[0].textContent, /롯데마 합성 가게.*서울 합성로 10/)
})

test('a late unchanged compositionend cannot reopen suggestions after selecting a candidate', async () => {
  await focus()
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true })))
  await act(async () => options()[0].click())
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  await act(async () => input().dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true })))
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  assert.deepEqual(changes, [])
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
  assert.equal(changes.at(-1), '롯데')
  await key('Escape')
  await act(async () => document.getElementById('outside').focus())
  await focus()
  assert.equal(changes.length, 2)
  const clear = document.querySelector('[aria-label="검색어 지우기"]')
  await act(async () => { clear.focus(); clear.click() })
  assert.equal(changes.at(-1), '')
  assert.equal(input().value, '')
})

for (const direction of ['ArrowDown', 'ArrowUp']) test(`${direction} after Escape reloads candidates using the unchanged query`, async t => {
  const pending = []
  client.defaults.adapter = config => new Promise(resolve => pending.push({
    config,
    resolve: () => resolve({ config, status: 200, statusText: 'OK', headers: {}, data: { items: [candidates[0]] } }),
  }))
  liveSearch = true
  await act(async () => root.render(h(Probe)))
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await focus()
  await act(async () => t.mock.timers.tick(200))
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve())
  assert.equal(options().length, 1)
  await key('Escape')
  assert.equal(input().getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, input())
  assert.equal(input().value, '롯데')
  await key(direction)
  assert.equal(input().getAttribute('aria-expanded'), 'true')
  assert.match(document.querySelector('[role="status"]').textContent, /검색 중/)
  // Repeated navigation keys must not restart debounce or duplicate requests.
  await key(direction)
  await act(async () => t.mock.timers.tick(200))
  assert.equal(pending.length, 2)
  assert.equal(pending[1].config.params.query, '롯데')
  await act(async () => pending[1].resolve())
  await key(direction)
  assert.equal(document.getElementById(input().getAttribute('aria-activedescendant')), options()[0])
  await key('Enter')
  assert.deepEqual(selected, [candidates[0]])
  assert.equal(input().getAttribute('aria-expanded'), 'false')
})
