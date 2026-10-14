// Synthetic gateway only. Never forward requests to a real API from this test.
import { createServer } from 'node:http'
createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.url === '/auth/login' || req.url === '/auth/logout') {
    const expired = req.url.endsWith('/logout')
    res.setHeader('Set-Cookie', `PINGDOM_REFRESH_TOKEN=${expired ? '' : 'synthetic'}; Path=/auth; HttpOnly; Secure; SameSite=Lax${expired ? '; Max-Age=0' : ''}`)
    res.end('{}')
  } else if (req.url.startsWith('/echo')) {
    res.end(JSON.stringify({ url: req.url, method: req.method, authorization: req.headers.authorization, timestamp: req.headers['x-timestamp'] }))
  } else if (req.url.startsWith('/swagger-ui/') || req.url.startsWith('/v3/api-docs')) {
    res.end('{"fixture":"swagger"}')
  } else {
    res.writeHead(401)
    res.end('{"code":"UNAUTHORIZED"}')
  }
}).listen(8081, '0.0.0.0')
