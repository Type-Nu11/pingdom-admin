import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserCases, browserFailureLog, runBrowserProcess } from '../scripts/run-browser-regressions.mjs'

test('release browser list protects operational regression boundaries', () => {
  assert.equal(new Set(browserCases.map(([name]) => name)).size, browserCases.length)
  for (const name of ['web-design-system', 'text-readability', 'admin-readable-copy']) assert.ok(browserCases.some(([key]) => key === name))
  for (const name of ['detector-probes', 'dashboard', 'accessibility', 'reservation-context', 'merchant-safety', 'merchant-identity', 'user-ban-structure', 'community', 'merchant-draft', 'reservation-setup', 'reservation-timezone', 'trust-score-history', 'place-dispute-review', 'data-quality', 'residual-contract']) assert.ok(browserCases.some(([key]) => key === name))
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
      if (name === 'setup exception') assert.match(await browserFailureLog(join(output, 'run.log')), /synthetic setup failure/)
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
test('failure logs preserve diagnostic tails with a bounded size and missing-output fallback', async () => {
  const output = await mkdtemp(join(tmpdir(), 'pingdom-runner-log-'))
  const log = join(output, 'failure.log')
  try {
    await writeFile(log, 'old output\n'.repeat(100) + 'FINAL ASSERTION DETAIL')
    const excerpt = await browserFailureLog(log, 40)
    assert.match(excerpt, /Earlier output truncated/)
    assert.ok(excerpt.endsWith('FINAL ASSERTION DETAIL'))
    assert.ok(excerpt.length < 130)
    await writeFile(log, '')
    assert.equal(await browserFailureLog(log), 'Browser process produced no output.')
    assert.match(await browserFailureLog(join(output, 'missing.log')), /Unable to read browser failure log/)
  } finally { await rm(output, { recursive: true, force: true }) }
})
