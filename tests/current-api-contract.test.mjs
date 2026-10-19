import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { compareDocuments } from '../scripts/refresh-openapi-snapshots.mjs'
import { verifyCurrentContracts, retiredReservationFields } from './helpers/current-contract.mjs'
import { observeFixtureAdapter } from './helpers/fixture-adapter.mjs'

const docs = Object.fromEntries(['admin', 'merchant', 'app', 'common'].map(group => [group, JSON.parse(readFileSync(`docs/openapi/${group}.json`, 'utf8'))]))
test('current stored contracts preserve product-free reservations and historical payments', () => verifyCurrentContracts(docs))
for (const field of retiredReservationFields) test(`contract probe detects retired ${field} even if nullable`, () => {
  const changed = structuredClone(docs)
  changed.merchant.components.schemas.AvailabilityResponse.properties[field] = { type: 'string', nullable: true }
  assert.throws(() => verifyCurrentContracts(changed), /Retired reservation field/)
})
for (const field of retiredReservationFields) test(`browser fixture adapter detects nested ${field}=null instead of faking compatibility`, async () => {
  const adapter = observeFixtureAdapter(async () => ({ status: 200, data: { reservations: [{ confirmation: { [field]: null } }] } }))
  await assert.rejects(adapter({ method: 'get', url: '/merchant-owner/reservations' }), /Retired reservation fixture field/)
  const payments = observeFixtureAdapter(async () => ({ status: 200, data: { amountMinor: null, currency: null } }))
  assert.deepEqual((await payments({ method: 'get', url: '/merchant-owner/payments' })).data, { amountMinor: null, currency: null })
})
test('fixture rejects retired null request fields before executing a synthetic write', async () => {
  let calls = 0
  const adapter = observeFixtureAdapter(async () => { calls++; return { status: 200, data: {} } })
  await assert.rejects(adapter({ method: 'put', url: '/merchant-owner/availabilities/7/reservation-terms', data: JSON.stringify({ currency: null }) }), /Retired/)
  assert.equal(calls, 0)
})
test('contract probe detects revived product API, array history and full-report dispute response', () => {
  for (const alter of [
    d => { d.merchant.paths['/merchant-owner/reservable-products'] = { get: {} } },
    d => { d.admin.components.schemas.AdminTrustScoreChangeHistoryResponse = { type: 'array' } },
    d => { Object.values(d.admin.paths['/admin/place-information-reports/{reportId}/disputes/{disputeId}/review'].post.responses['200'].content)[0].schema.$ref = '#/components/schemas/PlaceInformationReportResponse' },
  ]) { const changed = structuredClone(docs); alter(changed); assert.throws(() => verifyCurrentContracts(changed)) }
})

function members(file, name) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const declaration = source.statements.find(value => ts.isInterfaceDeclaration(value) && value.name.text === name)
  assert.ok(declaration)
  return declaration.members.map(member => member.name?.getText(source))
}
test('five residual types match their distinct query/request/response contracts', () => {
  assert.ok(!members('src/types/adminNotification.types.ts', 'AdminNotificationListRequest').includes('userId'))
  assert.ok(members('src/types/adminNotification.types.ts', 'AdminNotificationDeliveryListRequest').includes('userId'))
  assert.deepEqual(members('src/types/adminMerchantOwner.types.ts', 'AdminMerchantOwnerReviewRequest'), ['reason'])
  assert.ok(members('src/types/adminMerchantOwner.types.ts', 'AdminMerchantOwnerPlaceUpdateRequest').includes('placeIds'))
  assert.ok(!members('src/types/adminPlace.types.ts', 'AdminPlaceDetail').includes('kakaoPlaceId'))
  assert.ok(members('src/types/adminMerchantPlaceApplication.types.ts', 'AdminMerchantPlaceApplication').includes('businessRegistrationNumber'))
  assert.match(readFileSync('src/types/adminS3Orphan.types.ts', 'utf8'), /S3OrphanReport extends Omit<S3OrphanReportStatus, 'completedAt'>/)
})
test('reference groups preserve unmodified source bytes and do not invent an old baseline', () => {
  const metadata = JSON.parse(readFileSync('docs/openapi/metadata.json', 'utf8'))
  const report = JSON.parse(readFileSync('docs/openapi/contract-changes.json', 'utf8'))
  assert.deepEqual(metadata.reference_scope, ['app', 'common'])
  for (const group of metadata.reference_scope) {
    const baselinePath = `${metadata.comparison_baseline}:docs/openapi/${group}.json`
    const hasBaseline = spawnSync('git', ['cat-file', '-e', baselinePath]).status === 0
    if (!hasBaseline) {
      assert.equal(metadata.snapshots[group].baseline_sha256, null)
      assert.deepEqual(report.groups[group], { initial_collection: true })
    } else {
      const baseline = execFileSync('git', ['show', baselinePath], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
      assert.equal(metadata.snapshots[group].baseline_sha256, createHash('sha256').update(baseline).digest('hex'))
      assert.deepEqual(report.groups[group], compareDocuments(JSON.parse(baseline), docs[group]))
    }
    const raw = readFileSync(`docs/openapi/${group}.json`, 'utf8')
    assert.equal(createHash('sha256').update(raw).digest('hex'), metadata.snapshots[group].sha256)
    assert.ok(Number.isFinite(Date.parse(metadata.snapshots[group].collected_at)))
  }
})
test('public snapshots and provenance contain no recognizable live credentials', () => {
  for (const name of ['admin', 'merchant', 'app', 'common', 'metadata', 'source-contract-gaps', 'known-source-contracts']) {
    const raw = readFileSync(`docs/openapi/${name}.json`, 'utf8')
    assert.doesNotMatch(raw, /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bAKIA[A-Z0-9]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/)
  }
})
