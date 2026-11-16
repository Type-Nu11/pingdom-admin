import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const baseline = JSON.parse(readFileSync(new URL('./fixtures/admin-user-feature-baseline.json', import.meta.url), 'utf8'))
const features = ['src/features/admin/userBans/', 'src/features/admin/userRoles/']
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

test('the 13 user-owned files have one feature location without old shims or barrel files', () => {
  assert.equal(Object.keys(baseline.moves).length, 13)
  for (const [before, after] of Object.entries(baseline.moves)) {
    assert.equal(existsSync(resolve(root, before)), false, before)
    assert.equal(existsSync(resolve(root, after)), true, after)
  }
  assert.deepEqual(features.flatMap(feature => files(feature.slice(0, -1))).sort(), Object.values(baseline.moves).sort())
})

for (const [file, expected] of Object.entries(baseline.files)) {
  test(`${file}: relocation preserves non-import AST, import bindings and dependency identity`, () => {
    const source = parse(file)
    const body = source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => printer.printNode(ts.EmitHint.Unspecified, node, source)).join('\n')
    assert.equal(hash(body), expected.nonImportHash)
    assert.deepEqual(source.statements.filter(ts.isImportDeclaration).map(node => ({
      clause: node.importClause ? printer.printNode(ts.EmitHint.Unspecified, node.importClause, source) : null,
      target: targetOf(file, node.moduleSpecifier.text),
    })), expected.imports)
  })
}

test('only the router imports user feature pages from outside; shared code never imports either feature', () => {
  const observed = []
  for (const file of files('src')) {
    for (const target of references(file)) {
      const feature = features.find(prefix => target.startsWith(prefix))
      if (!feature || file.startsWith(feature)) continue
      assert.equal(file, 'src/app/router/Router.tsx', `${file} -> ${target}`)
      assert.ok(['/pages/UserBanPage.tsx', '/pages/UserRolePage.tsx'].some(suffix => target.endsWith(suffix)), target)
      observed.push(target)
    }
  }
  assert.deepEqual(observed.sort(), features.map((feature, index) => feature + `pages/${index === 0 ? 'UserBanPage' : 'UserRolePage'}.tsx`).sort())
})

test('user API and type dependency graphs do not load UI or feature state', () => {
  const seen = new Set()
  function visit(file) {
    if (!file.startsWith('src/') || seen.has(file)) return
    seen.add(file)
    assert.ok(!/\/(?:pages|components|hooks)\//.test(file), file)
    for (const target of references(file)) visit(target)
  }
  for (const feature of features) for (const file of [...files(feature + 'api'), ...files(feature + 'types')]) visit(file)
})

test('user routes remain independently lazy at their existing URLs', () => {
  const router = parse('src/app/router/Router.tsx').text
  for (const [component, feature, route] of [['UserBanPage', 'userBans', '/bans'], ['UserRolePage', 'userRoles', '/users/roles']]) {
    assert.ok(router.includes(`const ${component} = lazy(() => import('../../features/admin/${feature}/pages/${component}'))`))
    assert.ok(router.includes(`<Route path="${route}" element={<${component} />} />`))
  }
  for (const file of ['src/hooks/useAuth.ts', 'src/api/customAxios.ts', 'src/types/auth.types.ts', 'src/components/common/AdminTargetSearch.tsx', 'src/app/layouts/AdminLayout.tsx']) assert.ok(existsSync(resolve(root, file)), file)
})

test('active source and tests do not retain exact old user feature path literals', () => {
  const oldPaths = Object.keys(baseline.moves).flatMap(file => [file, file.replace(/\.[jt]sx?$/, '')])
  for (const file of ['src', 'tests', 'scripts'].flatMap(files)) {
    function visit(node) {
      if (ts.isStringLiteralLike(node)) for (const old of oldPaths) assert.notEqual(node.text.replace(/^\//, ''), old, `${file}: ${old}`)
      ts.forEachChild(node, visit)
    }
    visit(parse(file))
  }
})

test('API inventory retains all nine user operations with feature hooks as their consumers', () => {
  const inventory = JSON.parse(execFileSync(process.execPath, ['scripts/api-source-inventory.mjs'], { cwd: root, encoding: 'utf8' }))
  const userOperations = inventory.filter(item => features.some(feature => item.file.startsWith(feature + 'api/')))
  assert.equal(userOperations.length, 9)
  for (const feature of features) {
    for (const file of files(feature + 'api')) {
      const exported = parse(file).statements.filter(node => ts.isFunctionDeclaration(node) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
      for (const declaration of exported) {
        const operations = userOperations.filter(item => item.file === file && item.function === declaration.name.text)
        assert.equal(operations.length, 1, declaration.name.text)
        assert.ok(operations[0].callers.some(caller => caller.startsWith(feature + 'hooks/')), declaration.name.text)
      }
    }
  }
  for (const item of inventory) assert.ok(!Object.hasOwn(baseline.moves, item.file), item.file)
})
