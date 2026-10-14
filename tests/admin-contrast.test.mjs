import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', ssr: { noExternal: ['styled-components'] } })
const { adminColors: c } = await server.ssrLoadModule('/src/styles/theme.ts')
after(() => server.close())
function rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) }
function composite(foreground, background) {
  const alpha = foreground.length === 9 ? parseInt(foreground.slice(7), 16) / 255 : 1
  return rgb(foreground).map((v, i) => v * alpha + rgb(background)[i] * (1 - alpha))
}
function luminance(channels) {
  return channels.map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
}
function contrast(fg, bg) {
  const a = luminance(rgb(fg)), b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
for (const [name, fg, bg] of [
  ['selected tab', c.primaryText, rgb(c.primaryAction)],
  ['selected tab hover', c.primaryText, rgb(c.primaryForeground)],
  ['selected menu', c.primaryForeground, composite(c.primaryTint, c.surface)],
  ['attachment button', c.primaryForeground, rgb(c.surfaceLow)],
  ['attachment/tab hover', c.primaryForeground, composite(c.primaryTint, c.surfaceLow)],
]) {
  test(name + ' meets 4.5:1', () => {
    const ratio = contrast(fg, bg)
    console.log(`${name}: ${ratio.toFixed(2)}:1`)
    assert.ok(ratio >= 4.5)
  })
}
test('brand primary stays unchanged', () => assert.equal(c.primary, '#FF1956'))
