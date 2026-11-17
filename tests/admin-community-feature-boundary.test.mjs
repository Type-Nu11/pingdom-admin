import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const baseline = JSON.parse(readFileSync(new URL('./fixtures/admin-community-feature-baseline.json', import.meta.url), 'utf8'))
const features = ['community'].map(name => `src/features/admin/${name}/`)
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
  visit(parse(file)); return result
}

test('the 11 community files have exactly one owner without old shims or barrels', () => {
  assert.equal(Object.keys(baseline.moves).length, 11)
  assert.deepEqual(features.map(feature => files(feature.slice(0, -1)).length), [11])
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

test('only the router and existing pending-work adapter consume community modules', () => {
  const observed = []
  for (const file of files('src')) for (const target of references(file)) {
    const feature = features.find(prefix => target.startsWith(prefix))
    if (feature && !file.startsWith(feature)) observed.push(`${file} -> ${target}`)
  }
  assert.deepEqual(observed.sort(), baseline.externalConsumers)
})

test('API, types and the community model never load feature UI, hooks or pages', () => {
  const seen = new Set()
  function visit(file) {
    if (!file.startsWith('src/') || seen.has(file)) return
    seen.add(file)
    assert.ok(!/\/(?:pages|components|hooks)\//.test(file), file)
    for (const target of references(file)) visit(target)
  }
  for (const feature of features) for (const file of [...files(feature + 'api'), ...files(feature + 'types'), ...files(feature + 'model')]) visit(file)
})

test('both community screens remain individually lazy at their protected URLs', () => {
  const tree = parse('src/app/router/Router.tsx')
  const routes = new Map()
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'Route') {
      const path = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'path')?.initializer
      const element = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'element')?.initializer
      if (path && ts.isStringLiteral(path) && element && ts.isJsxExpression(element) && element.expression && ts.isJsxSelfClosingElement(element.expression)) {
        let adminProtected = false
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (!ts.isJsxElement(parent) || parent.openingElement.tagName.getText(tree) !== 'Route') continue
          const wrapper = parent.openingElement.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.text === 'element')?.initializer
          if (wrapper && ts.isJsxExpression(wrapper) && wrapper.expression && ts.isJsxSelfClosingElement(wrapper.expression) && wrapper.expression.tagName.getText(tree) === 'ProtectedRoute') adminProtected = true
        }
        routes.set(path.text, { component: element.expression.tagName.getText(tree), adminProtected })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  for (const [component, feature, route] of [
    ['CommunityContentPage', 'community', '/community'],
    ['CommunityReportsPage', 'community', '/community-reports'],
  ]) {
    assert.match(tree.text, new RegExp(`const ${component} = lazy\\([\\s\\S]*?import\\('\\.\\./\\.\\./features/admin/${feature}/pages/${component}'\\)`))
    assert.deepEqual(routes.get(route), { component, adminProtected: true })
  }
})

test('common auth, dialogs, search, map and shared primitives stay outside feature owners', () => {
  for (const file of ['src/api/customAxios.ts', 'src/hooks/useAuth.ts', 'src/components/common/AdminPlacePicker.tsx', 'src/components/common/AdminTargetSearch.tsx', 'src/components/common/FeedbackMessage.tsx', 'src/components/map/naverMapController.ts']) assert.ok(existsSync(resolve(root, file)), file)
  for (const file of files('src/shared')) for (const target of references(file)) assert.ok(!features.some(feature => target.startsWith(feature)), `${file} -> ${target}`)
})

test('active source, tests and scripts do not retain exact old community paths', () => {
  const oldPaths = Object.keys(baseline.moves).flatMap(file => [file, file.replace(/\.[jt]sx?$/, '')])
  for (const file of ['src', 'tests', 'scripts'].flatMap(files)) {
    function visit(node) {
      if (ts.isStringLiteralLike(node)) for (const old of oldPaths) assert.notEqual(node.text.replace(/^\//, ''), old, `${file}: ${old}`)
      ts.forEachChild(node, visit)
    }
    visit(parse(file))
  }
})

test('all API methods, paths, function names and callers match the normalized pre-move inventory', () => {
  const inventory = JSON.parse(execFileSync(process.execPath, ['scripts/api-source-inventory.mjs'], { cwd: root, encoding: 'utf8' }))
  const normalized = inventory.map(item => ({ ...item, callers: item.callers.slice().sort() })).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  assert.equal(normalized.length, baseline.apiInventoryCount)
  assert.equal(hash(JSON.stringify(normalized)), baseline.apiInventoryHash)
  for (const item of inventory) assert.ok(!Object.hasOwn(baseline.moves, item.file), item.file)
})
