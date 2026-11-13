import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from './helpers/isolated-vite.mjs'

// Exercise the real relocated hooks and Axios instance, but never send HTTP.
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createElement: h, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { AuthContext } = await server.ssrLoadModule('/src/app/providers/AuthContext.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const { useAdminBannedUsers } = await server.ssrLoadModule('/src/features/admin/userBans/hooks/useAdminBannedUsers.ts')
const { useAdminUserRoles } = await server.ssrLoadModule('/src/features/admin/userRoles/hooks/useAdminUserRoles.ts')
let root, bans, roles, calls, cleared, adapter
const reply = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const list = (config, users = [{ userId: 901, username: '합성 사용자', banned: true, banType: 'PERMANENT' }]) => ({ users, page: config.params.page, limit: config.params.limit, totalCount: 21, totalPages: 2, hasNext: config.params.page < 2 })
function baseAdapter(config) {
  if (config.method === 'get' && config.url === '/admin/users/banned') return reply(config, list(config))
  if (config.method === 'get' && config.url === '/admin/users/banned/901') return reply(config, { userId: 901, username: '합성 사용자', banned: true, banType: 'PERMANENT' })
  if (config.method === 'get' && config.url === '/admin/users/901/sanction') return reply(config, { userId: 901, banned: true })
  if (config.method === 'get' && config.url === '/admin/users/901/sanctions') return reply(config, { histories: [], page: 1, totalCount: 0, totalPages: 1, hasNext: false })
  if (config.method === 'get' && /^\/admin\/users\/\d+\/roles$/.test(config.url)) return reply(config, [])
  throw new Error(`Unexpected synthetic API: ${config.method} ${config.url}`)
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  root = createRoot(document.getElementById('root'))
  calls = []; cleared = 0; bans = null; roles = null; adapter = baseAdapter
  client.defaults.adapter = config => { calls.push(config); return Promise.resolve().then(() => adapter(config)) }
})
afterEach(async () => { await act(async () => root.unmount()) })
after(async () => { await server.close(); dom.window.close() })
function BanProbe() { bans = useAdminBannedUsers({ limit: 20 }); return null }
function RoleProbe() { roles = useAdminUserRoles(); return null }
async function render(Probe) {
  await act(async () => root.render(h(AuthContext.Provider, { value: { clearAuth() { cleared++ } } }, h(Probe))))
}

test('ban apply keeps payload, blocks duplicate writes and refreshes list/status/selected history', async () => {
  await render(BanProbe)
  await act(async () => bans.fetchAdminBannedUserDetail(901))
  const gate = deferred()
  adapter = async config => {
    if (config.method === 'post' && config.url === '/admin/ban/901') { await gate.promise; return reply(config, { userId: 901 }) }
    return baseAdapter(config)
  }
  const payload = { durationDays: 7, reason: '합성 검토 사유' }
  let first, duplicate
  await act(async () => { first = bans.applyUserBan(901, payload); duplicate = await bans.applyUserBan(901, payload) })
  assert.equal(duplicate, null)
  assert.equal(bans.banningUserId, 901)
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
  assert.deepEqual(JSON.parse(calls.find(config => config.method === 'post').data), payload)
  await act(async () => { gate.resolve(); await first })
  assert.equal(calls.filter(config => config.url === '/admin/users/banned').at(-1).params.page, 1)
  for (const url of ['/admin/users/901/sanction', '/admin/users/901/sanctions']) assert.ok(calls.some(config => config.url === url), url)
  assert.equal(bans.banningUserId, null)
  assert.match(bans.actionSuccessMessage, /901.*밴 처리/)
})

test('ban release keeps reason and selection, blocks duplicates and corrects a last-row page', async () => {
  await render(BanProbe)
  await act(async () => { await bans.fetchAdminBannedUsers({ page: 2 }); await bans.fetchAdminBannedUserDetail(901) })
  const gate = deferred()
  adapter = async config => {
    if (config.method === 'post' && config.url === '/admin/ban/901/release') { await gate.promise; return reply(config, { userId: 901 }) }
    return baseAdapter(config)
  }
  let first, duplicate
  await act(async () => { first = bans.releaseUserBan(901, { reason: '합성 해제 사유' }); duplicate = await bans.releaseUserBan(901) })
  assert.equal(duplicate, null)
  assert.equal(bans.releasingUserId, 901)
  const writes = calls.filter(config => config.method === 'post')
  assert.equal(writes.length, 1)
  assert.deepEqual(JSON.parse(writes[0].data), { reason: '합성 해제 사유' })
  await act(async () => { gate.resolve(); await first })
  assert.equal(calls.filter(config => config.url === '/admin/users/banned').at(-1).params.page, 1)
  assert.equal(bans.selectedUserDetail.userId, 901)
  assert.equal(bans.selectedUserDetail.banned, false)
  assert.ok(calls.some(config => config.url === '/admin/users/901/sanctions'))
  assert.equal(bans.releasingUserId, null)
})

test('role grant/revoke preserves target, body and refetch; in-flight write rejects duplicate and new lookup', async () => {
  await render(RoleProbe)
  await act(async () => roles.fetchRoles(8))
  const gate = deferred()
  adapter = async config => {
    if (config.method === 'post' || config.method === 'delete') { await gate.promise; return reply(config, {}) }
    return baseAdapter(config)
  }
  let first, duplicate, switched
  await act(async () => {
    first = roles.mutate('ANALYST', 'assign', '합성 부여 사유')
    duplicate = await roles.mutate('ANALYST', 'assign', '중복')
    switched = await roles.fetchRoles(9)
  })
  assert.equal(duplicate, false); assert.equal(switched, false)
  assert.equal(roles.isMutating, true)
  assert.equal(calls.filter(config => config.method === 'post').length, 1)
  const grant = calls.find(config => config.method === 'post')
  assert.equal(grant.url, '/admin/users/8/roles')
  assert.deepEqual(JSON.parse(grant.data), { role: 'ANALYST', reason: '합성 부여 사유' })
  await act(async () => { gate.resolve(); await first })
  assert.equal(roles.targetUserId, 8)
  assert.equal(roles.isMutating, false)
  assert.match(roles.successMessage, /부여/)
  await act(async () => roles.mutate('ANALYST', 'revoke', '합성 회수 사유'))
  const revoke = calls.find(config => config.method === 'delete')
  assert.equal(revoke.url, '/admin/users/8/roles/ANALYST')
  assert.deepEqual(JSON.parse(revoke.data), { reason: '합성 회수 사유' })
  assert.equal(calls.at(-1).url, '/admin/users/8/roles')
  assert.equal(calls.at(-1).method, 'get')
  assert.match(roles.successMessage, /회수/)
})

for (const status of [401, 403]) test(`${status} on a role mutation preserves auth/error handling without a success result`, async () => {
  await render(RoleProbe)
  await act(async () => roles.fetchRoles(8))
  adapter = config => {
    if (config.method !== 'get') throw { isAxiosError: true, config, response: { status, data: { code: status === 401 ? 'INVALID_TOKEN' : 'ACCESS_DENIED' } } }
    return baseAdapter(config)
  }
  let result
  await act(async () => { result = await roles.mutate('ANALYST', 'assign', '합성 거절') })
  assert.equal(result, false)
  assert.equal(roles.successMessage, '')
  assert.ok(roles.actionErrorMessage)
  assert.equal(roles.isMutating, false)
  assert.equal(cleared, status === 401 ? 1 : 0)
})
