import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { after, test } from 'node:test'
import { createServer } from './helpers/isolated-vite.mjs'

const reference = JSON.parse(readFileSync('tests/fixtures/figma-web-design-system.json', 'utf8'))
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { semanticColors, palette, typography, adminColors } = await server.ssrLoadModule('/src/styles/theme.ts')
after(() => server.close())

test('all web Foundation semantic colors match the inspected Figma frame', () => {
  for (const [group, values] of Object.entries(semanticColors)) {
    for (const [name, value] of Object.entries(values)) {
      const key = `${group[0].toUpperCase() + group.slice(1)}/${name[0].toUpperCase() + name.slice(1)}`
      assert.equal(value, reference.colors[key] ?? (key === 'Line/Neutral' ? reference.colors['Fill/Neutral'] : undefined), key)
    }
  }
})

test('all seven primitive color ramps match Figma, including distinct Status/Success', () => {
  for (const [group, values] of Object.entries(palette)) for (const [level, value] of Object.entries(values)) {
    assert.equal(value, reference.colors[`${group[0].toUpperCase() + group.slice(1)}/${level}`])
  }
  assert.equal(semanticColors.status.success, '#20C831')
  assert.notEqual(semanticColors.status.success, palette.green[50])
})

test('all 21 named type styles follow size, weight and 130% line height', () => {
  for (const [role, size] of Object.entries(reference.typography.sizes)) for (const [weight, value] of Object.entries(reference.typography.weights)) {
    assert.deepEqual(typography[role][weight], { fontSize: size, fontWeight: value, lineHeight: 1.3 })
  }
})

test('status text and draft badges use the verified palette, not bespoke hex values', () => {
  assert.equal(adminColors.errorText, palette.red[40])
  assert.equal(adminColors.infoText, palette.blue[40])
  assert.equal(adminColors.successText, palette.green[20])
  assert.equal(adminColors.warningText, palette.yellow[20])
  assert.equal(adminColors.draftTint, palette.purple[95])
  assert.equal(adminColors.draftText, palette.purple[40])
})

test('brand foreground and action aliases never darken the PingDom main color', () => {
  assert.equal(adminColors.primaryForeground, '#FF1956')
  assert.equal(adminColors.primaryAction, '#FF1956')
  assert.equal(adminColors.primaryHover, '#FF1956')
  assert.equal(adminColors.errorText, palette.red[40])
})

test('admin and merchant styles cannot reintroduce off-scale text sizes or weights', () => {
  for (const path of readdirSync('src', { recursive: true }).filter(path => /\.(ts|tsx)$/.test(path))) {
    const source = readFileSync(`src/${path}`, 'utf8')
    assert.doesNotMatch(source, /font-size:\s*(11|13|15|30)px;/, path)
    assert.doesNotMatch(source, /font-weight:[^\n]*(?:\b600\b|\b800\b|\b900\b)/, path)
  }
})
