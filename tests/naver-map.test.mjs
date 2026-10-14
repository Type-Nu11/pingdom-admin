import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { installNaverSdk } from './helpers/naver-sdk.mjs'

const dom = new JSDOM('<div id="viewport"><div id="map"></div></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'HTMLElement']) globalThis[key] = dom.window[key]
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { loadNaverMaps, subscribeNaverAuthFailure } = await server.ssrLoadModule('/src/components/map/loadNaverMaps.ts')
const { isValidMapCoordinate } = await server.ssrLoadModule('/src/components/map/map.types.ts')
after(async () => { await server.close(); dom.window.close() })

test('loader validates configuration, shares requests, retries failures and handles late authentication errors', async () => {
  await assert.rejects(loadNaverMaps(''), /Client ID/)
  let promise = loadNaverMaps('test-public-id')
  assert.equal(loadNaverMaps('test-public-id'), promise)
  const script = () => document.getElementById('pingdom-naver-map-sdk')
  const callback = element => new URL(element.src).searchParams.get('callback')
  assert.equal(new URL(script().src).searchParams.get('ncpKeyId'), 'test-public-id')
  assert.equal(new URL(script().src).searchParams.get('submodules'), 'gl')
  assert.equal(document.querySelectorAll('script').length, 1)
  await assert.rejects(loadNaverMaps('another-id'), /새로고침/)
  const failedCallback = callback(script())
  script().dispatchEvent(new dom.window.Event('error'))
  await assert.rejects(promise, /네트워크/)
  assert.equal(script(), null)
  promise = loadNaverMaps('test-public-id', 5)
  await assert.rejects(promise, /초과/)
  promise = loadNaverMaps('test-public-id')
  window[failedCallback]() // Old requests must not resolve a newer attempt.
  let resolved = false
  promise.then(() => { resolved = true })
  await Promise.resolve()
  assert.equal(resolved, false)
  installNaverSdk()
  window[callback(script())]()
  assert.equal(await promise, window.naver.maps)
  assert.equal(loadNaverMaps('test-public-id'), promise)
  let authFailures = 0
  const unsubscribe = subscribeNaverAuthFailure(() => authFailures++)
  window.navermap_authFailure()
  assert.equal(authFailures, 1)
  promise = loadNaverMaps('test-public-id')
  const rejection = assert.rejects(promise, /인증/)
  window.navermap_authFailure()
  await rejection
  unsubscribe()
  promise = loadNaverMaps('test-public-id')
  installNaverSdk()
  window[callback(script())]()
  await promise
})

test('invalid coordinates are excluded without excluding zero coordinates', () => {
  for (const coordinate of [{ latitude: NaN, longitude: 1 }, { latitude: 91, longitude: 1 }, { latitude: 0, longitude: 181 }]) assert.equal(isValidMapCoordinate(coordinate), false)
  assert.equal(isValidMapCoordinate({ latitude: 0, longitude: 0 }), true)
})
