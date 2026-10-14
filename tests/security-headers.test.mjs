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
  assert.deepEqual(scripts.trim().split(/\s+/).slice(1), [
    "'self'", 'https://oapi.map.naver.com', 'https://maps.apigw.ntruss.com',
  ])
  assert.doesNotMatch(policy, /kakao|daumcdn/)
})

test('NAVER SDK and geocoder JSONP are allowed while legacy scripts are reported', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { ...headers, 'Content-Type': 'text/html' })
    response.end('<!doctype html><title>NAVER policy fixture</title>')
  })
  let browser
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.addInitScript(() => {
      window.policyViolations = []
      document.addEventListener('securitypolicyviolation', event => {
        window.policyViolations.push({ uri: event.blockedURI, disposition: event.disposition })
      })
    })
    for (const origin of ['https://oapi.map.naver.com', 'https://maps.apigw.ntruss.com', 'https://dapi.kakao.com']) {
      await page.route(origin + '/**', route => route.fulfill({
        contentType: 'application/javascript', body: 'window.loadedScripts = (window.loadedScripts || 0) + 1;',
      }))
    }
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    for (const url of ['https://oapi.map.naver.com/openapi/v3/maps.js', 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode-js', 'https://dapi.kakao.com/v2/maps/sdk.js']) {
      await page.evaluate(url => new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = url
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      }), url)
    }
    await page.waitForFunction(() => window.policyViolations.some(v => v.uri.includes('dapi.kakao.com')))
    assert.equal(await page.evaluate(() => window.loadedScripts), 3, 'Report-Only does not block legacy scripts')
    const violations = await page.evaluate(() => window.policyViolations)
    assert.equal(violations.some(v => /oapi\.map\.naver|maps\.apigw\.ntruss/.test(v.uri)), false)
    assert.equal(violations.every(v => v.disposition === 'report'), true)
  } finally {
    await browser?.close()
    await new Promise(resolve => server.close(resolve))
  }
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
