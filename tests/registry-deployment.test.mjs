import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('..', import.meta.url))
const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')

test('deployment accepts only successful same-repository release pushes; manual runs only check credentials', () => {
  for (const guard of ["conclusion == 'success'", "event == 'push'", "head_branch == 'release'", 'head_repository.full_name == github.repository']) {
    assert.ok(workflow.includes(guard), guard)
  }
  assert.match(workflow, /cancel-in-progress: false/)
  assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/)
  const names = ['Configure image builder', 'Build and push verified release image', 'Pull and deploy on the platform instance']
  for (const name of names) {
    const step = workflow.slice(workflow.indexOf(`- name: ${name}`)).split('\n      - ')[0]
    assert.match(step, /if: github.event_name == 'workflow_run'/)
  }
  assert.equal((workflow.match(/git ls-remote origin refs\/heads\/release/g) || []).length, 2)
})

test('deployment reuses existing secret names, pins SSH identity, and ships only public build inputs', () => {
  const secrets = [...workflow.matchAll(/secrets\.([A-Z_]+)/g)].map(match => match[1])
  assert.deepEqual([...new Set(secrets)].sort(), ['DOCKER_TOKEN', 'DOCKER_USERNAME', 'HOST', 'KEY', 'USERNAME'])
  assert.match(workflow, /StrictHostKeyChecking yes/)
  assert.match(workflow, /HostKeyAlias 54\.116\.166\.107/)
  assert.doesNotMatch(workflow, /ssh-keyscan|StrictHostKeyChecking no/)
  const buildArgs = workflow.split('build-args: |')[1].split('\n          labels:')[0]
  assert.doesNotMatch(buildArgs, /secrets\.|TOKEN|PASSWORD|PRIVATE_KEY/)
  assert.match(workflow, /IMAGE_REPOSITORY@\$IMAGE_DIGEST/)
})

test('remote deployment rejects invalid targets and restores the previous web after replacement failures', () => {
  assert.doesNotThrow(() => execFileSync('python3', ['tests/registry_deployment_test.py'], { cwd: root, stdio: 'pipe' }))
})
