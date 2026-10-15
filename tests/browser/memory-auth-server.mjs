import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { createServer } from '../helpers/isolated-vite.mjs'
import { loginData, token } from '../helpers/auth-session.mjs'

// Synthetic HTTP cookie server. No development proxy, .env, or real credentials.
let refreshCookie = '', owner = 1, mode = 'ok', rotations = 0
const requests = []
const server = await createServer({ base: '/console/', server: { host: '127.0.0.1', port: 5198, strictPort: true, open: false, hmr: false }, plugins: [{
  name: 'memory-auth-qa', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const path = req.url.split('?')[0]
      if (path.startsWith('/api/')) {
        const body = []
        for await (const chunk of req) body.push(chunk)
        let payload = {}
        try { payload = JSON.parse(Buffer.concat(body).toString() || '{}') } catch { /* Synthetic empty payload. */ }
        const send = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(data)) }
        if (path === '/api/qa/mode') { mode = payload.mode; return send(200, { mode }) }
        if (path === '/api/qa/status') return send(200, { mode, rotations, requests })
        requests.push({ path, method: req.method }) // Never log tokens, cookies, or credentials.
        const setCookie = () => {
          refreshCookie = randomUUID()
          res.setHeader('Set-Cookie', `qa-refresh=${refreshCookie}; HttpOnly; SameSite=Strict; Path=/api`)
        }
        const profile = () => loginData(owner, owner === 1 ? 'ADMIN' : 'MERCHANT_OWNER')
        if (path === '/api/auth/admin/login' || path === '/api/auth/login') {
          owner = payload.username === 'merchant-b' ? 2 : 1
          setCookie(); return send(200, profile())
        }
        const cookie = /(?:^|;\s*)qa-refresh=([^;]+)/.exec(req.headers.cookie ?? '')?.[1]
        if (path === '/api/auth/token/refresh') {
          if (mode === '503') return send(503, { code: 'SYNTHETIC_OUTAGE' })
          if (!refreshCookie || cookie !== refreshCookie || mode === 'expired') return send(401, { code: 'INVALID_TOKEN' })
          setCookie(); rotations++
          return send(200, { accessToken: mode === 'mismatch' ? token(99) : token(owner, `-${rotations}`) })
        }
        if (path === '/api/auth/logout') {
          if (mode === 'logout503') return send(503, { code: 'SYNTHETIC_OUTAGE' })
          refreshCookie = ''; res.setHeader('Set-Cookie', 'qa-refresh=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0')
          return send(200, {})
        }
        if (!req.headers.authorization) return send(401, { code: 'AUTHENTICATION_REQUIRED' })
        if (path === '/api/users/me') return send(200, profile())
        return send(200, { notifications: [], unreadCount: 0, items: [], reports: [], requests: [], candidates: [], groups: [], profiles: [], reservations: [], applications: [], anomalies: [], total: 0, totalCount: 0, totalElements: 0, totalPages: 0, page: 1, limit: 20, hasNext: false })
      }
      if (!['/console/login', '/console/dashboard', '/console/places', '/console/merchant', '/console/merchant/menus'].includes(path)) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/memory-auth-fixture.jsx')))
    })
  },
}] })
await server.listen()
console.log('Synthetic auth QA: http://127.0.0.1:5198/console/login')
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await server.close(); process.exit(0) })
