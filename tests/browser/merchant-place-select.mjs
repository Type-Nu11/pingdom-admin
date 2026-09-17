import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-place-select-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'place-selector-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url !== '/merchant/menus') return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-place-select-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api') ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/merchant/menus`)
    await page.getByRole('button').filter({ hasText: '합성 메뉴' }).click()
    const name = page.getByRole('textbox', { name: '메뉴명', exact: true })
    await name.fill('저장 전 수정 내용')
    const select = page.getByRole('combobox', { name: '메뉴를 관리할 장소 선택' })
    const requestCount = await page.evaluate(() => window.qaRequests.length)
    await select.click()
    await page.getByRole('option', { name: '연결 장소 #1', exact: true }).click()
    assert.equal(await name.inputValue(), '저장 전 수정 내용')
    await select.press('ArrowDown')
    await select.press('Enter')
    assert.equal(await name.inputValue(), '저장 전 수정 내용')
    assert.equal(await page.evaluate(() => window.qaRequests.length), requestCount)

    // Move beyond the first screen, without scrolling the surrounding page.
    await page.mouse.move(0, 0)
    await select.press('ArrowDown')
    const pageScroll = await page.evaluate(() => window.scrollY)
    for (let i = 0; i < 20; i++) await select.press('ArrowDown')
    const activeIsVisible = () => select.evaluate(element => {
      const option = document.getElementById(element.getAttribute('aria-activedescendant'))
      const list = option.parentElement
      const top = list.getBoundingClientRect().top + list.clientTop
      const rect = option.getBoundingClientRect()
      return rect.top >= top - 1 && rect.bottom <= top + list.clientHeight + 1 && list.scrollTop > 0
    })
    assert.equal(await activeIsVisible(), true)
    assert.equal(await page.evaluate(() => window.scrollY), pageScroll)
    await page.screenshot({ path: join(output, `keyboard-${width}.png`) })
    await select.press('Enter')
    await page.waitForFunction(() => window.qaRequests.includes('/merchant-owner/places/21/menus'))
    await page.getByText('새 메뉴 등록', { exact: true }).waitFor()
    assert.equal(await name.inputValue(), '')
    await select.press('ArrowDown')
    assert.equal(await activeIsVisible(), true)
    // Wrapping upward also keeps the final option visible.
    for (let i = 0; i < 21; i++) await select.press('ArrowUp')
    assert.equal(await activeIsVisible(), true)
    await select.press('Escape')
    assert.equal(await select.evaluate(el => el === document.activeElement), true)
    assert.equal(await page.getByRole('listbox').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    console.log(`PASS merchant place selector ${width}px`)
    await page.close()
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
