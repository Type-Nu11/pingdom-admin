import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-301-'))
const server = await createServer({ cacheDir: join(output, 'cache'),
  server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{
    name: 'data-quality-fixture', configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/data-quality')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8'))
          .replace('/src/main.tsx', '/tests/browser/data-quality-fixture.jsx')))
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
      if (event.kind === 'fixture-api') return event.method === 'GET' && event.path === '/admin/data-quality/issues'
        && allowed.has(event.status) && event.text === '합성 품질 조회 실패'
      return event.kind === 'console' && event.level === 'error' && event.text.startsWith('관리자 데이터 품질 이슈 조회 실패')
        && (event.text.includes('합성 품질 조회 실패') || allowed.has('malformed') && event.text.includes('데이터 품질 이슈 응답 형식'))
    })
    await page.goto(`${base}/data-quality`)
    const rows = page.getByRole('button').filter({ hasText: 'SYNTHETIC_RULE' })
    const summary = text => page.getByRole('status').filter({ hasText: text })
    const nav = page.getByRole('navigation', { name: '데이터 품질 이슈 목록 페이지네이션' })
    const filter = page.getByRole('combobox', { name: '심각도 필터' })
    const choose = async label => { await filter.click(); await page.getByRole('option', { name: label, exact: true }).click() }
    const refresh = page.getByRole('button', { name: '이슈 목록 새로고침' })
    const retry = page.getByRole('button', { name: '다시 조회', exact: true })
    await summary('전체 45건 · 1 / 3페이지').waitFor()
    assert.equal(await rows.count(), 20)
    await rows.first().focus(); await page.keyboard.press('Enter')
    await page.getByRole('button', { name: '대상 관리 열기', exact: true }).waitFor()
    assert.match(await page.locator('body').innerText(), /2026.10.19 09:30/)
    await page.screenshot({ path: join(output, `detail-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: '대상 관리 열기', exact: true }).click()
    await page.waitForFunction(() => window.qualityQA.path === '/places')
    await page.evaluate(() => window.qualityQA.navigate('/data-quality'))
    const readsBeforeFilter = await page.evaluate(() => window.qualityQA.calls.length)
    await choose('오류'); assert.equal(await rows.count(), 6)
    assert.equal(await page.evaluate(() => window.qualityQA.calls.length), readsBeforeFilter)
    await summary('전체 45건 · 1 / 3페이지').waitFor()
    assert.equal(await page.getByRole('button', { name: '대상 관리 열기', exact: true }).count(), 0)
    await choose('심각도 전체')

    allowed.add(500)
    await page.evaluate(() => { window.qualityQA.status = 500 })
    await nav.getByRole('button', { name: '다음 페이지로 이동' }).click()
    await retry.waitFor()
    await summary('전체 45건 · 1 / 3페이지 (이전 결과)').waitFor()
    await page.getByRole('alert').filter({ hasText: '2페이지 조회에 실패' }).waitFor()
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'alert')
    const alertBounds = await page.getByRole('alert').boundingBox()
    assert.ok(alertBounds.y >= 0 && alertBounds.y + alertBounds.height <= height, 'paging errors must be brought into view')
    await page.screenshot({ path: join(output, `previous-error-${width}.png`), fullPage: true })
    await page.evaluate(() => { window.qualityQA.status = 0; window.qualityQA.delay = true })
    await retry.click()
    await summary('2페이지 조회 중').waitFor()
    assert.equal(await nav.getByRole('button', { name: '다음 페이지로 이동' }).isDisabled(), true)
    assert.equal(await filter.isDisabled(), true)
    assert.equal(await rows.first().isDisabled(), true)
    await page.evaluate(() => { window.qualityQA.delay = false; window.qualityQA.release() })
    await summary('전체 45건 · 2 / 3페이지').waitFor()
    const latestRead = await page.evaluate(() => window.qualityQA.calls.at(-1).params)
    assert.deepEqual(latestRead, { page: 2, limit: 20 })
    await nav.getByRole('button', { name: '다음 페이지로 이동' }).focus(); await page.keyboard.press('Enter')
    await summary('전체 45건 · 3 / 3페이지').waitFor()
    assert.equal(await rows.count(), 5)
    assert.equal(await nav.getByRole('button', { name: '다음 페이지로 이동' }).isDisabled(), true)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)

    // Missing IDs and repeated composite fields must not select the wrong record.
    await page.evaluate(() => { window.qualityQA.total = 2; window.qualityQA.duplicates = true })
    await refresh.click()
    await summary('전체 2건 · 1 / 1페이지').waitFor()
    await rows.nth(1).click()
    assert.equal(await page.getByText('같은 식별 필드 둘째 이슈', { exact: true }).count(), 2)
    assert.equal(await page.getByText('같은 식별 필드 첫째 이슈', { exact: true }).count(), 1)
    await page.screenshot({ path: join(output, `duplicates-${width}.png`), fullPage: true })
    await choose('안내')
    await page.getByText('현재 페이지에 선택한 심각도의 이슈가 없습니다.', { exact: true }).waitFor()
    await summary('전체 2건 · 1 / 1페이지').waitFor()
    await choose('심각도 전체')

    // A new account's first failure must never display stale totals or successful zero.
    await page.evaluate(() => { window.qualityQA.status = 500; window.qualityQA.changeAccount(100) })
    await retry.waitFor()
    await page.getByRole('alert').filter({ hasText: '미해결 건수는 확인되지 않았습니다' }).waitFor()
    assert.equal(await rows.count(), 0)
    assert.equal(await page.getByText('미해결 이슈가 없습니다.', { exact: true }).count(), 0)
    assert.doesNotMatch(await page.locator('body').innerText(), /전체 0건|전체 2건/)
    await page.screenshot({ path: join(output, `initial-error-${width}.png`), fullPage: true })
    await page.evaluate(() => { window.qualityQA.status = 0; window.qualityQA.total = 0; window.qualityQA.duplicates = false })
    await retry.click()
    await page.getByText('미해결 이슈가 없습니다.', { exact: true }).waitFor()
    await summary('전체 0건 · 1 / 1페이지').waitFor()
    assert.equal(await nav.count(), 0)

    allowed.add('malformed')
    await page.evaluate(() => { window.qualityQA.malformed = true; window.qualityQA.changeAccount(101) })
    await retry.waitFor()
    assert.equal(await page.getByText('미해결 이슈가 없습니다.', { exact: true }).count(), 0)
    await page.evaluate(() => { window.qualityQA.malformed = false; window.qualityQA.total = 45 })
    await retry.click(); await summary('전체 45건 · 1 / 3페이지').waitFor()
    allowed.add(403)
    await page.evaluate(() => { window.qualityQA.status = 403 })
    await nav.getByRole('button', { name: '다음 페이지로 이동' }).click()
    await retry.waitFor(); await page.getByRole('alert').filter({ hasText: '관리자 권한' }).waitFor()
    assert.equal(await rows.count(), 0)
    assert.equal(await page.evaluate(() => window.qualityQA.clears), 0)
    await page.evaluate(() => { window.qualityQA.status = 0 })
    await retry.click(); await summary('전체 45건 · 2 / 3페이지').waitFor()
    allowed.add(401)
    await page.evaluate(() => { window.qualityQA.status = 401 })
    await refresh.click(); await page.waitForFunction(() => window.qualityQA.clears >= 1)
    await page.evaluate(() => { window.qualityQA.status = 0; window.qualityQA.total = 0; window.qualityQA.changeAccount(102) })
    await page.getByText('미해결 이슈가 없습니다.', { exact: true }).waitFor()
    guard.assertClean()
    assert.ok((await page.evaluate(() => window.qualityQA.calls)).every(call => call.method === 'get'
      && call.path === '/admin/data-quality/issues' && Object.keys(call.params).sort().join(',') === 'limit,page'))
    console.log(`PASS data-quality pages/filter/selection/navigation/errors/retry/auth ${width}×${height}`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; GET-only, no real API or operational mutations.`)
} finally { await browser?.close(); await server.close() }
