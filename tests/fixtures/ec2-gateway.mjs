// Synthetic gateway only. Never forward requests to a real API from this test.
import { createServer } from 'node:http'
createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.url === '/auth/login' || req.url === '/auth/logout') {
    const expired = req.url.endsWith('/logout')
    res.setHeader('Set-Cookie', `PINGDOM_REFRESH_TOKEN=${expired ? '' : 'synthetic'}; Path=/auth; HttpOnly; Secure; SameSite=Lax${expired ? '; Max-Age=0' : ''}`)
    res.end('{}')
  } else if (req.url.startsWith('/echo')) {
    res.end(JSON.stringify({ url: req.url, method: req.method, authorization: req.headers.authorization, timestamp: req.headers['x-timestamp'], host: req.headers.host, forwardedProto: req.headers['x-forwarded-proto'] }))
  } else if (/^\/fail\/(401|403|404|503)$/.test(req.url)) {
    const status = Number(req.url.split('/').at(-1))
    res.writeHead(status); res.end(JSON.stringify({ code: `SYNTHETIC_${status}` }))
  } else if (req.url.startsWith('/swagger-ui/') || req.url.startsWith('/v3/api-docs')) {
    res.end('{"fixture":"swagger"}')
  } else {
    res.writeHead(401)
    res.end('{"code":"UNAUTHORIZED"}')
  }
}).listen(8081, '0.0.0.0')
