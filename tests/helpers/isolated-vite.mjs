import { createServer as createViteServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Do not read the development proxy or .env. All business calls must stay in
// the synthetic adapter; the browser guard blocks accidental /api traffic too.
export function createServer(options) {
  return createViteServer({
    ...options,
    cacheDir: options.cacheDir ?? mkdtempSync(join(tmpdir(), 'pingdom-isolated-vite-')),
    root: fileURLToPath(new URL('../../', import.meta.url)),
    configFile: false,
    envDir: false,
    plugins: [react(), ...(options.plugins ?? [])],
    server: { ...options.server, proxy: {} },
  })
}
