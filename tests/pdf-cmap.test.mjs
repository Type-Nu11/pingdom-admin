import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { build, createServer } from 'vite'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const server = await createServer({ base: '/admin/', server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { getPdfDocumentOptions } = await server.ssrLoadModule('/src/utils/pdfDocumentOptions.ts')
const { pdfCMapAssets } = await server.ssrLoadModule('/build/pdfCMapAssets.ts')
const built = await build({
  configFile: false,
  logLevel: 'silent',
  base: '/admin/',
  plugins: [pdfCMapAssets()],
  build: {
    write: false,
    rollupOptions: { input: fileURLToPath(new URL('../src/utils/pdfDocumentOptions.ts', import.meta.url)) },
  },
})
const assets = new Map(built.output.filter(item => item.type === 'asset').map(item => [item.fileName, item.source]))
const http = createHttpServer(server.middlewares)
await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${http.address().port}`
after(async () => {
  await new Promise(resolve => http.close(resolve))
  await server.close()
})

// A predefined Korean CMap is required to decode these characters (가나다).
function koreanPdf() {
  const stream = 'BT /F1 24 Tf 20 100 Td <AC00B098B2E4> Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [5 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYSMyeongJo-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 1 >> /FontDescriptor 6 0 R /DW 1000 >>',
    '<< /Type /FontDescriptor /FontName /HYSMyeongJo-Medium /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 900 /Descent -200 /CapHeight 700 /StemV 80 >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let body = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += 'xref\n0 8\n0000000000 65535 f \n'
  body += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(body)
}

async function extractText(options) {
  const task = getDocument({ data: koreanPdf(), verbosity: 0, ...options })
  try {
    const document = await task.promise
    const page = await document.getPage(1)
    return (await page.getTextContent()).items.map(item => item.str).join('')
  } finally {
    await task.destroy()
  }
}

test('CMap options respect the deployment base and assets include license', () => {
  assert.deepEqual(getPdfDocumentOptions('blob:example'), {
    url: 'blob:example', cMapUrl: '/admin/pdfjs/cmaps/', cMapPacked: true,
  })
  for (const name of ['UniKS-UCS2-H.bcmap', 'Adobe-Korea1-UCS2.bcmap', 'LICENSE']) {
    assert.ok(assets.get(`pdfjs/cmaps/${name}`)?.length)
  }
})

test('development serves the same CMap bytes as production under the base path', async () => {
  const response = await fetch(`${origin}/admin/pdfjs/cmaps/UniKS-UCS2-H.bcmap`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/octet-stream')
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array(assets.get('pdfjs/cmaps/UniKS-UCS2-H.bcmap')))
  assert.equal((await fetch(`${origin}/admin/pdfjs/cmaps/missing.bcmap`)).status, 404)
})

test('Korean PDF regression fixture loses text without CMaps', async () => {
  assert.equal(await extractText({}), '')
})

test('Korean PDF decodes using emitted production assets and application options', async () => {
  const { url: _url, ...options } = getPdfDocumentOptions('blob:example')
  const fetched = []
  class EmittedAssetFactory {
    constructor({ cMapUrl }) { this.base = cMapUrl }
    async fetch({ kind, filename }) {
      assert.equal(kind, 'cMapUrl')
      const path = `${this.base}${filename}`.replace(/^\/admin\//, '')
      fetched.push(path)
      const source = assets.get(path)
      assert.ok(source, `missing emitted CMap: ${path}`)
      return new Uint8Array(source)
    }
  }
  assert.equal(await extractText({ ...options, BinaryDataFactory: EmittedAssetFactory }), '가나다')
  assert.ok(fetched.includes('pdfjs/cmaps/UniKS-UCS2-H.bcmap'))
})
