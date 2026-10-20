import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { startUserBanServer } from './user-ban-structure-server.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const { server, url, output } = await startUserBanServer()
let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage()
  const guard = await guardBrowserPage(page, new URL(url).origin, event => {
    if (!page.url().includes('scenario=history-error')) return false
    if (event.kind === 'console') return event.level === 'error' && event.text.startsWith('관리자 사용자 제재 이력 조회 실패') && event.text.includes('합성 제재 이력 조회 실패')
    return event.kind === 'fixture-api' && event.method === 'GET' && event.status === 500 && event.path === '/admin/users/901/sanctions' && event.text === '합성 제재 이력 조회 실패'
  })
  const listCalls = () => page.evaluate(() => window.banQa.calls.filter(call => call.path === '/admin/users/banned'))
  const historyCalls = () => page.evaluate(() => window.banQa.calls.filter(call => call.path.endsWith('/sanctions')))
  async function checkHover(control, { row = false, selected = false, disabled = false } = {}) {
    await page.mouse.move(0, 0)
    const appearance = locator => locator.evaluate(element => {
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, color: style.color, shadow: style.boxShadow }
    })
    const before = await appearance(control)
    await control.hover()
    const after = await appearance(control)
    if (disabled) assert.deepEqual(after, before, 'disabled controls do not pretend to be interactive on hover')
    else {
      assert.notEqual(after.background, before.background, 'hover visibly changes the background')
      if (row) {
        const [red, green, blue] = after.background.match(/[\d.]+/g).map(Number)
        assert.ok(red > green && red > blue, 'list hover is a light brand pink instead of white')
      } else if (!selected) assert.equal(after.background, 'rgb(255, 255, 255)', 'control hover is white against the gray panel')
      if (!row) assert.notEqual(after.shadow, 'none', 'filter hover has a visible brand outline')
    }
    await page.mouse.move(0, 0)
    assert.deepEqual(await appearance(control), before, 'pointer exit restores the normal or selected appearance')
  }
  async function checkReleaseAlignment(reference) {
    const heading = page.getByRole('heading', { name: '밴 해제', exact: true })
    const button = page.getByRole('button', { name: '밴 해제', exact: true })
    const positions = await Promise.all([reference, heading, button].map(locator => locator.boundingBox()))
    assert.ok(Math.abs(positions[0].x - positions[1].x) < 1, 'release title shares the account/history heading left edge')
    const [title, action] = positions.slice(1)
    assert.ok(Math.abs(title.y + title.height / 2 - action.y - action.height / 2) < 1, 'release title and action share one centered row')
    assert.ok(action.x >= title.x + title.width, 'release action remains on the right')
    const inset = await button.evaluate(element => {
      const group = element.closest('section')
      return group.getBoundingClientRect().right - element.getBoundingClientRect().right
    })
    assert.ok(Math.abs(inset - 14) < 1, 'release action uses the same section padding instead of the far panel edge')
  }
  async function openHistory() {
    await page.getByRole('button', { name: /합성 사용자 901/ }).click()
    await page.getByRole('tab', { name: '제재 이력', exact: true }).waitFor()
    await page.getByRole('tab', { name: '제재 이력', exact: true }).click()
  }
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.goto(url)
    await page.getByRole('button', { name: /합성 사용자 901/ }).waitFor()
    await checkHover(page.getByRole('button', { name: '밴 유형 필터', exact: true }))
    await checkHover(page.getByRole('button', { name: '밴 사용자 정렬 기준', exact: true }))
    await checkHover(page.getByRole('button', { name: '밴 사용자 정렬 방향', exact: true }))
    await checkHover(page.getByRole('button', { name: /^밴 처리 시작일,/ }))
    await checkHover(page.getByRole('button', { name: /^밴 처리 종료일,/ }))
    await checkHover(page.getByRole('button', { name: '조회', exact: true }))
    await checkHover(page.getByRole('button', { name: '필터 초기화', exact: true }), { disabled: true })
    for (const id of [901, 902]) await checkHover(page.getByRole('button', { name: new RegExp(`합성 사용자 ${id}`) }), { row: true })
    // Inspect the actual release dialog without submitting any operational write.
    await page.getByRole('button', { name: /합성 사용자 901/ }).click()
    await page.getByRole('heading', { name: '계정 정보', exact: true }).waitFor()
    await checkHover(page.getByRole('button', { name: /합성 사용자 901/ }), { row: true, selected: true })
    assert.equal(await page.getByRole('button', { name: /합성 사용자 901/ }).getAttribute('aria-current'), 'true')
    await checkReleaseAlignment(page.getByRole('heading', { name: '계정 정보', exact: true }))
    await page.getByRole('button', { name: '밴 해제', exact: true }).click()
    const releaseDialog = page.getByRole('dialog', { name: '이 사용자의 밴을 해제할까요?', exact: true })
    await releaseDialog.waitFor()
    const releaseReason = releaseDialog.getByRole('textbox', { name: /해제 사유/ })
    await releaseReason.fill('합성 검토 사유 — 실제 해제하지 않음')
    const gaps = await releaseReason.evaluate(textarea => {
      const field = textarea.closest('label')
      const description = document.getElementById('ban-release-confirm-description')
      const meta = field.nextElementSibling
      return {
        before: field.getBoundingClientRect().top - description.getBoundingClientRect().bottom,
        after: meta.getBoundingClientRect().top - field.getBoundingClientRect().bottom,
      }
    })
    assert.ok(Math.abs(gaps.before - 14) < 1, `reason top gap must be 14px: ${gaps.before}`)
    assert.ok(Math.abs(gaps.before - gaps.after) < 1, `reason gaps differ: ${JSON.stringify(gaps)}`)
    await page.screenshot({ path: join(output, `ban-release-spacing-${width}.png`) })
    await releaseDialog.getByRole('button', { name: '취소', exact: true }).click()
    await releaseDialog.waitFor({ state: 'hidden' })
    const callsBefore = (await listCalls()).length
    await page.getByRole('searchbox', { name: '사용자 ID 또는 닉네임 검색' }).fill('  합성 사용자  ')
    const banType = page.getByRole('button', { name: '밴 유형 필터', exact: true })
    await banType.click()
    await page.keyboard.press('Escape')
    assert.equal(await banType.getAttribute('aria-expanded'), 'false')
    await banType.click()
    await page.getByRole('option', { name: '기간 밴', exact: true }).click()
    await page.getByRole('button', { name: /^밴 처리 시작일,/ }).click()
    const dateDialog = page.getByRole('dialog', { name: '밴 처리 시작일', exact: true })
    await dateDialog.waitFor()
    const bounds = await dateDialog.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, 'date popover must fit viewport')
    await dateDialog.getByRole('button', { name: /년 \d+월 1일$/ }).first().click()
    await dateDialog.getByRole('button', { name: '적용', exact: true }).click()
    assert.equal((await listCalls()).length, callsBefore, 'draft input must not issue queries')
    await page.getByRole('button', { name: '조회', exact: true }).click()
    await page.waitForFunction(count => window.banQa.calls.filter(call => call.path === '/admin/users/banned').length > count, callsBefore)
    const request = (await listCalls()).at(-1).params
    assert.equal(request.keyword, '합성 사용자')
    assert.equal(request.banType, 'TEMPORARY')
    assert.equal(request.page, 1)
    assert.match(request.from, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/)
    await page.getByRole('button', { name: '필터 초기화', exact: true }).click()
    await page.waitForFunction(() => window.banQa.calls.filter(call => call.path === '/admin/users/banned').at(-1).params.banType === undefined)
    assert.equal(await page.getByRole('searchbox').inputValue(), '')
    await openHistory()
    await page.getByText('합성 이력 901 페이지 1', { exact: true }).waitFor()
    await checkReleaseAlignment(page.getByRole('heading', { name: /^제재 이력 \d+건$/ }))
    const panel = page.getByRole('tabpanel')
    await panel.getByRole('button', { name: '2페이지로 이동' }).click()
    await page.getByText('합성 이력 901 페이지 2', { exact: true }).waitFor()
    assert.equal((await historyCalls()).at(-1).params.page, 2)
    await panel.getByRole('button', { name: '필터', exact: true }).click()
    await checkHover(panel.getByRole('button', { name: '제재 이력 유형 필터', exact: true }))
    await checkHover(panel.getByRole('button', { name: '제재 이력 처리 상태 필터', exact: true }))
    await checkHover(panel.getByRole('button', { name: /^제재 이력 처리 시작일,/ }))
    await checkHover(panel.getByRole('button', { name: /^제재 이력 처리 종료일,/ }))
    await checkHover(panel.getByRole('button', { name: '조회', exact: true }))
    await checkReleaseAlignment(page.getByRole('heading', { name: /^제재 이력 \d+건$/ }))
    await panel.screenshot({ path: join(output, `ban-history-hover-alignment-${width}.png`) })
    const before = (await historyCalls()).length
    await panel.getByRole('button', { name: '제재 이력 처리 상태 필터' }).click()
    await panel.getByRole('option', { name: '밴 해제', exact: true }).click()
    assert.equal((await historyCalls()).length, before)
    await panel.getByRole('button', { name: '조회', exact: true }).click()
    await page.waitForFunction(count => window.banQa.calls.filter(call => call.path.endsWith('/sanctions')).length > count, before)
    assert.equal((await historyCalls()).at(-1).params.action, 'RELEASED')
    assert.equal((await historyCalls()).at(-1).params.page, 1)
    // Selection must reset the detail tab and never expose the prior user's history.
    await page.getByRole('button', { name: /합성 사용자 902/ }).click()
    await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === '상세 정보')
    await page.getByRole('tab', { name: '제재 이력', exact: true }).click()
    await page.getByText('합성 이력 902 페이지 1', { exact: true }).waitFor()
    assert.equal(await page.getByText('합성 이력 901 페이지 1', { exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `horizontal overflow at ${width}`)
    await page.locator('#admin-main-scroll-area').evaluate(element => { element.scrollTop = 0 })
    await page.screenshot({ path: join(output, `user-ban-${width}.png`) })
    await page.getByRole('button', { name: /새 밴 처리/ }).click()
    const banDialog = page.getByRole('dialog', { name: '새 사용자 밴 처리', exact: true })
    await banDialog.waitFor()
    await page.screenshot({ path: join(output, `user-ban-dialog-${width}.png`) })
    await page.mouse.click(width - 2, height - 2)
    assert.equal(await banDialog.count(), 0)
    console.log(`UserBan filters/detail/history/pagination/target switch: ${width}×${height} PASS`)
  }
  for (const scenario of ['empty', 'history-empty', 'history-error', 'slow']) {
    await page.goto(url + '?scenario=' + scenario)
    if (scenario === 'empty') await page.getByText('표시할 밴 내역이 없습니다.', { exact: true }).waitFor()
    else {
      await openHistory()
      if (scenario === 'history-empty') await page.getByText('제재 이력이 없습니다.', { exact: true }).waitFor()
      else if (scenario === 'history-error') {
        await page.getByRole('tabpanel').getByRole('alert').waitFor()
        assert.equal(await page.getByText('제재 이력이 없습니다.', { exact: true }).count(), 0)
        await page.evaluate(() => { window.banQa.failHistory = false })
        await page.getByRole('tabpanel').getByRole('button', { name: '필터', exact: true }).click()
        await page.getByRole('tabpanel').getByRole('button', { name: '조회', exact: true }).click()
        await page.getByText('합성 이력 901 페이지 1', { exact: true }).waitFor()
      } else {
        await page.getByText('제재 이력을 불러오는 중입니다.', { exact: true }).waitFor()
        await page.evaluate(() => window.banQa.releaseHistory())
        await page.getByText('합성 이력 901 페이지 1', { exact: true }).waitFor()
      }
    }
    console.log(`UserBan ${scenario}: PASS`)
  }
  guard.assertClean()
  console.log(`Synthetic screenshots: ${output}`)
  console.log('No unexpected browser errors or real API requests; operational writes blocked.')
} finally {
  await browser?.close()
  await server.close()
}
