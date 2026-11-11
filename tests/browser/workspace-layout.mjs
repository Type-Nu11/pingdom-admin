import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-workspace-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 },
  plugins: [{ name: 'workspace-layout-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/console/')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/workspace-layout-fixture.jsx')))
    })
  } }],
})
let browser, page
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const width of [1920, 1366, 390]) {
    page = await browser.newPage({ viewport: { width, height: 844 } })
    const guard = await guardBrowserPage(page, base)
    await page.goto(base + '/console/bans')
    const input = page.getByRole('textbox', { name: '합성 입력', exact: true })
    await input.fill('작성 중인 입력')
    await page.getByRole('button', { name: '상단 작업 0', exact: true }).click()
    await page.getByRole('button', { name: '상단 작업 1', exact: true }).waitFor()
    assert.equal(await input.inputValue(), '작성 중인 입력', 'header updates must not remount page content')
    await page.getByRole('button', { name: '팝업 열기', exact: true }).click()
    const modal = page.getByRole('dialog', { name: '레이아웃 팝업', exact: true })
    await modal.waitFor()
    assert.equal(await modal.evaluate(el => document.getElementById('admin-main-scroll-area').contains(el)), false)
    await modal.getByRole('button', { name: '닫기', exact: true }).focus()
    await page.keyboard.press('Escape')
    await modal.waitFor({ state: 'detached' })
    assert.equal(await page.getByRole('button', { name: '팝업 열기', exact: true }).evaluate(el => el === document.activeElement), true)
    const home = page.getByRole('link', { name: '대시보드로 이동', exact: true })
    assert.equal(await home.getAttribute('href'), '/console/dashboard')
    await home.click()
    const unsaved = page.getByRole('dialog', { name: '저장하지 않은 변경 사항이 있습니다', exact: true })
    await unsaved.waitFor()
    assert.equal(await unsaved.evaluate(el => document.getElementById('root').contains(el)), false, 'unsaved confirmation stays in the existing body portal')
    await unsaved.getByRole('button', { name: '계속 작성', exact: true }).click()
    assert.equal(await input.inputValue(), '작성 중인 입력')
    assert.equal(new URL(page.url()).pathname, '/console/bans')
    await home.click()
    await unsaved.getByRole('button', { name: '변경 버리고 이동', exact: true }).click()
    await page.getByTestId('admin-route').getByText('/dashboard', { exact: true }).waitFor()
    assert.equal(await input.inputValue(), '')
    await page.screenshot({ path: join(output, `admin-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await page.getByText('합성 로그인 화면', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.workspaceQA.logouts), 1)

    await page.goto(base + '/console/merchant/menus')
    await page.getByRole('button', { name: '가게 2 선택', exact: true }).click()
    assert.equal(await page.getByTestId('selected-place').innerText(), '2')
    await page.getByRole('button', { name: '이벤트 관리', exact: true }).click()
    await page.getByTestId('merchant-route').getByText('/merchant/campaigns', { exact: true }).waitFor()
    assert.equal(await page.getByTestId('selected-place').innerText(), '2', 'merchant provider survives child navigation')
    await page.goBack()
    await page.getByTestId('merchant-route').getByText('/merchant/menus', { exact: true }).waitFor()
    assert.equal(await page.getByTestId('selected-place').innerText(), '2')
    await page.evaluate(() => window.workspaceQA.changeAccount(100))
    await page.getByTestId('selected-place').getByText('선택 없음', { exact: true }).waitFor()
    const main = page.locator('#merchant-main-scroll-area')
    assert.equal(await main.count(), 1)
    assert.equal(await page.locator('#admin-main-scroll-area').count(), 0)
    assert.equal(await main.evaluate(el => getComputedStyle(el).overflowY), width > 900 ? 'auto' : 'visible')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: join(output, `merchant-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await page.getByText('합성 로그인 화면', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.workspaceQA.logouts), 1)
    guard.assertClean()
    await page.close()
    console.log(`${width}px layout, header, modal focus, unsaved portal, basename/logout and merchant selection: PASS`)
  }
  console.log(`Synthetic screenshots: ${output}; no API requests or operational writes.`)
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'failure.png'), fullPage: true })
  console.error(`Failure screenshot: ${output}/failure.png`)
  throw error
} finally { await browser?.close(); await server.close() }
