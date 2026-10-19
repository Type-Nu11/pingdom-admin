import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'
import { guardBrowserPage } from '../helpers/browser-regression-guard.mjs'
import { measureElementContrast as measure } from '../helpers/element-contrast.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-web-design-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { port: 0, host: '127.0.0.1' }, plugins: [{ name: 'web-design-qa', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/__qa/web-design')) return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/web-design-system-fixture.jsx')))
  })
} }] })
let browser
try {
  await server.listen(); browser = await chromium.launch()
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const guard = await guardBrowserPage(page, origin)
    await page.goto(`${origin}/__qa/web-design`)
    await page.getByTestId('admin-title').waitFor()
    for (const [id, size, weight] of [['admin-title', 28, 700], ['merchant-title', 28, 700], ['surface-title', 28, 700], ['panel-title', 18, 700], ['admin-nav', 14, 700], ['merchant-nav', 14, 700], ['merchant-input', 14, 400], ['hint', 12, 400], ['badge', 12, 700]]) {
      const css = await page.getByTestId(id).evaluate(el => { const s = getComputedStyle(el); return { size: parseFloat(s.fontSize), weight: Number(s.fontWeight) } })
      assert.deepEqual(css, { size, weight }, `${id} at ${width}`)
    }
    assert.equal(await page.getByTestId('marker').evaluate(el => getComputedStyle(el).color), 'rgb(255, 25, 86)')
    assert.equal(await page.getByTestId('draft').evaluate(el => getComputedStyle(el).color), 'rgb(92, 5, 199)')
    assert.equal(await page.getByTestId('primary').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 25, 86)')
    for (const id of ['admin-nav', 'merchant-nav']) assert.equal(await page.getByTestId(id).evaluate(el => getComputedStyle(el).color), 'rgb(255, 25, 86)')
    const brandContrast = (await page.getByTestId('primary').evaluate(measure)).ratio
    assert.ok(brandContrast >= 3 && brandContrast < 4.5, 'Record the explicit main-color contrast limitation')
    for (const locator of [page.getByTestId('badge'), page.getByTestId('draft'), ...await page.getByRole('alert').all(), ...await page.getByRole('status').all()]) {
      assert.ok((await locator.evaluate(measure)).ratio >= 4.5, await locator.textContent())
    }
    await page.getByTestId('merchant-input').fill('수정한 가게')
    await page.getByTestId('primary').click()
    const modal = page.getByRole('dialog', { name: '입력 내용 확인' })
    await modal.waitFor()
    const box = await modal.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height)
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
    await page.keyboard.press('Escape')
    await modal.waitFor({ state: 'hidden' })
    assert.equal(await page.getByTestId('merchant-input').inputValue(), '수정한 가게')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(output, `design-${width}.png`), fullPage: true })
    guard.assertClean(); await page.close()
    console.log(`PASS named typography, palette, contrast, input/modal: ${width}×${height}`)
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
