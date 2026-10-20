import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-verification-layout-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'verification-layout-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/places/information-verification') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/admin-target-fixture.jsx')))
    })
  },
}] })
let browser
try {
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch()
  for (const width of [1920, 1449, 1366, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.origin === base && !url.pathname.startsWith('/api/') ? route.continue() : route.abort()
    })
    await page.goto(`${base}/places/information-verification?tab=evidence&placeId=1`)
    for (const name of ['증빙', '재확인']) {
      await page.getByRole('tab', { name, exact: true }).click()
      const submit = page.getByRole('button', { name: '장소 조회', exact: true })
      const form = submit.locator('xpath=ancestor::form')
      const summary = form.locator('summary')
      assert.equal(await summary.locator('..').getAttribute('open'), null)
      await form.getByRole('button', { name: '장소 변경', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: /합성 장소 1 · #1/ }).click()
      await form.getByText('동명 구분용 주소', { exact: true }).waitFor()
      const geometry = await submit.evaluate(button => {
        const row = button.parentElement
        const r = row.getBoundingClientRect(), b = button.getBoundingClientRect()
        const f = row.firstElementChild.getBoundingClientRect()
        return { remaining: r.right - b.right, fieldWidth: f.width, rowWidth: r.width, stacked: b.top >= f.bottom }
      })
      assert.ok(geometry.remaining < 2, 'lookup button uses the right edge rather than a capped left column')
      if (width > 640) {
        assert.ok(geometry.fieldWidth / geometry.rowWidth > 0.75, 'place selector expands with the available space')
        assert.equal(geometry.stacked, false)
      } else assert.equal(geometry.stacked, true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const closedButton = await submit.boundingBox()
      await summary.click()
      const openButton = await submit.boundingBox()
      if (width > 640) assert.ok(Math.abs(openButton.y - closedButton.y) < 1, 'expanding direct ID input must not move the desktop lookup button')
      const inputSpacing = await form.getByRole('textbox', { name: '장소 ID', exact: true }).evaluate(input => {
        const label = input.previousElementSibling.getBoundingClientRect()
        const field = input.getBoundingClientRect()
        return { gap: field.top - label.bottom, left: Math.abs(field.left - label.left) }
      })
      assert.equal(inputSpacing.gap, 6, 'ID label sits above its input with explicit spacing')
      assert.ok(inputSpacing.left < 1)
      await form.getByRole('textbox', { name: '장소 ID', exact: true }).fill('1')
      await submit.click()
      await page.waitForFunction(suffix => window.qaRequests.at(-1)?.url.endsWith(suffix), name === '증빙' ? '/information-evidence' : '/information-reverification-requests')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await form.screenshot({ path: join(output, `${name}-${width}.png`) })
      await summary.click()
      if (width > 640) assert.ok(Math.abs((await submit.boundingBox()).y - closedButton.y) < 1, 'collapsing direct input restores the same lookup position')
    }
    assert.ok((await page.evaluate(() => window.qaRequests)).every(request => request.method === 'get'))
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`${width}px: full-width lookup, collapsible ID input, responsive layout and no mutations PASS`)
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
