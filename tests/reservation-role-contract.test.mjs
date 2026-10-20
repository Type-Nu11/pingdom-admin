import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { observeFixtureAdapter } from './helpers/fixture-adapter.mjs'

const admin = JSON.parse(readFileSync('docs/openapi/admin.json', 'utf8'))
const merchant = JSON.parse(readFileSync('docs/openapi/merchant.json', 'utf8'))
const inventory = JSON.parse(execFileSync('node', ['scripts/api-source-inventory.mjs'], { encoding: 'utf8' }))
function verifyRoles(a, m, source) {
  assert.ok(a.paths['/admin/reservations'].get)
  assert.ok(a.paths['/admin/reservations/{reservationId}'].get)
  for (const action of ['confirm', 'reject']) {
    assert.equal(a.paths[`/admin/reservations/{reservationId}/${action}`]?.post, undefined, 'retired admin mutation')
    assert.ok(m.paths[`/merchant-owner/reservations/{reservationId}/${action}`]?.post, 'merchant mutation missing')
    assert.ok(source.some(row => row.method === 'POST' && row.path === `/merchant-owner/reservations/{reservationId}/${action}` && row.callers.length), 'new operation must have a concrete connected source path')
  }
  assert.ok(!source.some(row => row.method !== 'GET' && row.path.startsWith('/admin/reservations')), 'admin writes must not return to source')
  const params = m.paths['/merchant-owner/reservations'].get.parameters.map(param => param.name)
  for (const filter of ['status', 'placeId', 'reservationFrom', 'reservationTo', 'page', 'limit']) assert.ok(params.includes(filter))
  const fields = m.components.schemas.MerchantReservationDetailResponse.properties
  for (const field of ['reservation', 'placeId', 'placeName', 'statusHistory']) assert.ok(fields[field])
  assert.notEqual(m.paths['/merchant-owner/reservations/{reservationId}/confirm'].post.requestBody.required, true)
  assert.equal(m.paths['/merchant-owner/reservations/{reservationId}/reject'].post.requestBody.required, true)
}
test('stored contracts and connected source agree on reservation role transfer', () => verifyRoles(admin, merchant, inventory))
test('regression probe rejects a revived admin operation or missing merchant processing operation', () => {
  const revived = structuredClone(admin)
  revived.paths['/admin/reservations/{reservationId}/confirm'] = { post: {} }
  assert.throws(() => verifyRoles(revived, merchant, inventory), /retired admin mutation/)
  const missing = structuredClone(merchant)
  delete missing.paths['/merchant-owner/reservations/{reservationId}/reject']
  assert.throws(() => verifyRoles(admin, missing, inventory), /merchant mutation missing/)
  assert.throws(() => verifyRoles(admin, merchant, [...inventory, { method: 'POST', path: '/admin/reservations/{reservationId}/reject', callers: ['fake'] }]), /admin writes must not return/)
})
test('shared synthetic adapter rejects retired administrator writes before reaching its handler', async () => {
  let called = false
  const adapter = observeFixtureAdapter(async () => { called = true; return { status: 200, data: {} } })
  await assert.rejects(adapter({ method: 'post', url: '/admin/reservations/1/confirm' }), /Retired administrator/)
  assert.equal(called, false)
})
