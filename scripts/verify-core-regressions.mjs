import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cases = [
  [148, 'f21faa6^', 'registration-validation', 'existing draft blocks submission for required field', ['src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.tsx']],
  [149, '6704261^', 'auth-session', 'old-session success response is canceled after account switch', ['src/api/customAxios.ts']],
  [149, '6704261^', 'auth-session', 'late refresh after logout cannot restore tokens or retry writes', ['src/api/customAxios.ts']],
  [149, '6704261^', 'auth-session', 'late refresh after switch cannot restore tokens or retry writes', ['src/api/customAxios.ts']],
  [150, '3a863c3^', 'scout-review', 'old detail success cannot overwrite a newer selection', ['src/hooks/useAdminScouts.ts']],
  [150, '5e82142^', 'scout-review', '프로필 회수: dialog keeps its target after selection changes', ['src/pages/scout/ScoutPage.tsx']],
  [151, '6444eff^', 'registration-upload-retry', 'existing draft retries only remaining files after partial failure', ['src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.tsx', 'src/hooks/useMerchantPlaceRegistrations.ts']],
  [152, '094aab9^', 'auth-session', 'refresh 500 preserves failure classification and session', ['src/api/customAxios.ts']],
  [153, 'a4a9427^', 'cross-tab-auth', 'remote account switch updates identity and resets previous screen state', ['src/utils/authStorage.ts', 'src/app/providers/AuthProvider.tsx']],
  [153, 'a4a9427^', 'cross-tab-auth', 'remote logout removes authenticated state and private selection', ['src/utils/authStorage.ts', 'src/app/providers/AuthProvider.tsx']],
  [154, '42d7a7e^', 'merchant-offer-loading', 'new clears loading and ignores stale success', ['src/hooks/useMerchantOffers.ts']],
  [155, '4e8e408^', 'place-search-race', 'stale success cannot replace the latest result', ['src/hooks/useMerchantPlaceApplications.ts']],
  [156, 'af94cf8^', 'notification-query-state', 'delivery filters and pagination do not restart initialization', ['src/hooks/useAdminNotificationOperations.ts']],
]
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 })
const head = git('rev-parse', 'HEAD').toString().trim()
const archive = git('archive', head)
const temp = mkdtempSync(join(tmpdir(), 'pingdom-regressions-'))
let failed = false
try {
  for (const [issue, ref, suite, name, files] of cases) {
    const old = git('rev-parse', ref).toString().trim()
    for (const mode of ['current', 'before']) {
      const cwd = join(temp, `${issue}-${mode}`)
      mkdirSync(cwd)
      execFileSync('tar', ['-xf', '-', '-C', cwd], { input: archive })
      symlinkSync(join(root, 'node_modules'), join(cwd, 'node_modules'), 'dir')
      if (mode === 'before') {
        for (const file of files) writeFileSync(join(cwd, file), git('show', `${old}:${file}`))
      }
      const pattern = `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
      const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', `--test-name-pattern=${pattern}`, `tests/${suite}.test.mjs`], {
        cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024,
      })
      const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
      // Require the named test itself to run; setup/import/timeouts are not evidence.
      const expected = mode === 'current'
        ? run.status === 0 && output.includes(`ok 1 - ${name}`)
        : run.status === 1 && output.includes(`not ok 1 - ${name}`) && (
          output.includes("code: 'ERR_ASSERTION'") ||
          (issue === 152 && output.includes('to be reference-equal to') && output.includes('+   status: 401') && output.includes('-   status: 500'))
        )
      if (!expected || run.error || run.signal) {
        failed = true
        process.stderr.write(`#${issue} ${mode}: verification failed\n${output}\n${run.error ?? ''}\n`)
      } else {
        process.stdout.write(`#${issue} ${mode}: ${mode === 'current' ? 'PASS' : 'EXPECTED ASSERTION FAILURE'} | ${name} | ${mode === 'current' ? head : old}\n`)
      }
      rmSync(cwd, { recursive: true, force: true })
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}
process.exitCode = failed ? 1 : 0
