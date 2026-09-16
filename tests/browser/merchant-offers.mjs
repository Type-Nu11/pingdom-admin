import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-160-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'offer-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url !== '/merchant/offers') return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-offers-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  console.log(`Screenshots: ${output}`)
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    await page.route('**/*', route => {
      const u = new URL(route.request().url())
      return (u.hostname === '127.0.0.1' && !u.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(u.hostname) ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/merchant/offers`)
    await page.getByText('총 45건', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.qaRequests.filter(r => r.url === '/merchant-owner/offers').length), 1)
    const title = page.getByRole('textbox', { name: '혜택 제목', exact: true })
    await title.fill('작성 중인 새 혜택')
    await page.getByRole('button', { name: '전체', exact: true }).click()
    assert.equal(await title.inputValue(), '작성 중인 새 혜택')
    assert.equal(await page.evaluate(() => window.qaRequests.filter(r => r.url === '/merchant-owner/offers').length), 1)
    await page.getByRole('button', { name: '다음 페이지로 이동' }).click()
    await page.getByText('합성 혜택 21', { exact: true }).waitFor()
    assert.equal(await title.inputValue(), '작성 중인 새 혜택')
    const requestsBeforeSameFilter = await page.evaluate(() => window.qaRequests.length)
    await page.getByRole('button', { name: '전체', exact: true }).click()
    assert.equal(await page.evaluate(() => window.qaRequests.length), requestsBeforeSameFilter)
    assert.equal(await page.locator('button[aria-current="page"]').textContent(), '2')
    await page.getByRole('button', { name: '초안', exact: true }).click()
    await page.getByText('합성 혜택 1', { exact: true }).waitFor()
    assert.equal(await title.inputValue(), '작성 중인 새 혜택')
    await title.scrollIntoViewIfNeeded()
    await page.screenshot({ path: join(output, `preserved-draft-${width}.png`) })
    await page.getByText('합성 혜택 1', { exact: true }).click()
    await page.getByRole('button', { name: '공개하기', exact: true }).click()
    await page.getByText('총 44건', { exact: true }).waitFor()
    assert.equal(await page.getByText('합성 혜택 1', { exact: true }).count(), 0)
    await page.getByRole('button', { name: '공개 중', exact: true }).click()
    await page.getByText('총 1건', { exact: true }).waitFor()
    await page.getByLabel('혜택을 관리할 장소 선택').selectOption('2')
    await page.getByText('총 0건', { exact: true }).waitFor()
    await page.getByRole('button', { name: '전체', exact: true }).click()
    await page.getByText('총 20건', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `offers-${width}.png`), fullPage: true })
    assert.deepEqual(errors, [])
    await page.close()
  }
} finally { await browser?.close(); await server.close() }
