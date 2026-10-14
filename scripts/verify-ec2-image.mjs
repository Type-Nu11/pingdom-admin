import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { setTimeout } from 'node:timers/promises'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))
const suffix = `${process.pid}-${Date.now()}`
const network = `pingdom-qa-${suffix}`
const gateway = `pingdom-qa-gateway-${suffix}`
const web = `pingdom-qa-web-${suffix}`
const image = `pingdom-admin-qa:${suffix}`
const gatewayImage = `pingdom-admin-gateway-qa:${suffix}`
const docker = async (...args) => (await exec('docker', args, { cwd: root, timeout: 600_000, maxBuffer: 10 * 1024 * 1024 })).stdout.trim()
let networkCreated = false, imageCreated = false, gatewayImageCreated = false
const containers = []
try {
  await docker('info')
  console.log('Building EC2 image with a synthetic public map ID (no real API calls).')
  await docker('build', '--build-arg', 'VITE_NAVER_MAP_CLIENT_ID=qa-public-client-id', '-t', image, '.')
  imageCreated = true
  // Export the cached Node build stage instead of pulling another runtime image.
  await docker('build', '--target', 'build', '--build-arg', 'VITE_NAVER_MAP_CLIENT_ID=qa-public-client-id', '-t', gatewayImage, '.')
  gatewayImageCreated = true
  await docker('network', 'create', network); networkCreated = true
  const gatewaySource = await readFile(new URL('../tests/fixtures/ec2-gateway.mjs', import.meta.url), 'utf8')
  await docker('run', '-d', '--name', gateway, '--network', network, '--network-alias', 'qa-gateway',
    gatewayImage, 'node', '--input-type=module', '-e', gatewaySource)
  containers.push(gateway)
  await docker('run', '-d', '--name', web, '--network', network, '-e', 'PINGDOM_API_UPSTREAM=qa-gateway:8081', '-p', '127.0.0.1::8080', image)
  containers.push(web)
  const port = (await docker('port', web, '8080/tcp')).split(':').at(-1)
  const url = `http://127.0.0.1:${port}`
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(`${url}/healthz`)).ok } catch { /* starting */ }
    if (ready) break
    await setTimeout(250)
  }
  assert.ok(ready, 'container must become healthy')
  await docker('exec', web, 'nginx', '-t')
  assert.equal((await fetch(`${url}/healthz`)).status, 200)
  for (const path of ['/login', '/dashboard', '/merchant/reservations/setup', '/index.html']) {
    const res = await fetch(url + path)
    assert.equal(res.status, 200, path)
    assert.match(res.headers.get('content-type'), /text\/html/)
    assert.match(res.headers.get('cache-control'), /no-store/)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.match(res.headers.get('content-security-policy-report-only'), /worker-src 'self' blob:/)
    assert.equal(res.headers.get('content-security-policy'), null)
  }
  const html = await (await fetch(`${url}/index.html`)).text()
  const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1]
  assert.ok(asset, 'built entry asset exists')
  const entry = await fetch(url + asset)
  assert.equal(entry.status, 200)
  assert.match(entry.headers.get('cache-control'), /immutable/)
  assert.equal(entry.headers.get('x-content-type-options'), 'nosniff')
  const workers = (await docker('exec', web, 'find', '/usr/share/nginx/html/assets', '-name', '*.mjs')).split('\n').filter(Boolean)
  assert.ok(workers.length > 0, 'built PDF.js worker exists')
  for (const worker of workers) {
    const res = await fetch(url + worker.replace('/usr/share/nginx/html', ''))
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /javascript/, 'module worker must have a JavaScript MIME type')
  }
  assert.equal((await fetch(`${url}/pdfjs/cmaps/Adobe-Korea1-UCS2.bcmap`)).status, 200)
  for (const path of ['/assets/missing-12345678.js', '/pdfjs/cmaps/missing.bcmap', '/.env']) assert.equal((await fetch(url + path)).status, 404, path)
  const unauthorized = await fetch(`${url}/api/users/me`)
  assert.equal(unauthorized.status, 401)
  assert.deepEqual(await unauthorized.json(), { code: 'UNAUTHORIZED' })
  const echo = await fetch(`${url}/api/echo?query=hello%20world`, { method: 'POST', headers: { Authorization: 'Bearer synthetic', 'X-Timestamp': '123' } })
  assert.deepEqual(await echo.json(), { url: '/echo?query=hello%20world', method: 'POST', authorization: 'Bearer synthetic', timestamp: '123' })
  for (const path of ['/auth/login', '/auth/logout']) {
    const cookie = (await fetch(`${url}/api${path}`, { method: 'POST' })).headers.get('set-cookie')
    assert.match(cookie, /Path=\/api\/auth;/)
    assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/)
    if (path.endsWith('/logout')) assert.match(cookie, /Max-Age=0/)
  }
  assert.equal((await fetch(`${url}/swagger-ui/index.html`)).status, 200)
  console.log('PASS EC2 image: nginx -t, SPA, cache, headers, API 401/query/method/headers, refresh cookie issuance/expiry, Swagger; synthetic gateway only.')
} catch (error) {
  if (containers.includes(web)) console.error(await docker('logs', web).catch(() => 'Container logs unavailable'))
  throw error
} finally {
  for (const name of containers.reverse()) await docker('rm', '-f', name).catch(() => {})
  if (networkCreated) await docker('network', 'rm', network).catch(() => {})
  if (imageCreated) await docker('image', 'rm', image).catch(() => {})
  if (gatewayImageCreated) await docker('image', 'rm', gatewayImage).catch(() => {})
}
