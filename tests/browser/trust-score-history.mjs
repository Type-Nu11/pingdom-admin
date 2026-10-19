import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-299-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1', open: false }, plugins: [{
  name: 'trust-score-history-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/trust-score')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/trust-score-history-fixture.jsx')))
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
      if (event.kind === 'fixture-api') return allowed.has(event.status) && event.method === 'GET' && /reporters\/\d+\/history$/.test(event.path) && event.text === '합성 이력 조회 실패'
      return event.kind === 'console' && event.level === 'error' && event.text.startsWith('관리자 Trust Score 이력 조회 실패') && (event.text.includes('합성 이력 조회 실패') || (allowed.has('malformed') && event.text.includes('신뢰 점수 이력 응답 형식')))
    })
    await page.goto(`${base}/trust-score`)
    const input = page.getByRole('textbox', { name: '신고자 사용자 ID' })
    const search = async id => {
      await input.fill(String(id)); await page.getByRole('button', { name: '조회', exact: true }).click()
      await page.getByText(`합성 신고자 ${id} · 사용자 #${id}`, { exact: true }).waitFor()
    }
    assert.doesNotMatch(await page.locator('body').innerText(), /전체 0건|변경 이력이 없습니다/)
    await search(1)
    await page.getByText('전체 45건 · 1 / 3페이지', { exact: true }).waitFor()
    const nav = page.getByRole('navigation', { name: '점수 변경 이력 페이지네이션' })
    await nav.getByRole('button', { name: '다음 페이지로 이동', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByText('전체 45건 · 2 / 3페이지', { exact: true }).waitFor()
    await nav.getByRole('button', { name: '3페이지로 이동', exact: true }).click()
    await page.getByText('전체 45건 · 3 / 3페이지', { exact: true }).waitFor()
    assert.equal(await nav.getByRole('button', { name: '다음 페이지로 이동', exact: true }).isDisabled(), true)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `history-${width}.png`), fullPage: true })

    allowed.add(500)
    await page.evaluate(() => { window.trustScoreQA.historyStatus = 500 })
    await nav.getByRole('button', { name: '2페이지로 이동', exact: true }).click()
    await page.getByRole('button', { name: '이력 다시 시도', exact: true }).waitFor()
    await page.getByText('전체 45건 · 3 / 3페이지 (이전 결과)', { exact: true }).waitFor()
    assert.doesNotMatch(await page.locator('body').innerText(), /전체 0건|변경 이력이 없습니다/)
    await page.screenshot({ path: join(output, `failure-${width}.png`), fullPage: true })
    await page.evaluate(() => { window.trustScoreQA.historyStatus = 0; window.trustScoreQA.delayHistory = true })
    await page.getByRole('button', { name: '이력 다시 시도', exact: true }).click()
    await page.getByRole('status').filter({ hasText: '점수 변경 이력을 불러오는 중' }).waitFor()
    assert.equal(await nav.getByRole('button', { name: '다음 페이지로 이동', exact: true }).isDisabled(), true)
    await page.evaluate(() => { window.trustScoreQA.delayHistory = false; window.trustScoreQA.releaseHistory() })
    await page.getByText('전체 45건 · 2 / 3페이지', { exact: true }).waitFor()

    await search(2)
    await page.getByText('전체 0건 · 1 / 1페이지', { exact: true }).waitFor()
    await page.getByText('변경 이력이 없습니다.', { exact: true }).waitFor()
    assert.equal(await nav.count(), 0)
    assert.equal(await page.getByText(/합성 이력 1-/).count(), 0)
    await search(1)
    await page.getByText('전체 45건 · 1 / 3페이지', { exact: true }).waitFor()

    allowed.add(403)
    await page.evaluate(() => { window.trustScoreQA.historyStatus = 403 })
    await nav.getByRole('button', { name: '다음 페이지로 이동', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '관리자 권한이 필요' }).waitFor()
    assert.equal(await page.getByText(/합성 이력 1-/).count(), 0)
    assert.equal(await nav.count(), 0)
    await page.evaluate(() => { window.trustScoreQA.historyStatus = 0 })
    await page.getByRole('button', { name: '이력 다시 시도', exact: true }).click()
    await page.getByText('전체 45건 · 2 / 3페이지', { exact: true }).waitFor()

    allowed.add('malformed')
    await page.evaluate(() => { window.trustScoreQA.malformed = true })
    await search(3)
    await page.getByRole('button', { name: '이력 다시 시도', exact: true }).waitFor()
    assert.doesNotMatch(await page.locator('body').innerText(), /전체 0건|변경 이력이 없습니다/)
    await page.evaluate(() => { window.trustScoreQA.malformed = false })
    await page.getByRole('button', { name: '이력 다시 시도', exact: true }).click()
    await page.getByText('전체 45건 · 1 / 3페이지', { exact: true }).waitFor()
    await page.evaluate(() => window.trustScoreQA.changeAccount(100))
    await page.getByText('신고자 ID로 Trust Score를 조회해주세요.', { exact: true }).waitFor()
    assert.equal(await page.getByText(/합성 이력 3-/).count(), 0)

    await search(1)
    await page.getByText('전체 45건 · 1 / 3페이지', { exact: true }).waitFor()
    allowed.add(401)
    await page.evaluate(() => { window.trustScoreQA.historyStatus = 401 })
    await nav.getByRole('button', { name: '다음 페이지로 이동', exact: true }).click()
    await page.getByText('신고자 ID로 Trust Score를 조회해주세요.', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.trustScoreQA.clears), 1)
    guard.assertClean()
    assert.ok((await page.evaluate(() => window.trustScoreQA.calls)).every(call => call.method === 'get'))
    console.log(`PASS trust-score history pagination/error/retry/loading/empty/permission/account/auth ${width}×${height}`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; no real API or mutations.`)
} finally { await browser?.close(); await server.close() }
