import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { CanceledError } from 'axios'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { useMerchantUnifiedPlaceSearch } = await server.ssrLoadModule('/src/hooks/useMerchantUnifiedPlaceSearch.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const item = { name: '합성 장소', roadAddress: '합성로 1', jibunAddress: '합성동 1', latitude: 37.5, longitude: 127 }
let root, state, pending
function Probe() { state = useMerchantUnifiedPlaceSearch(); return null }
beforeEach(async () => {
  pending = []
  client.defaults.adapter = config => new Promise((resolve, reject) => pending.push({ config, resolve: (items = [{ ...item, name: config.params.query }]) => resolve({ config, data: { items }, status: 200, statusText: 'OK', headers: {} }), reject }))
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(h(Probe)))
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
const search = query => act(async () => { void state.search(query) })

test('primary failure, partial fallback failure and complete empty are distinct hook outcomes', async () => {
  await search('없는 업체')
  await act(async () => pending[0].reject(Object.assign(new Error('unavailable'), { isAxiosError: true, response: { status: 503 } })))
  assert.equal(state.isError, true)
  assert.equal(state.isWarning, false)
  assert.equal(pending.length, 1)
  assert.doesNotMatch(state.message, /0건/)
  await search('없는 업체')
  await act(async () => pending[1].resolve([]))
  await act(async () => pending[2].reject(Object.assign(new Error('unavailable'), { isAxiosError: true, response: { status: 503, data: { code: 'NAVER_ADDRESS_SEARCH_UNAVAILABLE' } } })))
  assert.equal(state.isError, false)
  assert.equal(state.isWarning, true)
  assert.match(state.message, /업체명 검색 결과는 0건.*추가 주소 검색을 완료하지 못했습니다/)
  await search('없는 업체')
  await act(async () => pending[3].resolve([]))
  await act(async () => pending[4].resolve([]))
  assert.equal(state.isError, false)
  assert.equal(state.isWarning, false)
  assert.match(state.message, /^검색 결과가 없습니다/)
})

test('session cancellation is silent and the same query can be automatically retried', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await search('롯데')
  await act(async () => pending[0].reject(new CanceledError('session changed')))
  assert.equal(state.isError, false)
  assert.equal(state.isWarning, false)
  assert.equal(state.message, '')
  assert.equal(state.phase, 'idle')
  await act(async () => state.scheduleSearch('롯데'))
  await act(async () => t.mock.timers.tick(200))
  assert.equal(pending.length, 2)
})

test('canceled postal supplementation never returns a candidate to apply', async () => {
  let selection
  await act(async () => { selection = state.prepareSelection({ ...item, kind: 'place', postalCode: '' }) })
  await act(async () => pending[0].reject(new CanceledError('session changed')))
  assert.equal(await selection, null)
  assert.equal(state.isError, false)
  assert.equal(state.message, '')
  assert.equal(state.phase, 'idle')
})

test('automatic search waits 200ms, ignores short input, and searches only the latest keyword', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => { state.scheduleSearch('롯'); t.mock.timers.tick(500) })
  assert.equal(pending.length, 0)
  await act(async () => state.scheduleSearch('롯데'))
  assert.equal(state.phase, 'waiting')
  await act(async () => { t.mock.timers.tick(150); state.scheduleSearch('롯데마트') })
  await act(async () => t.mock.timers.tick(199))
  assert.equal(pending.length, 0)
  await act(async () => t.mock.timers.tick(1))
  assert.equal(pending.length, 1)
  assert.equal(pending[0].config.params.query, '롯데마트')
  await act(async () => pending[0].resolve())
  assert.equal(state.results[0].name, '롯데마트')
})

test('Enter starts immediately and consumes the pending automatic search', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => state.scheduleSearch('롯데'))
  await search('롯데')
  await act(async () => t.mock.timers.tick(500))
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve())
})

test('same-value input events do not restart the 200ms timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => state.scheduleSearch('롯데'))
  await act(async () => { t.mock.timers.tick(150); state.scheduleSearch(' 롯데 ') })
  await act(async () => t.mock.timers.tick(50))
  assert.equal(pending.length, 1)
  assert.equal(pending[0].config.params.query, '롯데')
})

test('late IME completion cannot cancel an immediate search or start another request', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => state.scheduleSearch('롯데'))
  await search('롯데')
  await act(async () => state.scheduleSearch('롯데'))
  assert.equal(pending[0].config.signal.aborted, false)
  assert.equal(state.phase, 'search')
  await act(async () => t.mock.timers.tick(500))
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve())
  await act(async () => { state.scheduleSearch('롯데'); t.mock.timers.tick(500) })
  assert.equal(pending.length, 1)
  assert.equal(state.results[0].name, '롯데')
  await search('롯데')
  assert.equal(pending.length, 2, 'an explicit search can still refresh or retry the same keyword')
})

test('clear and unmount cancel queued searches before any API call', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => { state.scheduleSearch('롯데'); state.reset(); t.mock.timers.tick(500) })
  assert.equal(pending.length, 0)
  await act(async () => state.scheduleSearch('롯데'))
  await act(async () => root.render(null))
  await act(async () => t.mock.timers.tick(500))
  assert.equal(pending.length, 0)
})

test('typing a newer keyword aborts the active request immediately before the debounce ends', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await search('롯데')
  await act(async () => state.scheduleSearch('롯데마트'))
  assert.equal(pending[0].config.signal.aborted, true)
  await act(async () => pending[0].resolve())
  assert.equal(state.phase, 'waiting')
  assert.deepEqual(state.results, [])
  await act(async () => t.mock.timers.tick(200))
  assert.equal(pending[1].config.params.query, '롯데마트')
})

for (const fail of [false, true]) {
  test(`old ${fail ? 'failure' : 'success'} cannot replace a newer search or end loading`, async () => {
    await search('서울 업체'); await search('부산 업체')
    assert.equal(pending[0].config.signal.aborted, true)
    await act(async () => fail ? pending[0].reject(new Error('stale')) : pending[0].resolve())
    assert.equal(state.phase, 'search')
    assert.equal(state.message, '')
    await act(async () => pending[1].resolve())
    assert.equal(state.results[0].name, '부산 업체')
    assert.equal(state.phase, 'idle')
  })
}
test('input edit/reset prevents fallback and stale result resurrection', async () => {
  await search('서울 업체')
  await act(async () => state.reset())
  await act(async () => pending[0].resolve([]))
  assert.equal(pending.length, 1)
  assert.deepEqual(state.results, [])
  assert.equal(state.phase, 'idle')
})
test('duplicate in-flight Enter calls issue only one request', async () => {
  await search('서울 업체'); await search(' 서울 업체 ')
  assert.equal(pending.length, 1)
  await act(async () => pending[0].resolve())
})
test('editing while completing a candidate cannot overwrite the form with late postal data', async () => {
  let selection
  await act(async () => { selection = state.prepareSelection({ ...item, kind: 'place', postalCode: '' }) })
  assert.equal(state.phase, 'complete')
  await act(async () => state.reset())
  await act(async () => pending[0].resolve([{ ...item, postalCode: '12345' }]))
  assert.equal(await selection, null)
  assert.equal(state.message, '')
})
test('unmount invalidates selection and search responses', async () => {
  await search('서울 업체')
  await act(async () => root.render(null))
  await act(async () => root.render(h(Probe)))
  await act(async () => pending[0].resolve())
  assert.deepEqual(state.results, [])
})

test('canceling a prepared address clears its unapplied postal warning', async () => {
  let selection
  await act(async () => {
    selection = await state.prepareSelection({ ...item, kind: 'address', postalCode: '' })
  })
  assert.ok(selection)
  assert.match(state.message, /우편번호가 없는 주소/)
  await act(async () => state.reset())
  assert.equal(state.message, '')
  assert.equal(state.isError, false)
  assert.equal(state.phase, 'idle')
  assert.deepEqual(state.results, [])
})
