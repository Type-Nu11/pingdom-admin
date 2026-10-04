import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { installNaverSdk } from '../helpers/naver-sdk.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-unified-search-'))
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
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    page.setDefaultTimeout(10000)
    const errors = []
    const calls = []
    const pending = []
    let markDelayedStarted
    const delayedStarted = new Promise(resolve => { markDelayedStarted = resolve })
    const place = { name: '합성 업체', roadAddress: '서울 합성로 10', jibunAddress: '서울 합성동 20', latitude: 37, longitude: 127 }
    const address = { roadAddress: place.roadAddress, jibunAddress: place.jibunAddress, postalCode: '12345', latitude: 37.6, longitude: 127.1 }
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.hostname === 'oapi.map.naver.com') return route.fulfill({ contentType: 'application/javascript', body:
        '(' + installNaverSdk.toString() + ')();window[' + JSON.stringify(url.searchParams.get('callback')) + ']();' })
      if (url.pathname.startsWith('/api/')) {
        assert.equal(route.request().method(), 'GET', 'No real writes')
        const query = url.searchParams.get('query')
        if (url.pathname.endsWith('/naver-address-search') || url.pathname.endsWith('/naver-place-search')) {
          calls.push({ path: url.pathname, query })
          if (query === '늦은 업체') return new Promise(resolve => {
            pending.push(async () => {
              try { await route.fulfill({ json: { items: [{ ...place, name: '늦은 결과' }] } }) } finally { resolve() }
            })
            markDelayedStarted()
          })
          if (query === '오류') return route.fulfill({ status: 503, json: { code: 'NAVER_PLACE_SEARCH_UNAVAILABLE' } })
          if (query === '권한오류') return route.fulfill({ status: 403, json: { code: 'ACCESS_DENIED', message: '접근 권한이 없습니다.' } })
          if (query === '빈 검색') return route.fulfill({ json: { items: [] } })
          if (url.pathname.endsWith('/naver-address-search')) {
            if (query === '서울 다른로 20') return route.fulfill({ json: { items: [{ ...address, roadAddress: '서울 다른로 20', jibunAddress: '서울 다른동 20', postalCode: null, latitude: 37.9 }] } })
            return route.fulfill({ json: { items: [{ ...address, roadAddress: '틀린로 10', postalCode: '99999' }, address] } })
          }
          return route.fulfill({ json: { items: [place] } })
        }
        if (url.pathname.endsWith('/merchant-owner-profile')) return route.fulfill({ status: 404, json: { code: 'PROFILE_NOT_FOUND' } })
        if (url.pathname.endsWith('/merchant-place-applications')) return route.fulfill({ json: { items: [], hasNext: false } })
        return route.abort()
      }
      return url.hostname === '127.0.0.1' || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/merchant/place-registration')
    await page.getByRole('button', { name: '새 장소 등록 신청', exact: true }).click()
    const query = page.getByLabel('업체명 또는 주소', { exact: true })
    const search = page.getByRole('button', { name: '장소·주소 검색', exact: true })
    await query.waitFor()
    assert.equal(await search.count(), 1)
    assert.equal(await page.locator('vite-error-overlay').count(), 0)
    assert.equal(await page.locator('#naver-address-query').count(), 0)
    await page.screenshot({ path: join(output, 'initial-' + width + '.png'), fullPage: true })
    const run = async value => { await query.fill(value); await query.press('Enter') }

    await run('합성 업체')
    await page.getByRole('button', { name: /합성 업체.*업체/ }).click()
    await page.getByLabel(/^장소명(?: \(필수\))?$/).waitFor()
    assert.equal(await page.getByLabel(/^장소명(?: \(필수\))?$/).inputValue(), '합성 업체')
    await page.getByText('우편번호 12345', { exact: true }).waitFor()
    assert.ok(calls[0].path.endsWith('/naver-place-search'))
    assert.ok(calls[1].path.endsWith('/naver-address-search'))
    await page.getByText('좌표 직접 입력', { exact: true }).click()
    assert.equal(await page.getByLabel('위도', { exact: true }).inputValue(), '37.000000', 'postal lookup must not move business marker')
    await page.getByLabel('위도', { exact: true }).fill('36.2')

    // Same-address supplementation preserves name, category and the manually adjusted marker.
    await run('서울 합성로 10')
    await page.getByRole('button', { name: /서울 합성로 10.*주소/ }).click()
    await page.getByLabel(/^도로명 주소/).waitFor()
    assert.equal(await page.getByLabel('위도', { exact: true }).inputValue(), '36.2')
    assert.equal(await page.getByLabel(/^장소명(?: \(필수\))?$/).inputValue(), '합성 업체')
    assert.equal(await page.getByLabel(/^우편번호/).inputValue(), '12345')
    assert.equal(await page.getByRole('dialog').count(), 0)


    // A different address must not silently move a hand-adjusted pin. Cancel preserves the whole selection.
    await run('서울 다른로 20')
    await page.getByRole('button', { name: /서울 다른로 20.*주소/ }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByLabel('위도', { exact: true }).inputValue(), '36.2')
    await page.getByRole('button', { name: '기존 위치 유지', exact: true }).click()
    assert.equal(await page.getByLabel(/^도로명 주소/).inputValue(), place.roadAddress)
    await run('서울 다른로 20')
    await page.getByRole('button', { name: /서울 다른로 20.*주소/ }).click()
    await page.getByRole('button', { name: '검색 위치 적용', exact: true }).click()
    assert.equal(await page.getByLabel('위도', { exact: true }).inputValue(), '37.900000')
    assert.equal(await page.getByLabel(/^우편번호/).inputValue(), '', 'old postal must not follow a different address')
    assert.equal(await page.getByLabel(/^장소명(?: \(필수\))?$/).inputValue(), '합성 업체')
    await page.getByLabel(/^우편번호/).fill('99999')
    await page.getByLabel(/^도로명 주소/).fill('직접 수정 주소')
    assert.equal(await page.getByLabel(/^우편번호/).inputValue(), '')

    // Failures do not fall through to the other provider or alter entered values.
    for (const [value, message] of [['오류', '업체명 검색 서비스를 사용할 수 없습니다.'], ['권한오류', '접근 권한이 없습니다.']]) {
      const count = calls.length
      await run(value)
      await page.getByText(message, { exact: false }).waitFor()
      assert.equal(calls.length, count + 1)
      assert.equal(await page.getByLabel(/^도로명 주소/).inputValue(), '직접 수정 주소')
    }
    const count = calls.length
    await run('빈 검색')
    await page.getByText('검색 결과가 없습니다. 지역명을 포함해 다시 검색하거나 직접 입력해주세요.', { exact: true }).waitFor()
    assert.equal(calls.length, count + 2, 'valid empty results trigger the alternate search only once')

    await run('늦은 업체'); await delayedStarted
    const duplicates = calls.length
    await query.press('Enter'); await query.press('Enter')
    assert.equal(calls.length, duplicates)
    await run('새 검색')
    await page.getByRole('button', { name: /합성 업체.*업체/ }).waitFor()
    await pending.shift()()
    assert.equal(await page.getByRole('button', { name: /늦은 결과/ }).count(), 0)

    // Map remains independent of server search and retries with the last entered coordinates.
    await page.getByLabel('위도', { exact: true }).fill('36.2')
    await page.waitForFunction(() => window.naverTest.stats.centers.at(-1)?.lat() === 36.2)
    await page.evaluate(() => window.navermap_authFailure())
    await page.getByRole('button', { name: '지도 다시 불러오기' }).click()
    await page.waitForFunction(() => window.naverTest.stats.centers.at(-1)?.lat() === 36.2)
    assert.equal(await page.locator('button[aria-haspopup="listbox"]').filter({ hasText: '음식점' }).count(), 1)
    await page.screenshot({ path: join(output, 'registration-' + width + '.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('PASS unified search: single input, business postal supplement, address routing, pin confirmation/cancel, manual preservation, failures, empty fallback, request races, map retry; 1920/1366/390; ' + output)
} finally { await browser?.close(); await server.close() }
