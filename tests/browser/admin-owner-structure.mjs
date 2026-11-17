import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-owner-structure-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'owner-structure-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== '/__qa/owners') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/admin-owner-structure-fixture.jsx')))
    })
  },
}] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const url = `http://127.0.0.1:${server.httpServer.address().port}/__qa/owners`
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    page.setDefaultTimeout(10000)
    const guard = await guardBrowserPage(page, new URL(url).origin)
    await page.goto(url)
    const record = id => page.getByRole('button', { name: new RegExp(`합성 사업장 ${id}`) })
    await record(901).click()
    await page.getByRole('button', { name: '승인', exact: true }).waitFor()
    const latestList = () => page.evaluate(() => window.ownerQa.calls.filter(call => call.url === '/admin/merchant-owners').at(-1))
    assert.equal((await latestList()).params.limit, 10)
    const checkDialog = async (button, title, confirmation) => {
      await page.getByRole('button', { name: button, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: title, exact: true })
      await dialog.waitFor()
      await dialog.getByRole('button', { name: confirmation, exact: true }).click()
      await dialog.getByRole('alert').filter({ hasText: '처리 사유를 입력해주세요.' }).waitFor()
      await dialog.getByRole('textbox', { name: /처리 사유/ }).fill('합성 사유 — 실제 처리하지 않음')
      await dialog.getByRole('button', { name: '취소', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
    }
    await checkDialog('승인', '상점주 신청 승인', '승인 확정')
    await checkDialog('반려', '상점주 신청 반려', '반려 확정')
    await page.getByRole('button', { name: '2페이지로 이동', exact: true }).click()
    await record(902).waitFor()
    assert.equal((await latestList()).params.page, 2)
    await page.getByText('확인할 상점주를 선택해주세요.', { exact: true }).waitFor()
    await page.getByRole('combobox', { name: '상점주 상태', exact: true }).click()
    await page.getByRole('option', { name: '운영 중', exact: true }).click()
    await record(901).waitFor()
    assert.equal((await latestList()).params.status, 'ACTIVE')
    assert.equal((await latestList()).params.page, 1)
    await record(901).focus(); await page.keyboard.press('Enter')
    await page.getByRole('button', { name: '연결 장소 변경', exact: true }).waitFor()
    await checkDialog('연결 장소 변경', '연결 장소 변경', '변경 확정')
    await checkDialog('온보딩 변경', '온보딩 변경', '변경 확정')
    await checkDialog('권한 회수', '상점주 권한 회수', '권한 회수 확정')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.ok(await page.evaluate(() => window.ownerQa.calls.every(call => call.method === 'get')))
    await page.screenshot({ path: join(output, `owners-${width}.png`) })
    guard.assertClean()
    console.log(`${width}×${height}: list/detail/status/page/keyboard and five read-only confirmations PASS`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; no operational writes.`)
} finally {
  await browser?.close()
  await server.close()
}
