import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))

// 실제 빌드 산출물로 자산 URL과 Router basename이 함께 반영되는지 확인합니다.
test('root and operator builds keep asset URLs and browser router basename aligned', async () => {
  const previous = process.env.VITE_APP_BASE_PATH
  try {
    for (const base of ['/', '/operator/']) {
      process.env.VITE_APP_BASE_PATH = base
      const result = await build({ root, logLevel: 'silent', build: { write: false, minify: false } })
      const html = String(result.output.find(item => item.fileName === 'index.html').source)
      const scripts = result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n')
      assert.ok(html.includes(`src="${base}assets/`), `${base}: entry script uses the deployment base`)
      assert.ok(scripts.includes(`basename: "${base}"`), `${base}: browser router uses the same base`)
      assert.ok(scripts.includes('/api'), 'same-origin API prefix remains independent of the UI base')
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_APP_BASE_PATH
    else process.env.VITE_APP_BASE_PATH = previous
  }
})
