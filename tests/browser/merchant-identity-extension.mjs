import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createIdentityQaServer } from './merchant-identity-extension-server.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'

const { server, base, output } = await createIdentityQaServer()
let browser
const details = () => window.qaRequests.filter(config => /^\/merchant-owner\/places\/\d+$/.test(config.url)).length
try {
  browser = await chromium.launch()
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const guard = await guardBrowserPage(page, base, event => (page.url().includes('product-error') && (
      event.kind === 'fixture-api' && event.method === 'GET' && event.path === '/merchant-owner/verified-boost-products' &&
      event.status === 0 && event.text === 'Synthetic product failure' ||
      event.kind === 'console' && event.level === 'error' && event.text.startsWith('상점주 Verified Boost 상품 목록 조회 실패 Error: Synthetic product failure'))) || (page.url().includes('?fail') &&
      event.kind === 'fixture-api' && event.method === 'GET' && event.path === '/merchant-owner/places/2' &&
      event.status === 0 && event.text === 'Synthetic detail failure'))
    const summary = scope => scope.locator('[aria-label="장소 #2 정보"]')
    const noOverflow = async scope => {
      const bounds = await scope.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }))
      assert.ok(bounds.scroll <= bounds.client + 1, `container overflow at ${width}: ${JSON.stringify(bounds)}`)
      for (const text of await scope.locator('[aria-label="장소 #2 정보"] strong, [aria-label="장소 #2 정보"] small').all()) {
        assert.equal(await text.evaluate(element => element.scrollWidth > element.clientWidth + 1), false, 'identity text wraps completely')
      }
    }
    await page.goto(`${base}/merchant/verified-boost?long`)
    const qaData = await page.evaluate(() => window.qaData)
    await summary(page).first().getByText(qaData.name, { exact: true }).waitFor()
    assert.equal(await page.evaluate(details), 2)
    await noOverflow(page.locator('#merchant-main-scroll-area'))
    await page.screenshot({ path: join(output, `boost-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: '상품 선택', exact: true }).click()
    const dialog = () => page.getByRole('dialog')
    const select = dialog().getByRole('combobox', { name: '적용 장소' })
    await page.mouse.move(0, 0)
    await select.focus(); await select.press('ArrowDown'); await select.press('ArrowDown')
    assert.equal((await page.getByRole('listbox', { name: '적용 장소' }).innerText()).includes(qaData.address), false, 'candidate labels omit addresses')
    assert.equal(await page.getByRole('listbox', { name: '적용 장소' }).getByRole('option').nth(1).locator('span').first().evaluate(element => element.scrollWidth > element.clientWidth + 1), false, 'candidate label wraps without clipping')
    await select.press('Enter')
    await select.filter({ hasText: '#2' }).waitFor()
    assert.equal((await select.textContent()).includes(qaData.address), false, 'selected button omits address')
    assert.ok((await select.textContent()).includes(qaData.name))
    await dialog().getByText(qaData.address, { exact: true }).waitFor()
    assert.equal(await dialog().getByText(qaData.address, { exact: true }).evaluate(element => element.scrollWidth > element.clientWidth + 1), false)
    await noOverflow(dialog())
    await page.screenshot({ path: join(output, `selection-${width}.png`) })
    await select.press('ArrowDown'); await select.press('Escape')
    assert.equal(await dialog().count(), 1, 'Escape closes only the nested picker')
    assert.equal(await page.getByRole('listbox').count(), 0)
    await select.press('Escape'); assert.equal(await dialog().count(), 0)
    const stop = page.getByRole('button', { name: '집행 중단', exact: true }).nth(1)
    await stop.click(); await summary(dialog()).getByText(qaData.name, { exact: true }).waitFor()
    assert.ok((await summary(dialog()).textContent()).includes(qaData.address))
    await noOverflow(dialog())
    await page.screenshot({ path: join(output, `stop-${width}.png`) })
    await dialog().getByRole('button', { name: '돌아가기' }).click()
    assert.equal(await page.evaluate(details), 2, 'opening dialogs never rereads cached identities')
    await page.getByRole('button', { name: '정보 재확인', exact: true }).click()
    await page.getByRole('heading', { name: '정보 재확인', exact: true }).waitFor()
    await summary(page).getByText(qaData.name, { exact: true }).waitFor()
    assert.equal(await page.evaluate(details), 2, 'real Router navigation reuses provider cache')
    await noOverflow(page.locator('#merchant-main-scroll-area'))
    await page.getByRole('button', { name: '응답 작성', exact: true }).nth(1).click()
    await summary(dialog()).getByText(qaData.name, { exact: true }).waitFor()
    await dialog().getByRole('textbox', { name: '응답 내용' }).fill('합성 입력 — 제출하지 않음')
    await noOverflow(dialog())
    await page.screenshot({ path: join(output, `response-${width}.png`) })
    await dialog().getByRole('button', { name: '취소', exact: true }).click()
    const protection = page.getByRole('dialog').last()
    await protection.getByRole('button', { name: '계속 작성', exact: true }).click()
    assert.equal(await dialog().getByRole('textbox', { name: '응답 내용' }).inputValue(), '합성 입력 — 제출하지 않음')
    await dialog().getByRole('textbox', { name: '응답 내용' }).fill('')
    await dialog().getByRole('button', { name: '취소', exact: true }).click()
    assert.equal(await dialog().count(), 0)
    assert.ok(await page.evaluate(() => window.qaRequests.every(config => config.method === 'get')))

    for (const path of ['verified-boost', 'place-reverification']) {
      for (const count of [0, 1]) {
        await page.goto(`${base}/merchant/${path}?count=${count}`)
        await page.getByRole('heading', { name: path === 'verified-boost' ? 'Verified Boost 관리' : '정보 재확인', exact: true }).waitFor()
        if (count) await page.locator('[aria-label="장소 #1 정보"]').first().getByText('같은 매장명', { exact: true }).waitFor()
        else await page.getByText(path === 'verified-boost' ? '관리 권한이 연결된 장소가 없어 상품을 선택할 수 없습니다.' : '현재 확인할 재확인 요청이 없습니다.', { exact: true }).waitFor()
        assert.equal(await page.evaluate(details), count)
      }
      await page.goto(`${base}/merchant/${path}?fail`)
      await summary(page).first().getByText('장소 #2 · 조회 실패', { exact: true }).waitFor()
      await page.getByRole('button', { name: path === 'verified-boost' ? '집행 중단' : '응답 작성', exact: true }).nth(1).click()
      await page.evaluate(() => { window.qaFail = false })
      await dialog().getByRole('button', { name: '장소 #2 정보 다시 조회', exact: true }).click()
      await summary(dialog()).getByText('같은 매장명', { exact: true }).waitFor()
      assert.equal(await page.evaluate(details), 3)
      await dialog().getByRole('button', { name: '닫기', exact: true }).click()
    }
    const noProductsMessage = '현재 선택 가능한 Verified Boost 상품이 없습니다.'
    for (const scenario of ['no-products&no-selections', 'no-selections', 'no-products', 'product-error&no-selections']) {
      await page.goto(`${base}/merchant/verified-boost?count=1&${scenario}`)
      const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: '선택한 부스트', exact: true }) })
      const message = scenario.includes('product-error') ? '선택 가능한 Verified Boost 상품을 불러오지 못했습니다.'
        : scenario.includes('no-products') ? noProductsMessage : '선택된 Verified Boost가 없습니다.'
      await panel.getByText(message, { exact: true }).waitFor()
      assert.equal(await panel.getByText(message, { exact: true }).count(), 1, 'availability guidance appears once')
      assert.equal(await panel.getByRole('button', { name: '상품 선택', exact: true }).isDisabled(), scenario !== 'no-selections')
      if (scenario.includes('no-selections')) {
        assert.equal(await panel.getByText('선택된 Verified Boost가 없습니다.', { exact: true }).count(), scenario === 'no-selections' ? 1 : 0, 'no duplicate empty notice')
        const empty = panel.getByText(message, { exact: true }).locator('..')
        assert.equal(await empty.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', 'empty state inherits the panel background')
        await noOverflow(panel)
      } else {
        await panel.getByRole('button', { name: '집행 중', exact: true }).waitFor()
        assert.equal(await panel.locator('[aria-label="장소 #1 정보"]').count(), 1, 'existing selections stay visible without catalog products')
      }
      if (scenario === 'no-products&no-selections') await page.screenshot({ path: join(output, `boost-empty-${width}.png`), fullPage: true })
      assert.ok(await page.evaluate(() => window.qaRequests.every(config => config.method === 'get')))
    }
    guard.assertClean()
    console.log(`PASS identity extension: real layout/navigation, long text, keyboard, modals, 0/1/2 places, retry ${width}x${height}`)
    await page.close()
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
