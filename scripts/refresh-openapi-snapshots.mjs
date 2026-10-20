// Public GETs only; validate both groups before changing generated artifacts.
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const groups = ['admin', 'merchant']
const references = ['app', 'common']
const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
const presentation = new Set(['description', 'summary', 'title', 'example', 'examples', 'tags', 'operationId', 'externalDocs'])
const digest = text => createHash('sha256').update(text).digest('hex')
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const blocked = (reason, group, httpStatus) => Object.assign(new Error(reason === 'http'
  ? `${group}: HTTP ${httpStatus}; snapshots unchanged`
  : reason === 'network' ? 'Public OpenAPI network request failed' : 'Invalid OpenAPI document responses or JSON'),
{ reason, group: [...groups, ...references].includes(group) ? group : undefined, httpStatus })

export function operations(doc) {
  return Object.fromEntries(Object.entries(doc.paths).flatMap(([path, item]) =>
    Object.entries(item).filter(([method]) => methods.has(method)).map(([method, operation]) =>
      [`${method.toUpperCase()} ${path}`, { ...operation, ...(item.parameters ? { pathParameters: item.parameters } : {}), ...(item.servers !== undefined ? { pathServers: item.servers } : {}), effectiveSecurity: operation.security ?? doc.security ?? [] }],
    ),
  ))
}

export function validateOpenApi(doc) {
  if (!doc || !/^3\./.test(doc.openapi ?? '') || !doc.paths || Array.isArray(doc.paths)
    || typeof doc.paths !== 'object' || !Object.keys(doc.paths).length) throw new Error('Expected a nonempty OpenAPI 3 document')
  for (const [path, item] of Object.entries(doc.paths)) {
    if (!path.startsWith('/') || !isObject(item)) throw new Error('Invalid OpenAPI path')
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue
      if (!isObject(operation) || !isObject(operation.responses)) throw new Error('Invalid OpenAPI operation responses')
      const responses = Object.entries(operation.responses).filter(([status]) => !status.startsWith('x-'))
      if (!responses.length) throw new Error('Empty OpenAPI operation responses')
      for (const [status, response] of responses) {
        if (!(status === 'default' || /^[1-5](?:\d{2}|XX)$/.test(status)) || !isObject(response)) throw new Error('Invalid OpenAPI response entry')
        if ('$ref' in response) {
          if (typeof response.$ref !== 'string' || !response.$ref.trim()) throw new Error('Invalid OpenAPI response reference')
        } else if (typeof response.description !== 'string') throw new Error('Missing OpenAPI response description')
      }
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

export async function collectSnapshots(sources, fetcher = fetch, selectedGroups = groups) {
  return Promise.all(selectedGroups.map(async group => {
    const url = sources[group]
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') throw new Error('Public snapshot source must use HTTPS')
    if (parsed.username || parsed.password) throw new Error('Credentials are not allowed in public snapshot URLs')
    if (parsed.search || parsed.hash) throw new Error('Query strings and fragments are not allowed in public snapshot URLs')
    let response
    try { response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) }) }
    catch { throw blocked('network', group) }
    if (response.status !== 200) throw blocked('http', group, response.status)
    let raw, doc
    try { raw = await response.text(); doc = validateOpenApi(JSON.parse(raw)) }
    catch { throw blocked('invalid-document', group) }
    return { group, url, raw, doc, collectedAt: new Date().toISOString() }
  }))
}

export function buildReport(baseline, snapshots) {
  return { baseline_ref: baseline, groups: Object.fromEntries(snapshots.map(snapshot =>
    [snapshot.group, snapshot.before ? compareDocuments(snapshot.before, snapshot.doc) : { initial_collection: true }],
  )) }
}

export function hasContractChanges(report) {
  return Object.values(report.groups).some(group => group.initial_collection
    || ['operations', 'schemas'].some(section => group[section].added.length || group[section].removed.length
      || group[section].changed.some(change => change.contract.length))
    || group.document.some(change => change.classification === 'contract'))
}

// Check is read-only: failed/blocked retrieval is not evidence of compatibility.
export async function checkSnapshots(metadata, reader = readFile, fetcher = fetch) {
  const selectedGroups = [...metadata.scope, ...(metadata.reference_scope ?? [])]
  const snapshots = await collectSnapshots(metadata.sources, fetcher, selectedGroups)
  for (const snapshot of snapshots) {
    const raw = await reader(`docs/openapi/${snapshot.group}.json`, 'utf8')
    if (digest(raw) !== metadata.snapshots[snapshot.group]?.sha256) throw new Error('Stored snapshot hash mismatch')
    snapshot.before = JSON.parse(raw)
  }
  const report = buildReport('checked-in snapshots', snapshots)
  return { status: hasContractChanges(report) ? 'changed' : 'compatible', report }
}

async function main() {
  if (process.argv.includes('--check')) {
    if (process.argv.includes('--refresh') || process.argv.includes('--baseline')) throw new Error('Check cannot refresh snapshots')
    try {
      const metadata = JSON.parse(await readFile('docs/openapi/metadata.json', 'utf8'))
      const result = await checkSnapshots(metadata)
      console.log(JSON.stringify(result, null, 2))
      process.exitCode = result.status === 'changed' ? 1 : 0
    } catch (error) {
      // Never print remote HTML, response bodies, credentials, or an unsafe source URL.
      console.error(JSON.stringify({ status: 'blocked', reason: error.reason ?? 'source-or-stored-snapshot', group: error.group, httpStatus: error.httpStatus,
        message: 'Public OpenAPI retrieval/validation failed; stored files unchanged. Check connectivity, HTTP status, JSON/OpenAPI and stored hashes.' }))
      process.exitCode = 2
    }
    return
  }
  const baseline = process.argv[process.argv.indexOf('--baseline') + 1]
  if (!process.argv.includes('--refresh') || !process.argv.includes('--baseline') || !baseline || baseline.startsWith('-')) {
    throw new Error('Usage: node scripts/refresh-openapi-snapshots.mjs --refresh --baseline <git-ref>')
  }
  const baselineSha = execFileSync('git', ['rev-parse', '--verify', `${baseline}^{commit}`], { encoding: 'utf8' }).trim()
  const oldMetadata = JSON.parse(await readFile('docs/openapi/metadata.json', 'utf8'))
  const issue = process.argv.includes('--issue') ? process.argv[process.argv.indexOf('--issue') + 1] : '#302'
  if (!/^#[1-9]\d*$/.test(issue ?? '')) throw new Error('Issue reference must use # followed by a positive issue number')
  const serverRef = process.argv.includes('--server-ref') ? process.argv[process.argv.indexOf('--server-ref') + 1] : null
  if (serverRef !== null && !/^[a-f0-9]{40}$/.test(serverRef ?? '')) throw new Error('Server source reference must be a full commit SHA')
  const sources = { ...oldMetadata.sources,
    app: oldMetadata.sources.app ?? 'https://www.typenull.xyz/v3/api-docs/app',
    common: oldMetadata.sources.common ?? 'https://www.typenull.xyz/v3/api-docs/common' }
  const snapshots = await collectSnapshots(sources, fetch, [...groups, ...references])
  for (const snapshot of snapshots) {
    const baselineFile = `${baselineSha}:docs/openapi/${snapshot.group}.json`
    const exists = (() => { try { execFileSync('git', ['cat-file', '-e', baselineFile], { stdio: 'ignore' }); return true } catch { return false } })()
    if (!exists && groups.includes(snapshot.group)) throw new Error('Missing required baseline snapshot')
    if (exists) {
      const raw = execFileSync('git', ['show', baselineFile], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
      snapshot.before = JSON.parse(raw)
      snapshot.baselineSha256 = digest(raw)
    }
  }
  const report = buildReport(baselineSha, snapshots)
  const metadata = {
    ...oldMetadata, sources, scope: groups, reference_scope: references, excluded: ['consulting'],
    collected_at: snapshots.map(s => s.collectedAt).sort().at(-1),
    source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    issue, comparison_baseline: baselineSha,
    server_source_reference: serverRef,
    server_source_verification: 'Source reference is separate from deployed version; OpenAPI info.version is not release provenance',
    snapshots: Object.fromEntries(snapshots.map(s => [s.group, { collected_at: s.collectedAt, url: s.url, sha256: digest(s.raw), baseline_sha256: s.baselineSha256 ?? null, operations: Object.keys(operations(s.doc)).length }])),
    verification: 'Public GET retrieval and static source comparison only; no login, authenticated requests or mutations',
  }
  // Failed downloads or comparisons cannot overwrite the previous snapshots.
  for (const s of snapshots) await writeFile(`docs/openapi/${s.group}.json`, s.raw)
  await writeFile('docs/openapi/metadata.json', JSON.stringify(metadata, null, 2) + '\n')
  await writeFile('docs/openapi/contract-changes.json', JSON.stringify(report, null, 2) + '\n')
  for (const s of snapshots) {
    const diff = report.groups[s.group]
    console.log(`${s.group}: ${Object.keys(operations(s.doc)).length} operations; ${diff.initial_collection ? 'initial reference collection (no historical comparison)' : `+${diff.operations.added.length}/-${diff.operations.removed.length}, ${diff.operations.changed.length} changed operations, ${diff.schemas.changed.length} changed schemas`}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
