import { createServer as createViteServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Do not read the development proxy or .env. All business calls must stay in
// the synthetic adapter; the browser guard blocks accidental /api traffic too.
export function createServer(options) {
  return createViteServer({
    ...options,
    root: fileURLToPath(new URL('../../', import.meta.url)),
    configFile: false,
    envDir: false,
    plugins: [react(), ...(options.plugins ?? [])],
    server: { ...options.server, proxy: {} },
  })
}
