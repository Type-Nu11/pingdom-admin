import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const baseline = JSON.parse(readFileSync(new URL('./fixtures/admin-place-tools-baseline.json', import.meta.url), 'utf8'))
function fingerprint(file) {
  const input = readFileSync(resolve(root, file), 'utf8')
  const tree = ts.createSourceFile(file, input, ts.ScriptTarget.Latest, true)
  const edits = []
  function visit(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0]
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal
    if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith('.')) {
      const base = resolve(root, dirname(file), specifier.text)
      const target = ['', '.ts', '.tsx', '.js', '.jsx', '.css', '/index.ts', '/index.tsx']
        .map(suffix => base + suffix).find(path => existsSync(path) && statSync(path).isFile())
      assert.ok(target, `${file}: unresolved ${specifier.text}`)
      const path = relative(root, target).replaceAll('\\', '/')
      edits.push([specifier.getStart(tree) + 1, specifier.end - 1, path])
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  let normalized = input
  for (const [start, end, target] of edits.reverse()) normalized = normalized.slice(0, start) + target + normalized.slice(end)
  return createHash('sha256').update(normalized).digest('hex')
}

test('place events and place merge each own their files without an old shim or a barrel', () => {
  assert.equal(Object.keys(baseline.moves).length, 11)
  for (const [from, to] of Object.entries(baseline.moves)) {
    assert.equal(existsSync(resolve(root, from)), false, from)
    assert.ok(existsSync(resolve(root, to)), to)
  }
  for (const [feature, count] of [['placeEvents', 4], ['placeMerge', 7]]) {
    const dir = `src/features/admin/${feature}`
    const files = readdirSync(resolve(root, dir), { withFileTypes: true, recursive: true })
      .filter(entry => entry.isFile())
      .map(entry => relative(root, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'))
      .sort()
    const expected = Object.values(baseline.moves).filter(path => path.startsWith(`${dir}/`)).sort()
    assert.equal(files.length, count, feature)
    assert.deepEqual(files, expected)
  }
})

for (const [file, expected] of Object.entries(baseline.fileHashes)) {
  test(`${file}: source and resolved imports match the pre-move baseline`, () => {
    assert.equal(fingerprint(file), expected)
  })
}
