import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import axios from 'axios'
import { createServer } from 'vite'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const auth = await server.ssrLoadModule('/src/utils/authStorage.ts')
const { default: client } = await server.ssrLoadModule('/src/api/customAxios.ts')
const originalAdapter = axios.defaults.adapter
after(async () => {
  axios.defaults.adapter = originalAdapter
  await server.close()
})
beforeEach(() => auth.saveLoginAuth({ accessToken: 'A', id: 1, username: 'A' }))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function response(config, data = {}) {
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
function unauthorized(config) {
  return new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
    ...response(config, { code: 'INVALID_TOKEN' }), status: 401,
  })
}

for (const transition of ['logout', 'switch']) {
  test('late refresh after ' + transition + ' cannot restore tokens or retry writes', async () => {
    const started = deferred()
    const refresh = deferred()
    let calls = 0
    axios.defaults.adapter = async (config) => {
      started.resolve()
      return response(config, await refresh.promise)
    }
    client.defaults.adapter = async (config) => { calls++; throw unauthorized(config) }
    const pending = client.post('/test-write', {}).catch((error) => error)
    await started.promise
    if (transition === 'logout') auth.clearStoredAuth()
    else auth.saveLoginAuth({ accessToken: 'B', id: 2, username: 'B' })
    refresh.resolve({ accessToken: 'late-A' })
    assert.ok(axios.isCancel(await pending))
    assert.equal(auth.getStoredAccessToken(), transition === 'logout' ? '' : 'B')
    assert.equal(calls, 1)
  })
}

test('same-session simultaneous 401 responses share one refresh', async () => {
  const started = deferred()
  const refresh = deferred()
  let refreshes = 0
  let calls = 0
  const session = auth.getAuthSessionId()
  axios.defaults.adapter = async (config) => {
    refreshes++
    started.resolve()
    return response(config, await refresh.promise)
  }
  client.defaults.adapter = async (config) => {
    calls++
    if (config.headers.get('Authorization') === 'Bearer A') throw unauthorized(config)
    return response(config, 'done')
  }
  const pending = Promise.all([client.post('/one'), client.post('/two')])
  await started.promise
  refresh.resolve({ accessToken: 'renewed-A' })
  const results = await pending
  assert.equal(refreshes, 1)
  assert.equal(calls, 4)
  assert.ok(results.every((item) => item.data === 'done'))
  assert.equal(auth.getAuthSessionId(), session)
})

for (const outcome of ['success', '401']) {
  test('old-session ' + outcome + ' response is canceled after account switch', async () => {
    const started = deferred()
    const gate = deferred()
    let calls = 0
    client.defaults.adapter = async (config) => {
      calls++
      started.resolve()
      await gate.promise
      if (outcome === '401') throw unauthorized(config)
      return response(config, { privateData: 'A' })
    }
    const pending = client.get('/detail').catch((error) => error)
    await started.promise
    auth.saveLoginAuth({ accessToken: 'B', id: 2 })
    gate.resolve()
    assert.ok(axios.isCancel(await pending))
    assert.equal(auth.getStoredAccessToken(), 'B')
    assert.equal(calls, 1)
  })
}

test('late refresh failure cannot clear a new session', async () => {
  const started = deferred()
  const gate = deferred()
  axios.defaults.adapter = async (config) => {
    started.resolve()
    await gate.promise
    throw unauthorized(config)
  }
  client.defaults.adapter = async (config) => { throw unauthorized(config) }
  const pending = client.get('/detail').catch((error) => error)
  await started.promise
  auth.saveLoginAuth({ accessToken: 'B', id: 2 })
  gate.resolve()
  assert.ok(axios.isCancel(await pending))
  assert.equal(auth.getStoredAccessToken(), 'B')
})

test('new-session refresh is independent of a pending old-session refresh', async () => {
  const started = [deferred(), deferred()]
  const gates = [deferred(), deferred()]
  let refreshes = 0
  axios.defaults.adapter = async (config) => {
    const index = refreshes++
    started[index].resolve()
    return response(config, await gates[index].promise)
  }
  client.defaults.adapter = async (config) => {
    if (config.headers.get('Authorization') !== 'Bearer renewed-B') throw unauthorized(config)
    return response(config, 'B result')
  }
  const oldRequest = client.post('/old-write').catch((error) => error)
  await started[0].promise
  auth.saveLoginAuth({ accessToken: 'B', id: 2 })
  const newRequest = client.get('/new-detail')
  await started[1].promise
  gates[0].resolve({ accessToken: 'late-A' })
  assert.ok(axios.isCancel(await oldRequest))
  assert.equal(auth.getStoredAccessToken(), 'B')
  gates[1].resolve({ accessToken: 'renewed-B' })
  assert.equal((await newRequest).data, 'B result')
  assert.equal(auth.getStoredAccessToken(), 'renewed-B')
  assert.equal(refreshes, 2)
})
