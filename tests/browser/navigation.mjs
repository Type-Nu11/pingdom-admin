import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-162-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
  plugins: [{ name: 'navigation-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== '/navigation-qa') return next()
      res.setHeader('Content-Type', 'text/html')
      const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/navigation-fixture.jsx')
      res.end(await vite.transformIndexHtml(req.url, html))
    })
  } }] })
let browser, page
try {
  await server.listen()
  browser = await chromium.launch()
  for (const width of [1280, 390]) {
    page = await browser.newPage({ viewport: { width, height: 650 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/navigation-qa`)
    const growth = page.locator('[aria-controls="admin-navigation-group-growth"]')
    await growth.focus()
    await page.keyboard.press('Enter')
    assert.equal(await growth.getAttribute('aria-expanded'), 'false')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-controls')), 'admin-navigation-group-system')
    await page.keyboard.press('Shift+Tab')
    assert.ok(await growth.evaluate(el => el === document.activeElement))
    await page.keyboard.press('Space')
    assert.equal(await growth.getAttribute('aria-expanded'), 'true')
    await page.keyboard.press('Tab')
    assert.ok(await page.getByRole('button', { name: '상점주 관리', exact: true }).evaluate(el => el === document.activeElement))
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('[data-testid="route"]').textContent === '/merchant-owners')
    await growth.focus()
    await page.keyboard.press('Space')
    assert.match(await growth.getAttribute('aria-label'), /현재 페이지 포함/)
    await page.getByRole('button', { name: '운영 이력', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('[data-testid="route"]').textContent === '/operations/history')
    assert.equal(await growth.getAttribute('aria-expanded'), 'false')
    const submenu = page.getByRole('button', { name: '장소 관리 하위 메뉴 접기' })
    await submenu.focus()
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: '장소 관리', exact: true }).focus()
    await page.keyboard.press('Enter')
    assert.equal(await page.getByRole('button', { name: '장소 관리 하위 메뉴 펼치기' }).getAttribute('aria-expanded'), 'false')
    const scroll = page.getByTestId('side-scroll')
    const axis = width > 900 ? 'scrollTop' : 'scrollLeft'
    const before = await scroll.evaluate((el, axis) => { el[axis] = 160; el.dispatchEvent(new Event('scroll')); return el[axis] }, axis)
    assert.ok(before > 0, 'fixture must actually overflow on the tested axis')
    // Trigger remount without moving focus or automatically scrolling the sidebar.
    await page.getByRole('button', { name: '재마운트' }).dispatchEvent('click')
    const after = await scroll.evaluate((el, axis) => el[axis], axis)
    assert.equal(after, before, `${width}px scroll survives remount`)
    assert.equal(await growth.getAttribute('aria-expanded'), 'false')
    await page.getByRole('button', { name: '운영 이력', exact: true }).focus()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const beforeNavigation = await scroll.evaluate((el, axis) => el[axis], axis)
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('[data-testid="route"]').textContent === '/operations/history')
    assert.equal(await scroll.evaluate((el, axis) => el[axis], axis), beforeNavigation, 'keyboard navigation keeps scroll')
    assert.equal(await page.getByRole('button', { name: '운영 이력', exact: true }).getAttribute('aria-current'), 'page')
    await page.screenshot({ path: join(output, `navigation-${width}.png`) })
    await page.reload()
    assert.equal(await growth.getAttribute('aria-expanded'), 'false')
    assert.equal(await page.getByRole('button', { name: '장소 관리 하위 메뉴 펼치기' }).getAttribute('aria-expanded'), 'false')
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`${width}px keyboard, collapsed state, routing, remount scroll PASS`)
  }
  console.log(`Screenshots: ${output}`)
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'failure.png') })
  console.error(`Screenshots: ${output}`)
  throw error
} finally { await browser?.close(); await server.close() }
