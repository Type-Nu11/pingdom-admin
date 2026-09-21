import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const output = await mkdtemp(join(tmpdir(), 'pingdom-172-'))
// Compare the pre-#190 inspector within the same current page shell and data.
const baseline = execFileSync('git', ['show', 'f09c4cb9135d6b9ac949eeb31f3dbf0424d15d7f:src/components/place/PlaceInspector.tsx'], { encoding: 'utf8' })
const measurements = new Map()
let browser, server, page
try {
  browser = await chromium.launch()
  console.log(`Screenshots: ${output}`)
  for (const mode of ['before', 'after']) {
    server = await createServer({ cacheDir: join(output, mode), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
      name: 'place-qa', enforce: 'pre',
      resolveId(source) {
        if (source.endsWith('/map/NaverMap')) return resolve('tests/browser/place-map-fixture.jsx')
      },
      load(id) {
        if (mode === 'before' && id.endsWith('/src/components/place/PlaceInspector.tsx')) return baseline
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url !== '/place-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/place-inspector-fixture.jsx')
          res.end(await vite.transformIndexHtml(req.url, html))
        })
      },
    }] })
    await server.listen()
    for (const [width, height] of [[1280, 800], [1280, 600], [390, 800], [390, 600]]) {
      page = await browser.newPage({ viewport: { width, height } })
      page.setDefaultTimeout(10000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/missing-qa-image.png') return route.fulfill({ status: 404, body: '' })
        return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
      })
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/place-qa`)
      await page.locator('[aria-label="장소 목록"] button').first().click()
      const panel = page.locator('aside').filter({ has: page.getByRole('button', { name: '장소 상세 닫기' }) })
      const hours = panel.getByRole('button', { name: '영업시간 수정', exact: true })
      await hours.waitFor()
      await page.evaluate(() => document.fonts.ready)
      await panel.scrollIntoViewIfNeeded()
      const metrics = await hours.evaluate(button => {
        let body = button.parentElement
        while (body && getComputedStyle(body).overflowY !== 'auto') body = body.parentElement
        body.scrollTop = 0
        const b = button.getBoundingClientRect(), r = body.getBoundingClientRect()
        return { neededScroll: Math.max(0, Math.ceil(b.bottom - r.bottom)), bodyHeight: r.height, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      const key = `${width}x${height}`
      console.log(mode, key, metrics)
      await page.screenshot({ path: join(output, `${mode}-${key}.png`) })
      if (mode === 'before') measurements.set(key, metrics)
      else {
        assert.ok(metrics.neededScroll < measurements.get(key).neededScroll, 'operations require less scrolling')
        assert.equal(metrics.overflow, false)
        assert.ok(metrics.bodyHeight >= 120)
        assert.equal(await panel.locator('details').evaluate(el => el.open), false)
        const image = panel.getByRole('button', { name: '대표 이미지 확대' })
        await image.focus(); await page.keyboard.press('Enter')
        await page.getByRole('dialog').waitFor()
        await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
        assert.ok(await page.getByRole('dialog').locator('img').evaluate(el => el.complete && el.naturalWidth > 0))
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
        assert.ok(await image.evaluate(el => el === document.activeElement))
        await panel.getByRole('button', { name: '위치 보기' }).click()
        assert.equal(await page.evaluate(() => window.qaMapFocus.latitude), 37.01)
        await hours.click()
        await page.getByRole('dialog').waitFor()
        await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
        await panel.locator('summary').click()
        assert.equal(await panel.locator('details').evaluate(el => el.open), true)
        await page.getByRole('button', { name: '장소 삭제', exact: true }).click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor()
        const deletion = dialog.getByRole('button', { name: '삭제하기', exact: true })
        assert.ok(await deletion.isDisabled())
        await dialog.getByRole('textbox', { name: '삭제할 장소 ID 확인' }).fill('2')
        assert.ok(await deletion.isDisabled())
        await dialog.getByRole('textbox', { name: '삭제할 장소 ID 확인' }).fill('1')
        assert.ok(await deletion.isEnabled())
        await dialog.getByRole('button', { name: '취소', exact: true }).click()
        await dialog.waitFor({ state: 'hidden' })
        await panel.getByRole('button', { name: '장소 상세 닫기' }).click()
        await page.getByRole('button', { name: '지도 대상 2', exact: true }).click()
        await panel.getByText('대표 이미지 없음', { exact: true }).waitFor()
        assert.equal(await page.getByTestId('map').getAttribute('data-selected'), '2')
        assert.equal(await panel.locator('details').evaluate(el => el.open), false)
        assert.ok(await page.locator('[aria-label="장소 목록"] button').nth(1).getAttribute('aria-pressed') === 'true')
        await panel.scrollIntoViewIfNeeded()
        assert.equal(await panel.evaluate(el => el.scrollWidth > el.clientWidth), false)
        await page.screenshot({ path: join(output, `long-name-${key}.png`) })
        await panel.getByRole('button', { name: '위치 보기' }).click()
        assert.equal(await page.evaluate(() => window.qaMapFocus.latitude), 37.02)
        assert.ok((await page.evaluate(() => window.qaRequests)).every(req => req.method === 'get'))
      }
      assert.deepEqual(errors, [])
      await page.close()
    }
    await server.close(); server = null
  }
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'failure.png') })
  throw error
} finally { await browser?.close(); await server?.close() }
