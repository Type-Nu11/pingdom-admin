import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'

export async function startMerchantReservationQueryServer() {
  const output = await mkdtemp(join(tmpdir(), 'pingdom-315-browser-'))
  const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{
    name: 'merchant-reservation-query-fixture',
    configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/merchant/reservations') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-reservation-query-fixture.jsx')))
    }) },
  }] })
  await server.listen()
  return { server, output, base: 'http://127.0.0.1:' + server.httpServer.address().port }
}
if (process.argv[1]?.endsWith('merchant-reservation-query-server.mjs')) {
  const { server, base, output } = await startMerchantReservationQueryServer()
  console.log('Synthetic query-only QA: ' + base + '/merchant/reservations\nEvidence output: ' + output)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
}
