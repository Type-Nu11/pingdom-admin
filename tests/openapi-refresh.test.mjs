import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectSnapshots, compareDocuments, operations, validateOpenApi } from '../scripts/refresh-openapi-snapshots.mjs'

const document = () => ({ openapi: '3.0.1', paths: { '/test': { get: { tags: ['old'], operationId: 'old', responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } } } } } } }, components: { schemas: { Item: { type: 'object', properties: { id: { type: 'integer' } } } } } })
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
