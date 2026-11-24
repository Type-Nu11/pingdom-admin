import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'

process.env.VITE_ENABLE_PINGDOM_AI = 'true'
const server = await createServer({
  server: { host: '127.0.0.1', port: 0, open: false },
  plugins: [{
    name: 'assistant-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/assistant-fixture')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8'))
          .replace('/src/main.tsx', '/tests/browser/assistant-chat-fixture.jsx')))
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
    const page = await browser.newPage({ viewport: role === 'admin' ? { width: 1440, height: 900 } : { width: 390, height: 844 } })
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
    const question = dialog.getByRole('textbox', { name: '질문' })
    const send = async value => { await question.fill(value); await dialog.getByRole('button', { name: '보내기' }).click() }
    await launcher.click()
    await dialog.waitFor()
    assert.equal(await question.evaluate(element => document.activeElement === element), true)
    const bounds = await dialog.boundingBox()
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width)
    await send('문의 010-1234-5678')
    await dialog.getByText('연락처, 이메일, 인증 정보는 빼고 다시 보내주세요.').waitFor()
    assert.equal(await page.evaluate(() => window.chatRequests.length), 0)
    await send('대기 건수 알려줘')
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
  console.log('PASS: desktop admin and mobile merchant assistant with mocked transport.')
} finally {
  await browser?.close()
  await server.close()
}
