import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
const cMapDirectory = join(dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps')

// PDF.js requests CMaps by their original names, so keep the directory structure.
export function pdfCMapAssets(): Plugin {
  let assets: Map<string, Uint8Array>
  return {
    name: 'pdf-cmap-assets',
    async buildStart() {
      const names = (await readdir(cMapDirectory)).filter(name => name.endsWith('.bcmap') || name === 'LICENSE')
      assets = new Map(await Promise.all(names.map(async name => [name, await readFile(join(cMapDirectory, name))] as const)))
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url ?? '').split('?')[0]
        const prefix = `${server.config.base}pdfjs/cmaps/`
        if (!pathname.startsWith(prefix)) return next()
        const file = assets?.get(pathname.slice(prefix.length))
        if (!file) { response.statusCode = 404; response.end(); return }
        response.setHeader('Content-Type', 'application/octet-stream')
        response.end(file)
      })
    },
    generateBundle() {
      for (const [name, source] of assets) {
        this.emitFile({ type: 'asset', fileName: `pdfjs/cmaps/${name}`, source })
      }
    },
  }
}
