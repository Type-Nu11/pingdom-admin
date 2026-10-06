import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'

export async function startReservationContextServer(port = 0) {
  const temp = await mkdtemp(join(tmpdir(), 'pingdom-reservation-context-'))
  const server = await createServer({ cacheDir: join(temp, 'cache'), server: { host: '127.0.0.1', port, strictPort: port !== 0, open: false }, plugins: [{
    name: 'reservation-context-fixture', enforce: 'pre',
    resolveId(source) { if (source.endsWith('/map/NaverMap')) return resolve('tests/browser/place-map-fixture.jsx') },
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!['/reservations/review', '/places'].includes(req.url?.split('?')[0])) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/reservation-context-fixture.jsx')))
      })
    },
  }] })
  await server.listen()
  return { server, base: `http://127.0.0.1:${server.httpServer.address().port}`, output: temp }
}
if (process.argv[1]?.endsWith('reservation-context-server.mjs')) {
  const { server, base } = await startReservationContextServer(5198)
  console.log(`Synthetic reservation QA (no real API): ${base}/reservations/review?placeId=7&page=2&reservationId=11`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
}
