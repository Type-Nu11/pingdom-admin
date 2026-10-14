import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-241-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
  name: 'auth-return-fixture', configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
    if (!['/login', '/places', '/dashboard', '/merchant', '/merchant/menus'].includes(req.url.split('?')[0])) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/auth-return-fixture.jsx')))
  }) },
}] })
let browser, page
const login = async (username = 'synthetic') => {
  await page.getByLabel('관리자 아이디').fill(username)
  await page.getByLabel('비밀번호', { exact: true }).fill('synthetic-password')
  await page.getByLabel('비밀번호', { exact: true }).press('Enter')
}
const query = async mode => {
  await page.evaluate(mode => { window.qaMode = mode }, mode)
  await page.getByRole('button', { name: '조회 검증' }).click()
}
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  console.log(`Screenshots: ${output}`)
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } })
    page = await context.newPage(); page.setDefaultTimeout(10000)
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => { const url = new URL(route.request().url()); return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort() })
    await page.goto(`${base}/places?placeId=8&keyword=private-search`)
    await page.getByLabel('미저장 입력').fill('private-unsaved')
    await query('refresh-success')
    await page.getByTestId('result').filter({ hasText: 'success' }).waitFor()
    assert.equal(await page.getByLabel('미저장 입력').inputValue(), 'private-unsaved')
    for (const [mode, result] of [['resource403', 'forbidden'], ['refresh503', 'server'], ['timeout', 'timeout']]) {
      await query(mode)
      await page.getByTestId('result').filter({ hasText: result }).waitFor()
      assert.equal(new URL(page.url()).pathname, '/places')
    }
    await query('expired')
    await page.getByRole('status').filter({ hasText: '로그인 인증' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/login')
    assert.doesNotMatch(await page.evaluate(() => sessionStorage.getItem('pingdom-login-return')), /private/)
    await login('wrong')
    await page.getByRole('alert').filter({ hasText: '아이디 또는 비밀번호' }).waitFor()
    assert.match(await page.getByRole('status').textContent(), /로그인 인증/)
    await page.screenshot({ path: join(output, `login-error-${width}.png`) })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.reload()
    await page.getByRole('status').filter({ hasText: '로그인 인증' }).waitFor()
    await login()
    await page.getByTestId('route').filter({ hasText: '/places?placeId=8' }).waitFor()
    assert.equal(new URL(page.url()).search, '?placeId=8')
    assert.equal(await page.getByLabel('미저장 입력').inputValue(), '')
    assert.equal(await page.evaluate(() => sessionStorage.getItem('pingdom-login-return')), null)
    await query('mismatch')
    await page.getByRole('status').filter({ hasText: '계정 정보' }).waitFor()
    await page.evaluate(() => { window.qaLogin = { id: 2, role: 'ADMIN' } })
    await login()
    await page.getByTestId('route').filter({ hasText: '/dashboard' }).waitFor()
    await page.getByRole('button', { name: '로그아웃 검증' }).click()
    await page.getByRole('heading', { name: '관리자 로그인' }).waitFor()
    assert.equal(await page.getByRole('status').count(), 0)
    await login()
    await page.getByTestId('route').filter({ hasText: '/dashboard' }).waitFor()
    await query('refresh403')
    await page.getByRole('status').filter({ hasText: '로그인 인증' }).waitFor()
    await page.getByRole('button', { name: '상점주', exact: true }).click()
    assert.equal(await page.getByRole('status').count(), 0)
    await page.reload()
    await page.getByRole('heading', { name: '관리자 로그인' }).waitFor()
    assert.equal(await page.getByRole('status').count(), 0)
    assert.deepEqual(errors, [])
    await context.close()
  }
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'failure.png') })
  throw error
} finally { await browser?.close(); await server.close() }
