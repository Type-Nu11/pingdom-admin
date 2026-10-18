import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from '../helpers/isolated-vite.mjs'

export async function startReservationSetupServer(port = 0) {
  const output = await mkdtemp(join(tmpdir(), 'pingdom-295-'))
  const server = await createServer({ cacheDir: join(output, 'cache'), server: { host: '127.0.0.1', port, strictPort: port !== 0, open: false }, plugins: [{
    name: 'reservation-setup-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.headers.accept?.includes('text/html')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/reservation-setup-fixture.jsx')))
      })
    },
  }] })
  await server.listen()
  return { server, output, base: `http://127.0.0.1:${server.httpServer.address().port}` }
}
if (process.argv[1]?.endsWith('reservation-setup-server.mjs')) {
  const { server, base } = await startReservationSetupServer(5197)
  console.log(`Synthetic slot QA (no real API): ${base}/merchant/reservations/products`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
}
