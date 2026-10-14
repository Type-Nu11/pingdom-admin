import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { searchNaverAddresses: search, getNaverAddressSearchError: message } = await server.ssrLoadModule('/src/api/merchantNaverAddressSearchApi.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
after(async () => { await server.close(); dom.window.close() })
const item = { roadAddress: '도로 1', jibunAddress: '지번 2', postalCode: null, latitude: 37, longitude: 127 }

test('address REST query is bounded, authenticated through shared client and independent of SDK', async () => {
  let calls = 0
  const controller = new AbortController()
  client.defaults.adapter = async config => {
    calls++
    assert.equal(config.url, '/users/me/merchant-place-applications/naver-address-search')
    assert.deepEqual(config.params, { query: '도로 1' })
    assert.equal(config.signal, controller.signal)
    assert.equal(config.timeout, 10000)
    return { data: { items: Array(12).fill(item) }, status: 200, statusText: 'OK', headers: {}, config }
  }
  await assert.rejects(search(' '), /1~100/)
  await assert.rejects(search('가'.repeat(101)), /1~100/)
  assert.equal(calls, 0)
  const result = await search(' 도로 1 ', controller.signal)
  assert.equal(result.length, 10)
  assert.deepEqual(result[0], { ...item, postalCode: '' })
  assert.equal(document.querySelectorAll('script').length, 0)
})

test('empty results and optional postal code do not conceal malformed responses', async () => {
  for (const data of [{ items: [] }, { items: [item] }, { items: [{ ...item, postalCode: '12345' }] }, { items: [{ ...item, latitude: '37' }] }, { items: [{ ...item, longitude: 181 }] }, { items: [{ ...item, roadAddress: '', jibunAddress: '' }] }, { items: [{ ...item, postalCode: 12345 }] }, {}]) {
    client.defaults.adapter = async config => ({ data, status: 200, statusText: 'OK', headers: {}, config })
    if (data.items?.length === 0) assert.deepEqual(await search('없음'), [])
    else if (data.items?.[0] === item || data.items?.[0]?.postalCode === '12345') assert.equal((await search('주소'))[0].postalCode, data.items[0].postalCode ?? '')
    else await assert.rejects(search('주소'), /형식/)
  }
})

test('deployment, quota, timeout and auth errors have distinct user guidance', () => {
  for (const [code, expected] of [['NAVER_ADDRESS_SEARCH_UNAVAILABLE', '사용할 수 없습니다'], ['NAVER_ADDRESS_SEARCH_TIMEOUT', '초과'], ['NAVER_ADDRESS_SEARCH_RATE_LIMITED', '너무 많습니다'], ['NAVER_ADDRESS_SEARCH_FAILED', '조회하지'], ['PLACE_SEARCH_CONDITION_INVALID', '1~100']]) {
    assert.match(message({ isAxiosError: true, response: { data: { code } } }), new RegExp(expected))
  }
  for (const status of [404, 405]) assert.match(message({ isAxiosError: true, response: { status } }), /배포/)
  assert.match(message({ isAxiosError: true, category: 'unauthorized' }), /로그인/)
  assert.match(message({ isAxiosError: true, category: 'forbidden' }), /권한/)
  assert.match(message({ isAxiosError: true, category: 'network' }), /연결/)
})
