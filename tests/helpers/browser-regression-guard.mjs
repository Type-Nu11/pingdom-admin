import assert from 'node:assert/strict'

export function createFailureCollector(expected = () => false) {
  const unexpected = [], allowed = []
  return {
    record(event) { (expected(event) ? allowed : unexpected).push(event) },
    assertClean() { assert.deepEqual(unexpected, [], 'Unexpected browser/fixture failures') },
    allowed,
  }
}

// Each suite supplies a scenario-specific allowlist. No global console suppression.
// Report only method/path/status for requests, never bodies, tokens or query strings.
export async function guardBrowserPage(page, origin, expected = () => false) {
  const collector = createFailureCollector(expected)
  await page.exposeBinding('__pingdomQaFailure', (_, event) => collector.record(event))
  page.on('pageerror', error => collector.record({ kind: 'pageerror', text: error.message }))
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) collector.record({ kind: 'console', level: message.type(), text: message.text() })
  })
  const requestInfo = request => ({ method: request.method(), path: new URL(request.url()).pathname })
  page.on('response', response => {
    if (response.status() >= 400) collector.record({ kind: 'http', ...requestInfo(response.request()), status: response.status() })
  })
  page.on('requestfailed', request => collector.record({ kind: 'requestfailed', ...requestInfo(request) }))
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url())
    // Font CSS is deterministic and offline. Do not grant these domains general access.
    if (request.method() === 'GET' && request.resourceType() === 'stylesheet' &&
        ['fonts.googleapis.com', 'cdn.jsdelivr.net'].includes(url.hostname)) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    }
    if (url.origin === origin && !/^\/api(?:\/|$)/.test(url.pathname)) return route.continue()
    collector.record({ kind: 'blocked-request', ...requestInfo(request) })
    return route.abort()
  })
  return collector
}
