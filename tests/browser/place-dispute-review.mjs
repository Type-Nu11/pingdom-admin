import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-300-'))
const server = await createServer({ cacheDir: join(output, 'cache'),
  server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{
    name: 'place-dispute-review-fixture', configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/places/information-verification')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8'))
          .replace('/src/main.tsx', '/tests/browser/place-dispute-review-fixture.jsx')))
      })
    },
  }] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const allowed = new Set()
    const guard = await guardBrowserPage(page, base, event => {
      if (event.kind === 'fixture-api') return allowed.has(event.status)
        && /^\/admin\/place-information-reports(?:\/\d+(?:\/review)?)?$/.test(event.path)
        && event.text === '합성 검토 API 실패'
      return event.kind === 'console' && event.level === 'error'
        && /^관리자 장소 정보 (신고 (목록|상세) 조회|검토 저장) 실패/.test(event.text)
        && event.text.includes('합성 검토 API 실패')
    })
    await page.goto(`${base}/places/information-verification`)
    await page.getByRole('button').filter({ hasText: '신고 #1 · 장소 #101' }).click()
    await page.getByText('반박 2건', { exact: true }).waitFor()
    await page.getByRole('button', { name: '반박 검토', exact: true }).first().click()
    let dialog = page.getByRole('dialog', { name: '반박 #11 검토', exact: true })
    await dialog.waitFor()
    await dialog.getByRole('button', { name: '반박 수용', exact: true }).click()
    await dialog.getByRole('alert').filter({ hasText: '판정 근거를 입력해주세요' }).waitFor()
    assert.equal((await page.evaluate(() => window.placeReviewQA.calls)).filter(c => c.method === 'post').length, 0)
    await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('합성 판정 근거')
    await page.keyboard.press('Escape')
    const unsaved = page.getByRole('dialog', { name: '저장하지 않은 변경 사항이 있습니다', exact: true })
    await unsaved.waitFor(); await unsaved.getByRole('button', { name: '계속 작성', exact: true }).click()
    assert.equal(await dialog.getByRole('textbox', { name: /판정 근거/ }).inputValue(), '합성 판정 근거')
    // Keyboard focus remains trapped inside the shared dialog.
    await dialog.getByRole('button', { name: '반박 수용', exact: true }).focus()
    await page.keyboard.press('Tab')
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true)
    await page.screenshot({ path: join(output, `dialog-${width}.png`), fullPage: true })
    await page.evaluate(() => { window.placeReviewQA.delayPost = true })
    await dialog.getByRole('button', { name: '반박 수용', exact: true }).click()
    await dialog.getByRole('button', { name: '저장 중', exact: true }).waitFor()
    assert.equal(await dialog.getByRole('button', { name: '닫기', exact: true }).isDisabled(), true)
    await page.keyboard.press('Escape')
    await page.mouse.click(5, 5)
    assert.equal(await dialog.count(), 1)
    assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)))
    await page.evaluate(() => { window.placeReviewQA.delayPost = false; window.placeReviewQA.releasePost() })
    await dialog.waitFor({ state: 'detached' })
    await page.getByRole('status').filter({ hasText: '반박 검토 결과를 저장했습니다' }).waitFor()
    await page.getByText('반박 2건', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '반박 검토', exact: true }).count(), 1)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `success-${width}.png`), fullPage: true })

    // Successful save + failed refresh closes the draft but disables further reviews.
    allowed.add(500)
    await page.getByRole('button', { name: '반박 검토', exact: true }).click()
    dialog = page.getByRole('dialog', { name: '반박 #12 검토', exact: true })
    await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('합성 두 번째 근거')
    await page.evaluate(() => { window.placeReviewQA.detailStatus = 500; window.placeReviewQA.listStatus = 500 })
    await dialog.getByRole('button', { name: '반박 반려', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    const retry = page.getByRole('button', { name: '최신 정보 다시 조회', exact: true })
    await retry.waitFor()
    assert.equal(await page.getByRole('button', { name: '신고 검토', exact: true }).isDisabled(), true)
    assert.equal(await page.getByText('접수된 반박이 없습니다.', { exact: true }).count(), 0)
    await page.screenshot({ path: join(output, `refresh-failure-${width}.png`), fullPage: true })
    await page.evaluate(() => { window.placeReviewQA.detailStatus = 0; window.placeReviewQA.listStatus = 0 })
    await retry.click(); await retry.waitFor({ state: 'detached' })
    assert.equal(await page.getByRole('button', { name: '신고 검토', exact: true }).isDisabled(), false)

    // A permission failure during refresh hides data, but must not erase the known save outcome.
    allowed.add(403)
    await page.getByRole('button', { name: '신고 검토', exact: true }).click()
    dialog = page.getByRole('dialog', { name: '신고 검토', exact: true })
    await dialog.getByRole('combobox', { name: '신고 검토 결과', exact: true }).click()
    await page.getByRole('option', { name: '검토 중', exact: true }).click()
    await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('합성 재조회 권한 확인')
    await page.evaluate(() => { window.placeReviewQA.listStatus = 403 })
    await dialog.getByRole('button', { name: '검토 결과 저장', exact: true }).click()
    await dialog.waitFor({ state: 'detached' }); await retry.waitFor()
    await page.getByRole('alert').filter({ hasText: '검토 결과는 저장됐지만' }).waitFor()
    assert.equal(await page.getByText('반박 2건', { exact: true }).count(), 0)
    await page.evaluate(() => { window.placeReviewQA.listStatus = 0 })
    await retry.click(); await retry.waitFor({ state: 'detached' })
    await page.getByText('반박 2건', { exact: true }).waitFor()

    // Existing whole-report review: POST failure retains the reason, retry succeeds.
    await page.getByRole('button', { name: '신고 검토', exact: true }).click()
    dialog = page.getByRole('dialog', { name: '신고 검토', exact: true })
    await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('합성 신고 완료')
    await page.evaluate(() => { window.placeReviewQA.postStatus = 500 })
    await dialog.getByRole('button', { name: '검토 결과 저장', exact: true }).click()
    await dialog.getByRole('alert').waitFor()
    assert.equal(await dialog.getByRole('textbox', { name: /판정 근거/ }).inputValue(), '합성 신고 완료')
    await page.evaluate(() => { window.placeReviewQA.postStatus = 0; window.placeReviewQA.empty = true })
    await dialog.getByRole('button', { name: '검토 결과 저장', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await page.getByText('반박 2건', { exact: true }).waitFor()
    assert.equal(await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).count(), 0,
      'selected detail remains visible even after the filtered list empties')

    await page.evaluate(() => { window.placeReviewQA.changeAccount(100) })
    await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).waitFor()
    assert.equal(await page.getByText('반박 2건', { exact: true }).count(), 0)
    // Empty, first-read failure, and auth failure must remain distinct.
    await page.evaluate(() => { window.placeReviewQA.listStatus = 500; window.placeReviewQA.changeAccount(101) })
    await page.getByRole('button', { name: '목록 다시 조회', exact: true }).waitFor()
    assert.equal(await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).count(), 0)
    allowed.add(401)
    await page.evaluate(() => { window.placeReviewQA.listStatus = 401 })
    await page.getByRole('button', { name: '목록 다시 조회', exact: true }).click()
    await page.waitForFunction(() => window.placeReviewQA.clears >= 1)
    await page.evaluate(() => { window.placeReviewQA.listStatus = 0; window.placeReviewQA.changeAccount(102) })
    await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).waitFor()
    guard.assertClean()
    const writes = (await page.evaluate(() => window.placeReviewQA.calls)).filter(c => c.method !== 'get')
    assert.equal(writes.length, 5)
    assert.ok(writes.every(c => c.method === 'post' && /\/review$/.test(c.path)))
    console.log(`PASS place-dispute review/save/refresh/retry/dialog/empty/auth ${width}×${height}`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; no real API or operational mutations.`)
} finally { await browser?.close(); await server.close() }
