import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const baseline = JSON.parse(readFileSync(new URL('./fixtures/admin-review-feature-baseline.json', import.meta.url), 'utf8'))
const features = ['reservations', 'merchantApplications', 'merchantOwners'].map(name => `src/features/admin/${name}/`)
const printer = ts.createPrinter({ removeComments: true })
const hash = value => createHash('sha256').update(value).digest('hex')
const parse = file => ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
function files(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}
function targetOf(file, specifier) {
  if (!specifier.startsWith('.')) return specifier
  const base = resolve(root, dirname(file), specifier)
  const target = [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx'].map(suffix => base + suffix)]
    .find(path => existsSync(path) && statSync(path).isFile())
  assert.ok(target, `${file}: unresolved ${specifier}`)
  return relative(root, target).replaceAll('\\', '/')
}
function references(file) {
  const result = []
  function visit(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0]
    if (specifier && ts.isStringLiteralLike(specifier)) result.push(targetOf(file, specifier.text))
    ts.forEachChild(node, visit)
  }
  visit(parse(file))
  return result
}

test('the 17 review workflow files have one owner and no old shims or barrels', () => {
  assert.equal(Object.keys(baseline.moves).length, 17)
  assert.deepEqual(features.map(feature => files(feature.slice(0, -1)).length), [6, 7, 4])
  for (const [before, after] of Object.entries(baseline.moves)) {
    assert.equal(existsSync(resolve(root, before)), false, before)
    assert.equal(existsSync(resolve(root, after)), true, after)
  }
  assert.deepEqual(features.flatMap(feature => files(feature.slice(0, -1))).sort(), Object.values(baseline.moves).sort())
})

for (const [file, expected] of Object.entries(baseline.files)) test(`${file}: non-import code and dependency identities remain unchanged`, () => {
  const source = parse(file)
  assert.equal(hash(source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => printer.printNode(ts.EmitHint.Unspecified, node, source)).join('\n')), expected.nonImportHash)
  assert.deepEqual(source.statements.filter(ts.isImportDeclaration).map(node => ({
    clause: node.importClause ? printer.printNode(ts.EmitHint.Unspecified, node.importClause, source) : null,
    target: targetOf(file, node.moduleSpecifier.text),
  })), expected.imports)
})

test('cross-feature consumers are limited to the router, read-only assistants and existing adapters', () => {
  const allowed = new Map([
    ['src/app/router/Router.tsx', [
      features[0] + 'pages/AdminReservationReviewPage.tsx',
      features[1] + 'pages/MerchantPlaceApplicationReviewPage.tsx',
      features[2] + 'pages/MerchantOwnerPage.tsx',
    ]],
    ['src/api/adminPendingWorkApi.ts', [features[1] + 'api/adminMerchantPlaceApplicationApi.ts']],
    ['src/features/assistant/model/assistantTools.ts', [features[1] + 'api/adminMerchantPlaceApplicationApi.ts']],
    ['src/utils/authReturn.ts', [features[0] + 'model/reservationReviewContext.ts']],
    [features[1] + 'hooks/useAdminMerchantPlaceApplications.ts', [features[2] + 'api/adminMerchantOwnerApi.ts', features[2] + 'types/adminMerchantOwner.types.ts']],
  ])
  const observed = []
  for (const file of files('src')) for (const target of references(file)) {
    const feature = features.find(prefix => target.startsWith(prefix))
    if (!feature || file.startsWith(feature)) continue
    assert.ok(allowed.get(file)?.includes(target), `${file} -> ${target}`)
    observed.push(`${file} -> ${target}`)
  }
  assert.deepEqual(observed.sort(), [...allowed].flatMap(([file, targets]) => targets.map(target => `${file} -> ${target}`)).sort())
})

test('API, type and reservation context modules cannot load UI or feature hooks', () => {
  const seen = new Set()
  function visit(file) {
    if (!file.startsWith('src/') || seen.has(file)) return
    seen.add(file)
    assert.ok(!/\/(?:pages|components|hooks)\//.test(file), file)
    for (const target of references(file)) visit(target)
  }
  for (const feature of features) for (const file of [...files(feature + 'api'), ...files(feature + 'types')]) visit(file)
  visit(features[0] + 'model/reservationReviewContext.ts')
})

test('all three page routes stay lazy and keep existing URLs', () => {
  const tree = parse('src/app/router/Router.tsx')
  const router = tree.text
  const routes = new Map()
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'Route') {
      const path = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'path')?.initializer
      const element = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'element')?.initializer
      if (path && ts.isStringLiteral(path) && element && ts.isJsxExpression(element) && element.expression && ts.isJsxSelfClosingElement(element.expression)) routes.set(path.text, element.expression.tagName.getText(tree))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  for (const [component, feature, route] of [
    ['AdminReservationReviewPage', 'reservations', '/reservations/review'],
    ['MerchantPlaceApplicationReviewPage', 'merchantApplications', '/merchant-place-applications'],
    ['MerchantOwnerPage', 'merchantOwners', '/merchant-owners'],
  ]) {
    assert.match(router, new RegExp(`const ${component} = lazy\\([\\s\\S]*?import\\('\\.\\./\\.\\./features/admin/${feature}/pages/${component}'\\)`))
    assert.equal(routes.get(route), component)
  }
  for (const [feature, file, name] of [
    [features[0], 'useAdminReservations.ts', 'ADMIN_RESERVATION_PAGE_SIZE'],
    [features[1], 'useAdminMerchantPlaceApplications.ts', 'APPLICATION_REVIEW_PAGE_SIZE'],
    [features[2], 'useAdminMerchantOwners.ts', 'ADMIN_OWNER_PAGE_SIZE'],
  ]) assert.match(parse(feature + 'hooks/' + file).text, new RegExp(`export const ${name} = 10`))
})

test('domain preview reuses common PDF/dialog/styles; auth and shared UI stay outside feature owners', () => {
  const preview = references(features[1] + 'components/AttachmentPreview.tsx')
  for (const target of ['src/components/common/PdfAttachment.tsx', 'src/components/common/AttachmentPreview.styles.ts', 'src/components/common/AppDialog.tsx']) assert.ok(preview.includes(target), target)
  assert.ok(references('src/components/common/PdfAttachment.tsx').includes('src/components/common/AttachmentPreview.styles.ts'))
  for (const file of ['src/components/common/PdfAttachment.tsx', 'src/components/common/AttachmentPreview.styles.ts', 'src/api/customAxios.ts', 'src/hooks/useAuth.ts']) assert.ok(existsSync(resolve(root, file)), file)
  for (const file of files('src/shared')) for (const target of references(file)) assert.ok(!features.some(feature => target.startsWith(feature)), `${file} -> ${target}`)
})

test('active source, tests and scripts do not reference exact old review paths', () => {
  const oldPaths = Object.keys(baseline.moves).flatMap(file => [file, file.replace(/\.[jt]sx?$/, '')])
  for (const file of ['src', 'tests', 'scripts'].flatMap(files)) {
    function visit(node) {
      if (ts.isStringLiteralLike(node)) for (const old of oldPaths) assert.notEqual(node.text.replace(/^\//, ''), old, `${file}: ${old}`)
      ts.forEachChild(node, visit)
    }
    visit(parse(file))
  }
})

test('API inventory includes each exported workflow operation and preserves read-only reservation access', () => {
  const inventory = JSON.parse(execFileSync(process.execPath, ['scripts/api-source-inventory.mjs'], { cwd: root, encoding: 'utf8' }))
  for (const feature of features) for (const file of files(feature + 'api')) {
    const names = parse(file).statements.filter(node => ts.isFunctionDeclaration(node) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)).map(node => node.name.text)
    assert.ok(names.length > 0, file)
    for (const name of names) {
      const operations = inventory.filter(item => item.file === file && item.function === name)
      assert.equal(operations.length, 1, name)
      assert.ok(operations[0].callers.some(caller => caller.startsWith(feature + 'hooks/')), name)
    }
  }
  const reservations = inventory.filter(item => item.file.startsWith(features[0] + 'api/'))
  assert.equal(reservations.length, 2)
  assert.ok(reservations.every(item => item.method === 'GET'))
  for (const item of inventory) assert.ok(!Object.hasOwn(baseline.moves, item.file), item.file)
})
