import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from './helpers/isolated-vite.mjs'

const cacheDir = await mkdtemp(join(tmpdir(), 'pingdom-302-types-'))
const vite = await createServer({ cacheDir, server: { middlewareMode: true, ws: false }, appType: 'custom' })
const { default: client } = await vite.ssrLoadModule('/src/api/customAxios.ts')
const { getAdminNotifications, getAdminNotificationDeliveries } = await vite.ssrLoadModule('/src/api/adminNotificationApi.ts')
const { approveAdminMerchantOwner, rejectAdminMerchantOwner, replaceAdminMerchantOwnerPlaces } = await vite.ssrLoadModule('/src/api/adminMerchantOwnerApi.ts')
const calls = []
client.defaults.adapter = async config => { calls.push(config); return { config, data: {}, status: 200, headers: {}, statusText: 'Synthetic' } }
after(() => vite.close())
test('notification queries do not leak unsupported recipient filters; delivery queries keep theirs', async () => {
  await getAdminNotifications({ userId: 999, type: 'ADMIN_REPORT_RECEIVED', read: false })
  assert.equal(Object.hasOwn(calls.at(-1).params, 'userId'), false)
  assert.equal(calls.at(-1).params.read, false)
  assert.equal(calls.at(-1).params.page, 1)
  await getAdminNotificationDeliveries({ userId: 999 })
  assert.equal(calls.at(-1).params.userId, 999)
})
test('synthetic owner review sends only reason, explicit place replacement keeps placeIds', async () => {
  for (const review of [approveAdminMerchantOwner, rejectAdminMerchantOwner]) {
    await review(999, { reason: '합성 계약 검사', placeIds: [888] })
    assert.deepEqual(JSON.parse(calls.at(-1).data), { reason: '합성 계약 검사' })
  }
  await replaceAdminMerchantOwnerPlaces(999, { reason: '합성 계약 검사', placeIds: [888] })
  assert.deepEqual(JSON.parse(calls.at(-1).data).placeIds, [888])
  assert.ok(calls.every(call => call.baseURL === '/api'))
})
