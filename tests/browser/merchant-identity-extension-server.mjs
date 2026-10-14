import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'

export async function createIdentityQaServer() {
  const output = await mkdtemp(join(tmpdir(), 'pingdom-identity-extension-'))
  const server = await createServer({ envDir: false, cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'identity-extension-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!['/merchant/verified-boost', '/merchant/place-reverification'].includes(req.url?.split('?')[0])) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-identity-extension-fixture.jsx')))
    })
  } }] })
  await server.listen()
  return { server, output, base: `http://127.0.0.1:${server.httpServer.address().port}` }
}
if (process.argv.includes('--serve')) {
  const { server, base } = await createIdentityQaServer()
  console.log(`Synthetic readonly QA: ${base}/merchant/verified-boost`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
}
