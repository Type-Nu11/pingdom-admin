import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { test, after } from 'node:test'
import ts from 'typescript'
import { createServer } from './helpers/isolated-vite.mjs'

const hash = value => createHash('sha256').update(value).digest('hex')
const parse = path => ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const styleBaseline = JSON.parse(readFileSync('tests/fixtures/merchant-style-baseline.json', 'utf8'))
const banBaseline = JSON.parse(readFileSync('tests/fixtures/user-ban-structure-baseline.json', 'utf8'))
const printer = ts.createPrinter({ removeComments: true })
const canonical = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/^export /, '')

for (const [path, baseline] of Object.entries(styleBaseline)) {
  test(`${path}: extracted declarations retain exact CSS, variants and responsive rules`, () => {
    const source = parse(path)
    for (const [name, expected] of Object.entries(baseline)) {
      const node = source.statements.find(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations[0].name.getText(source) === name)
      assert.ok(node, name)
      assert.equal(hash(node.getText(source)), expected, name)
    }
  })
}

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
}
test('common merchant modules and consumers never depend on external page-owned style files', () => {
  const ownPages = new Map([
    ['MerchantCampaignPage.styles', 'src/pages/merchantCampaign/MerchantCampaignPage.tsx'],
    ['MerchantStorePage.styles', 'src/pages/merchantStore/MerchantStorePage.tsx'],
  ])
  for (const path of files('src').filter(path => /\.(ts|tsx)$/.test(path))) {
    for (const node of parse(path).statements.filter(ts.isImportDeclaration)) {
      const imported = node.moduleSpecifier.text
      for (const [style, ownPage] of ownPages) if (imported.includes(style)) assert.equal(path, ownPage, `${path} depends on ${style}`)
      if (path.startsWith('src/components/merchant/')) assert.ok(!/pages\/(merchantStore|merchantCampaign)\//.test(imported), path)
    }
  }
})

test('UserBan state, selection, request building and mutation handlers remain unchanged', () => {
  const source = parse('src/pages/userBan/UserBanPage.tsx')
  const parent = source.statements.find(statement => statement.name?.text === 'UserBanPage')
  assert.equal(hash(parent.body.statements.filter(node => !ts.isReturnStatement(node)).map(node => canonical(node, source)).join('\n')), banBaseline.parentStateAndHandlers)
})

test('display format extraction preserves missing/invalid/unknown-value behavior', () => {
  const source = parse('src/pages/userBan/userBan.format.ts')
  for (const [name, expected] of Object.entries(banBaseline.formatters)) {
    const node = source.statements.find(statement => statement.name?.text === name)
    assert.ok(node, name)
    assert.equal(hash(canonical(node, source)), expected, name)
  }
})

test('extracted list/history views cannot issue API requests or sanctions', () => {
  for (const name of ['UserBanListFilters', 'UserSanctionHistory', 'UserBanFilterMenu']) {
    const source = parse(`src/pages/userBan/${name}.tsx`)
    for (const node of source.statements.filter(ts.isImportDeclaration)) assert.ok(!/\/api\/|useAdminBannedUsers|useAuth/.test(node.moduleSpecifier.text))
    assert.ok(!/fetch\(|\.post\(|\.delete\(/.test(source.text))
  }
})

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
after(async () => server.close())
test('page compatibility exports point to the same shared components, not duplicated styles', async () => {
  for (const [sharedPath, pagePath] of [
    ['/src/components/merchant/MerchantWorkspace.styles.ts', '/src/pages/merchantCampaign/MerchantCampaignPage.styles.ts'],
    ['/src/components/merchant/MerchantSurface.styles.ts', '/src/pages/merchantStore/MerchantStorePage.styles.ts'],
  ]) {
    const common = await server.ssrLoadModule(sharedPath), page = await server.ssrLoadModule(pagePath)
    for (const [name, component] of Object.entries(common)) assert.equal(page[name], component, name)
  }
})
