import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-300-'))
const cpuRate = Number(process.env.PINGDOM_QA_CPU_RATE ?? 1)
assert.ok(Number.isFinite(cpuRate) && cpuRate >= 1 && cpuRate <= 8, 'CPU stress rate must be between 1 and 8')
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
let browser, page, currentViewport
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    currentViewport = { width, height }
    page = await browser.newPage({ viewport: currentViewport })
    if (cpuRate > 1) {
      const session = await page.context().newCDPSession(page)
      await session.send('Emulation.setCPUThrottlingRate', { rate: cpuRate })
    }
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

    // Both reply orders must retire a saved dialog even if permission failure hides it early.
    allowed.add(403)
    for (const denied of ['list', 'detail']) {
      await page.getByRole('button', { name: '신고 검토', exact: true }).click()
      dialog = page.getByRole('dialog', { name: '신고 검토', exact: true })
      assert.equal(await dialog.getByRole('textbox', { name: /판정 근거/ }).inputValue(), '')
      await dialog.getByRole('combobox', { name: '신고 검토 결과', exact: true }).click()
      await page.getByRole('option', { name: '검토 중', exact: true }).click()
      await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('합성 재조회 권한 확인')
      await page.evaluate(mode => {
        Object.assign(window.placeReviewQA, {
          listStatus: mode === 'list' ? 403 : 0, detailStatus: mode === 'detail' ? 403 : 0,
          delayList: mode === 'detail', delayDetail: mode === 'list',
          releaseList: null, releaseDetail: null,
        })
      }, denied)
      await dialog.getByRole('button', { name: '검토 결과 저장', exact: true }).click()
      await dialog.waitFor({ state: 'detached' })
      await page.waitForFunction(mode => typeof window.placeReviewQA[mode === 'list' ? 'releaseDetail' : 'releaseList'] === 'function', denied)
      assert.equal(await retry.count(), 0, 'the sibling GET is still pending')
      await page.evaluate(mode => {
        window.placeReviewQA.delayList = false; window.placeReviewQA.delayDetail = false
        window.placeReviewQA[mode === 'list' ? 'releaseDetail' : 'releaseList']()
      }, denied)
      await retry.waitFor()
      await page.getByRole('alert').filter({ hasText: '검토 결과는 저장됐지만' }).waitFor()
      assert.equal(await page.getByText('반박 2건', { exact: true }).count(), 0)
      const postCount = await page.evaluate(() => window.placeReviewQA.calls.filter(call => call.method === 'post').length)
      await page.evaluate(() => { window.placeReviewQA.listStatus = 0; window.placeReviewQA.detailStatus = 0 })
      await retry.click(); await retry.waitFor({ state: 'detached' })
      await page.getByText('반박 2건', { exact: true }).waitFor()
      assert.equal(await page.getByRole('dialog').count(), 0, 'GET retry must not revive the saved dialog')
      assert.equal(await page.evaluate(() => window.placeReviewQA.calls.filter(call => call.method === 'post').length), postCount)
      await page.screenshot({ path: join(output, `permission-retry-${denied}-${width}.png`), fullPage: true })
    }

    // An old account's save must not close a new draft or clear its unsaved protection.
    await page.getByRole('button', { name: '신고 검토', exact: true }).click()
    dialog = page.getByRole('dialog', { name: '신고 검토', exact: true })
    await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('이전 계정의 합성 검토')
    await page.evaluate(() => { window.placeReviewQA.delayPost = true })
    await dialog.getByRole('button', { name: '검토 결과 저장', exact: true }).click()
    await dialog.getByRole('button', { name: '저장 중', exact: true }).waitFor()
    await page.evaluate(() => window.placeReviewQA.changeAccount(150))
    await page.getByText('검토할 신고를 선택해주세요.', { exact: true }).waitFor()
    await page.getByRole('button').filter({ hasText: '신고 #2 · 장소 #102' }).click()
    await page.getByText('신고 #2', { exact: true }).waitFor()
    await page.getByRole('button', { name: '신고 검토', exact: true }).click()
    dialog = page.getByRole('dialog', { name: '신고 검토', exact: true })
    await dialog.getByRole('textbox', { name: /판정 근거/ }).fill('새 계정의 미저장 검토')
    await page.evaluate(() => { window.placeReviewQA.delayPost = false; window.placeReviewQA.releasePost() })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await dialog.getByRole('textbox', { name: /판정 근거/ }).inputValue(), '새 계정의 미저장 검토')
    await page.keyboard.press('Escape')
    await unsaved.waitFor()
    await unsaved.getByRole('button', { name: '계속 작성', exact: true }).click()
    assert.equal(await dialog.getByRole('textbox', { name: /판정 근거/ }).inputValue(), '새 계정의 미저장 검토')
    await dialog.getByRole('button', { name: '취소', exact: true }).click()
    await unsaved.getByRole('button', { name: '변경 버리고 이동', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })

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
    const clearsBefore = await page.evaluate(() => window.placeReviewQA.clears)
    await page.evaluate(() => { window.placeReviewQA.listStatus = 401 })
    await page.getByRole('button', { name: '목록 다시 조회', exact: true }).click()
    // A clearAuth call is not a committed logout. Wait for protected content to unmount.
    await page.getByTestId('qa-logged-out').waitFor()
    await page.waitForFunction(() => window.placeReviewQA.accountId === null && window.placeReviewQA.pending === 0)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.evaluate(() => window.placeReviewQA.clears), clearsBefore + 1)
    assert.equal(await page.evaluate(() => window.placeReviewQA.trace.filter(event =>
      event.event === 'request-start' && event.accountId === null).length), 0,
    'logged-out fixture must not keep fetching a protected page')
    await page.evaluate(() => { window.placeReviewQA.listStatus = 0; window.placeReviewQA.changeAccount(102) })
    await page.waitForFunction(() => window.placeReviewQA.accountId === 102 && window.placeReviewQA.pending === 0)
    await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).waitFor()

    // An older account's delayed 401 must not log out the freshly committed account.
    await page.evaluate(() => { window.placeReviewQA.listStatus = 401; window.placeReviewQA.delayList = true })
    await page.getByRole('button', { name: '현재 작업 새로고침', exact: true }).click()
    await page.waitForFunction(() => window.placeReviewQA.pending === 1 && typeof window.placeReviewQA.releaseList === 'function')
    const oldRequest = await page.evaluate(() => window.placeReviewQA.trace
      .filter(event => event.event === 'request-start' && event.path === '/admin/place-information-reports').at(-1).requestId)
    await page.evaluate(() => {
      window.placeReviewQA.listStatus = 0; window.placeReviewQA.delayList = false
      window.placeReviewQA.changeAccount(103)
    })
    await page.waitForFunction(() => window.placeReviewQA.accountId === 103)
    await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).waitFor()
    await page.evaluate(() => window.placeReviewQA.releaseList())
    await page.waitForFunction(id => window.placeReviewQA.trace.some(event =>
      event.event === 'response-rejected' && event.requestId === id), oldRequest)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.evaluate(() => window.placeReviewQA.accountId), 103)
    assert.equal(await page.evaluate(() => window.placeReviewQA.clears), clearsBefore + 1)
    await page.getByTestId('qa-logged-out').waitFor({ state: 'detached' })
    await page.getByText('조건에 맞는 신고가 없습니다.', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.placeReviewQA.pending), 0)
    guard.assertClean()
    const writes = (await page.evaluate(() => window.placeReviewQA.calls)).filter(c => c.method !== 'get')
    assert.equal(writes.length, 7)
    assert.ok(writes.every(c => c.method === 'post' && /\/review$/.test(c.path)))
    console.log(`PASS place-dispute review/save/refresh/retry/dialog/empty/auth ${width}×${height}`)
    await page.close()
  }
  console.log(`Synthetic screenshots: ${output}; no real API or operational mutations.`)
} catch (error) {
  // This fixture uses synthetic accounts/API data only. Never dump request bodies or tokens.
  try {
    const diagnostic = await page.evaluate(() => ({ accountId: window.placeReviewQA.accountId,
      clears: window.placeReviewQA.clears, pending: window.placeReviewQA.pending,
      trace: window.placeReviewQA.trace.slice(-40), text: document.body.innerText.slice(0, 2000) }))
    console.error('Place dispute failure diagnostics:', JSON.stringify({ viewport: currentViewport, ...diagnostic }))
    await writeFile(join(output, 'failure.json'), JSON.stringify({ viewport: currentViewport, ...diagnostic }, null, 2))
    await page.screenshot({ path: join(output, 'failure.png'), fullPage: true })
    console.error(`Failure artifacts: ${output}`)
  } catch (diagnosticError) { console.error('Unable to capture fixture diagnostics:', diagnosticError.message) }
  throw error
} finally { await browser?.close(); await server.close() }
