import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const api = await server.ssrLoadModule('/src/api/merchantUnifiedPlaceSearchApi.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
after(async () => { await server.close(); dom.window.close() })
const place = { name: '합성 카페24', roadAddress: '서울 합성로 10', jibunAddress: '서울 합성동 20', latitude: 37.5, longitude: 127 }
const address = { roadAddress: place.roadAddress, jibunAddress: place.jibunAddress, postalCode: '12345', latitude: 37.6, longitude: 127.1 }
const current = { placeName: '작성한 장소명', roadAddress: place.roadAddress, jibunAddress: place.jibunAddress, postalCode: '54321', latitude: '37.500100', longitude: '127.000200', pinAdjusted: true }
const signal = () => new AbortController().signal
const response = (config, items) => ({ config, data: { items }, status: 200, statusText: 'OK', headers: {} })

test('road/lot numbers use address search, ambiguous localities and numeric brand names use place search', () => {
  for (const query of ['서울 중구 세종대로 110', '서울 세종대로110', '성수동 123-4', '성수동 산 21', '서울 합성로12길 3', '합성읍 12']) assert.equal(api.prefersAddressSearch(query), true, query)
  for (const query of ['성수동', '서울시청', '합성 카페24', '성수 카페', '123', '가로수길']) assert.equal(api.prefersAddressSearch(query), false, query)
})

for (const query of ['서울 합성로 10', '합성 카페24']) {
  for (const fallback of [false, true]) {
    test(`${query}: sequential ${fallback ? 'empty-result fallback' : 'single API'} preserves result type and signal`, async () => {
      const calls = []
      const controller = new AbortController()
      client.defaults.adapter = async config => {
        calls.push(config.url)
        assert.equal(config.params.query, query)
        assert.equal(config.signal, controller.signal)
        return response(config, fallback && calls.length === 1 ? [] : [config.url.endsWith('address-search') ? address : place])
      }
      const result = await api.searchMerchantPlacesAndAddresses(` ${query} `, controller.signal)
      const first = query.includes('합성로') ? 'address' : 'place'
      assert.equal(calls.length, fallback ? 2 : 1)
      assert.ok(calls[0].endsWith(`naver-${first}-search`))
      assert.equal(result[0].kind, fallback ? first === 'address' ? 'place' : 'address' : first)
    })
  }
}

test('invalid query and pre-aborted request do not call APIs', async () => {
  let calls = 0
  client.defaults.adapter = async config => { calls++; return response(config, []) }
  for (const query of ['', '  ', '가'.repeat(101)]) await assert.rejects(api.searchMerchantPlacesAndAddresses(query, signal()), /1~100/)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(api.searchMerchantPlacesAndAddresses('합성 장소', controller.signal))
  assert.equal(calls, 0)
})

test('server failures and malformed data do not masquerade as empty results or trigger fallback', async () => {
  for (const query of ['합성 업체', '서울 합성로 10']) {
    for (const malformed of [false, true]) {
      let calls = 0
      client.defaults.adapter = async config => {
        calls++
        if (malformed) return { ...response(config, []), data: {} }
        throw Object.assign(new Error('synthetic server failure'), { isAxiosError: true, response: { status: 503 }, category: 'server' })
      }
      await assert.rejects(api.searchMerchantPlacesAndAddresses(query, signal()))
      assert.equal(calls, 1)
    }
  }
})

test('two valid empty responses stay empty', async () => {
  let calls = 0
  client.defaults.adapter = async config => { calls++; return response(config, []) }
  assert.deepEqual(await api.searchMerchantPlacesAndAddresses('없는 업체', signal()), [])
  assert.equal(calls, 2)
})

test('postal supplementation matches addresses and never substitutes the address geocoder coordinates', async () => {
  client.defaults.adapter = async config => response(config, [{ ...address, roadAddress: '다른로 10', postalCode: '99999' }, { ...address, roadAddress: '서울  합성로 10' }])
  const result = await api.completeMerchantSearchCandidate({ ...place, kind: 'place', postalCode: '' }, signal())
  assert.equal(result.candidate.postalCode, '12345')
  assert.equal(result.candidate.latitude, place.latitude)
  assert.equal(result.candidate.longitude, place.longitude)
  assert.equal(result.message, '')
  assert.equal(api.sameSearchAddress(place, { ...address, roadAddress: '다른로 10' }), false)
  assert.equal(api.sameSearchAddress({ roadAddress: '', jibunAddress: '' }, { roadAddress: '', jibunAddress: '' }), false)
})

test('unmatched/ambiguous/missing postal results require manual supplementation, no guessed first result', async () => {
  for (const items of [[], [{ ...address, roadAddress: '다른로 10' }], [{ ...address, postalCode: '' }], [address, { ...address, postalCode: '99999' }]]) {
    client.defaults.adapter = async config => response(config, items)
    const result = await api.completeMerchantSearchCandidate({ ...place, kind: 'place', postalCode: '' }, signal())
    assert.equal(result.candidate.postalCode, '')
    assert.match(result.message, /직접 입력/)
  }
})

test('postal failure keeps usable place data but auth failures are not concealed', async () => {
  client.defaults.adapter = async () => { throw new Error('synthetic failure') }
  const result = await api.completeMerchantSearchCandidate({ ...place, kind: 'place', postalCode: '' }, signal())
  assert.equal(result.candidate.name, place.name)
  assert.match(result.message, /업체 위치는 유지.*직접 입력/)
  client.defaults.adapter = async () => { throw Object.assign(new Error('auth'), { isAxiosError: true, category: 'forbidden', response: { status: 403 } }) }
  await assert.rejects(api.completeMerchantSearchCandidate({ ...place, kind: 'place', postalCode: '' }, signal()), /권한/)
})

test('same-address supplementation keeps written name and adjusted pin; changed address clears old postal and requires confirmation', () => {
  const same = api.getMerchantSearchSelection({ ...address, kind: 'address', postalCode: '' }, current)
  assert.equal(same.placeName, current.placeName)
  assert.equal(same.latitude, current.latitude)
  assert.equal(same.longitude, current.longitude)
  assert.equal(same.postalCode, current.postalCode)
  assert.equal(same.needsPinConfirmation, false)
  assert.equal(same.pinAdjusted, true)
  const other = api.getMerchantSearchSelection({ ...address, kind: 'address', roadAddress: '다른로 1', postalCode: '' }, current)
  assert.equal(other.postalCode, '')
  assert.equal(other.needsPinConfirmation, true)
  const replacement = api.getMerchantSearchSelection({ ...place, name: '새 업체', kind: 'place', postalCode: '12345' }, current)
  assert.equal(replacement.placeName, '새 업체')
  assert.equal(replacement.needsPinConfirmation, true)
})

test('invalid current coordinates cannot be retained as a valid selected address', () => {
  for (const latitude of ['', 'abc', '91']) {
    const next = api.getMerchantSearchSelection({ ...address, kind: 'address' }, { ...current, latitude })
    assert.equal(next.latitude, address.latitude.toFixed(6))
  }
})
