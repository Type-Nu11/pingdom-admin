import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { installNaverSdk } from './helpers/naver-sdk.mjs'

const dom = new JSDOM('<div id="viewport"><div id="map"></div></div>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement']) globalThis[key] = dom.window[key]
const frames = new Map()
let serial = 0
globalThis.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial }
globalThis.cancelAnimationFrame = id => frames.delete(id)
const paint = () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()) }
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { createNaverGlZoomController, glWheelStep } = await server.ssrLoadModule('/src/components/map/naverGlZoomController.ts')
const { createNaverMapController } = await server.ssrLoadModule('/src/components/map/naverMapController.ts')
const { loadNaverMaps } = await server.ssrLoadModule('/src/components/map/loadNaverMaps.ts')
after(async () => { await server.close(); dom.window.close() })

test('GL loader shares a single GL request and retries', async () => {
  let pending = loadNaverMaps('test-id', 1000)
  assert.equal(loadNaverMaps('test-id', 1000), pending)
  const script = document.getElementById('pingdom-naver-map-sdk')
  assert.equal(new URL(script.src).searchParams.get('submodules'), 'gl')
  script.dispatchEvent(new dom.window.Event('error'))
  await assert.rejects(pending, /네트워크/)
  pending = loadNaverMaps('test-id', 1000)
  installNaverSdk()
  const current = document.getElementById('pingdom-naver-map-sdk')
  window[new URL(current.src).searchParams.get('callback')]()
  assert.equal(await pending, window.naver.maps)
  assert.equal(window.naver.maps.Service, undefined)
  assert.equal(document.querySelectorAll('script').length, 1)
})

test('GL input is fractional, frame-bounded, anchored and has no idle backlog', () => {
  let zoom = 15
  const calls = []
  const map = { get: () => 2, getZoom: () => zoom, stop() {}, zoomBy(delta, origin, animate) { zoom += delta; calls.push({ delta, origin, animate }) } }
  const control = createNaverGlZoomController(map, 6, 20)
  for (let i = 0; i < 100; i++) control.button(1)
  assert.equal(frames.size, 1)
  paint()
  assert.equal(zoom, 15.5)
  assert.equal(calls[0].animate, false)
  control.idle(); paint(); assert.equal(calls.length, 1)
  control.button(1); control.button(-1); paint()
  assert.equal(zoom, 15, 'latest opposite direction supersedes pending intent')
  const anchor = { lat: () => 37.5, lng: () => 127 }
  control.wheel(0.1, () => anchor); paint()
  assert.equal(calls.at(-1).origin, anchor)
  control.wheel(0.1, () => anchor); control.button(-1); paint()
  assert.equal(calls.at(-1).origin, undefined, 'buttons always zoom around center')
  zoom = 19.9; control.button(1); paint(); assert.equal(zoom, 20)
  control.button(1); paint(); assert.equal(zoom, 20)
  zoom = 6.1; control.button(-1); paint(); assert.equal(zoom, 6)
  const count = calls.length
  control.button(1); control.cancel(); paint(); assert.equal(calls.length, count)
  control.button(1); control.destroy(); control.button(1); paint()
  assert.equal(calls.length, count)
  assert.equal(frames.size, 0)
})

test('GL wheel normalizes devices and bounds extreme/nonfinite deltas', () => {
  assert.equal(glWheelStep(-100, 0, 480), 0.5)
  assert.equal(glWheelStep(-1, 1, 480), 0.08)
  assert.equal(glWheelStep(1, 2, 480), -0.5)
  assert.equal(glWheelStep(-10000, 0, 480), 0.5)
  assert.equal(glWheelStep(NaN, 0, 480), 0)
})

test('image fallback uses symmetric integer button and wheel zoom with limits', () => {
  let zoom = 15
  const calls = []
  const map = {
    get: key => { assert.equal(key, 'renderMode'); return 1 },
    getZoom: () => zoom, stop() {},
    // Real image-tile SDK rounds deltas, unlike the GL test double.
    zoomBy(delta, origin, animate) { zoom += Math.round(delta); calls.push({ delta, origin, animate }) },
  }
  const control = createNaverGlZoomController(map, 6, 20)
  control.button(-1); paint(); assert.equal(zoom, 14)
  control.button(1); paint(); assert.equal(zoom, 15)
  const anchor = { lat: () => 37.5, lng: () => 127 }
  control.wheel(glWheelStep(100, 0, 480), () => anchor); paint()
  assert.equal(zoom, 14)
  assert.equal(calls.at(-1).origin, anchor)
  control.wheel(glWheelStep(-100, 0, 480), () => anchor); paint()
  assert.equal(zoom, 15)
  for (let i = 0; i < 100; i++) control.button(-1)
  paint(); assert.equal(zoom, 14, 'a burst still applies at most one step per frame')
  control.idle(); paint(); assert.equal(zoom, 14)
  zoom = 6; control.button(-1); paint(); assert.equal(zoom, 6)
  zoom = 20; control.button(1); paint(); assert.equal(zoom, 20)
  assert.ok(calls.every(call => Number.isInteger(call.delta) && call.animate === false))
  control.destroy()
})

test('image fallback accumulates small wheel input and clears stale intent', () => {
  let zoom = 15
  let mode = 1
  const map = { get: () => mode, getZoom: () => zoom, stop() {}, zoomBy(delta) { zoom += mode === 2 ? delta : Math.round(delta) } }
  const control = createNaverGlZoomController(map, 6, 20)
  const wheel = step => { control.wheel(step, () => ({})); paint() }
  wheel(-0.25); assert.equal(zoom, 15)
  wheel(-0.25); assert.equal(zoom, 14)
  wheel(-0.25); wheel(0.25); assert.equal(zoom, 14, 'reversal replaces partial intent')
  wheel(0.25); assert.equal(zoom, 15)
  wheel(-0.25); control.cancel(); wheel(-0.25); assert.equal(zoom, 15)
  control.button(1); paint(); wheel(-0.25); assert.equal(zoom, 16, 'button clears wheel remainder')
  mode = 2; wheel(-0.25); assert.equal(zoom, 15.75, 'actual mode is read at execution time')
  mode = 1; zoom = 15; wheel(-0.25); assert.equal(zoom, 15, 'GL transition clears raster remainder')
  control.wheel(-0.5, () => ({})); control.destroy(); paint(); assert.equal(zoom, 15)
})

test('GL adapter preserves markers, panel positioning, refresh and scoped wheel cleanup', () => {
  const maps = installNaverSdk()
  const viewport = document.getElementById('viewport')
  const container = document.getElementById('map')
  for (const el of [viewport, container]) Object.defineProperties(el, { clientWidth: { value: 800, configurable: true }, clientHeight: { value: 480, configurable: true } })
  container.getBoundingClientRect = () => ({ left: 20, top: 40 })
  let selected = null
  let clicked = null
  const controller = createNaverMapController(maps, container, viewport, {
    onMarkerClick: id => { selected = id }, onMapClick: coord => { clicked = coord },
  })
  const { stats, emit } = window.naverTest
  const map = stats.maps[0]
  assert.deepEqual([map.options.gl, map.options.zoom, map.options.minZoom, map.options.maxZoom, map.options.scrollWheel], [true, 15, 6, 20, false])
  const markers = [
    { id: 1, label: '카페', latitude: 37.5, longitude: 127, category: 'CAFE', level: 10 },
    { id: 2, label: '음식점', latitude: 37.501, longitude: 127.001, category: 'RESTAURANT', level: 20 },
  ]
  controller.update({ markers: [...markers, { ...markers[0], id: 3, latitude: NaN }], fitBoundsKey: 'two' })
  assert.equal(container.querySelectorAll('button').length, 2)
  assert.deepEqual(map.lastFitOptions, { top: 160, right: 120, bottom: 100, left: 120, maxZoom: 18 })
  const button = container.querySelector('button')
  button.focus(); button.click(); assert.equal(selected, 1)
  controller.update({ markers: markers.map(m => ({ ...m })), activeMarkerId: 1, fitBoundsKey: 'two' })
  assert.equal(container.querySelector('button'), button)
  assert.equal(document.activeElement, button)
  assert.equal(stats.maps.length, 1)
  assert.equal(stats.fits.length, 1)
  assert.equal(button.getAttribute('aria-pressed'), 'true')
  const anchorBefore = map.getProjection().fromOffsetToCoord(new maps.Point(180, 80))
  const wheel = new dom.window.WheelEvent('wheel', { deltaY: -100, clientX: 200, clientY: 120, cancelable: true, ctrlKey: true })
  viewport.dispatchEvent(wheel); paint()
  assert.equal(wheel.defaultPrevented, true)
  assert.equal(map.getZoom(), 15.5)
  assert.deepEqual(map.lastZoomOrigin, anchorBefore)
  const outside = new dom.window.WheelEvent('wheel', { deltaY: -100, cancelable: true, ctrlKey: true })
  document.body.dispatchEvent(outside); assert.equal(outside.defaultPrevented, false)
  controller.handle.moveTo(37.5, 127, { offsetX: 120 })
  assert.ok(Math.abs(map.getProjection().fromCoordToOffset(new maps.LatLng(37.5, 127)).x - 520) < 0.01)
  emit(map, 'click', { coord: new maps.LatLng(37.55, 127.1) })
  assert.deepEqual(clicked, { latitude: 37.55, longitude: 127.1 })
  controller.update({ markers: markers.slice(0, 1), fitBoundsKey: 'one' })
  assert.equal(container.querySelectorAll('button').length, 1)
  controller.update({ markers: [], fitBoundsKey: 'empty' })
  assert.equal(container.querySelectorAll('button').length, 0)
  controller.handle.zoomIn(); controller.destroy(); controller.destroy(); paint()
  assert.equal(stats.destroyed, 1)
  assert.equal(stats.listeners.size, 0)
  assert.equal(frames.size, 0)
  const detached = new dom.window.WheelEvent('wheel', { deltaY: -100, cancelable: true })
  viewport.dispatchEvent(detached); assert.equal(detached.defaultPrevented, false)
})
