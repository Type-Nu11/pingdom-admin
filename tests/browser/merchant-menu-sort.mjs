import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-menu-sort-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'menu-sort-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/menu-sort-qa')) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-menu-sort-fixture.jsx')))
  })
} }] })
let browser
const handle = (page, id) => page.getByRole('button', { name: `테스트 메뉴 ${id} 순서 이동`, exact: true })
const order = page => page.getByRole('list', { name: '메뉴 표시 순서' }).locator('[data-menu-id]').evaluateAll(elements => elements.map(element => Number(element.dataset.menuId)))
async function requests(page) { const log = page.getByRole('button', { name: '정렬 요청 기록' }); await log.click(); return JSON.parse(await log.innerText()) }
try {
  await server.listen()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width === 390 })
    const guard = await guardBrowserPage(page, base)
    await page.goto(base + '/menu-sort-qa')
    await handle(page, 1).waitFor()
    assert.equal(await handle(page, 3).isDisabled(), true)
    const name = page.getByRole('textbox', { name: '메뉴명 (필수)', exact: true })
    await name.fill('작성 중인 새 메뉴')
    await handle(page, 1).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
    assert.deepEqual((await order(page)).slice(0, 3), [2, 3, 1])
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.activeElement?.dataset.handleId === '1')
    assert.deepEqual((await order(page)).slice(0, 3), [1, 2, 3])
    assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 0)
    await handle(page, 1).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    await page.getByText('메뉴 표시 순서를 변경했습니다.', { exact: true }).waitFor()
    assert.deepEqual((await order(page)).slice(0, 3), [2, 3, 1])
    assert.equal(await name.inputValue(), '작성 중인 새 메뉴', 'new menu draft survives write and requery')
    assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 1)
    // Mouse or touch: preview must not submit until release.
    await handle(page, 1).scrollIntoViewIfNeeded()
    const from = await handle(page, 2).boundingBox()
    const target = await handle(page, 1).boundingBox()
    if (width === 390) {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + 18, y: from.y + 20 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + 18, y: target.y + 20 }] })
      assert.deepEqual((await order(page)).slice(0, 3), [3, 1, 2])
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
    } else {
      await page.mouse.move(from.x + 18, from.y + 20); await page.mouse.down()
      await page.mouse.move(target.x + 18, target.y + 20, { steps: 4 })
      assert.deepEqual((await order(page)).slice(0, 3), [3, 1, 2])
      await page.mouse.up()
    }
    await page.getByText('메뉴 표시 순서를 저장했습니다.', { exact: true }).waitFor()
    assert.equal(await name.inputValue(), '작성 중인 새 메뉴')
    const writes = (await requests(page)).filter(call => call.method !== 'get')
    assert.equal(writes.length, 2)
    assert.deepEqual(writes[1].data, { displayOrder: 2 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `menu-sort-${width}.png`), fullPage: true })
    await guard.assertClean()
    await page.close()
    console.log(`${width}px keyboard cancel/save, pointer/touch, inactive guard and draft preservation PASS`)
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  let expectedFailure = false
  const guard = await guardBrowserPage(page, base, event => expectedFailure && (
    event.kind === 'fixture-api' && event.method === 'PATCH' && event.path.endsWith('/order') && event.status === 500
    || event.kind === 'console' && event.level === 'error' && event.text.startsWith('상점주 메뉴 order 실패')))
  await page.goto(base + '/menu-sort-qa')
  await handle(page, 1).waitFor()
  // Auto-scroll during a long drag, then cancel without writing.
  await handle(page, 1).scrollIntoViewIfNeeded()
  const source = await handle(page, 1).boundingBox()
  const list = page.getByRole('list', { name: '메뉴 표시 순서' })
  const rect = await list.boundingBox()
  await page.mouse.move(source.x + 18, source.y + 20); await page.mouse.down()
  await page.mouse.move(source.x + 18, Math.min(756, rect.y + rect.height - 8), { steps: 5 })
  await page.waitForFunction(() => document.querySelector('[aria-label="메뉴 표시 순서"]').scrollTop > 40)
  await page.keyboard.press('Escape'); await page.mouse.up()
  assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 0)
  assert.deepEqual((await order(page)).slice(0, 3), [1, 2, 3])
  // Existing menu edits, like new-menu drafts, survive sorting without a discard prompt.
  await page.locator('[data-menu-id="2"]').getByRole('button').nth(1).click()
  const name = page.getByRole('textbox', { name: '메뉴명 (필수)', exact: true })
  await name.fill('편집 중인 메뉴')
  await handle(page, 1).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await page.getByText('메뉴 표시 순서를 저장했습니다.', { exact: true }).waitFor()
  assert.equal(await name.inputValue(), '편집 중인 메뉴')
  await guard.assertClean()
  expectedFailure = true
  await page.goto(base + '/menu-sort-qa?scenario=failure')
  await handle(page, 1).waitFor()
  await handle(page, 1).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await page.getByRole('alert').filter({ hasText: '합성 순서 저장 실패' }).waitFor()
  await page.getByText('순서 저장을 확인하지 못했습니다.', { exact: false }).waitFor()
  assert.deepEqual((await order(page)).slice(0, 3), [1, 2, 3])
  assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 1)
  await guard.assertClean(); await page.close()
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
