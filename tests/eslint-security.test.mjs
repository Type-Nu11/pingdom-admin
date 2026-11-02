import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { test } from 'node:test'
import { ESLint } from 'eslint'

const require = createRequire(import.meta.url)
const eslint = new ESLint()
const sourcePath = 'src/components/SecurityLintProbe.tsx'

test('the three minimatch consumers resolve the patched version without a global override', async () => {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'))
  assert.equal(manifest.overrides.minimatch, undefined)
  for (const parent of ['eslint', '@eslint/config-array', '@typescript-eslint/typescript-estree']) {
    assert.equal(manifest.overrides[parent].minimatch, '11.0.3')
    const fromParent = createRequire(require.resolve(parent))
    assert.equal(fromParent('minimatch/package.json').version, '11.0.3', parent)
  }
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'))
  const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith('node_modules/minimatch'))
  assert.ok(copies.length > 0)
  for (const [path, entry] of copies) assert.equal(entry.version, '11.0.3', path)
  assert.ok(!lock.packages['node_modules/@eslint/eslintrc'], 'legacy ESLint resolver must not remain')
})

const invalidSources = [
  ['@typescript-eslint/no-unused-vars', 'export function Probe() { const unused = 1; return <p /> }'],
  ['@typescript-eslint/no-explicit-any', 'export function Probe({ value }: { value: any }) { return <p>{value}</p> }'],
  ['react-hooks/rules-of-hooks', `import { useState } from 'react'
    export function Probe({ enabled }: { enabled: boolean }) {
      if (enabled) { const [value] = useState(0); return <p>{value}</p> }
      return null
    }`],
  ['react-refresh/only-export-components', 'export function getLabel() { return "label" }; export function Probe() { return <p /> }'],
  ['react-hooks/refs', `import { useRef } from 'react'
    export function Probe() { const ref = useRef(0); return <p>{ref.current}</p> }`],
  ['react-hooks/set-state-in-effect', `import { useEffect, useState } from 'react'
    export function Probe() {
      const [value, setValue] = useState(0)
      useEffect(() => { setValue(1) }, [])
      return <p>{value}</p>
    }`],
]

for (const [ruleId, source] of invalidSources) {
  test(`ESLint still rejects ${ruleId}`, async () => {
    const [result] = await eslint.lintText(source, { filePath: sourcePath })
    assert.ok(result.messages.some(message => message.ruleId === ruleId && message.severity === 2),
      JSON.stringify(result.messages))
  })
}

test('valid TSX/browser globals remain supported and every source file stays in lint scope', async () => {
  const [result] = await eslint.lintText(`import { useState } from 'react'
    export function Probe() {
      const [value, setValue] = useState(0)
      return <button onClick={() => { document.title = 'probe'; setValue(value + 1) }}>{value}</button>
    }`, { filePath: sourcePath })
  assert.deepEqual(result.messages, [])
  async function checkDirectory(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name)
      if (entry.isDirectory()) await checkDirectory(child)
      else if (/\.tsx?$/.test(child)) assert.equal(await eslint.isPathIgnored(child), false, child)
    }
  }
  await checkDirectory('src')
  assert.equal(await eslint.isPathIgnored('dist/assets/probe.js'), true)
})
