import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { resolveConfig } from 'vite'
import { createServer } from './helpers/isolated-vite.mjs'

test('project Vite config isolates each Node test server from the shared optimizer cache', async () => {
  assert.ok(process.env.NODE_TEST_CONTEXT)
  const configs = await Promise.all([0, 1].map(() => resolveConfig({ envDir: false, logLevel: 'silent' }, 'serve')))
  assert.notEqual(configs[0].cacheDir, configs[1].cacheDir)
  assert.ok(configs.every(config => config.cacheDir.startsWith(join(tmpdir(), 'pingdom-unit-vite-'))))
})

test('config-free test servers also have independent default caches and can load modules concurrently', async () => {
  const servers = []
  try {
    for (let index = 0; index < 2; index++) servers.push(await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' }))
    assert.notEqual(servers[0].config.cacheDir, servers[1].config.cacheDir)
    assert.ok(servers.every(server => server.config.cacheDir.startsWith(join(tmpdir(), 'pingdom-isolated-vite-'))))
    const modules = await Promise.all(servers.map(server => server.ssrLoadModule('/src/utils/appBasePath.ts')))
    assert.ok(modules.every(module => module.normalizeAppBasePath('/console') === '/console/'))
  } finally {
    await Promise.all(servers.map(server => server.close()))
  }
})

test('an explicitly supplied cache directory remains supported', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'pingdom-explicit-vite-'))
  const server = await createServer({ cacheDir, server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try { assert.equal(server.config.cacheDir, cacheDir) } finally { await server.close() }
})

test('normal development and build config retain the Vite default cache', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { resolveConfig } from 'vite'
    const config = await resolveConfig({ envDir: false, logLevel: 'silent' }, 'build')
    process.stdout.write(JSON.stringify({ cacheDir: config.cacheDir, root: config.root }))
  `], { env, encoding: 'utf8' })
  const config = JSON.parse(result)
  assert.equal(config.cacheDir, join(config.root, 'node_modules', '.vite'))
})
