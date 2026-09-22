import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { installNaverSdk } from '../helpers/naver-sdk.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-naver-map-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
  name: 'naver-map-qa', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/naver-map-qa') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/naver-map-fixture.jsx')))
    })
  },
}] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.setDefaultTimeout(10000)
    let attempts = 0
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.hostname === 'oapi.map.naver.com') {
        attempts++
        if (attempts === 1) return route.abort()
        return route.fulfill({ contentType: 'application/javascript', body: '(' + installNaverSdk.toString() + ')();window[' + JSON.stringify(url.searchParams.get('callback')) + ']();' })
      }
      return url.hostname === '127.0.0.1' || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/naver-map-qa')
    const primary = page.getByRole('region', { name: '주 지도', exact: true })
    await primary.getByRole('button', { name: '지도 다시 불러오기' }).click()
    await primary.getByRole('button', { name: '합성 카페 · 카페 위치 선택', exact: true }).waitFor()
    await page.getByRole('region', { name: '보조 지도' }).getByRole('button', { name: '지도 다시 불러오기' }).click()
    await page.waitForFunction(() => window.naverTest.stats.maps.length === 2)
    assert.equal(attempts, 2, 'two maps share one successful SDK request')
    const assertStableSize = async () => {
      await page.waitForFunction(() => {
        return [...document.querySelectorAll('[aria-label="네이버 지도"]')].every(canvas =>
          canvas.clientWidth === canvas.parentElement.clientWidth && canvas.clientHeight === canvas.parentElement.clientHeight)
      })
      const before = await primary.locator('[aria-label="네이버 지도"]').boundingBox()
      const count = await page.evaluate(() => window.naverTest.stats.sizes.length)
      // Multiple observer deliveries must not feed SDK pixel sizes back into layout.
      await page.waitForTimeout(500)
      assert.deepEqual(await primary.locator('[aria-label="네이버 지도"]').boundingBox(), before)
      assert.equal(await page.evaluate(() => window.naverTest.stats.sizes.length), count)
    }
    await assertStableSize()
    const marker = primary.getByRole('button', { name: '합성 카페 · 카페 위치 선택', exact: true })
    await marker.focus()
    await page.keyboard.press('Enter')
    assert.equal(await marker.getAttribute('aria-pressed'), 'true')
    assert.equal(await marker.evaluate(el => el === document.activeElement), true)
    assert.deepEqual(await page.evaluate(() => window.mapQa.selected), [1])
    assert.equal(await page.evaluate(() => window.mapQa.clicks.length), 0)
    await page.keyboard.press('Space')
    assert.deepEqual(await page.evaluate(() => window.mapQa.selected), [1, 1])
    const zoom = await page.evaluate(() => window.naverTest.stats.maps[0].getZoom())
    await page.getByRole('button', { name: '확대', exact: true }).click()
    await page.waitForFunction(z => window.naverTest.stats.maps[0].getZoom() === z + 1, zoom)
    assert.equal(await page.evaluate(() => window.naverTest.stats.maps[0].getZoom()), zoom + 1)
    await page.waitForTimeout(220)
    await page.getByRole('button', { name: '축소', exact: true }).click()
    await page.waitForFunction(z => window.naverTest.stats.maps[0].getZoom() === z, zoom)
    assert.equal(await page.evaluate(() => window.naverTest.stats.maps[0].getZoom()), zoom)
    await page.waitForTimeout(220)
    const pinch = await primary.locator('[aria-label="네이버 지도"]').evaluate(canvas => {
      const event = new WheelEvent('wheel', { deltaY: -80, ctrlKey: true, bubbles: true, cancelable: true })
      canvas.dispatchEvent(event)
      return { prevented: event.defaultPrevented, zoom: window.naverTest.stats.maps[0].getZoom() }
    })
    assert.equal(pinch.prevented, true, 'map pinch cancels browser page zoom')
    assert.equal(await page.evaluate(() => window.naverTest.stats.maps[0].options.scrollWheel), true)
    assert.equal(pinch.zoom, zoom, 'custom code does not double-apply SDK wheel zoom')
    await page.getByRole('button', { name: '중심 보정' }).click()
    assert.ok(await page.evaluate(() => {
      const map = window.naverTest.stats.maps[0]
      const point = map.getProjection().fromCoordToOffset(new window.naver.maps.LatLng(37.5665, 126.978))
      return Math.abs(point.x - map.element.clientWidth / 2 - 60) < 0.01
    }))
    await primary.locator('[aria-label="네이버 지도"]').click({ position: { x: 30, y: 30 } })
    assert.deepEqual(await page.evaluate(() => window.mapQa.clicks.at(-1)), { latitude: 37.57, longitude: 126.98 })
    const sizes = await page.evaluate(() => window.naverTest.stats.sizes.length)
    await page.setViewportSize({ width: width - 20, height: 850 })
    await page.waitForFunction(count => window.naverTest.stats.sizes.length > count, sizes)
    await assertStableSize()
    await primary.evaluate(el => { el.style.width = '75%'; el.style.height = '500px' })
    await assertStableSize()
    await primary.evaluate(el => { el.style.display = 'none' })
    await page.waitForTimeout(50)
    await page.getByRole('region', { name: '주 지도', exact: true, includeHidden: true }).evaluate(el => { el.style.width = '100%'; el.style.height = '420px'; el.style.display = '' })
    await page.setViewportSize({ width, height: 900 })
    await assertStableSize()
    await page.getByRole('button', { name: '마커 비우기' }).click()
    assert.equal(await primary.locator('.pingdom-map-marker').count(), 0)
    await page.getByRole('button', { name: '마커 복원' }).click()
    await marker.waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, 'map-' + width + '.png'), fullPage: true })
    await page.getByRole('button', { name: '주 지도 전환' }).click()
    assert.equal(await page.evaluate(() => window.naverTest.stats.destroyed), 1)
    await page.getByRole('button', { name: '보조 지도 전환' }).click()
    assert.equal(await page.evaluate(() => window.naverTest.stats.listeners.size), 0)
    await page.getByRole('button', { name: '주 지도 전환' }).click()
    await marker.waitFor()
    assert.equal(attempts, 2)
    await page.evaluate(() => window.navermap_authFailure())
    await primary.getByRole('alert').filter({ hasText: '인증에 실패' }).waitFor()
    assert.equal(await primary.locator('.pingdom-map-marker').count(), 0)
    await primary.getByRole('button', { name: '지도 다시 불러오기' }).click()
    await marker.waitFor()
    assert.equal(attempts, 3)
    assert.deepEqual(errors, [])
    console.log('PASS NAVER mocked SDK browser ' + width + 'px')
    await page.close()
  }
  console.log('Screenshots: ' + output)
} finally { await browser?.close(); await server.close() }
