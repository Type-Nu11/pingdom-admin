import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectSnapshots, compareDocuments, operations, validateOpenApi } from '../scripts/refresh-openapi-snapshots.mjs'

const document = () => ({ openapi: '3.0.1', paths: { '/test': { get: { tags: ['old'], operationId: 'old', responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } } } } } } }, components: { schemas: { Item: { type: 'object', properties: { id: { type: 'integer' } } } } } })
test('renamed tags/operationIds do not masquerade as contract changes', () => {
  const before = document(), after = document()
  after.paths['/test'].get.tags = ['new']
  after.paths['/test'].get.operationId = 'new'
  const diff = compareDocuments(before, after)
  assert.equal(diff.operations.changed[0].contract.length, 0)
  assert.equal(diff.operations.changed[0].documentation.length, 2)
})
test('unchanged references still expose required, nullable, and property schema changes', () => {
  const before = document(), after = document()
  after.components.schemas.Item.required = ['id']
  after.components.schemas.Item.properties.id.nullable = true
  after.components.schemas.Item.properties.id.description = 'documentation'
  const diff = compareDocuments(before, after)
  assert.deepEqual(diff.operations.changed, [])
  assert.equal(diff.schemas.changed[0].contract.length, 2)
  assert.equal(diff.schemas.changed[0].documentation.length, 1)
})
test('new/removed operations, inherited path parameters and security are covered', () => {
  const before = document(), after = document()
  after.paths['/new'] = after.paths['/test']
  delete after.paths['/test']
  const diff = compareDocuments(before, after)
  assert.deepEqual(diff.operations.added, ['GET /new'])
  assert.deepEqual(diff.operations.removed, ['GET /test'])
  const next = document()
  next.paths['/test'].parameters = [{ in: 'header', name: 'X-Timestamp', required: true }]
  next.security = [{ bearerAuth: [] }]
  assert.ok(operations(next)['GET /test'].pathParameters)
  assert.equal(compareDocuments(before, next).operations.changed[0].contract.length, 2)
})
test('invalid, empty, redirected, failed and non-JSON snapshots cannot be accepted', async () => {
  for (const doc of [{}, { openapi: '3.0.1', paths: {} }, { openapi: '3.0.1', paths: { bad: null } }, { openapi: '3.0.1', paths: { '/bad': { get: null } } }]) assert.throws(() => validateOpenApi(doc))
  const sources = { admin: 'https://example.test/admin', merchant: 'https://example.test/merchant' }
  for (const status of [301, 401, 503]) await assert.rejects(collectSnapshots(sources, async () => ({ status })), /HTTP/)
  await assert.rejects(collectSnapshots(sources, async () => ({ status: 200, text: async () => '<html>error</html>' })))
  await assert.rejects(collectSnapshots(sources, async url => ({ status: 200, text: async () => url.endsWith('/admin') ? JSON.stringify(document()) : '{}' })), /OpenAPI/)
  await assert.rejects(collectSnapshots({ ...sources, merchant: 'http://example.test/merchant' }, async () => ({ status: 200, text: async () => JSON.stringify(document()) })), /HTTPS/)
  await assert.rejects(collectSnapshots({ ...sources, merchant: 'https://user:password@example.test/merchant' }, async () => ({ status: 200, text: async () => JSON.stringify(document()) })), /Credentials/)
})
test('public retrieval preserves source bytes and records each collection timestamp', async () => {
  const raw = JSON.stringify(document(), null, 2) + '\n'
  const sources = { admin: 'https://example.test/admin', merchant: 'https://example.test/merchant' }
  const results = await collectSnapshots(sources, async (url, options) => {
    assert.equal(options.redirect, 'manual')
    assert.equal(options.headers, undefined)
    return { status: 200, text: async () => raw }
  })
  for (const result of results) {
    assert.equal(result.raw, raw)
    assert.equal(result.url, sources[result.group])
    assert.ok(Number.isFinite(Date.parse(result.collectedAt)))
  }
})
test('schema properties named like documentation fields remain contract changes', () => {
  const before = document(), after = document()
  after.components.schemas.Item.properties.tags = { type: 'string' }
  assert.equal(compareDocuments(before, after).schemas.changed[0].contract.length, 1)
})

test('response maps reject malformed shapes and accept references, ranges and default responses', async () => {
  const sources = { admin: 'https://example.test/admin', merchant: 'https://example.test/merchant' }
  for (const responses of ['invalid', [], {}, null, { 200: null }, { 200: [] }, { 200: {} }, { 200: { $ref: '' } }, { invalid: { description: 'OK' } }, { 'x-note': 'only extension' }]) {
    const invalid = document()
    invalid.paths['/test'].get.responses = responses
    assert.throws(() => validateOpenApi(invalid), /OpenAPI/)
    await assert.rejects(collectSnapshots(sources, async () => ({ status: 200, text: async () => JSON.stringify(invalid) })), /OpenAPI/)
  }
  const valid = document()
  valid.paths['/test'].get.responses = {
    200: { $ref: '#/components/responses/Success' },
    '4XX': { description: 'Client error' },
    default: { description: 'Other responses' },
    'x-note': 'extension',
  }
  valid.components.responses = { Success: { description: 'OK' } }
  assert.equal(validateOpenApi(valid), valid)
})

test('CLI leaves both snapshots, metadata and report unchanged when either group has invalid responses', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pingdom-openapi-rejection-'))
  try {
    mkdirSync(join(directory, 'docs/openapi'), { recursive: true })
    const original = {
      'admin.json': JSON.stringify(document()),
      'merchant.json': JSON.stringify(document()),
      'metadata.json': JSON.stringify({ sources: { admin: 'https://example.test/admin', merchant: 'https://example.test/merchant' } }),
      'contract-changes.json': '{"original":true}\n',
    }
    for (const [name, raw] of Object.entries(original)) writeFileSync(join(directory, 'docs/openapi', name), raw)
    const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8' })
    git(['init', '-q'])
    git(['add', 'docs/openapi'])
    git(['-c', 'user.name=Contract test', '-c', 'user.email=contract@example.test', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'test baseline'])
    const script = fileURLToPath(new URL('../scripts/refresh-openapi-snapshots.mjs', import.meta.url))
    for (const group of ['admin', 'merchant']) for (const responses of ['invalid', [], {}]) {
      const invalid = document()
      invalid.paths['/test'].get.responses = responses
      const runner = `process.argv = [process.execPath, ${JSON.stringify(script)}, '--refresh', '--baseline', 'HEAD'];
        globalThis.fetch = async url => ({ status: 200, text: async () => JSON.stringify(url.endsWith('/${group}') ? ${JSON.stringify(invalid)} : ${JSON.stringify(document())}) });
        await import(${JSON.stringify(new URL('../scripts/refresh-openapi-snapshots.mjs', import.meta.url).href)});`
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', runner], { cwd: directory, encoding: 'utf8', timeout: 10000 })
      assert.equal(result.error, undefined)
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /OpenAPI.*responses/)
      for (const [name, raw] of Object.entries(original)) assert.equal(readFileSync(join(directory, 'docs/openapi', name), 'utf8'), raw)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('path server additions, URL changes and removals remain visible as contract differences', () => {
  const before = document(), after = document()
  after.paths['/test'].servers = [{ url: 'https://old.example' }]
  let change = compareDocuments(before, after).operations.changed[0]
  assert.equal(change.contract[0].pointer, '/pathServers')
  assert.equal(change.contract[0].kind, 'added')
  assert.equal(change.documentation.length, 0)
  const next = structuredClone(after)
  next.paths['/test'].servers[0].url = 'https://new.example'
  change = compareDocuments(after, next).operations.changed[0]
  assert.equal(change.contract[0].kind, 'changed')
  assert.deepEqual(change.contract[0].after, [{ url: 'https://new.example' }])
  change = compareDocuments(next, before).operations.changed[0]
  assert.equal(change.contract[0].kind, 'removed')
  assert.deepEqual(change.contract[0].before, [{ url: 'https://new.example' }])
})

test('root, path and operation servers are compared without masking overrides', () => {
  const before = document()
  before.servers = [{ url: 'https://root.example' }]
  before.paths['/test'].servers = [{ url: 'https://path.example' }]
  before.paths['/test'].get.servers = [{ url: 'https://operation.example' }]
  const after = structuredClone(before)
  after.servers[0].url = 'https://root-new.example'
  after.paths['/test'].servers[0].url = 'https://path-new.example'
  after.paths['/test'].get.servers[0].url = 'https://operation-new.example'
  const diff = compareDocuments(before, after)
  assert.deepEqual(diff.operations.changed[0].contract.map(c => c.pointer), ['/pathServers', '/servers'])
  assert.equal(diff.document[0].pointer, '/servers')
})
