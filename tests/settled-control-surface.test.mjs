import assert from 'node:assert/strict'
import test from 'node:test'
import { settledControlSurface } from './helpers/settled-control-surface.mjs'

const white = 'rgb(255, 255, 255)'
function element(getAnimations, background = white) {
  return { getAnimations, css: { backgroundColor: background, borderTopWidth: '1px', outlineStyle: 'solid' },
    getAttribute: () => 'synthetic control', matches: () => false }
}
async function read(target, timeout) {
  const previous = globalThis.getComputedStyle
  globalThis.getComputedStyle = element => element.css
  try { return await settledControlSurface({ evaluate: (fn, arg) => fn(target, arg) }, timeout) }
  finally {
    if (previous === undefined) delete globalThis.getComputedStyle
    else globalThis.getComputedStyle = previous
  }
}

test('stable controls are returned without changing their CSS', async () => {
  const target = element(() => [])
  assert.equal((await read(target)).background, white)
  assert.equal(target.css.backgroundColor, white)
})
test('active transitions settle before the exact final color is read', async () => {
  let samples = 0
  const target = element(() => {
    if (++samples < 3) return [{ playState: 'running' }]
    target.css.backgroundColor = white
    return []
  }, 'rgba(255, 254, 254, 0.937)')
  assert.equal((await read(target)).background, white)
  assert.equal(samples, 3)
})
test('pending animations are also awaited', async () => {
  let samples = 0
  assert.equal((await read(element(() => ++samples === 1 ? [{ pending: true, playState: 'idle' }] : []))).background, white)
  assert.equal(samples, 2)
})
test('wrong final colors are not normalized into a passing result', async () => {
  const actual = await read(element(() => [], 'rgb(255, 0, 0)'))
  assert.equal(actual.background, 'rgb(255, 0, 0)')
  assert.throws(() => assert.equal(actual.background, white), { code: 'ERR_ASSERTION' })
})
test('non-terminating animations fail with a bounded descriptive error', async () => {
  await assert.rejects(read(element(() => [{ playState: 'running' }]), 1), /did not settle within 1ms.*synthetic control/)
})
