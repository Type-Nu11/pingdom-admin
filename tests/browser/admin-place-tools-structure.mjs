import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const routes = ['/places/events', '/places/duplicate-candidates', '/places/duplicates']
const output = await mkdtemp(join(tmpdir(), 'pingdom-place-tools-'))
const server = await createServer({
  cacheDir: join(output, 'cache'),
  server: { host: '127.0.0.1', port: 0 },
  plugins: [{
    name: 'admin-place-tools-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!routes.includes(req.url?.split('?')[0])) return next()
        const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/admin-place-tools-fixture.jsx')
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, html))
      })
    },
  }],
})
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    page.setDefaultTimeout(10000)
    const guard = await guardBrowserPage(page, base)
    const button = name => page.getByRole('button', { name, exact: typeof name === 'string' })
    const dialog = name => page.getByRole('dialog', { name, exact: true })
    const cancel = async modal => {
      await modal.getByRole('button', { name: '취소', exact: true }).click()
      await modal.waitFor({ state: 'hidden' })
    }
    const noWrites = async () => assert.ok(await page.evaluate(() => window.placeToolsCalls.every(call => call.method === 'get')))
    const checkLayout = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)

    await page.goto(base + routes[0])
    await button('이벤트 등록').click()
    const editor = dialog('기간형 이벤트 등록')
    const title = editor.getByRole('textbox', { name: /이벤트 제목/ })
    await title.fill('합성 미저장 행사')
    const picker = dialog('이벤트 시작 일시')
    const start = editor.getByRole('button', { name: /^이벤트 시작 일시,/ })
    await start.click()
    await picker.getByRole('button', { name: '다음 달', exact: true }).press('Escape')
    await picker.waitFor({ state: 'hidden' })
    assert.equal(await start.evaluate(element => element === document.activeElement), true)
    const warning = dialog('저장하지 않은 변경 사항이 있습니다')
    await editor.getByRole('button', { name: '취소', exact: true }).click()
    await warning.getByRole('button', { name: '계속 작성', exact: true }).click()
    assert.equal(await title.inputValue(), '합성 미저장 행사')
    await editor.getByRole('button', { name: '취소', exact: true }).click()
    await warning.getByRole('button', { name: '변경 버리고 이동', exact: true }).click()
    await editor.waitFor({ state: 'hidden' })
    await page.getByText('합성 초안', { exact: true }).first().click()
    await button('공개').click()
    await cancel(dialog('이벤트 공개 확인'))
    await button('이벤트 취소').click()
    await cancel(dialog('이벤트 취소 확인'))
    await checkLayout()
    await noWrites()

    await page.goto(base + routes[1])
    await button(/^후보 #1 /).press('Enter')
    await button('중복 확정').click()
    const review = dialog('중복 후보 확정')
    await review.getByRole('button', { name: '중복 확정', exact: true }).click()
    await review.getByText('판정 사유를 입력해주세요.', { exact: true }).waitFor()
    await cancel(review)
    await button('2페이지로 이동').click()
    await button(/^후보 #2 /).waitFor()
    await page.getByText('검토할 후보를 선택해주세요.', { exact: true }).waitFor()
    const status = page.getByRole('combobox', { name: '중복 후보 상태' })
    await status.click()
    await page.getByRole('option', { name: '중복 확정', exact: true }).click()
    await button(/^후보 #1 /).click()
    await button('병합 검토').click()
    const candidateMerge = dialog('확정 후보 병합')
    await candidateMerge.getByRole('button', { name: '병합 실행', exact: true }).click()
    await candidateMerge.getByText('병합 영향 범위를 확인해주세요.', { exact: true }).waitFor()
    await candidateMerge.getByRole('checkbox').check()
    await cancel(candidateMerge)
    await checkLayout()
    await noWrites()

    await page.goto(base + routes[2])
    await button(/^중복 후보 #1 /).click()
    const merge = button('병합 검토')
    await merge.waitFor()
    assert.equal(await merge.isDisabled(), true)
    await button(/^#101 · 합성 장소 101/).click()
    await merge.click()
    const groupMerge = dialog('장소 병합 확인')
    await groupMerge.getByText(/합성 장소 101/).waitFor()
    await cancel(groupMerge)
    await button('복구').click()
    const restore = dialog('병합 복구 확인')
    await restore.getByText(/병합 이력 #7/).waitFor()
    await cancel(restore)
    await checkLayout()
    await noWrites()
    guard.assertClean()
    console.log(`${width}x${height}: event draft protection, candidate pagination and review validation, merge/restore cancellation PASS`)
    await page.close()
  }
} finally {
  await browser?.close()
  await server.close()
}
