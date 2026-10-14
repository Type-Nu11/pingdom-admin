// Synthetic external TLS gateway: strip the UI base once, preserve root /api.
// No request can leave the isolated QA Docker network.
import { createServer, request } from 'node:http'
const base = process.env.QA_WEB_BASE
const upstream = process.env.QA_WEB_UPSTREAM
if (!['/', '/operator/'].includes(base) || !/^qa-web-[a-z]+:8080$/.test(upstream ?? '')) throw new Error('Invalid synthetic proxy settings')
createServer((req, res) => {
  let path = req.url
  if (base !== '/' && path.split('?')[0] === base.slice(0, -1)) {
    res.writeHead(308, { Location: base + (path.includes('?') ? '?' + path.split('?')[1] : '') }); res.end(); return
  }
  if (path.startsWith('/api/') || path === '/api' || path.startsWith('/swagger-ui/') || path.startsWith('/v3/api-docs')) {
    // API and Swagger are independent of the UI basename.
  } else if (path.startsWith(base)) {
    path = '/' + path.slice(base.length)
  } else { res.writeHead(404); res.end('Outside synthetic web base'); return }
  const destination = new URL('http://' + upstream)
  const proxy = request({ hostname: destination.hostname, port: destination.port, path, method: req.method,
    headers: { ...req.headers, 'x-forwarded-proto': 'https', 'x-forwarded-for': req.socket.remoteAddress } }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res)
  })
  proxy.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Synthetic upstream unavailable') })
  req.pipe(proxy)
}).listen(8080, '0.0.0.0')
