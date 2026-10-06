import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

export async function startAccessibilityServer(port = 0) {
  const server = await createServer({ server: { host: '127.0.0.1', port, strictPort: port !== 0, open: false }, plugins: [{
    name: 'ui-accessibility-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/__qa/accessibility') return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/ui-accessibility-fixture.jsx')))
      })
    },
  }] })
  await server.listen()
  return { server, url: `http://127.0.0.1:${server.httpServer.address().port}/__qa/accessibility` }
}
if (process.argv[1]?.endsWith('ui-accessibility-server.mjs')) {
  const { server, url } = await startAccessibilityServer(5196)
  console.log(`Synthetic UI QA (no real API): ${url}`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
}
