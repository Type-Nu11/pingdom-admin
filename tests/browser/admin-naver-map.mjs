import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { installNaverSdk } from '../helpers/naver-sdk.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-admin-naver-'))
const server = await createServer({
  cacheDir: join(output, 'cache'),
  define: { 'import.meta.env.VITE_NAVER_MAP_CLIENT_ID': JSON.stringify('synthetic-public-id') },
  server: { host: '127.0.0.1', port: 0, open: false },
  plugins: [{ name: 'admin-naver-qa', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== '/admin-map-qa') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/place-inspector-fixture.jsx')))
    })
  } }],
})
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    let releaseSdk
    const gate = new Promise(resolve => { releaseSdk = resolve })
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.hostname === 'oapi.map.naver.com') {
        await gate
        return route.fulfill({ contentType: 'application/javascript', body: `(${installNaverSdk.toString()})();window[${JSON.stringify(url.searchParams.get('callback'))}]();` })
      }
      return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/admin-map-qa`, { waitUntil: 'domcontentloaded' })
    const list = page.locator('[aria-label="장소 목록"]')
    await list.getByRole('button').first().click()
    await page.getByRole('button', { name: '장소 상세 닫기' }).waitFor()
    releaseSdk()
    await page.waitForFunction(() => window.naverTest?.stats.centers.some(c => Math.abs(c.lat() - 37.01) < 0.00001))
    await page.waitForFunction(() => document.querySelectorAll('.pingdom-map-marker').length === 2)
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[aria-label="네이버 지도"]')
      const detail = document.querySelector('button[aria-label="장소 상세 닫기"]')?.closest('aside')
      if (!detail) return false
      const mapRect = canvas.getBoundingClientRect(), detailRect = detail.getBoundingClientRect()
      const covered = Math.min(mapRect.width, Math.max(0, detailRect.right - mapRect.left))
      const offset = mapRect.width - covered < 240 ? 0 : covered / 2
      const map = window.naverTest.stats.maps[0]
      const point = map.getProjection().fromCoordToOffset(new window.naver.maps.LatLng(37.01, 127))
      return Math.abs(point.x - canvas.clientWidth / 2 - offset) < 1
    })
    await page.getByRole('button', { name: '장소 상세 닫기' }).click()
    const marker = page.locator('.pingdom-map-marker').first()
    await marker.click()
    await page.waitForFunction(() => document.querySelector('.pingdom-map-marker')?.getAttribute('aria-pressed') === 'true')
    assert.equal(await marker.getAttribute('aria-pressed'), 'true')
    await page.getByRole('button', { name: '장소 상세 닫기' }).click()
    const zoom = await page.evaluate(() => window.naverTest.stats.maps[0].getZoom())
    await page.getByRole('button', { name: '지도 확대' }).click()
    assert.equal(await page.evaluate(() => window.naverTest.stats.maps[0].getZoom()), zoom + 1)
    await page.evaluate(() => {
      const button = document.querySelector('[aria-label="지도 확대"]')
      for (let i = 0; i < 20; i++) button.click()
    })
    assert.equal(await page.evaluate(() => window.naverTest.stats.maps[0].getZoom()), zoom + 1)
    await page.waitForTimeout(220)
    await page.getByRole('button', { name: '지도 축소' }).click()
    assert.equal(await page.evaluate(() => window.naverTest.stats.maps[0].getZoom()), zoom)
    await page.getByRole('button', { name: '장소 목록 접기' }).click()
    await page.getByRole('button', { name: '장소 목록 열기' }).click()
    await page.setViewportSize({ width: width - 30, height: 700 })
    await page.waitForFunction(() => {
      const c = document.querySelector('[aria-label="네이버 지도"]')
      return c.clientWidth === c.parentElement.clientWidth && c.clientHeight === c.parentElement.clientHeight
    })
    await page.evaluate(async () => {
      const { default: client } = await import('/src/api/customAxios.ts')
      const previous = client.defaults.adapter
      client.defaults.adapter = async config => {
        const response = await previous(config)
        if (config.url === '/admin/places') {
          const keyword = config.params?.keyword
          if (keyword === 'pages') {
            const pageNumber = Number(config.params?.page ?? 1)
            response.data.places = [response.data.places[pageNumber - 1]]
            Object.assign(response.data, { page: pageNumber, totalCount: 20, totalPages: 2, hasNext: pageNumber === 1 })
          } else {
            response.data.places = keyword === 'empty' ? [] : response.data.places.map((p, i) => i ? { ...p, latitude: 999 } : p)
            response.data.totalCount = response.data.places.length
          }
        }
        return response
      }
    })
    const search = page.getByLabel('장소명, 등록자 ID, 주소 검색', { exact: true })
    await search.fill('pages')
    await page.getByRole('button', { name: '다음 페이지로 이동', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.pingdom-map-marker')?.getAttribute('aria-label')?.includes('합성 장소 2'))
    assert.equal(await page.locator('.pingdom-map-marker').count(), 1)
    await search.fill('invalid')
    await page.waitForFunction(() => document.querySelectorAll('.pingdom-map-marker').length === 1)
    await page.getByText('1개 장소 표시', { exact: true }).waitFor()
    await search.fill('empty')
    await page.waitForFunction(() => document.querySelectorAll('.pingdom-map-marker').length === 0)
    await page.getByText('0개 장소 표시', { exact: true }).waitFor()
    await page.getByRole('button', { name: '검색어 지우기' }).click()
    await list.getByRole('button').first().waitFor()
    await page.evaluate(() => window.navermap_authFailure())
    await page.getByRole('alert').filter({ hasText: '인증에 실패' }).waitFor()
    await list.getByRole('button').first().click()
    await page.getByRole('button', { name: '장소 상세 닫기' }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.getByRole('button', { name: '장소 상세 닫기' }).click()
    await page.getByRole('button', { name: '지도 다시 불러오기' }).click()
    await page.waitForFunction(() => document.querySelectorAll('.pingdom-map-marker').length === 1)
    const beforeRefresh = await page.evaluate(() => ({ maps: window.naverTest.stats.maps.length, destroyed: window.naverTest.stats.destroyed }))
    await page.getByRole('button', { name: '장소 목록 새로고침', exact: true }).click()
    await page.waitForFunction(count => window.naverTest.stats.maps.length === count + 1, beforeRefresh.maps)
    assert.equal(await page.evaluate(() => window.naverTest.stats.destroyed), beforeRefresh.destroyed + 1)
    await page.waitForFunction(() => document.querySelectorAll('.pingdom-map-marker').length === 1)
    assert.deepEqual(errors, [])
    await page.screenshot({ path: join(output, `admin-map-${width}.png`), fullPage: true })
    console.log(`PASS admin NAVER integration ${width}px (mock SDK/API, no mutations)`)
    await page.close()
  }
  console.log('Screenshots: ' + output)
} finally { await browser?.close(); await server.close() }
