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
const edgeNetwork = `${network}-edge`
const gateway = `pingdom-qa-gateway-${suffix}`
const gatewayImage = `pingdom-admin-gateway-qa:${suffix}`
const docker = async (...args) => (await exec('docker', args, { cwd: root, timeout: 600_000, maxBuffer: 10 * 1024 * 1024 })).stdout.trim()
let networkCreated = false
let edgeNetworkCreated = false
const containers = [], images = [], webContainers = []
const buildArgs = base => ['--build-arg', 'VITE_NAVER_MAP_CLIENT_ID=qa-public-client-id', '--build-arg', `VITE_APP_BASE_PATH=${base}`]

async function verifyCompose() {
  for (const base of ['/', '/operator/']) {
    for (const bind of ['127.0.0.1', '10.0.0.10']) {
      const { stdout } = await exec('docker', ['compose', '--env-file', 'deploy/ec2.env.example', 'config', '--format', 'json'], {
        cwd: root, env: { ...process.env, PINGDOM_IMAGE_TAG: 'qa-synthetic', VITE_NAVER_MAP_CLIENT_ID: 'qa-public-client-id',
          VITE_APP_BASE_PATH: base, PINGDOM_WEB_BIND_ADDRESS: bind, PINGDOM_WEB_PORT: '8082', PINGDOM_API_UPSTREAM: 'qa-gateway:8081' },
      })
      const service = JSON.parse(stdout).services.web
      assert.equal(service.build.args.VITE_APP_BASE_PATH, base)
      assert.equal(service.build.args.VITE_PUBLIC_API_BASE_URL, '/api')
      assert.equal(service.ports[0].host_ip, bind)
      assert.equal(String(service.ports[0].published), '8082')
      assert.equal(service.ports[0].target, 8080)
    }
  }
  console.log('PASS Compose base/private-IP configuration (validation only, no private-IP listener started).')
}

async function waitReady(url) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(url)).ok) return } catch { /* starting */ }
    await setTimeout(250)
  }
  throw new Error('Synthetic container did not become healthy: ' + url)
}

async function verifyBase(base) {
  const name = base === '/' ? 'root' : 'operator'
  const image = `pingdom-admin-qa:${suffix}-${name}`
  const web = `pingdom-qa-web-${suffix}-${name}`
  const outer = `pingdom-qa-outer-${suffix}-${name}`
  console.log(`Building and verifying ${base} with a synthetic external proxy and gateway.`)
  images.push(image)
  await docker('build', ...buildArgs(base), '-t', image, '.')
  await docker('run', '-d', '--name', web, '--network', network, '--network-alias', `qa-web-${name}`,
    '-e', 'PINGDOM_API_UPSTREAM=qa-gateway:8081', image)
  containers.push(web); webContainers.push(web)
  await docker('exec', web, 'nginx', '-t')
  const proxySource = await readFile(new URL('../tests/fixtures/ec2-outer-proxy.mjs', import.meta.url), 'utf8')
  // Docker internal networks cannot publish host ports. Only the synthetic
  // edge proxy joins a second network, with its listener restricted to loopback.
  await docker('run', '-d', '--name', outer, '--network', edgeNetwork,
    '-e', `QA_WEB_BASE=${base}`, '-e', `QA_WEB_UPSTREAM=qa-web-${name}:8080`,
    '-p', '127.0.0.1::8080', gatewayImage, 'node', '--input-type=module', '-e', proxySource)
  containers.push(outer)
  await docker('network', 'connect', network, outer)
  const port = (await docker('port', outer, '8080/tcp')).split(':').at(-1)
  const origin = `http://127.0.0.1:${port}`
  const ui = path => origin + base + path.replace(/^\//, '')
  await waitReady(ui('healthz'))
  for (const path of ['login', 'dashboard', 'merchant/reservations/setup', 'index.html']) {
    const res = await fetch(ui(path))
    assert.equal(res.status, 200, path)
    assert.match(res.headers.get('content-type'), /text\/html/)
    assert.match(res.headers.get('cache-control'), /no-store/)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.match(res.headers.get('content-security-policy-report-only'), /worker-src 'self' blob:/)
    assert.equal(res.headers.get('content-security-policy'), null)
  }
  if (base !== '/') {
    const redirect = await fetch(origin + base.slice(0, -1), { redirect: 'manual' })
    assert.equal(redirect.status, 308)
    assert.equal(redirect.headers.get('location'), base)
    assert.equal((await fetch(origin + '/operatorial/login')).status, 404)
  }
  const html = await (await fetch(ui('index.html'))).text()
  const asset = html.match(/src="([^\"]+\.js)"/)?.[1]
  assert.ok(asset?.startsWith(base + 'assets/'), 'built entry asset uses the public UI base')
  const entry = await fetch(origin + asset)
  assert.equal(entry.status, 200)
  assert.match(entry.headers.get('cache-control'), /immutable/)
  assert.equal(entry.headers.get('x-content-type-options'), 'nosniff')
  const logo = await fetch(ui('pingdom-logo.png'))
  assert.equal(logo.status, 200)
  assert.match(logo.headers.get('content-type'), /image\/png/)
  assert.ok(html.includes(`href="${base}favicon.svg"`))
  assert.equal((await fetch(ui('favicon.svg'))).status, 200)
  const files = (await docker('exec', web, 'find', '/usr/share/nginx/html/assets', '-type', 'f')).split('\n').filter(Boolean)
  for (const file of files.filter(file => /\.(svg|mjs)$/.test(file))) {
    const path = file.replace('/usr/share/nginx/html/', '')
    if (file.endsWith('.svg')) assert.match(path, /^assets\/[A-Za-z0-9_-]+\.svg$/, 'image URLs must use ASCII filenames')
    const res = await fetch(ui(path))
    assert.equal(res.status, 200, path)
    assert.match(res.headers.get('content-type'), file.endsWith('.svg') ? /image\/svg\+xml/ : /javascript/)
    assert.match(res.headers.get('cache-control'), /immutable/)
    if (file.endsWith('.svg')) assert.match(await res.text(), /<svg\b/)
  }
  assert.ok(files.some(file => file.endsWith('.mjs')), 'built PDF.js worker exists')
  assert.ok(files.some(file => file.endsWith('.svg')), 'built map marker SVGs exist')
  assert.equal((await fetch(ui('pdfjs/cmaps/Adobe-Korea1-UCS2.bcmap'))).status, 200)
  for (const path of ['assets/missing-12345678.js', 'pdfjs/cmaps/missing.bcmap', '.env']) assert.equal((await fetch(ui(path))).status, 404, path)
  for (const status of [401, 403, 404, 503]) {
    const res = await fetch(`${origin}/api/fail/${status}`)
    assert.equal(res.status, status)
    assert.match(res.headers.get('content-type'), /application\/json/)
    assert.deepEqual(await res.json(), { code: `SYNTHETIC_${status}` })
  }
  const echo = await fetch(`${origin}/api/echo?query=hello%20world`, { method: 'POST', headers: { Authorization: 'Bearer synthetic', 'X-Timestamp': '123' } })
  assert.deepEqual(await echo.json(), { url: '/echo?query=hello%20world', method: 'POST', authorization: 'Bearer synthetic', timestamp: '123', host: '127.0.0.1', forwardedProto: 'https' })
  for (const path of ['/auth/login', '/auth/logout']) {
    const cookie = (await fetch(`${origin}/api${path}`, { method: 'POST' })).headers.get('set-cookie')
    assert.match(cookie, /Path=\/api\/auth;/)
    assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/)
    if (path.endsWith('/logout')) assert.match(cookie, /Max-Age=0/)
  }
  for (const path of ['/swagger-ui/index.html', '/v3/api-docs']) assert.equal((await fetch(origin + path)).status, 200)
  console.log(`PASS ${base}: outer proxy prefix, SPA, logo/SVG/PDF, cache/CSP, API status/header/query, cookies, Swagger.`)
}

try {
  await docker('info')
  await verifyCompose()
  images.push(gatewayImage)
  await docker('build', '--target', 'build', ...buildArgs('/'), '-t', gatewayImage, '.')
  await docker('network', 'create', '--internal', network); networkCreated = true
  await docker('network', 'create', edgeNetwork); edgeNetworkCreated = true
  const gatewaySource = await readFile(new URL('../tests/fixtures/ec2-gateway.mjs', import.meta.url), 'utf8')
  await docker('run', '-d', '--name', gateway, '--network', network, '--network-alias', 'qa-gateway', gatewayImage, 'node', '--input-type=module', '-e', gatewaySource)
  containers.push(gateway)
  for (const base of ['/', '/operator/']) await verifyBase(base)
  console.log('PASS EC2 deployment matrix. Synthetic network only; real TLS, NAVER credentials and EC2 ingress remain separate QA.')
} catch (error) {
  for (const web of webContainers) console.error(await docker('logs', web).catch(() => 'Container logs unavailable'))
  throw error
} finally {
  for (const name of containers.reverse()) await docker('rm', '-f', name).catch(() => {})
  if (networkCreated) await docker('network', 'rm', network).catch(() => {})
  if (edgeNetworkCreated) await docker('network', 'rm', edgeNetwork).catch(() => {})
  for (const image of images.reverse()) await docker('image', 'rm', image).catch(() => {})
}
