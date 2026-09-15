import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

// Synthetic two-page Korean PDF; no customer documents or credentials are used.
function pdf() {
  const stream = '0.2 0.6 0.3 rg 20 20 180 40 re f BT /F1 24 Tf 20 100 Td <AC00B098B2E4> Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 8 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [5 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYSMyeongJo-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 1 >> /FontDescriptor 6 0 R /DW 1000 >>',
    '<< /Type /FontDescriptor /FontName /HYSMyeongJo-Medium /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 900 /Descent -200 /CapHeight 700 /StemV 80 >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => { const offset = body.length; body += `${index + 1} 0 obj\n${object}\nendobj\n`; return offset })
  const xref = body.length
  body += `xref\n0 9\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return body
}
const output = await mkdtemp(join(tmpdir(), 'pingdom-166-'))
const server = await createServer({ cacheDir: join(output, 'vite-cache'), server: { port: 0, host: '127.0.0.1', strictPort: false, open: false },
  plugins: [{ name: 'synthetic-attachment-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url === '/synthetic.pdf') { res.setHeader('Content-Type', 'application/pdf'); res.end(pdf()); return }
      if (req.url !== '/attachment-qa') return next()
      res.setHeader('Content-Type', 'text/html')
      const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/attachment-fixture.jsx')
      res.end(await vite.transformIndexHtml(req.url, html))
    })
  } }] })
let browser
let activePage
try {
  await server.listen()
  console.log(`Fixture: http://127.0.0.1:${server.httpServer.address().port}/attachment-qa; screenshots: ${output}`)
  browser = await chromium.launch({ headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    activePage = page
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api')) || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname) ? route.continue() : route.abort()
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/attachment-qa`)
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button').filter({ hasText: '합성 장소 1' }).click()
    const open = page.getByRole('button', { name: '미리보기', exact: true })
    await open.first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('img').waitFor()
    assert.ok(await dialog.getByRole('img').evaluate(img => img.complete && img.naturalWidth === 640))
    await page.screenshot({ path: join(output, `image-${width}.png`) })
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), 'dialog content must not overflow horizontally')
    await dialog.getByRole('button', { name: '확대', exact: true }).focus()
    await page.keyboard.press('Enter')
    assert.equal(await dialog.getByLabel('확대 비율').textContent(), '125%')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Enter')
    assert.equal(await dialog.getByLabel('확대 비율').textContent(), '200%')
    assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)))
    for (let i = 0; i < 6; i++) {
      await dialog.getByRole('button', { name: '축소', exact: true }).focus()
      await page.keyboard.press('Enter')
    }
    assert.equal(await dialog.getByLabel('확대 비율').textContent(), '50%')
    assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)))
    await dialog.getByRole('button', { name: '닫기', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    assert.ok(await dialog.getByRole('region').evaluate(el => el === document.activeElement))
    await page.keyboard.press('Tab')
    assert.ok(await dialog.getByRole('button', { name: '닫기', exact: true }).evaluate(el => el === document.activeElement))
    await dialog.getByRole('button', { name: '다운로드', exact: true }).focus()
    const downloaded = page.waitForEvent('download')
    await page.keyboard.press('Enter')
    assert.ok((await downloaded).suggestedFilename().endsWith('.png'))
    await page.keyboard.press('Escape')
    assert.ok(await open.first().evaluate(el => el === document.activeElement))
    await open.nth(1).click()
    await page.waitForFunction(() => document.querySelector('[aria-label="증빙 PDF"]')?.getAttribute('aria-busy') === 'false')
    const pixels = await dialog.locator('canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data].filter((n, i) => i % 4 !== 3 && n < 200).length)
    assert.ok(pixels > 100, 'PDF canvas is nonblank')
    await dialog.getByRole('button', { name: '다음 페이지' }).focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('2페이지') && document.querySelector('[aria-label="증빙 PDF"]')?.getAttribute('aria-busy') === 'false')
    await page.screenshot({ path: join(output, `pdf-${width}.png`) })
    await dialog.getByRole('button', { name: '이전 페이지' }).focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('1페이지') && document.querySelector('[aria-label="증빙 PDF"]')?.getAttribute('aria-busy') === 'false')
    assert.ok(await dialog.getByRole('region').evaluate(el => el === document.activeElement))
    await dialog.getByRole('button', { name: '다운로드', exact: true }).focus()
    const pdfDownload = page.waitForEvent('download')
    await page.keyboard.press('Enter')
    assert.equal((await pdfDownload).suggestedFilename(), 'synthetic-korean.pdf')
    await dialog.getByRole('region').focus()
    await page.keyboard.press('Escape')
    for (const [index, message] of [[2, '파일이 손상'], [3, '열람할 권한'], [4, '지원하지 않는'], [5, '파일이 손상']]) {
      await open.nth(index).click()
      await dialog.getByText(message, { exact: false }).waitFor()
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))
      await page.keyboard.press('Escape')
    }
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`${width}px: image, PDF, keyboard, download, error states PASS`)
  }
  console.log(`Screenshots: ${output}`)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: join(output, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await server.close()
}
