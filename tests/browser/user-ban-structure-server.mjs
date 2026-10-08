import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'

export async function startUserBanServer() {
  const output = await mkdtemp(join(tmpdir(), 'pingdom-user-ban-'))
  const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'user-ban-structure-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/__qa/user-ban') return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/user-ban-structure-fixture.jsx')))
      })
    },
  }] })
  await server.listen()
  return { server, output, url: `http://127.0.0.1:${server.httpServer.address().port}/__qa/user-ban` }
}
