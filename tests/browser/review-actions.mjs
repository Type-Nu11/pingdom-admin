import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-167-'))
const server = await createServer({ cacheDir: join(output, 'vite-cache'), server: { port: 0, host: '127.0.0.1', open: false },
  plugins: [{ name: 'review-actions-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/review-qa')) return next()
      res.setHeader('Content-Type', 'text/html')
      const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/attachment-fixture.jsx')
      res.end(await vite.transformIndexHtml(req.url, html))
    })
  } }] })
let browser
let activePage
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  console.log(`Screenshots: ${output}`)
  for (const [width, height] of [[1280, 800], [1280, 600], [390, 800], [390, 600]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    activePage = page
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/review-qa?review=1`)
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button').filter({ hasText: '합성 장소 1' }).click()
    const actions = page.locator('footer[aria-label="장소 신청 심사 작업"]')
    await actions.getByRole('button', { name: '승인', exact: true }).waitFor()
    await actions.scrollIntoViewIfNeeded()
    const measure = () => actions.evaluate(el => {
      const body = el.previousElementSibling
      const a = el.getBoundingClientRect(), b = body.getBoundingClientRect()
      return { top: a.top, bottom: a.bottom, bodyHeight: b.height, bodyBottom: b.bottom, overflow: document.documentElement.scrollWidth > innerWidth }
    })
    const before = await measure()
    await actions.evaluate(el => { const body = el.previousElementSibling; body.scrollTop = body.scrollHeight })
    await page.screenshot({ path: join(output, `review-${width}-${height}.png`) })
    const after = await measure()
    console.log(width, height, after)
    assert.ok(after.bodyHeight >= 120, 'detail body retains a usable reading area')
    assert.ok(after.bodyBottom <= after.top + 1, 'actions must not cover the body')
    assert.ok(after.top >= 0 && after.bottom <= height + 1, 'actions are reachable within the viewport')
    assert.ok(Math.abs(before.top - after.top) < 1, 'body scrolling must not move actions')
    assert.equal(after.overflow, false)
    assert.ok(await actions.evaluate(el => {
      const body = el.previousElementSibling
      const last = [...body.querySelectorAll('button')].at(-1)
      return !last || (last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 1 && last.getBoundingClientRect().top >= body.getBoundingClientRect().top)
    }), 'last attachment remains accessible')
    await actions.getByRole('button', { name: '승인', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.getByRole('button').filter({ hasText: '합성 장소 2' }).click()
    await actions.getByText('읽기 전용', { exact: false }).waitFor()
    assert.equal(await actions.getByRole('button').count(), 0)
    await page.close()
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: join(output, 'failure.png') })
  throw error
} finally { await browser?.close(); await server.close() }
