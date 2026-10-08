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
  async function openHistory() {
    await page.getByRole('button', { name: /합성 사용자 901/ }).click()
    await page.getByRole('tab', { name: '제재 이력', exact: true }).waitFor()
    await page.getByRole('tab', { name: '제재 이력', exact: true }).click()
  }
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.goto(url)
    await page.getByRole('button', { name: /합성 사용자 901/ }).waitFor()
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
    const panel = page.getByRole('tabpanel')
    await panel.getByRole('button', { name: '2페이지로 이동' }).click()
    await page.getByText('합성 이력 901 페이지 2', { exact: true }).waitFor()
    assert.equal((await historyCalls()).at(-1).params.page, 2)
    await panel.getByRole('button', { name: '필터', exact: true }).click()
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
