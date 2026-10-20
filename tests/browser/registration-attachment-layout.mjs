import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { createServer } from '../helpers/isolated-vite.mjs'

const output = await mkdtemp(join(tmpdir(), 'pingdom-attachment-layout-'))
const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'attachment-layout-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/draft-qa')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-draft-fixture.jsx')))
    })
  },
}] })
let browser
try {
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch()
  for (const width of [1449, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.origin === base && !url.pathname.startsWith('/api/') ? route.continue() : route.abort()
    })
    await page.goto(base + '/draft-qa?new&fresh')
    await page.getByRole('button', { name: '새 장소 등록 신청', exact: true }).click()
    const type = page.getByRole('button', { name: '증빙 파일 종류', exact: true })
    const file = page.locator('input[type="file"]')
    const picker = file.locator('..')
    const add = page.getByRole('button', { name: '파일 추가', exact: true })
    async function checkHeight() {
      const rects = await Promise.all([type, picker, add].map(control => control.boundingBox()))
      assert.deepEqual(rects.map(rect => rect.height), [50, 50, 50])
      assert.equal(rects[1].y, rects[2].y, 'file selection and add button align')
      if (width > 400) assert.equal(rects[0].y, rects[1].y, 'all three controls align on desktop')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    }
    await type.scrollIntoViewIfNeeded()
    await checkHeight()
    for (const label of ['신분증', '대표 이미지', '사업자등록증']) {
      await type.click()
      await page.getByRole('option', { name: label, exact: true }).click()
      await checkHeight()
    }
    const filename = '사업자등록증_파일명이_길어도_전체_안내에서_확인할_수_있는_테스트_파일.png'
    await file.setInputFiles({ name: filename, mimeType: 'image/png', buffer: Buffer.from('synthetic layout test') })
    await checkHeight()
    assert.ok((await picker.locator('..').innerText()).includes(filename), 'complete filename is available below the compact picker')
    assert.equal(await add.isEnabled(), true)
    assert.deepEqual(await page.evaluate(() => window.qaCalls.filter(call => call.method !== 'get')), [], 'no business writes during layout QA')
    assert.deepEqual(errors, [])
    await picker.locator('..').screenshot({ path: join(output, `attachment-${width}.png`) })
    await page.close()
    console.log(`${width}px: aligned 50px controls, all document types, long filename and no overflow PASS`)
  }
  console.log(`Screenshots: ${output}`)
} finally { await browser?.close(); await server.close() }
