import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const cpuRate = Number(process.env.PINGDOM_MENU_SORT_CPU_RATE ?? 1)
assert.ok(Number.isFinite(cpuRate) && cpuRate >= 1 && cpuRate <= 20, 'CPU rate must be between 1 and 20')
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
async function assertOrder(page, expected, timeout = 3000) {
  // React may not have committed the latest pointer/keyboard preview yet.
  // Wait for the exact expected prefix; never retry an input or accept another order.
  await page.waitForFunction(expected => {
    const actual = [...document.querySelectorAll('[aria-label="메뉴 표시 순서"] [data-menu-id]')]
      .slice(0, expected.length).map(row => Number(row.dataset.menuId))
    return JSON.stringify(actual) === JSON.stringify(expected)
  }, expected, { timeout })
  assert.deepEqual((await order(page)).slice(0, expected.length), expected)
}
async function dragPoints(page, fromId, toId) {
  await handle(page, toId).scrollIntoViewIfNeeded()
  // Trial clicks check enabled/stable/hit-tested readiness without dispatching input.
  await handle(page, fromId).click({ trial: true })
  const result = await page.waitForFunction(({ fromId, toId }) => {
    const point = id => {
      const button = document.querySelector(`[data-handle-id="${id}"]`)
      if (!button || button.disabled) return null
      const rect = button.getBoundingClientRect()
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
      if (document.elementFromPoint(x, y)?.closest('[data-handle-id]') !== button) return null
      return { x, y }
    }
    const from = point(fromId), target = point(toId)
    return from && target ? { from, target } : false
  }, { fromId, toId }, { timeout: 3000 })
  try { return await result.jsonValue() } finally { await result.dispose() }
}
async function assertDragging(page, id) {
  await page.waitForFunction(id => document.querySelector(`[data-handle-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', id, { timeout: 3000 })
}
async function throttle(page) {
  if (cpuRate === 1) return
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setCPUThrottlingRate', { rate: cpuRate })
}
async function assertSingleOutline(page, id) {
  const outlines = await page.locator(`[data-menu-id="${id}"]`).evaluate(row => ({
    row: getComputedStyle(row).outlineStyle,
    buttons: [...row.querySelectorAll('button')].map(button => getComputedStyle(button).outlineStyle),
  }))
  assert.deepEqual(outlines, { row: 'solid', buttons: ['none', 'none'] }, 'only the whole row has a focus/drag outline')
}
async function requests(page) { return page.evaluate(() => window.menuSortQA.calls) }
try {
  await server.listen()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width === 390 })
    await throttle(page)
    const guard = await guardBrowserPage(page, base)
    await page.goto(base + '/menu-sort-qa')
    await handle(page, 1).waitFor()
    const originalSurface = await page.getByRole('list', { name: '메뉴 표시 순서' }).evaluate(list => {
      const row = list.querySelector('[data-menu-id]')
      const style = getComputedStyle(row)
      return { padding: getComputedStyle(list).padding, background: style.backgroundColor,
        shadow: style.boxShadow, margin: style.margin, selectionBorder: style.borderLeftWidth }
    })
    assert.deepEqual(originalSurface, { padding: '12px', background: 'rgba(0, 0, 0, 0)', shadow: 'none', margin: '0px', selectionBorder: '3px' }, 'original shared list surface is preserved')
    assert.equal(await handle(page, 3).isDisabled(), true)
    const name = page.getByRole('textbox', { name: '메뉴명 (필수)', exact: true })
    const select = id => page.locator(`[data-menu-id="${id}"]`).getByRole('button').nth(1)
    await select(1).click(); await select(2).click()
    assert.equal(await name.inputValue(), '테스트 메뉴 2', 'quick menu selection works without starting a drag')
    await page.getByRole('button', { name: '새 메뉴', exact: true }).click()
    // First pointer press and small hand jitter must not activate drag or shift the list.
    await handle(page, 1).scrollIntoViewIfNeeded()
    const initial = await handle(page, 1).boundingBox()
    await page.mouse.move(initial.x + 18, initial.y + 20); await page.mouse.down()
    await page.mouse.move(initial.x + 21, initial.y + 22)
    assert.equal(await handle(page, 1).getAttribute('aria-pressed'), 'false')
    assert.equal(await select(2).isDisabled(), false)
    assert.equal((await handle(page, 1).boundingBox()).y, initial.y, 'pressing a handle must not move the list')
    await page.mouse.move(initial.x + 26, initial.y + 20)
    await assertDragging(page, 1)
    assert.equal(await handle(page, 1).getAttribute('aria-pressed'), 'true', '6px movement activates dragging')
    assert.equal((await handle(page, 1).boundingBox()).y, initial.y, 'first pointer activation must not shift the row')
    assert.equal(await select(2).isDisabled(), true)
    await assertSingleOutline(page, 1)
    await page.mouse.up()
    await assertOrder(page, [1, 2, 3])
    // Plain handle clicks, including immediately after a no-op drag, leave menu selection usable.
    await handle(page, 1).click()
    await select(2).click()
    assert.equal(await name.inputValue(), '테스트 메뉴 2', 'short handle click does not swallow the next selection')
    assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 0)
    await page.getByRole('button', { name: '새 메뉴', exact: true }).click()
    await name.fill('작성 중인 새 메뉴')
    const listTop = () => page.getByRole('list', { name: '메뉴 표시 순서' }).evaluate(list => list.getBoundingClientRect().top + scrollY)
    const beforeActivation = await listTop()
    await handle(page, 1).focus()
    await assertSingleOutline(page, 1)
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
    await assertSingleOutline(page, 1)
    assert.equal(await listTop(), beforeActivation, 'activation notice does not shift the list')
    await assertOrder(page, [2, 3, 1])
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.activeElement?.dataset.handleId === '1')
    await assertOrder(page, [1, 2, 3])
    assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 0)
    await handle(page, 1).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    await page.getByRole('status').filter({ hasText: '순서 저장 중…' }).waitFor()
    assert.equal(await select(2).isDisabled(), true, 'selection is explicitly locked during write and requery')
    assert.equal(await handle(page, 2).isDisabled(), true, 'duplicate sorting is blocked while saving')
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    await page.getByText('메뉴 표시 순서를 변경했습니다.', { exact: true }).waitFor()
    await assertOrder(page, [2, 3, 1])
    assert.equal(await name.inputValue(), '작성 중인 새 메뉴', 'new menu draft survives write and requery')
    assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 1)
    // Mouse or touch: preview must not submit until release.
    const { from, target } = await dragPoints(page, 2, 1)
    if (width === 390) {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + 8, y: from.y }] })
      await assertDragging(page, 2)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [target] })
      await assertOrder(page, [3, 1, 2])
      assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 1, 'preview must not submit before touch release')
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
    } else {
      await page.mouse.move(from.x, from.y); await page.mouse.down()
      await page.mouse.move(from.x + 8, from.y)
      await assertDragging(page, 2)
      await page.mouse.move(target.x, target.y, { steps: 4 })
      await assertOrder(page, [3, 1, 2])
      assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 1, 'preview must not submit before pointer release')
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
    console.log(`${width}px click/jitter threshold, stable geometry, saving feedback, keyboard, pointer/touch and draft preservation PASS`)
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await throttle(page)
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
  await assertOrder(page, [1, 2, 3])
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
  await assertOrder(page, [1, 2, 3])
  assert.equal((await requests(page)).filter(call => call.method !== 'get').length, 1)
  await assert.rejects(assertOrder(page, [3, 1, 2], 100), { name: 'TimeoutError' }, 'a persistently wrong preview must still fail')
  await assertOrder(page, [1, 2, 3])
  await guard.assertClean(); await page.close()
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
