import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserCases, runBrowserProcess } from '../scripts/run-browser-regressions.mjs'

test('release browser list protects operational regression boundaries', () => {
  assert.equal(new Set(browserCases.map(([name]) => name)).size, browserCases.length)
  for (const name of ['detector-probes', 'dashboard', 'accessibility', 'reservation-context', 'merchant-safety', 'merchant-identity', 'user-ban-structure']) assert.ok(browserCases.some(([key]) => key === name))
})
for (const [name, source, expected] of [
  ['success', 'console.log("synthetic pass")', true],
  ['failure', 'process.exitCode = 1', false],
  ['setup exception', 'throw new Error("synthetic setup failure")', false],
]) {
  test(`browser runner classifies ${name}`, async () => {
    const output = await mkdtemp(join(tmpdir(), 'pingdom-runner-test-'))
    try {
      const result = await runBrowserProcess('--eval', { cwd: process.cwd(), args: [source], log: join(output, 'run.log'), timeoutMs: 2000 })
      assert.equal(result.passed, expected)
      assert.equal(result.timedOut, false)
    } finally { await rm(output, { recursive: true, force: true }) }
  })
}
test('browser runner rejects timeout rather than accepting a zero SIGTERM exit', async () => {
  const output = await mkdtemp(join(tmpdir(), 'pingdom-runner-timeout-'))
  try {
    const result = await runBrowserProcess('--eval', { cwd: process.cwd(), args: ['process.on("SIGTERM", () => process.exit(0)); setInterval(() => {}, 100)'], log: join(output, 'run.log'), timeoutMs: 300 })
    assert.equal(result.passed, false)
    assert.equal(result.timedOut, true)
  } finally { await rm(output, { recursive: true, force: true }) }
})
