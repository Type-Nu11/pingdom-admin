import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-203-'))
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
  name: 'onboarding-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/merchant')) return next()
      const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/onboarding-fixture.jsx')
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, html))
    })
  },
}] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    const errors = [], requests = []
    let profileStatus = null
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith('/api/')) {
        requests.push(url.pathname)
        assert.equal(route.request().method(), 'GET')
        if (url.pathname.endsWith('/users/me/merchant-owner-profile')) return route.fulfill({ status: profileStatus ? 200 : 404, json: profileStatus ? { status: profileStatus, businessName: '합성 사업자', contactEmail: 'test@example.com', contactPhone: '01000000000', placeIds: [] } : { code: 'PROFILE_NOT_FOUND' } })
        if (url.pathname.endsWith('/users/me/merchant-place-applications')) return route.fulfill({ json: { items: [], hasNext: false } })
        return route.abort()
      }
      return url.hostname === '127.0.0.1' || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    const base = `http://127.0.0.1:${server.httpServer.address().port}`
    await page.goto(`${base}/merchant`)
    await page.getByRole('button', { name: '기존 장소 신청·내역' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/merchant/onboarding')
    await page.screenshot({ path: join(output, `onboarding-${width}.png`) })
    await page.getByRole('button', { name: '기존 장소 신청·내역' }).click()
    await page.getByRole('heading', { name: '기존 장소 운영 권한 신청', exact: true }).waitFor()
    assert.equal(await page.getByRole('navigation', { name: '상점주 메뉴', exact: true }).count(), 0)
    await page.getByRole('link', { name: '신규 장소 신청', exact: true }).click()
    await page.waitForURL('**/merchant/place-registration')
    await page.getByRole('link', { name: '신청 안내' }).click()
    for (const status of ['PENDING', 'REJECTED', 'REVOKED', 'ACTIVE']) {
      profileStatus = status
      await page.getByRole('button', { name: '상태 새로고침' }).click()
      await page.getByText(`기존 상점주 신청 · ${{ PENDING: '심사 대기', REJECTED: '반려', REVOKED: '권한 회수', ACTIVE: '승인 완료' }[status]}`, { exact: true }).waitFor()
    }
    await page.getByRole('button', { name: '다시 로그인', exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/merchant/onboarding')
    assert.ok(!requests.some(path => path.includes('merchant-verification') || path.includes('/merchant-owner/')))
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log(`PASS: USER route isolation, both application entries, four profile states; screenshots ${output}`)
} finally {
  await browser?.close()
  await server.close()
}
