// Interactive CUA fixture: real login/router/auth logic, synthetic adapters only.
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

const base = process.env.QA_APP_BASE_PATH ?? '/operator/'
if (!['/', '/operator/'].includes(base)) throw new Error('QA base must be / or /operator/')
const output = await mkdtemp(join(tmpdir(), 'pingdom-operator-browser-'))
const paths = ['login', 'places', 'dashboard', 'merchant', 'merchant/menus'].map(path => base + path)
const server = await createServer({ base, cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
  name: 'operator-deployment-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!paths.includes(req.url.split('?')[0])) return next()
      res.setHeader('Content-Type', 'text/html')
      const html = (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/operator-deployment-fixture.jsx')
      res.end(await vite.transformIndexHtml(req.url, html))
    })
  },
}] })
await server.listen()
console.log(`Synthetic deployment QA: http://127.0.0.1:${server.httpServer.address().port}${base}places?placeId=8`)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0) })
