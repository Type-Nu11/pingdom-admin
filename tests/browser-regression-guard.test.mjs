import test from 'node:test'
import assert from 'node:assert/strict'
import { createFailureCollector } from './helpers/browser-regression-guard.mjs'
import { observeFixtureAdapter } from './helpers/fixture-adapter.mjs'

for (const kind of ['console', 'pageerror', 'http', 'requestfailed', 'blocked-request', 'fixture-api']) {
  test(`browser guard rejects an unexpected ${kind}`, () => {
    const guard = createFailureCollector()
    guard.record({ kind, text: 'injected' })
    assert.throws(() => guard.assertClean(), { code: 'ERR_ASSERTION' })
  })
}
test('allowlist is scenario/method/path/status specific and does not erase failures', () => {
  let failing = true
  const expected = event => failing && event.kind === 'fixture-api' && event.method === 'GET' && event.path === '/synthetic' && event.status === 503
  const guard = createFailureCollector(expected)
  const event = { kind: 'fixture-api', method: 'GET', path: '/synthetic', status: 503 }
  guard.record(event)
  guard.assertClean()
  assert.equal(guard.allowed.length, 1)
  failing = false
  guard.record(event)
  assert.throws(() => guard.assertClean(), { code: 'ERR_ASSERTION' })
  assert.throws(() => guard.assertClean(), { code: 'ERR_ASSERTION' })
  for (const change of [{ method: 'POST' }, { path: '/other' }, { status: 401 }, { kind: 'pageerror' }]) {
    failing = true
    const other = createFailureCollector(expected)
    other.record({ ...event, ...change })
    assert.throws(() => other.assertClean(), { code: 'ERR_ASSERTION' })
  }
})
test('fixture observer reports swallowed failures and omits private request data', async () => {
  const events = [], previous = globalThis.__pingdomQaFailure
  globalThis.__pingdomQaFailure = async event => events.push(event)
  try {
    const error = Object.assign(new Error('synthetic'), { response: { status: 503 } })
    const fail = observeFixtureAdapter(async () => { throw error })
    const config = { url: '/synthetic?secret=never-report', method: 'get', data: 'private body', headers: { Authorization: 'private' } }
    await assert.rejects(fail(config), e => e === error)
    assert.deepEqual(events, [{ kind: 'fixture-api', method: 'GET', path: '/synthetic', status: 503, text: 'synthetic' }])
    const response = { status: 500 }
    assert.equal(await observeFixtureAdapter(async () => response)(config), response)
    assert.equal(events.at(-1).status, 500)
    const ready = { status: 200 }
    assert.equal(await observeFixtureAdapter(async () => ready)(config), ready)
    assert.equal(events.length, 2)
  } finally { globalThis.__pingdomQaFailure = previous }
})
