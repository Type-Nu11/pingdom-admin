import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { installNaverSdk } from '../helpers/naver-sdk.mjs'

process.env.VITE_ENABLE_PINGDOM_AI = 'true'
const server = await createServer({
  server: { host: '127.0.0.1', port: 0, open: false },
  define: { 'import.meta.env.VITE_NAVER_MAP_CLIENT_ID': JSON.stringify('synthetic-public-id') },
  plugins: [{
    name: 'assistant-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/assistant-fixture' && path !== '/assistant-map') return next()
        const fixture = path === '/assistant-map' ? 'place-inspector-fixture' : 'assistant-chat-fixture'
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8'))
          .replace('/src/main.tsx', `/tests/browser/${fixture}.jsx`)))
      })
    },
  }],
})
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  const url = 'http://127.0.0.1:' + server.httpServer.address().port + '/assistant-fixture'
  for (const role of ['admin', 'merchant']) {
    const page = await browser.newPage({ viewport: role === 'admin' ? { width: 1440, height: 900 } : { width: 390, height: 844 },
      reducedMotion: 'reduce', hasTouch: role === 'merchant' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const networkApiPaths = []
    await page.route(path => path.pathname.startsWith('/api/'), route => {
      networkApiPaths.push(new URL(route.request().url()).pathname)
      return route.abort()
    })
    await page.goto(url + '?role=' + role)
    const launcher = page.getByRole('button', { name: '핑덤 AI', exact: true })
    const dialog = page.getByRole('dialog', { name: '핑덤 AI' })
    const hint = launcher.locator('..').getByText('핑덤 AI', { exact: true })
    const question = dialog.getByRole('textbox', { name: '질문' })
    const send = async value => { await question.fill(value); await dialog.getByRole('button', { name: '보내기' }).click() }
    await launcher.waitFor()
    assert.equal(await launcher.innerText(), '')
    await hint.waitFor({ state: 'hidden' })
    if (role === 'admin') {
      await launcher.hover()
      await hint.waitFor()
      const [buttonBounds, hintBounds] = await Promise.all([launcher.boundingBox(), hint.boundingBox()])
      assert.ok(hintBounds.y + hintBounds.height < buttonBounds.y, 'hint appears above the button')
      assert.equal(await dialog.isVisible(), false, 'hover does not open the chat panel')
      await page.mouse.move(5, 5)
      await hint.waitFor({ state: 'hidden' })
      await page.keyboard.press('Tab')
      assert.equal(await launcher.evaluate(element => document.activeElement === element), true)
      await hint.waitFor()
      await page.keyboard.press('Enter')
    } else await launcher.tap()
    await dialog.waitFor()
    const logo = dialog.locator('header img')
    await logo.evaluate(image => image.decode())
    assert.deepEqual(await logo.evaluate(image => [image.naturalWidth, image.naturalHeight, image.width, image.height]), [24, 24, 24, 24])
    assert.equal(await question.evaluate(element => document.activeElement === element), true)
    const bounds = await dialog.boundingBox()
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width)
    await send('문의 010-1234-5678')
    await dialog.getByText('연락처, 이메일, 인증 정보는 빼고 다시 보내주세요.').waitFor()
    assert.equal(await page.evaluate(() => window.chatRequests.length), 0)
    await question.fill('대기')
    await question.press('Shift+Enter')
    assert.equal(await question.inputValue(), '대기\n')
    await question.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
    assert.equal(await page.evaluate(() => window.chatRequests.length), 0)
    await question.fill('대기 건수 알려줘')
    await question.press('Enter')
    await dialog.getByText('조회 결과를 확인했어요.').waitFor()
    assert.equal(await page.evaluate(() => window.chatRequests.length), 2)
    if (role === 'admin') {
      await dialog.getByText('6건', { exact: true }).waitFor()
      await dialog.getByText('0건', { exact: true }).waitFor()
      await dialog.getByText('조회하지 못함').waitFor()
      await page.evaluate(() => window.switchAccount())
      await dialog.waitFor({ state: 'hidden' })
      await launcher.click()
      assert.equal(await dialog.getByText('6건', { exact: true }).count(), 0)
    } else {
      await dialog.getByText('4건', { exact: true }).waitFor()
      const reads = await page.evaluate(() => window.chatReads)
      assert.deepEqual(reads, [{ url: '/merchant-owner/reservations', params: { placeId: 7, status: 'PENDING', page: 1, limit: 1 } }])
      const payload = await page.evaluate(() => JSON.stringify(window.chatRequests))
      assert.doesNotMatch(payload, /NOT_FOR_AI|010-1234-5678|DO_NOT_SHARE|placeId/)
      await send('이 예약 요약해줘')
      await dialog.getByText('확정', { exact: true }).waitFor()
      await send('잘못된 도구')
      await dialog.getByRole('alert').waitFor()
      assert.equal(await page.evaluate(() => window.chatReads.length), 1)
      await send('쿠폰 어디야?')
      const link = dialog.getByRole('link', { name: '혜택·쿠폰 열기' })
      await link.waitFor()
      assert.equal(await page.getByLabel('검증 경로').textContent(), '/initial')
      await link.click()
      await page.getByLabel('검증 경로').filter({ hasText: '/merchant/offers' }).waitFor()
      assert.equal(await page.getByLabel('검증 경로').textContent(), '/merchant/offers')
      await launcher.click()
      await send('기다려')
      await page.waitForFunction(() => typeof window.chatRelease === 'function')
      const loading = dialog.getByRole('status').filter({ hasText: '답변을 준비하고 있어요.' })
      assert.ok(await loading.locator('span > span').evaluateAll(dots => dots.length === 3 && dots.every(dot => getComputedStyle(dot).animationName === 'none')))
      await page.evaluate(() => { window.switchStore(); window.chatRelease() })
      await dialog.waitFor({ state: 'hidden' })
      await launcher.click()
      assert.equal(await dialog.getByText('이전 매장 답변').count(), 0)
      assert.equal(await dialog.getByText('4건', { exact: true }).count(), 0)
    }
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await launcher.evaluate(element => document.activeElement === element), true)
    assert.deepEqual(errors, [])
    assert.deepEqual(networkApiPaths, [])
    await page.close()
  }
  for (const width of [1440, 390]) {
    const map = await browser.newPage({ viewport: { width, height: 900 } })
    await map.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.hostname === 'oapi.map.naver.com') return route.fulfill({
        contentType: 'application/javascript',
        body: `(${installNaverSdk.toString()})();window[${JSON.stringify(url.searchParams.get('callback'))}]();`,
      })
      return url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api/') ? route.continue() : route.abort()
    })
    await map.goto(url.replace('/assistant-fixture', '/assistant-map?assistant=1'))
    const launcher = map.getByRole('button', { name: '핑덤 AI', exact: true })
    await launcher.waitFor()
    await map.waitForFunction(() => window.naverTest?.stats.maps.length === 1)
    const launcherBounds = await launcher.boundingBox()
    assert.equal(launcherBounds.x + launcherBounds.width, width - 24)
    assert.equal(launcherBounds.y + launcherBounds.height, 900 - 24)
    const canvas = map.getByLabel('네이버 지도')
    const scale = canvas.locator('[data-test-naver-scale="bottom-left"]')
    const placeCount = map.getByText(/개 장소 표시$/)
    const zoomIn = map.getByRole('button', { name: '지도 확대', exact: true })
    const zoomOut = map.getByRole('button', { name: '지도 축소', exact: true })
    await scale.waitFor({ state: 'attached' })
    await placeCount.waitFor()
    const [canvasBounds, scaleBounds, placeCountBounds, zoomInBounds, zoomOutBounds] = await Promise.all(
      [canvas, scale, placeCount.locator('..').locator('..'), zoomIn, zoomOut].map(locator => locator.boundingBox()))
    assert.ok(scaleBounds.x - canvasBounds.x >= 0 && scaleBounds.x - canvasBounds.x < 24, 'scale stays near the left edge')
    const scaleBottomGap = canvasBounds.y + canvasBounds.height - (scaleBounds.y + scaleBounds.height)
    assert.ok(scaleBottomGap >= 0 && scaleBottomGap < 24, 'scale stays near the bottom edge')
    assert.ok(Math.abs(placeCountBounds.y - canvasBounds.y - 16) <= 1, 'map tools reclaim the top inset')
    assert.ok(Math.abs(zoomInBounds.y - (placeCountBounds.y + placeCountBounds.height) - 8) <= 1)
    assert.ok(Math.abs(zoomOutBounds.y - (zoomInBounds.y + zoomInBounds.height) - 8) <= 1)
    assert.ok(canvasBounds.x + canvasBounds.width - (zoomOutBounds.x + zoomOutBounds.width) <= 20)
    const initial = await map.evaluate(() => window.naverTest.stats.maps[0].getZoom())
    await zoomOut.click()
    await map.waitForFunction(zoom => window.naverTest.stats.maps[0].getZoom() < zoom, initial)
    await zoomIn.click()
    await map.waitForFunction(zoom => window.naverTest.stats.maps[0].getZoom() === zoom, initial)
    await launcher.click()
    await map.getByRole('dialog', { name: '핑덤 AI' }).waitFor()
    await map.keyboard.press('Escape')
    assert.equal(await launcher.evaluate(element => document.activeElement === element), true)
    await map.close()
  }
  console.log('PASS: desktop/mobile chat, fixed launcher, lower-left map scale and upper-right zoom.')
} finally {
  await browser?.close()
  await server.close()
}
