export function token(id, suffix = '') {
  return `header.${Buffer.from(JSON.stringify({ sub: String(id), type: 'access' })).toString('base64url')}.signature${suffix}`
}
export function loginData(id = 1, role = 'ADMIN', suffix = '') {
  return { id, role, username: `synthetic-${id}`, accessToken: token(id, suffix) }
}
// Deterministic same-origin lock shared by independently loaded tab modules.
export function installAuthLocks(window, state = { tail: Promise.resolve(), active: 0, maxActive: 0 }) {
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: {
    request: (_name, options, callback) => {
      const result = state.tail.then(async () => {
        if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        state.active++; state.maxActive = Math.max(state.active, state.maxActive)
        try { return await callback() } finally { state.active-- }
      })
      state.tail = result.catch(() => {})
      return result
    },
  } })
  return state
}
