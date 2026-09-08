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
const { default: client, runAuthTransition } = await server.ssrLoadModule('/src/api/customAxios.ts')
const authApi = await server.ssrLoadModule('/src/api/authApi.ts')
const originalAdapter = axios.defaults.adapter
after(async () => {
  axios.defaults.adapter = originalAdapter
  await server.close()
})
beforeEach(() => auth.saveLoginAuth({ accessToken: 'A', id: 1, username: 'A' }))

function accessToken(userId, type = 'access') {
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), type, username: '테스트 계정' })).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`
}

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
  refresh.resolve({ accessToken: accessToken(1) })
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
    if (config.headers.get('Authorization') !== `Bearer ${accessToken(2)}`) throw unauthorized(config)
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
  gates[1].resolve({ accessToken: accessToken(2) })
  assert.equal((await newRequest).data, 'B result')
  assert.equal(auth.getStoredAccessToken(), accessToken(2))
  assert.equal(refreshes, 2)
})

test('auth transition aborts and settles refresh before sending logout and login', async () => {
  const started = deferred()
  const aborted = deferred()
  const cleanup = deferred()
  const events = []
  axios.defaults.adapter = async (config) => {
    started.resolve()
    config.signal.addEventListener('abort', () => aborted.resolve(), { once: true })
    await aborted.promise
    events.push('refresh-aborted')
    await cleanup.promise
    throw new axios.CanceledError()
  }
  client.defaults.adapter = async (config) => {
    if (config.url === '/auth/logout') {
      events.push('logout')
      return response(config)
    }
    if (config.url === '/auth/admin/login') {
      events.push('login')
      return response(config, { id: 2, accessToken: accessToken(2) })
    }
    throw unauthorized(config)
  }
  const old = client.post('/old-write').catch((error) => error)
  await started.promise
  const logout = runAuthTransition(async () => { auth.clearStoredAuth(); await authApi.logout() })
  const login = runAuthTransition(async () => { auth.saveLoginAuth(await authApi.login({ username: 'B', password: 'mock' })) })
  await aborted.promise
  assert.ok(axios.isCancel(await client.post('/blocked-during-transition').catch((error) => error)))
  assert.deepEqual(events, ['refresh-aborted'])
  cleanup.resolve()
  await Promise.all([logout, login])
  assert.ok(axios.isCancel(await old))
  assert.deepEqual(events, ['refresh-aborted', 'logout', 'login'])
  assert.equal(auth.getStoredAccessToken(), accessToken(2))
  assert.equal(auth.getStoredAuthState().user.id, 2)
})

test('late cookie overwrite cannot make B writes retry as A on the next refresh', async () => {
  const started = deferred()
  const gate = deferred()
  let cookie = 'A'
  let refreshes = 0
  const writes = []
  axios.defaults.adapter = async (config) => {
    const cookieOwner = cookie
    if (refreshes++ === 0) { started.resolve(); await gate.promise }
    // Model a browser applying Set-Cookie before Axios handles the response.
    cookie = cookieOwner
    return response(config, { accessToken: accessToken(cookieOwner === 'A' ? 1 : 2) })
  }
  client.defaults.adapter = async (config) => {
    writes.push(config.headers.get('Authorization'))
    throw unauthorized(config)
  }
  const old = client.post('/old-write').catch((error) => error)
  await started.promise
  // An uncoordinated login (e.g. another tab) can still change the shared cookie.
  cookie = 'B'
  auth.saveLoginAuth({ id: 2, username: 'B', accessToken: 'B' })
  gate.resolve()
  assert.ok(axios.isCancel(await old))
  assert.equal(cookie, 'A')
  assert.equal(auth.getStoredAccessToken(), 'B')
  const result = await client.post('/B-write').catch((error) => error)
  assert.ok(axios.isAxiosError(result))
  assert.deepEqual(writes, ['Bearer A', 'Bearer B'])
  assert.equal(auth.getStoredAccessToken(), '')
  assert.equal(auth.getStoredAuthState(), null)
  assert.match(auth.getAuthSessionNotice(), /다시 로그인/)
})

for (const [label, token] of [
  ['different user', accessToken(2)],
  ['refresh token type', accessToken(1, 'refresh')],
  ['malformed JWT', 'malformed'],
  ['missing token', undefined],
]) {
  test('invalid or mismatched refresh identity fails closed: ' + label, async () => {
    let calls = 0
    axios.defaults.adapter = async (config) => response(config, { accessToken: token })
    client.defaults.adapter = async (config) => { calls++; throw unauthorized(config) }
    const result = await client.post('/write').catch((error) => error)
    assert.ok(axios.isAxiosError(result))
    assert.equal(calls, 1)
    assert.equal(auth.getStoredAccessToken(), '')
    assert.match(auth.getAuthSessionNotice(), /다시 로그인/)
  })
}

test('storage rejects mismatched identity even when called directly', () => {
  const session = auth.getAuthSessionId()
  assert.equal(auth.saveRefreshedAuthTokens({ accessToken: accessToken(2) }, session), false)
  assert.equal(auth.getStoredAccessToken(), 'A')
  assert.equal(auth.saveRefreshedAuthTokens({ accessToken: accessToken(1) }, session), true)
  assert.equal(auth.getAuthSessionId(), session)
})

test('failed transition releases the queue and allows a later login and refresh', async () => {
  await assert.rejects(runAuthTransition(async () => { throw new Error('mock login failure') }))
  await runAuthTransition(async () => auth.saveLoginAuth({ id: 2, accessToken: 'B' }))
  axios.defaults.adapter = async (config) => response(config, { accessToken: accessToken(2) })
  client.defaults.adapter = async (config) => {
    if (config.headers.get('Authorization') === 'Bearer B') throw unauthorized(config)
    return response(config, 'ok')
  }
  assert.equal((await client.get('/detail')).data, 'ok')
  assert.equal(auth.getStoredAccessToken(), accessToken(2))
  assert.equal(auth.getAuthSessionNotice(), '')
})
