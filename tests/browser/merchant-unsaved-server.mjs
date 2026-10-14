import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'

// Run separately from the user's development server; the fixture never forwards API calls.
const server = await createServer({ server: { host: '127.0.0.1', port: 5194, strictPort: true, open: false }, plugins: [{
  name: 'merchant-unsaved-fixture',
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url.split('?')[0] !== '/') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml(req.url, (await readFile('index.html', 'utf8')).replace('/src/main.tsx', '/tests/browser/merchant-unsaved-fixture.jsx')))
    })
  },
}] })
await server.listen()
console.log('Synthetic form QA: http://127.0.0.1:5194/?screen=products')
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0) })
