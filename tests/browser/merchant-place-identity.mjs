import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-place-identity-'))
const server = await createServer({ envDir: false, cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'identity-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url.startsWith('/identity-qa/') && req.url.split('?')[0] !== '/merchant') return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-place-identity-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => ['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
    await page.goto(`${base}/identity-qa/home`)
    await page.getByRole('heading', { name: '전체 매장 성과' }).waitFor()
    await page.getByText('전체 연결 장소 · 기간 제한 없는 집계입니다.', { exact: false }).waitFor()
    const select = () => page.getByRole('combobox').first()
    await select().filter({ hasText: '동일한 매장 이름' }).waitFor()
    await select().click()
    await page.getByRole('option', { name: '동일한 매장 이름 · 서울특별시 테스트로 2 · #2', exact: true }).click()
    await page.getByText('동일한 매장 이름 · #2', { exact: true }).first().waitFor()
    for (const path of ['menu', 'reviews', 'reservation', 'home']) {
      await page.getByRole('link', { name: path, exact: true }).click()
      await select().filter({ hasText: '동일한 매장 이름 · 서울특별시 테스트로 2 · #2' }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    }
    // Two cached identities plus the review screen's existing fresh detail request.
    assert.equal(await page.evaluate(() => window.qaRequests.filter(url => /^\/merchant-owner\/places\/\d+$/.test(url)).length), 3)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: join(output, `home-${width}.png`), fullPage: true })
    await page.goto(`${base}/identity-qa/home?count=1`)
    await select().filter({ hasText: '동일한 매장 이름' }).waitFor()
    await page.goto(`${base}/identity-qa/home?count=0`)
    await page.getByRole('button', { name: '기존 장소 신청', exact: true }).waitFor()
    assert.equal(await page.getByRole('combobox').count(), 0)
    await page.goto(`${base}/identity-qa/home?fail`)
    const retry = page.getByRole('button', { name: '매장 정보 다시 조회', exact: true }).first()
    await retry.waitFor()
    await page.evaluate(() => { window.qaFail = false })
    await retry.click()
    await select().click()
    await page.getByRole('option', { name: '동일한 매장 이름 · 서울특별시 테스트로 2 · #2', exact: true }).waitFor()
    await select().press('Escape')
    assert.equal(await page.getByRole('listbox').count(), 0)
    assert.deepEqual(errors, [])
    console.log(`PASS identity screens, 0/1/2 places and retry ${width}x${height}`)
    await page.close()
  }
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return ['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) && !url.pathname.startsWith('/api') ? route.continue() : route.abort()
    })
    for (const nameCase of ['normal', 'latin', 'korean']) {
      await page.goto(`${base}/merchant?name=${nameCase}`)
      const name = await page.evaluate(() => window.qaPlaceName)
      await page.getByRole('heading', { name: `${name} · #1`, exact: true }).waitFor()
      await page.evaluate(() => document.fonts.ready)
      const row = page.getByText('장소 연결', { exact: true }).locator('../..')
      const value = row.locator(':scope > span')
      assert.equal(await value.textContent(), `${name} · #1`, 'full name and ID remain available')
      const bounds = await row.evaluate(element => {
        const rowRect = element.getBoundingClientRect()
        const description = element.querySelector(':scope > div').getBoundingClientRect()
        const value = element.querySelector(':scope > span')
        const textRect = value.getBoundingClientRect()
        return { rowWidth: rowRect.width, descriptionWidth: description.width, inside: textRect.left >= rowRect.left && textRect.right <= rowRect.right + 1, wrapped: value.scrollWidth <= value.clientWidth + 1 }
      })
      assert.equal(bounds.inside, true, `${nameCase} value stays inside its row at ${width}px`)
      assert.equal(bounds.wrapped, true, `${nameCase} value has no horizontal text overflow`)
      assert.ok(bounds.descriptionWidth >= bounds.rowWidth * 0.35, 'description is not squeezed into a narrow column')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.equal(await page.locator('#merchant-main-scroll-area').evaluate(element => element.scrollWidth > element.clientWidth), false)
      await row.scrollIntoViewIfNeeded()
      await page.screenshot({ path: join(output, `identity-row-${nameCase}-${width}.png`) })
    }
    assert.deepEqual(errors, [])
    console.log(`PASS full merchant layout, normal/long Latin/Korean names ${width}x${height}`)
    await page.close()
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
