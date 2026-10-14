import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))

test('root and operator production builds align router, images, favicon, PDF and API URLs', async () => {
  const keys = ['VITE_APP_BASE_PATH', 'VITE_PUBLIC_API_BASE_URL', 'VITE_NAVER_MAP_CLIENT_ID']
  const previous = keys.map(key => process.env[key])
  try {
    process.env.VITE_PUBLIC_API_BASE_URL = '/api'
    process.env.VITE_NAVER_MAP_CLIENT_ID = 'qa-public-client-id'
    for (const base of ['/', '/operator/']) {
      process.env.VITE_APP_BASE_PATH = base
      const result = await build({ root, logLevel: 'silent', build: { write: false, minify: false } })
      const html = String(result.output.find(item => item.fileName === 'index.html').source)
      const scripts = result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n')
      assert.ok(html.includes(`src="${base}assets/`), 'entry asset has deployment base')
      assert.ok(html.includes(`href="${base}favicon.svg"`), 'public favicon has deployment base')
      assert.ok(scripts.includes(`basename: "${base}"`), 'router has the same deployment base')
      assert.ok(scripts.includes(`${base}pdfjs/cmaps/`), 'Korean PDF CMaps use deployment base')
      const workers = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.mjs'))
      assert.ok(workers.length > 0)
      for (const worker of workers) assert.ok(scripts.includes(`${base}${worker.fileName}`))
      const images = result.output.filter(item => item.type === 'asset' && item.fileName.endsWith('.svg') && item.fileName.startsWith('assets/'))
      assert.ok(images.length > 0)
      for (const image of images) assert.ok(scripts.includes(encodeURI(`${base}${image.fileName}`)), image.fileName)
      assert.ok(scripts.includes(`${base}pingdom-logo.png`), 'logos use the public deployment base')
      assert.ok(scripts.includes('"/api"'), 'API prefix does not become /operator/api')
    }
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index] })
  }
})
