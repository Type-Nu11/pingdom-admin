import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { normalizeAppBasePath, browserPathToAppPath } = await server.ssrLoadModule('/src/utils/appBasePath.ts')
after(() => server.close())

test('deployment base defaults to root and normalizes one trailing slash', () => {
  for (const [value, expected] of [[undefined, '/'], ['', '/'], ['/', '/'], ['/operator', '/operator/'], ['/operator/', '/operator/'], ['/team/operator', '/team/operator/']]) {
    assert.equal(normalizeAppBasePath(value), expected)
  }
})

test('external, ambiguous, traversal and API-overlapping deployment bases fail closed', () => {
  for (const value of ['operator', '//operator/', '/operator//', '/operator/../', '/./', '/%2f/', '/operator?x=1', '/operator#x', '/operator\\', ' /operator/', '/한글/', 'https://evil.invalid/', '/api/', '/API/ui/', '/auth/', '/swagger-ui/', '/v3/']) {
    assert.throws(() => normalizeAppBasePath(value), /VITE_APP_BASE_PATH/, value)
  }
})

test('long invalid deployment bases fail promptly without blocking startup', () => {
  // A separate process bounds runtime even if a future regex regresses.
  const moduleUrl = new URL('../src/utils/appBasePath.ts', import.meta.url).href
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    import { normalizeAppBasePath } from ${JSON.stringify(moduleUrl)}
    const segment = 'a'.repeat(20000)
    assert.equal(normalizeAppBasePath('/' + segment), '/' + segment + '/')
    for (const suffix of ['.v2/', '?x=1', '#x', '//']) {
      assert.throws(() => normalizeAppBasePath('/' + segment + suffix), /VITE_APP_BASE_PATH/)
    }
    assert.throws(() => normalizeAppBasePath('/pingdom-admin-production-operator.v2/'), /VITE_APP_BASE_PATH/)
  `], { timeout: 2000, stdio: 'pipe' })
})

test('browser paths lose exactly one matching basename and preserve search parameters', () => {
  assert.equal(browserPathToAppPath('/operator/places?placeId=8', '/operator/'), '/places?placeId=8')
  assert.equal(browserPathToAppPath('/operator?x=1', '/operator/'), '/?x=1')
  assert.equal(browserPathToAppPath('/operator/operator/places', '/operator/'), '/operator/places')
  assert.equal(browserPathToAppPath('/places?placeId=8', '/'), '/places?placeId=8')
  for (const path of ['/operators/places', '/places', '//operator/places', 'https://evil.invalid', '/operator/places\n', '/operator\\places']) {
    assert.equal(browserPathToAppPath(path, '/operator/'), null, path)
  }
})
