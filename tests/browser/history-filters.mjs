import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-165-'))
const server = await createServer({ server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'history-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url !== '/history-qa') return next()
    res.setHeader('Content-Type', 'text/html')
    const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/history-filters-fixture.jsx')
    res.end(await vite.transformIndexHtml(req.url, html))
  })
} }] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/history-qa`)
    await page.getByRole('tab', { name: '처리 이력' }).click()
    await page.getByLabel('장소명·신청자 아이디').fill(' 서울 ')
    await page.getByLabel('장소명·신청자 아이디').press('Enter')
    await page.waitForFunction(() => window.historyQueries.at(-1).keyword === '서울')
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    assert.equal(await page.getByLabel('장소명·신청자 아이디').inputValue(), '')
    await page.getByText('조회 조건에 맞는 처리 이력이 없습니다.', { exact: true }).waitFor()
    const form = page.getByRole('form', { name: '처리 이력 검색' })
    await form.scrollIntoViewIfNeeded()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `history-${width}.png`) })
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log(`PASS: search Enter, reset, empty state, responsive layout; screenshots ${output}`)
} finally { await browser?.close(); await server.close() }
