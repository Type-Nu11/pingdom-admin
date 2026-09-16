import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-217-'))
const server = await createServer({ server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'review-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url !== '/review-qa') return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/review-media-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    let fail = true
    await page.route('**/photo.png', route => fail ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }))
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/review-qa`)
    await page.getByText('사진을 불러올 수 없습니다.').waitFor()
    assert.equal(await page.getByLabel('추천 이유').locator('span').count(), 7)
    fail = false
    await page.getByRole('button', { name: '다음 리뷰' }).click()
    await page.waitForFunction(() => { const img = document.querySelector('img'); return img?.complete && img.naturalWidth > 0 })
    assert.equal(await page.getByText('사진을 불러올 수 없습니다.').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `review-${width}.png`) })
    await page.close()
  }
  console.log(`PASS: responsive reasons, image failure and review change recovery; ${output}`)
} finally { await browser?.close(); await server.close() }
