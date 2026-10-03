// Public GETs only; validate both groups before changing generated artifacts.
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const groups = ['admin', 'merchant']
const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
const presentation = new Set(['description', 'summary', 'title', 'example', 'examples', 'tags', 'operationId', 'externalDocs'])
const digest = text => createHash('sha256').update(text).digest('hex')

export function operations(doc) {
  return Object.fromEntries(Object.entries(doc.paths).flatMap(([path, item]) =>
    Object.entries(item).filter(([method]) => methods.has(method)).map(([method, operation]) =>
      [`${method.toUpperCase()} ${path}`, { ...operation, ...(item.parameters ? { pathParameters: item.parameters } : {}), effectiveSecurity: operation.security ?? doc.security ?? [] }],
    ),
  ))
}

export function validateOpenApi(doc) {
  if (!doc || !/^3\./.test(doc.openapi ?? '') || !doc.paths || Array.isArray(doc.paths)
    || typeof doc.paths !== 'object' || !Object.keys(doc.paths).length) throw new Error('Expected a nonempty OpenAPI 3 document')
  for (const [path, item] of Object.entries(doc.paths)) {
    if (!path.startsWith('/') || !item || typeof item !== 'object') throw new Error('Invalid OpenAPI path')
    for (const [method, operation] of Object.entries(item)) {
      if (methods.has(method) && (!operation || Array.isArray(operation) || typeof operation !== 'object' || !operation.responses)) throw new Error('Invalid OpenAPI operation')
    }
  }
  if (!Object.keys(operations(doc)).length) throw new Error('No supported HTTP operations')
  return doc
}

function differences(before, after, path = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return []
  if (before && after && !Array.isArray(before) && !Array.isArray(after)
    && typeof before === 'object' && typeof after === 'object') {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => differences(before[key], after[key], [...path, key]))
  }
  return [{ pointer: '/' + path.map(x => x.replaceAll('~', '~0').replaceAll('/', '~1')).join('/'),
    kind: before === undefined ? 'added' : after === undefined ? 'removed' : 'changed',
    before: before ?? null, after: after ?? null,
    classification: path.some((x, index) => presentation.has(x) && path[index - 1] !== 'properties') ? 'documentation' : 'contract' }]
}

function compareEntries(before, after) {
  return {
    added: Object.keys(after).filter(key => !(key in before)).sort(),
    removed: Object.keys(before).filter(key => !(key in after)).sort(),
    changed: Object.keys(after).filter(key => key in before).sort().flatMap(key => {
      const changes = differences(before[key], after[key])
      return changes.length ? [{ key, contract: changes.filter(c => c.classification === 'contract'), documentation: changes.filter(c => c.classification === 'documentation') }] : []
    }),
  }
}

export function compareDocuments(before, after) {
  validateOpenApi(before); validateOpenApi(after)
  // An unchanged $ref can hide required/nullable/property changes in its component.
  const rest = doc => ({ ...doc, paths: undefined, components: { ...doc.components, schemas: undefined } })
  return {
    operations: compareEntries(operations(before), operations(after)),
    schemas: compareEntries(before.components?.schemas ?? {}, after.components?.schemas ?? {}),
    document: differences(rest(before), rest(after)),
  }
}

export async function collectSnapshots(sources, fetcher = fetch) {
  return Promise.all(groups.map(async group => {
    const url = sources[group]
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') throw new Error('Public snapshot source must use HTTPS')
    if (parsed.username || parsed.password) throw new Error('Credentials are not allowed in public snapshot URLs')
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) })
    if (response.status !== 200) throw new Error(`${group}: HTTP ${response.status}; snapshots unchanged`)
    const raw = await response.text()
    const doc = validateOpenApi(JSON.parse(raw))
    return { group, url, raw, doc, collectedAt: new Date().toISOString() }
  }))
}

export function buildReport(baseline, snapshots) {
  return { baseline_ref: baseline, groups: Object.fromEntries(snapshots.map(snapshot =>
    [snapshot.group, compareDocuments(snapshot.before, snapshot.doc)],
  )) }
}

async function main() {
  const baseline = process.argv[process.argv.indexOf('--baseline') + 1]
  if (!process.argv.includes('--refresh') || !process.argv.includes('--baseline') || !baseline || baseline.startsWith('-')) {
    throw new Error('Usage: node scripts/refresh-openapi-snapshots.mjs --refresh --baseline <git-ref>')
  }
  const baselineSha = execFileSync('git', ['rev-parse', '--verify', `${baseline}^{commit}`], { encoding: 'utf8' }).trim()
  const oldMetadata = JSON.parse(await readFile('docs/openapi/metadata.json', 'utf8'))
  const snapshots = await collectSnapshots(oldMetadata.sources)
  for (const snapshot of snapshots) {
    const raw = execFileSync('git', ['show', `${baselineSha}:docs/openapi/${snapshot.group}.json`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
    snapshot.before = JSON.parse(raw)
    snapshot.baselineSha256 = digest(raw)
  }
  const report = buildReport(baselineSha, snapshots)
  const metadata = {
    ...oldMetadata, collected_at: snapshots.map(s => s.collectedAt).sort().at(-1),
    source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    issue: '#254', comparison_baseline: baselineSha,
    snapshots: Object.fromEntries(snapshots.map(s => [s.group, { collected_at: s.collectedAt, url: s.url, sha256: digest(s.raw), baseline_sha256: s.baselineSha256, operations: Object.keys(operations(s.doc)).length }])),
    verification: 'Public GET retrieval and static source comparison only; no login, authenticated requests or mutations',
  }
  // Failed downloads or comparisons cannot overwrite the previous snapshots.
  for (const s of snapshots) await writeFile(`docs/openapi/${s.group}.json`, s.raw)
  await writeFile('docs/openapi/metadata.json', JSON.stringify(metadata, null, 2) + '\n')
  await writeFile('docs/openapi/contract-changes.json', JSON.stringify(report, null, 2) + '\n')
  for (const s of snapshots) {
    const diff = report.groups[s.group]
    console.log(`${s.group}: ${Object.keys(operations(s.doc)).length} operations; +${diff.operations.added.length}/-${diff.operations.removed.length}, ${diff.operations.changed.length} changed operations, ${diff.schemas.changed.length} changed schemas`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
