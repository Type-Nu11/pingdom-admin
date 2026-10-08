import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(new URL('../.github/workflows/release-verification.yml', import.meta.url), 'utf8')

test('release workflow defines the shared output path after runner assignment', () => {
  const jobConfiguration = workflow.slice(workflow.indexOf('jobs:'), workflow.indexOf('    steps:'))
  assert.doesNotMatch(jobConfiguration, /\$\{\{\s*runner\./)
  assert.match(workflow, /run: echo "PINGDOM_QA_OUTPUT=\$RUNNER_TEMP\/pingdom-browser-qa" >> "\$GITHUB_ENV"/)
  assert.ok(workflow.indexOf('Prepare browser verification output') < workflow.indexOf('- run: npm run test:release-browser'))
  assert.match(workflow, /if \[ -f "\$PINGDOM_QA_OUTPUT\/summary\.json" \]/)
})

test('release workflow installs Chromium before unit and browser tests', () => {
  const commands = [...workflow.matchAll(/^\s+- run: (.+)$/gm)].map(match => match[1])
  const install = commands.indexOf('npx --no-install playwright install --with-deps chromium')
  const unit = commands.indexOf('npm test')
  const browser = commands.indexOf('npm run test:release-browser')
  assert.ok(commands.indexOf('npm ci') >= 0 && commands.indexOf('npm ci') < install)
  assert.ok(install >= 0 && unit > install, 'security header unit tests also launch Chromium')
  assert.ok(browser > install)
})
