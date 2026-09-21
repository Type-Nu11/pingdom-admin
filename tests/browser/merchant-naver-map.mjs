import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { installNaverSdk } from '../helpers/naver-sdk.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-merchant-naver-'))
const server = await createServer({
  cacheDir: join(output, 'cache'),
  define: { 'import.meta.env.VITE_NAVER_MAP_CLIENT_ID': JSON.stringify('test-id') },
  server: { host: '127.0.0.1', port: 0, open: false },
  plugins: [{ name: 'merchant-naver-test', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/merchant')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/onboarding-fixture.jsx')))
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
    const searchRequests = []
    const pendingSearches = []
    let searchMode = 'normal'
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.hostname === 'oapi.map.naver.com') return route.fulfill({ contentType: 'application/javascript', body:
        '(' + installNaverSdk.toString() + ')();window.geocodeQueue=[];window.naver.maps.Service={Status:{OK:200},geocode:(options,callback)=>window.geocodeQueue.push({options,callback})};window[' + JSON.stringify(url.searchParams.get('callback')) + ']();' })
      if (url.hostname === 'dapi.kakao.com') throw new Error('Kakao SDK must not be requested')
      if (url.pathname.startsWith('/api/')) {
        assert.equal(route.request().method(), 'GET', 'No real writes')
        if (url.pathname.endsWith('/naver-place-search')) {
          searchRequests.push(url.searchParams.get('query'))
          if (searchMode === 'delay') return new Promise(resolve => pendingSearches.push(async () => {
            try { await route.fulfill({ json: { items: [{ name: '늦은 업체', roadAddress: '늦은 도로', jibunAddress: '', latitude: 37, longitude: 127 }] } }) } finally { resolve() }
          }))
          if (searchMode === 'empty') return route.fulfill({ json: { items: [] } })
          if (searchMode === 'forbidden') return route.fulfill({ status: 403, json: { code: 'ACCESS_DENIED', message: '접근 권한이 없습니다.' } })
          if (searchMode === 'unavailable') return route.fulfill({ status: 503, json: { code: 'NAVER_PLACE_SEARCH_UNAVAILABLE' } })
          return route.fulfill({ json: { items: [{ name: '합성 업체', roadAddress: '기존 도로', jibunAddress: '기존 지번', latitude: 37, longitude: 127 }] } })
        }
        if (url.pathname.endsWith('/merchant-owner-profile')) return route.fulfill({ status: 404, json: { code: 'PROFILE_NOT_FOUND' } })
        if (url.pathname.endsWith('/merchant-place-applications')) return route.fulfill({ json: { items: [], hasNext: false } })
        return route.abort()
      }
      return url.hostname === '127.0.0.1' || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/merchant/place-registration')
    const query = page.getByLabel('도로명·지번 주소 검색', { exact: true })
    await query.fill('도로')
    await page.getByRole('button', { name: '주소 검색', exact: true }).click()
    await page.waitForFunction(() => window.geocodeQueue?.length === 1)
    await query.press('Enter')
    await query.press('Enter')
    assert.equal(await page.evaluate(() => window.geocodeQueue.length), 1, 'Enter must not duplicate the pending query')
    const respond = async (roads, status = 200) => page.evaluate(({ roads, status }) => {
      window.geocodeQueue.shift().callback(status, { v2: { addresses: roads.map((roadAddress, i) => ({ roadAddress, jibunAddress: '지번 ' + i, x: '127', y: '37', addressElements: [] })) } })
    }, { roads, status })
    await respond(['도로 A', '도로 B'])
    assert.equal(await page.locator('.pingdom-map-marker').count(), 0)
    await page.getByRole('button', { name: /도로 B.*우편번호/ }).click()
    assert.equal(await page.getByLabel('도로명 주소', { exact: true }).inputValue(), '도로 B')
    assert.equal(await page.getByLabel('우편번호', { exact: true }).inputValue(), '')
    await page.locator('.pingdom-map-marker').waitFor()
    assert.equal(await page.getByLabel('장소명', { exact: true }).last().inputValue(), '')
    // Late results must not undo manual edits.
    await query.fill('늦은 주소')
    await page.getByRole('button', { name: '주소 검색', exact: true }).click()
    await page.waitForFunction(() => window.geocodeQueue.length === 1)
    await page.getByLabel('도로명 주소', { exact: true }).fill('직접 수정')
    await respond(['늦은 도로'])
    assert.equal(await page.getByRole('button', { name: /늦은 도로.*우편번호/ }).count(), 0)
    assert.equal(await page.getByLabel('도로명 주소', { exact: true }).inputValue(), '직접 수정')
    await query.fill('오류')
    await page.getByRole('button', { name: '주소 검색', exact: true }).click()
    await page.waitForFunction(() => window.geocodeQueue.length === 1)
    await respond([], 500)
    await page.getByText('주소를 조회하지 못했습니다. 다시 검색하거나 직접 입력해주세요.', { exact: true }).waitFor()
    await query.press('Enter')
    await page.waitForFunction(() => window.geocodeQueue.length === 1)
    await respond([])
    await page.getByText('검색 결과가 없습니다. 주소와 좌표를 직접 입력해주세요.', { exact: true }).waitFor()
    const map = page.getByLabel('네이버 지도', { exact: true })
    await map.click({ position: { x: 25, y: 25 } })
    await page.getByText('좌표 직접 입력', { exact: true }).click()
    assert.equal(await page.getByLabel('위도', { exact: true }).inputValue(), '37.570000')
    await page.getByLabel('위도', { exact: true }).fill('36.2')
    await page.waitForFunction(() => window.naverTest.stats.centers.at(-1)?.lat() === 36.2)
    // SDK retry must restore the latest manually entered coordinate.
    await page.evaluate(() => window.navermap_authFailure())
    await page.getByRole('button', { name: '지도 다시 불러오기' }).click()
    await page.waitForFunction(() => window.naverTest.stats.centers.at(-1)?.lat() === 36.2)
    await query.fill('재검색')
    await page.getByRole('button', { name: '주소 검색', exact: true }).click()
    await page.waitForFunction(() => window.geocodeQueue.length === 1)
    await query.fill('새 주소')
    await query.press('Enter')
    await page.waitForFunction(() => window.geocodeQueue.length === 2)
    await respond(['이전 쿼리 결과'])
    assert.equal(await page.getByRole('button', { name: /이전 쿼리 결과.*우편번호/ }).count(), 0)
    assert.equal(await page.getByRole('button', { name: '주소 검색', exact: true }).isDisabled(), true)
    await query.press('Enter')
    assert.equal(await page.evaluate(() => window.geocodeQueue.length), 1, 'An older completion must not unlock the newer request')
    await respond([])
    await page.getByText('검색 결과가 없습니다. 주소와 좌표를 직접 입력해주세요.', { exact: true }).waitFor()
    // Server keyword search is independent of the map SDK.
    await page.getByLabel('장소명, 건물명 또는 주소 검색', { exact: true }).fill('업체')
    await page.getByRole('button', { name: '장소 검색', exact: true }).click()
    await page.getByRole('option', { name: '합성 업체, 기존 도로' }).click()
    assert.equal(await page.getByLabel('장소명', { exact: true }).inputValue(), '합성 업체')
    const keyword = page.getByLabel('장소명, 건물명 또는 주소 검색', { exact: true })
    const keywordButton = page.getByRole('button', { name: '장소 검색', exact: true })
    // Failures and empty results preserve the selected form values.
    for (const [mode, message] of [['empty', '검색 결과가 없습니다. 지역명을 포함해 다시 검색하거나 직접 입력해주세요.'], ['forbidden', '접근 권한이 없습니다.'], ['unavailable', '업체명 검색 서비스를 사용할 수 없습니다. 잠시 후 다시 시도하거나 직접 입력해주세요.']]) {
      searchMode = mode
      await keyword.fill(mode)
      await keywordButton.click()
      await page.getByText(message, { exact: true }).waitFor()
      assert.equal(await page.getByLabel('장소명', { exact: true }).inputValue(), '합성 업체')
    }
    searchMode = 'delay'
    const before = searchRequests.length
    await keyword.fill('성수 카페')
    const started = page.waitForRequest(request => request.url().includes('/naver-place-search'))
    await keyword.press('Enter')
    await started
    await keyword.press('Enter')
    await keyword.press('Enter')
    assert.equal(searchRequests.length, before + 1)
    searchMode = 'normal'
    await keyword.fill('새 검색어')
    await keyword.press('Enter')
    await page.getByRole('option', { name: '합성 업체, 기존 도로' }).waitFor()
    await pendingSearches.shift()()
    assert.equal(await page.getByRole('option', { name: /늦은 업체/ }).count(), 0)
    await page.getByRole('option', { name: '합성 업체, 기존 도로' }).click()
    searchMode = 'delay'
    await keyword.fill('수동 수정 전 검색')
    const manualStarted = page.waitForRequest(request => request.url().includes('/naver-place-search'))
    await keyword.press('Enter')
    await manualStarted
    await page.getByRole('button', { name: '직접 입력', exact: true }).click()
    await page.getByLabel('도로명 주소', { exact: true }).fill('보존할 주소')
    await pendingSearches.shift()()
    assert.equal(await page.getByRole('option', { name: /늦은 업체/ }).count(), 0)
    assert.equal(await page.getByLabel('도로명 주소', { exact: true }).inputValue(), '보존할 주소')
    searchMode = 'normal'
    await keyword.press('Enter')
    await page.getByRole('option', { name: '합성 업체, 기존 도로' }).click()
    // Category remains the manually chosen/default value, not an inferred provider category.
    assert.equal(await page.getByRole('button', { name: /음식점/ }).count(), 1)
    await page.screenshot({ path: join(output, 'registration-' + width + '.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await query.fill('이전 신청 검색')
    await page.getByRole('button', { name: '주소 검색', exact: true }).click()
    await page.waitForFunction(() => window.geocodeQueue.length === 1)
    await page.getByRole('button', { name: '새로고침', exact: true }).click()
    await respond(['이전 신청 주소'])
    assert.equal(await query.inputValue(), '')
    assert.equal(await page.getByRole('button', { name: /이전 신청 주소.*우편번호/ }).count(), 0)
    await page.reload()
    assert.equal(await query.inputValue(), '')
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('PASS: merchant NAVER map/address selection, manual edit races, errors, coordinates, keyword compatibility, refresh at 1280/390; ' + output)
} finally { await browser?.close(); await server.close() }
