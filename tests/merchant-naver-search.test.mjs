import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.localStorage = dom.window.localStorage
globalThis.sessionStorage = dom.window.sessionStorage
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { searchMerchantNaverPlaces: search, getNaverPlaceSearchError: errorMessage } = await server.ssrLoadModule('/src/api/merchantNaverPlaceSearchApi.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
after(async () => { await server.close(); dom.window.close() })
const item = { name: '<b>합성 업체</b>', roadAddress: '', jibunAddress: '지번', latitude: 37, longitude: 127 }

test('validates query before making a request, sends trimmed query and signal, caps results at five', async () => {
  let calls = 0
  const controller = new AbortController()
  client.defaults.adapter = async config => {
    calls++
    assert.equal(config.url, '/users/me/merchant-place-applications/naver-place-search')
    assert.deepEqual(config.params, { query: '성수 카페' })
    assert.equal(config.signal, controller.signal)
    return { data: { items: Array(6).fill(item) }, status: 200, statusText: 'OK', config, headers: {} }
  }
  await assert.rejects(search(' '), /1~100/)
  await assert.rejects(search('가'.repeat(101)), /1~100/)
  assert.equal(calls, 0)
  const results = await search(' 성수 카페 ', controller.signal)
  assert.equal(results.length, 5)
  assert.deepEqual(results[0], item)
})
test('distinguishes empty results from invalid response and rejects unusable coordinates', async () => {
  for (const data of [{ items: [] }, { items: [{ ...item, longitude: 181 }] }, {}, { items: [{ ...item, latitude: '37' }] }]) {
    client.defaults.adapter = async config => ({ data, status: 200, statusText: 'OK', config, headers: {} })
    if (data.items?.length === 0) assert.deepEqual(await search('없음'), [])
    else await assert.rejects(search('검색'), /형식/)
  }
})
test('domain failure and network/auth errors have distinct messages', () => {
  for (const [code, text] of [['NAVER_PLACE_SEARCH_UNAVAILABLE', '사용할 수 없습니다'], ['NAVER_PLACE_SEARCH_FAILED', '실패'], ['PLACE_SEARCH_CONDITION_INVALID', '1~100']]) {
    assert.match(errorMessage({ isAxiosError: true, response: { data: { code } } }), new RegExp(text))
  }
  assert.match(errorMessage({ isAxiosError: true, category: 'forbidden' }), /권한/)
  assert.match(errorMessage({ isAxiosError: true, category: 'unauthorized' }), /로그인/)
  assert.match(errorMessage({ isAxiosError: true, category: 'network' }), /연결/)
})
