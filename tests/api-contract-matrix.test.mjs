import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'

const rows = JSON.parse(execFileSync('python3', ['-c', 'import csv,json; print(json.dumps(list(csv.DictReader(open("docs/web-api-contract-matrix.csv")))))'], { encoding: 'utf8' }))
const key = (method, path) => `${method.toUpperCase()} ${path}`
const current = ['admin', 'merchant'].flatMap(group => {
  const doc = JSON.parse(readFileSync(`docs/openapi/${group}.json`, 'utf8'))
  return Object.entries(doc.paths).flatMap(([path, methods]) => Object.keys(methods).filter(m => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).map(m => key(m, path)))
})
test('matrix covers each documented Admin and Merchant operation exactly once', () => {
  const documented = rows.filter(r => r.canonical_status.endsWith(': documented')).map(r => key(r.method, r.path))
  assert.deepEqual(documented.sort(), current.sort())
  assert.equal(new Set(documented).size, documented.length)
})
test('missing and alternate APIs are distinct from implemented flows', () => {
  const row = (method, path) => rows.find(r => key(r.method, r.path) === key(method, path))
  assert.equal(row('GET', '/admin/dashboard/pending-items').issue, '#206')
  assert.equal(row('GET', '/admin/dashboard/pending-items').status, 'missing')
  assert.equal(row('GET', '/merchant-owner/places/{placeId}/menus/{menuId}').status, 'alternative')
  assert.equal(row('PATCH', '/merchant-owner/places/{placeId}/media/{mediaId}').status, 'implemented')
  assert.match(row('PATCH', '/merchant-owner/places/{placeId}/media/{mediaId}').confirmation, /displayOrder/)
  assert.equal(row('GET', '/users/me/merchant-verification').status, 'blocked')
})
test('unused Claim code is removed without removing onboarding or unified applications', () => {
  const api = readFileSync('src/api/merchantStoreApi.ts', 'utf8')
  assert.doesNotMatch(api, /MerchantPlaceClaim|\/place-claims/)
  assert.doesNotMatch(readFileSync('src/types/merchantStore.types.ts', 'utf8'), /MerchantPlaceClaim/)
  assert.match(readFileSync('src/api/merchantOnboardingApi.ts', 'utf8'), /merchant-verification/)
  assert.match(readFileSync('src/api/merchantPlaceApplicationApi.ts', 'utf8'), /merchant-place-applications/)
})
test('source inventory resolves helper paths and dynamic actions', () => {
  const inventory = JSON.parse(execFileSync('node', ['scripts/api-source-inventory.mjs'], { encoding: 'utf8' }))
  assert.ok(inventory.some(r => r.path === '/admin/users/{userId}/roles' && r.callers.length))
  assert.ok(inventory.some(r => r.path === '/users/me/merchant-place-applications' && r.callers.length))
  const gaps = JSON.parse(readFileSync('docs/openapi/source-contract-gaps.json', 'utf8'))
  assert.ok(gaps.some(r => r.path === '/users/me/merchant-verification'))
  assert.ok(!gaps.some(r => r.path.includes('/roles')))
})
