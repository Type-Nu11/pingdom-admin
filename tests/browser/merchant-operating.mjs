import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const output = await mkdtemp(join(tmpdir(), 'pingdom-245-'))
const server = await createServer({ server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{ name: 'operating-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/operating-qa')) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-operating-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    for (const kind of ['operations', 'notices']) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/operating-qa?${kind}`)
      const summary = page.getByLabel('현재 영업 상태', { exact: true })
      await summary.getByText('현재 영업 상태를 확인할 수 없습니다.').waitFor()
      await page.evaluate(() => { window.qaFail = true })
      await summary.getByRole('button').click()
      await summary.getByText('조회에 실패했습니다. 다시 시도해주세요.').waitFor()
      await page.evaluate(() => { window.qaFail = false; window.qaOperating = false })
      await summary.getByRole('button').focus()
      await page.keyboard.press('Enter')
      await summary.getByText('현재 영업시간 외입니다.').waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.ok((await page.evaluate(() => window.qaRequests)).every(method => method === 'get'))
      assert.deepEqual(errors, [])
      await page.screenshot({ path: join(output, `${kind}-${width}.png`), fullPage: true })
      await page.close()
    }
  }
  console.log('PASS actual pages: missing, failure, keyboard retry, false, desktop/laptop; ' + output)
} finally { await browser?.close(); await server.close() }
