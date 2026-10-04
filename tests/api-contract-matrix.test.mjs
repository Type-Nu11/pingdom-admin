import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { compareDocuments } from '../scripts/refresh-openapi-snapshots.mjs'
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
  assert.equal(row('GET', '/admin/dashboard/pending-items').issue, '#207')
  assert.equal(row('GET', '/admin/dashboard/pending-items').status, 'alternative')
  assert.equal(row('DELETE', '/admin/posts/{id}/delete').status, 'excluded')
  assert.equal(row('GET', '/admin/reports/reported-users').status, 'excluded')
  assert.equal(row('GET', '/admin/report-appeals').status, 'excluded')
  assert.equal(row('GET', '/admin/posts/s3/orphans/report').status, 'implemented')
  assert.equal(row('GET', '/merchant-owner/places/{placeId}/menus/{menuId}').status, 'alternative')
  assert.equal(row('PATCH', '/merchant-owner/places/{placeId}/media/{mediaId}').status, 'implemented')
  assert.match(row('PATCH', '/merchant-owner/places/{placeId}/media/{mediaId}').confirmation, /displayOrder/)
  assert.equal(row('GET', '/users/me/merchant-verification').status, 'removed')
})
test('unused Claim code is removed without removing onboarding or unified applications', () => {
  const api = readFileSync('src/api/merchantStoreApi.ts', 'utf8')
  assert.doesNotMatch(api, /MerchantPlaceClaim|\/place-claims/)
  assert.doesNotMatch(readFileSync('src/types/merchantStore.types.ts', 'utf8'), /MerchantPlaceClaim/)
  assert.doesNotMatch(readFileSync('src/api/merchantOnboardingApi.ts', 'utf8'), /merchant-verification/)
  assert.match(readFileSync('src/api/merchantOnboardingApi.ts', 'utf8'), /merchant-owner-profile/)
  assert.match(readFileSync('src/api/merchantPlaceApplicationApi.ts', 'utf8'), /merchant-place-applications/)
})
test('source inventory resolves helper paths and dynamic actions', () => {
  const inventory = JSON.parse(execFileSync('node', ['scripts/api-source-inventory.mjs'], { encoding: 'utf8' }))
  assert.ok(inventory.some(r => r.path === '/admin/users/{userId}/roles' && r.callers.length))
  assert.ok(inventory.some(r => r.path === '/users/me/merchant-place-applications' && r.callers.length))
  const gaps = JSON.parse(readFileSync('docs/openapi/source-contract-gaps.json', 'utf8'))
  assert.ok(!gaps.some(r => r.path === '/users/me/merchant-verification'))
  assert.ok(!gaps.some(r => r.path.includes('/roles')))
})
test('new contracts reflect source connections without claiming live QA', () => {
  const row = (method, path) => rows.find(r => key(r.method, r.path) === key(method, path))
  for (const [method, path] of [
    ['GET', '/merchant-owner/availabilities'],
    ['PUT', '/merchant-owner/availabilities/{availabilityId}/reservation-terms'],
  ]) {
    assert.equal(row(method, path).issue, '#256')
    assert.equal(row(method, path).status, 'implemented')
    assert.match(row(method, path).frontend_target, /useMerchantReservationSetup/)
    assert.match(row(method, path).backend_prerequisite, /실서버 QA 미수행/)
  }
  assert.equal(row('GET', '/users/me/merchant-place-applications/naver-place-search').status, 'implemented')
  assert.match(row('GET', '/admin/dashboard/pending-items').frontend_target, /예약/)
  for (const entry of rows.filter(r => r.issue === '#204')) assert.equal(entry.status, 'excluded')
  const gaps = JSON.parse(readFileSync('docs/openapi/source-contract-gaps.json', 'utf8'))
  assert.ok(gaps.some(r => r.path === '/admin/data-quality/issues'))
})
test('snapshot provenance and structural diff can be reproduced from the pinned baseline', () => {
  const metadata = JSON.parse(readFileSync('docs/openapi/metadata.json', 'utf8'))
  const report = JSON.parse(readFileSync('docs/openapi/contract-changes.json', 'utf8'))
  assert.equal(report.baseline_ref, metadata.comparison_baseline)
  assert.deepEqual(metadata.scope, ['admin', 'merchant'])
  for (const group of metadata.scope) {
    const raw = readFileSync(`docs/openapi/${group}.json`, 'utf8')
    const baseline = execFileSync('git', ['show', `${report.baseline_ref}:docs/openapi/${group}.json`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
    assert.equal(createHash('sha256').update(raw).digest('hex'), metadata.snapshots[group].sha256)
    assert.equal(createHash('sha256').update(baseline).digest('hex'), metadata.snapshots[group].baseline_sha256)
    assert.deepEqual(compareDocuments(JSON.parse(baseline), JSON.parse(raw)), report.groups[group])
    assert.equal(rows.filter(r => r.canonical_status === `${group}: documented`).length, metadata.snapshots[group].operations)
    assert.ok(Number.isFinite(Date.parse(metadata.snapshots[group].collected_at)))
    assert.doesNotMatch(raw, /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/)
  }
})
