import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-165-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'history-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url !== '/history-qa') return next()
    res.setHeader('Content-Type', 'text/html')
    const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/history-filters-fixture.jsx')
    res.end(await vite.transformIndexHtml(req.url, html))
  })
} }] })
let browser
async function assertHeaders(page, width) {
  const headers = await page.locator('#application-review-panel section > header').evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect()
    return { top: bounds.top, bottom: bounds.bottom, titleTop: element.querySelector('h2').getBoundingClientRect().top,
      clipped: element.scrollHeight > element.clientHeight + 1 }
  }))
  assert.equal(headers.length, 2)
  assert.ok(headers.every(header => !header.clipped), 'Header descriptions are not clipped')
  if (width > 1080) {
    for (const edge of ['top', 'bottom', 'titleTop']) assert.ok(Math.abs(headers[0][edge] - headers[1][edge]) <= 1, `Application headers align at ${edge}: ${JSON.stringify(headers)}`)
  }
}
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1920, 1366, 1280, 1081, 1080, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (route.request().resourceType() === 'stylesheet' && ['fonts.googleapis.com', 'cdn.jsdelivr.net'].includes(url.hostname)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
      return url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api') ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/history-qa`)
    await page.getByText('현재 검토할 신청이 없습니다.', { exact: true }).waitFor()
    await assertHeaders(page, width)
    await page.getByRole('tab', { name: '처리 이력' }).click()
    await page.getByLabel('장소명·신청자 아이디').fill(' 서울 ')
    await page.getByLabel('장소명·신청자 아이디').press('Enter')
    await page.waitForFunction(() => window.historyQueries.at(-1).keyword === '서울')
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    assert.equal(await page.getByLabel('장소명·신청자 아이디').inputValue(), '')
    await page.getByText('조회 조건에 맞는 처리 이력이 없습니다.', { exact: true }).waitFor()
    await assertHeaders(page, width)
    const form = page.getByRole('form', { name: '처리 이력 검색' })
    await form.scrollIntoViewIfNeeded()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `history-${width}.png`) })
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log(`PASS: aligned application headers, search Enter, reset, empty state, responsive layout; screenshots ${output}`)
} finally { await browser?.close(); await server.close() }
