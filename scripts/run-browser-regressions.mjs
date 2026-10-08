import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const browserCases = [
  ['detector-probes', 'tests/browser/regression-probes.mjs'],
  ['dashboard', 'tests/browser/dashboard-pending.mjs'],
  ['accessibility', 'tests/browser/ui-accessibility.mjs'],
  ['reservation-context', 'tests/browser/reservation-context.mjs'],
  ['merchant-safety', 'tests/browser/merchant-safety.mjs'],
  ['merchant-identity', 'tests/browser/merchant-identity-extension.mjs'],
]

// Run suites sequentially: bounded browser load, separate processes/servers.
export function runBrowserProcess(file, { cwd, log, timeoutMs = 180_000, args = [] }) {
  return new Promise(resolveResult => {
    const output = createWriteStream(log)
    const grouped = process.platform !== 'win32'
    const child = spawn(process.execPath, [file, ...args], { cwd, detached: grouped, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false })
    let timedOut = false, interrupted = false, spawnError = null, force
    const stop = signal => {
      if (!child.pid) return
      try { grouped ? process.kill(-child.pid, signal) : child.kill(signal) } catch (error) { if (error.code !== 'ESRCH') spawnError = error.message }
    }
    const terminate = () => { stop('SIGTERM'); force = setTimeout(() => stop('SIGKILL'), 2000) }
    const interrupt = () => { interrupted = true; terminate() }
    process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt)
    const timer = setTimeout(() => { timedOut = true; terminate() }, timeoutMs)
    child.on('error', error => { spawnError = error.message })
    child.on('close', (code, signal) => {
      if (timedOut || interrupted) stop('SIGKILL') // Also reap any surviving browser descendants.
      clearTimeout(timer); clearTimeout(force)
      process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt)
      output.end(() => resolveResult({ code, signal, timedOut, interrupted, spawnError, passed: code === 0 && !signal && !timedOut && !interrupted && !spawnError }))
    })
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const output = process.env.PINGDOM_QA_OUTPUT ? resolve(process.env.PINGDOM_QA_OUTPUT) : await mkdtemp(join(tmpdir(), 'pingdom-release-qa-'))
  await mkdir(output, { recursive: true })
  const report = { kind: 'synthetic Chromium regression; not real-server/device/deployment QA', results: [] }
  console.log(`Browser regression logs: ${output}`)
  for (const [name, file] of browserCases) {
    const result = await runBrowserProcess(file, { cwd: root, log: join(output, `${name}.log`) })
    report.results.push({ name, ...result })
    console.log(`${name}: ${result.passed ? 'PASS' : 'FAIL'}${result.timedOut ? ' (timeout)' : ''}`)
    if (!result.passed) break // Fail closed; do not present unexecuted suites as passing.
  }
  const passed = report.results.length === browserCases.length && report.results.every(result => result.passed)
  report.passed = passed
  await writeFile(join(output, 'summary.json'), JSON.stringify(report, null, 2) + '\n')
  process.exitCode = passed ? 0 : 1
}
