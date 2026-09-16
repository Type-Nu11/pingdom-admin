import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { chromium } from 'playwright'

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]))

test('security headers do not change routing or silently enforce the candidate CSP', () => {
  assert.deepEqual(Object.keys(config).sort(), ['$schema', 'headers'])
  assert.equal(config.headers.length, 1)
  assert.equal(config.headers[0].source, '/(.*)')
  assert.equal(headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN')
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assert.equal(headers['Content-Security-Policy'], undefined)
  const policy = headers['Content-Security-Policy-Report-Only']
  assert.match(policy, /object-src 'none'/)
  assert.match(policy, /worker-src 'self' blob:/)
  assert.doesNotMatch(policy, /report-uri|report-to|unsafe-eval/)
  const scripts = policy.split(';').find(value => value.trim().startsWith('script-src'))
  assert.doesNotMatch(scripts, /unsafe-inline|https:;|\*/)
})

test('HTTP Report-Only emits violations without blocking page scripts', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' })
    response.end('<!doctype html><title>Policy fixture</title><script>window.fixtureExecuted = true</script>')
  })
  let browser
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.addInitScript(() => {
      window.policyViolations = []
      document.addEventListener('securitypolicyviolation', event => {
        window.policyViolations.push({ disposition: event.disposition, directive: event.effectiveDirective })
      })
    })
    const response = await page.goto(`http://127.0.0.1:${server.address().port}/login`)
    assert.equal(response.headers()['x-content-type-options'], 'nosniff')
    assert.equal(await page.evaluate(() => window.fixtureExecuted), true)
    await page.waitForFunction(() => window.policyViolations.some(event => event.disposition === 'report' && event.directive === 'script-src-elem'))
    assert.equal(await page.evaluate(() => window.policyViolations.some(event => event.disposition === 'enforce')), false)
  } finally {
    await browser?.close()
    await new Promise(resolve => server.close(resolve))
  }
})
