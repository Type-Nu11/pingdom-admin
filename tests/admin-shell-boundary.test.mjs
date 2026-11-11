import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'
import ts from 'typescript'
import { createServer } from './helpers/isolated-vite.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = JSON.parse(readFileSync(new URL('./fixtures/admin-shell-css.json', import.meta.url), 'utf8'))
const shellPath = 'src/app/layouts/AdminShell.styles.ts'
const iconPath = 'src/shared/ui/MaterialIcon.ts'
const placePath = 'src/pages/place/PlaceManagePage.styles.ts'
const shellNames = Object.keys(baseline.initializers).filter(name => name !== 'MaterialIcon')
const reserved = new Set(Object.keys(baseline.initializers))
function parse(path) {
  return ts.createSourceFile(path, readFileSync(resolve(root, path), 'utf8'), ts.ScriptTarget.Latest, true)
}
function exportedInitializers(tree) {
  return Object.fromEntries(tree.statements.flatMap(statement =>
    ts.isVariableStatement(statement) && statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword)
      ? statement.declarationList.declarations.map(item => [item.name.getText(tree), item.initializer.getText(tree)])
      : []))
}
function localImports(tree) {
  return tree.statements.flatMap(statement =>
    (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier
      && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith('.')
      ? [statement.moduleSpecifier.text] : [])
}
function sourceFiles(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : []
  })
}

test('all extracted shell and icon declarations preserve the pre-refactor CSS, media queries and selectors', () => {
  const shell = exportedInitializers(parse(shellPath))
  const icon = exportedInitializers(parse(iconPath))
  assert.deepEqual(Object.keys(shell), shellNames)
  assert.deepEqual(Object.keys(icon), ['MaterialIcon'])
  assert.deepEqual({ ...shell, ...icon }, baseline.initializers)
  // The copied expressions must still resolve the same semantic tokens.
  assert.match(parse(shellPath).text, /const neutral = adminColors/)
  assert.match(parse(shellPath).text, /import \{ typo, adminColors, radius \} from '\.\.\/\.\.\/styles\/theme'/)
})

test('shared icon and admin shell dependency graphs do not load pages, feature state or the map SDK', () => {
  const visited = new Set()
  function visit(path) {
    if (visited.has(path)) return
    visited.add(path)
    assert.doesNotMatch(path, /^src\/(?:pages|features)\//, path)
    assert.doesNotMatch(path, /^src\/components\/(?:map|place)\//, path)
    for (const specifier of localImports(parse(path))) {
      const target = resolve(root, dirname(path), specifier)
      const resolved = [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`, `${target}/index.tsx`]
        .find(candidate => /\.tsx?$/.test(candidate) && existsSync(candidate))
      assert.ok(resolved, `unresolved local dependency: ${path} -> ${specifier}`)
      visit(relative(root, resolved).replaceAll('\\', '/'))
    }
  }
  visit(shellPath)
  visit(iconPath)
})

test('place styles no longer own or re-export shell UI and all remaining imports are place-specific', () => {
  const place = parse(placePath)
  const remaining = exportedInitializers(place)
  for (const name of reserved) assert.equal(name in remaining, false, name)
  assert.equal(place.statements.some(ts.isExportDeclaration), false, 'no transitional re-export barrel')
  for (const file of sourceFiles('src')) {
    const tree = parse(file)
    for (const statement of tree.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier.text.endsWith('PlaceManagePage.styles')) continue
      const binding = statement.importClause?.namedBindings
      if (!binding) continue
      if (ts.isNamedImports(binding)) {
        for (const item of binding.elements) assert.equal(reserved.has((item.propertyName ?? item.name).text), false, file)
      } else {
        const visit = node => {
          if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === binding.name.text) {
            assert.equal(reserved.has(node.name.text), false, `${file}: ${node.name.text}`)
          }
          if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === binding.name.text) {
            assert.fail(`computed access hides place-style ownership: ${file}`)
          }
          ts.forEachChild(node, visit)
        }
        visit(tree)
      }
    }
  }
})

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
after(() => server.close())
test('profile/header selectors and place icon extensions share the same canonical MaterialIcon component', async () => {
  const shell = await server.ssrLoadModule('/' + shellPath)
  const place = await server.ssrLoadModule('/' + placePath)
  const { MaterialIcon } = await server.ssrLoadModule('/' + iconPath)
  for (const name of ['AdminProfileIcon', 'TopActionButton']) {
    // styled-components resolves a component interpolation to its selector at declaration time.
    assert.ok(shell[name].componentStyle.rules.flat(Infinity).includes(`.${MaterialIcon.styledComponentId}`), `${name} must target the shared icon`)
  }
  assert.ok(place.SearchIcon.foldedComponentIds.includes(MaterialIcon.styledComponentId))
})
