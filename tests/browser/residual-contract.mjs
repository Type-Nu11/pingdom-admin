import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-302-browser-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1' }, plugins: [{
  name: 'residual-contract', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__qa/display-consistency')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/display-consistency-fixture.jsx')))
    })
  },
}] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const guard = await guardBrowserPage(page, base)
    await page.goto(`${base}/__qa/display-consistency?screen=s3&scenario=complete`)
    await page.getByText('합성 비교 후보 — 실제 파일 아님', { exact: true }).waitFor()
    const responses = await page.evaluate(() => window.displayQA.responses)
    assert.ok(responses.find(value => value.path.endsWith('/status')).data.completedAt)
    assert.equal('completedAt' in responses.find(value => value.path.endsWith('/report')).data, false)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `s3-${width}.png`), fullPage: true })
    assert.equal(await page.getByRole('button', { name: '선택 0개 삭제', exact: true }).isDisabled(), true)
    await page.getByRole('checkbox', { name: 'map/synthetic-only.png', exact: true }).check()
    await page.getByRole('button', { name: '선택 1개 삭제', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: '미연결 파일 영구 삭제' })
    await confirmation.getByText(/선택한 파일 1개를 영구 삭제합니다/).waitFor()
    const confirmDelete = confirmation.getByRole('button', { name: '영구 삭제', exact: true })
    const reportId = confirmation.getByRole('textbox', { name: /리포트 ID 재입력/ })
    assert.equal(await confirmDelete.isDisabled(), true)
    await reportId.fill('different-report')
    assert.equal(await confirmDelete.isDisabled(), true)
    await reportId.fill('synthetic-report')
    assert.equal(await confirmDelete.isEnabled(), true)
    await confirmation.getByRole('button', { name: '취소', exact: true }).click()
    await confirmation.waitFor({ state: 'detached' })
    assert.ok((await page.evaluate(() => window.displayQA.calls)).every(call => call.method === 'get'))
    await page.goto(`${base}/__qa/display-consistency?screen=payments&scenario=unknown`)
    await page.getByText('예약 #2 · 금액 정보 없음', { exact: true }).waitFor()
    await page.getByRole('tab', { name: '정산 원장', exact: true }).click()
    await page.getByText('결제 #1 · 총액 금액 정보 없음', { exact: true }).waitFor()
    assert.match(await page.locator('body').innerText(), /수수료 금액 정보 없음 · 정산액 금액 정보 없음/)
    assert.doesNotMatch(await page.locator('body').innerText(), /0원|0 KRW|0 USD/)
    assert.ok((await page.evaluate(() => window.displayQA.calls)).every(call => call.method === 'get'))
    guard.assertClean()
    await page.close()
    console.log(`PASS residual contracts S3 report/status + delete confirmation without mutation + unknown historical amounts ${width}×${height}`)
  }
  console.log(`Synthetic GET-only screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
