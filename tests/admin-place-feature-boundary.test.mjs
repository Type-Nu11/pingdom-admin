import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, relative, resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const feature = 'src/features/admin/places/'
const moves = JSON.parse(readFileSync(new URL('./fixtures/admin-place-paths.json', import.meta.url), 'utf8'))
function files(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}
function parse(file) {
  return ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
}
function references(file) {
  const tree = parse(file), result = []
  function visit(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0]
    if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith('.')) {
      const base = resolve(root, dirname(file), specifier.text)
      const target = [base, base + '.ts', base + '.tsx', base + '.js', base + '.mjs', base + '.jsx', base + '/index.ts', base + '/index.tsx']
        .find(path => existsSync(path) && /\.[cm]?[jt]sx?$/.test(path))
      if (target) result.push(relative(root, target).replaceAll('\\', '/'))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return result
}

test('the 17 place-owned files have one canonical feature location, with no old shims or aggregate barrel', () => {
  assert.equal(Object.keys(moves).length, 17)
  for (const [before, after] of Object.entries(moves)) {
    assert.equal(existsSync(resolve(root, before)), false, before)
    assert.equal(existsSync(resolve(root, after)), true, after)
    assert.ok(after.startsWith(feature), after)
  }
  assert.deepEqual(files(feature.slice(0, -1)).sort(), Object.values(moves).sort())
  assert.equal(existsSync(resolve(root, feature, 'index.ts')), false)
})

test('source, tests and inspection scripts do not reference relocated paths except the explicit historical git comparison', () => {
  const oldPaths = Object.keys(moves).flatMap(file => [file, file.replace(/\.[jt]sx?$/, '')])
  for (const file of ['src', 'tests', 'scripts'].flatMap(files)) {
    const tree = parse(file)
    function visit(node) {
      if (ts.isStringLiteralLike(node)) {
        const value = node.text.replace(/^\//, '')
        const historical = file === 'tests/browser/place-inspector.mjs' && /^[a-f0-9]{40}:src\//.test(value)
        if (!historical) for (const old of oldPaths) assert.notEqual(value, old, `${file}: stale path ${old}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
})

test('cross-feature place access is explicit and never loads the page through a shared barrel', () => {
  const allowed = new Map([
    ['src/api/adminTargetSearchApi.ts', ['api/adminPlaceApi.ts']],
    ['src/app/router/Router.tsx', ['pages/PlaceManagePage.tsx']],
    ['src/pages/adminReservationReview/AdminReservationReviewPage.tsx', ['components/PlaceDetailLink.tsx']],
    ['src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage.tsx', ['components/PlaceDetailLink.tsx']],
    ['src/pages/placeDuplicateCandidate/PlaceDuplicateCandidatePage.tsx', ['api/adminPlaceApi.ts', 'types/adminPlace.types.ts', 'pages/PlaceManagePage.styles.ts']],
  ])
  const seen = new Set()
  for (const file of files('src').filter(file => !file.startsWith(feature))) {
    for (const target of references(file).filter(target => target.startsWith(feature))) {
      assert.ok(allowed.get(file)?.includes(target.slice(feature.length)), `${file} -> ${target}`)
      seen.add(file)
    }
  }
  assert.deepEqual([...seen].sort(), [...allowed.keys()].sort())
})

test('shared UI and place API/type modules cannot import page components or feature state', () => {
  for (const file of files('src/shared')) for (const target of references(file)) assert.ok(!target.startsWith('src/features/'), `${file} -> ${target}`)
  const seen = new Set()
  function visit(file) {
    if (seen.has(file)) return
    seen.add(file)
    assert.ok(!/\/(?:pages|components|hooks)\//.test(file), file)
    for (const target of references(file)) visit(target)
  }
  for (const file of [...files(feature + 'api'), ...files(feature + 'types')]) visit(file)
})

test('the places route remains lazy and shared map/category implementations stay outside the feature', () => {
  const router = parse('src/app/router/Router.tsx').text
  assert.match(router, /PlaceManagePage = lazy\(\(\) => import\('\.\.\/\.\.\/features\/admin\/places\/pages\/PlaceManagePage'\)\)/)
  assert.match(router, /path="\/places" element=\{<PlaceManagePage \/>\}/)
  assert.equal(existsSync(resolve(root, feature, 'components/NaverMap.tsx')), false)
  for (const file of ['src/components/map/NaverMap.tsx', 'src/components/map/naverMapController.ts', 'src/utils/placeCategory.ts', 'src/api/customAxios.ts']) assert.ok(existsSync(resolve(root, file)), file)
  assert.match(parse(feature + 'pages/PlaceManagePage.tsx').text, /const ADMIN_PLACE_PAGE_SIZE = 10/)
})

test('API inventory includes both relocated modules and their original consumers without old-path duplicates', () => {
  const inventory = JSON.parse(execFileSync(process.execPath, ['scripts/api-source-inventory.mjs'], { cwd: root, encoding: 'utf8' }))
  for (const file of files(feature + 'api')) {
    const names = parse(file).statements.filter(ts.isFunctionDeclaration).map(node => node.name.text)
    assert.ok(names.length > 0)
    for (const name of names) assert.equal(inventory.filter(item => item.file === file && item.function === name).length, 1, name)
  }
  const list = inventory.find(item => item.file === feature + 'api/adminPlaceApi.ts' && item.function === 'getAdminPlaces')
  assert.equal(list.method, 'GET'); assert.equal(list.path, '/admin/places')
  assert.ok(list.callers.includes('src/api/adminTargetSearchApi.ts'))
  assert.ok(list.callers.includes(feature + 'hooks/useAdminPlaces.ts'))
  for (const item of inventory) assert.ok(!Object.hasOwn(moves, item.file), item.file)
})
