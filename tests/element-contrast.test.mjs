import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { measureElementContrast } from './helpers/element-contrast.mjs'

function measure(styles = '', parentStyles = '', grandparentStyles = '') {
  const dom = new JSDOM(`<div style="${grandparentStyles}"><div style="${parentStyles}"><button data-contrast="sample" style="color:white;background:rgb(212,20,73);${styles}">확인</button></div></div>`)
  try { return measureElementContrast(dom.window.document.querySelector('button')) }
  finally { dom.window.close() }
}

function closeTo(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
}

test('opaque primary surface keeps the original contrast', () => {
  const result = measure()
  assert.deepEqual(result.foreground, [255, 255, 255])
  assert.deepEqual(result.background, [212, 20, 73])
  closeTo(result.ratio, 5.255676227828747)
})

test('element opacity blends the entire button onto the parent surface', () => {
  const result = measure('opacity:0.9', 'background:white')
  assert.deepEqual(result.foreground, [255, 255, 255])
  result.background.forEach((value, i) => closeTo(value, [216.3, 43.5, 91.2][i]))
  closeTo(result.ratio, 4.73660199720299)
})

test('opacity regression below AA does not incorrectly pass', () => {
  assert.ok(measure('opacity:0.8', 'background:white').ratio < 4.5)
})

test('ancestor opacity applies once to the already composited child', () => {
  const result = measure('', 'background:black;opacity:0.5', 'background:white')
  assert.deepEqual(result.foreground, [255, 255, 255])
  assert.deepEqual(result.background, [233.5, 137.5, 164])
})

test('nested opacities compose through an intermediate colored surface', () => {
  const result = measure('opacity:0.5', 'background:black;opacity:0.5', 'background:white')
  assert.deepEqual(result.foreground, [191.25, 191.25, 191.25])
  assert.deepEqual(result.background, [180.5, 132.5, 145.75])
})

test('translucent text and backgrounds compose before group opacity', () => {
  const result = measure('color:rgba(255,255,255,0.5);background:rgba(0,0,0,0.5);opacity:0.5', 'background:white')
  assert.deepEqual(result.foreground, [223.125, 223.125, 223.125])
  assert.deepEqual(result.background, [191.25, 191.25, 191.25])
})

test('brightness filters apply before group opacity at either level', () => {
  const child = measure('filter:brightness(0.5);opacity:0.5', 'background:white')
  const parent = measure('', 'filter:brightness(50%);opacity:0.5', 'background:white')
  for (const result of [child, parent]) {
    assert.deepEqual(result.foreground, [191.25, 191.25, 191.25])
    assert.deepEqual(result.background, [180.5, 132.5, 145.75])
  }
})

test('unsupported filters fail explicitly, including ancestor filters', () => {
  assert.throws(() => measure('filter:blur(1px)'), /Unsupported contrast filter/)
  assert.throws(() => measure('', 'filter:blur(1px)'), /Unsupported contrast filter/)
})

test('fully transparent groups have no text contrast against the canvas', () => {
  assert.equal(measure('opacity:0').ratio, 1)
})
