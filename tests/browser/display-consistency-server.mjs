import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
const temp = await mkdtemp(join(tmpdir(), 'pingdom-display-qa-'))
const server = await createServer({ cacheDir: join(temp, 'cache'), server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'display-consistency-fixture', configureServer(vite) {
  vite.middlewares.use(async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/__qa/display-consistency') return next()
    res.setHeader('Content-Type', 'text/html')
    res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/display-consistency-fixture.jsx')))
  })
} }] })
await server.listen()
console.log(`Synthetic QA URL: http://127.0.0.1:${server.httpServer.address().port}/__qa/display-consistency`)
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
