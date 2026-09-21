import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { installNaverSdk } from './helpers/naver-sdk.mjs'

const dom = new JSDOM('', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { normalizeAddress, searchNaverAddresses } = await server.ssrLoadModule('/src/components/map/naverGeocoder.ts')
const { loadNaverMaps } = await server.ssrLoadModule('/src/components/map/loadNaverMaps.ts')
after(async () => { await server.close(); dom.window.close() })
const address = { roadAddress: '도로 1', jibunAddress: '지번 2', x: '127', y: '37', addressElements: [{ types: ['POSTAL_CODE'], longName: '12345' }] }

test('normalizes WGS84 and optional postal code without inventing fields', () => {
  assert.deepEqual(normalizeAddress(address), { roadAddress: '도로 1', jibunAddress: '지번 2', latitude: 37, longitude: 127, postalCode: '12345' })
  assert.equal(normalizeAddress({ ...address, addressElements: [] }).postalCode, '')
  for (const changes of [{ x: '' }, { y: 'NaN' }, { y: '91' }, { roadAddress: '', jibunAddress: '' }]) assert.equal(normalizeAddress({ ...address, ...changes }), null)
})
test('admin-first SDK load includes geocoder and address results remain selectable', async () => {
  const loading = loadNaverMaps('test-id')
  const script = document.querySelector('script')
  const url = new URL(script.src)
  assert.equal(url.searchParams.get('submodules'), 'geocoder')
  installNaverSdk()
  window[url.searchParams.get('callback')]()
  await loading
  window.naver.maps.Service = { Status: { OK: 200 }, geocode: (_options, cb) => cb(200, { v2: { addresses: [address, { ...address, roadAddress: '도로 2' }] } }) }
  assert.equal((await searchNaverAddresses('도로', 'test-id')).length, 2)
  assert.equal(document.querySelectorAll('script').length, 1)
  window.naver.maps.Service.geocode = (_options, cb) => cb(500, {})
  await assert.rejects(searchNaverAddresses('도로', 'test-id'), /조회하지/)
  window.naver.maps.Service.geocode = (_options, cb) => cb(200, { v2: { addresses: [] } })
  assert.deepEqual(await searchNaverAddresses('없음', 'test-id'), [])
  window.naver.maps.Service.geocode = () => {}
  await assert.rejects(searchNaverAddresses('느림', 'test-id', 5), /초과/)
  delete window.naver.maps.Service
  await assert.rejects(searchNaverAddresses('도로', 'test-id'), /사용할 수 없습니다/)
})
