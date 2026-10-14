import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'
export async function startMerchantDialogServer() {
  const temp = await mkdtemp(join(tmpdir(), 'pingdom-dialog-qa-'))
  const server = await createServer({ cacheDir: join(temp, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'merchant-dialog-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/__qa/merchant-dialog') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-dialog-fixture.jsx')))
    })
  } }] })
  await server.listen()
  return { server, output: temp, base: `http://127.0.0.1:${server.httpServer.address().port}` }
}
if (process.argv[1]?.endsWith('merchant-dialog-server.mjs')) {
  const { server, base } = await startMerchantDialogServer()
  console.log(`Synthetic QA URL: ${base}/__qa/merchant-dialog`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
}
