import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-207-'))
const server = await createServer({ cacheDir: join(output, 'cache'),
  server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
  plugins: [{ name: 'legacy-cleanup-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!['/reports/', '/dashboard', '/merchant-place-applications', '/login'].some(prefix => req.url?.startsWith(prefix))) return next()
      res.setHeader('Content-Type', 'text/html')
      const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/legacy-post-cleanup-fixture.jsx')
      res.end(await vite.transformIndexHtml(req.url, html))
    })
  } }],
})
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    page.setDefaultTimeout(12000)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.route('**/*', route => {
      const u = new URL(route.request().url())
      return (u.hostname === '127.0.0.1' && !u.pathname.startsWith('/api')) ||
        ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(u.hostname)
        ? route.continue() : route.abort()
    })
    for (const oldPath of ['/reports/reported-users', '/reports/appeals']) {
      await page.goto(base + oldPath)
      await page.waitForURL('**/dashboard')
      const section = page.locator('[aria-labelledby="dashboard-pending-review-title"]')
      await section.getByText('전체 대기 32건 · 표시 1건 · 최대 10건').waitFor()
      assert.equal(await page.getByRole('button', { name: '신고 사용자', exact: true }).count(), 0)
      assert.equal(await page.getByRole('button', { name: '신고 이의제기', exact: true }).count(), 0)
      for (const name of ['리뷰 삭제 요청', '사용자 밴', '미연결 파일']) {
        assert.equal(await page.getByRole('button', { name, exact: true }).count(), 1)
      }
      assert.doesNotMatch(await section.innerText(), /게시글/)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const requests = await page.evaluate(() => window.qaRequests)
      assert.ok(!requests.some(r => /posts|report-appeals|reported-users|pending-items/.test(r.path)))
      assert.ok(requests.some(r => r.path === '/admin/merchant-place-applications' &&
        r.params.status === 'PENDING' && r.params.limit === 10 && r.params.page === 1))
    }
    await page.screenshot({ path: join(output, 'dashboard-' + width + '.png') })
    const row = page.locator('[aria-labelledby="dashboard-pending-review-title"]').getByRole('button', { name: /합성 장소 7/ })
    await row.focus()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/merchant-place-applications')
    // The footer is inside main, so query its explicit label rather than implicit landmark semantics.
    const footer = page.locator('footer[aria-label="장소 신청 심사 작업"]')
    await footer.getByText('신청 #7', { exact: false }).waitFor()
    await footer.getByRole('button', { name: '승인', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('dialog').getByRole('button', { name: '취소', exact: true }).click()
    assert.equal(await page.getByRole('dialog').count(), 0)
    assert.ok((await page.evaluate(() => window.qaRequests)).every(r => r.method === 'get'))
    await page.goto(base + '/reports/appeals?signedOut=1')
    await page.waitForURL('**/login')
    await page.getByRole('heading', { name: '관리자 로그인' }).waitFor()
    assert.deepEqual(errors, [])
    await page.close()
    console.log('PASS legacy routes, current menus, pending total/detail, confirmation cancel, auth guard: ' + width)
  }
  console.log('Screenshots: ' + output)
} finally {
  await browser?.close()
  await server.close()
}
