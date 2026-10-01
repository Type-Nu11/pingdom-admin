import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const page = await readFile(new URL('../src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.tsx', import.meta.url), 'utf8')
const hook = await readFile(new URL('../src/hooks/useMerchantPlaceRegistrations.ts', import.meta.url), 'utf8')
function extract(source, predicate) {
  const ast = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let found
  function visit(node) { if (predicate(node)) found = node; ts.forEachChild(node, visit) }
  visit(ast)
  assert.ok(found)
  return found.getText(ast)
}
const hookExpression = extract(hook, n => ts.isVariableDeclaration(n) && n.name.getText() === 'requestRegistrationReview')
const wrapper = extract(page, n => ts.isJsxAttribute(n) && n.name.getText() === 'onRequestReview')
const wrapperExpression = wrapper.slice(wrapper.indexOf('{') + 1, -1)
const handler = extract(page, n => ts.isVariableDeclaration(n) && n.name.getText() === 'requestReview')
function compile(code, scope) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(scope), js)(...Object.values(scope))
}
function scenario(existing, dirty = false) {
  let saved = { id: 7, status: 'DRAFT', attachments: [] }
  let pending = ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'].map(documentType => ({ documentType, file: { name: documentType } }))
  const uploads = []
  let submissions = 0
  let failFile = 'IDENTITY_DOCUMENT'
  let failSubmit = false
  let failSave = false
  let failRecovery = false
  let markedSaved = 0
  let selectedId = existing ? 7 : null
  const requestReview = compile(`const ${hookExpression}; return requestRegistrationReview`, {
    useCallback: fn => fn, actionRef: { current: null }, mountedRef: { current: true },
    setActiveAction() {}, setActionErrorMessage() {}, setSuccessMessage() {},
    applyApplication: data => { saved = data }, clearUnauthorizedSession() {},
    toRequest: x => x, toRegistration: x => x, getErrorMessage: () => 'failure', logDebugError() {},
    updateMerchantPlaceApplication: async () => { if (failSave) throw new Error('save failure'); return saved },
    getMerchantPlaceApplication: async () => { if (failRecovery) throw new Error('recovery failure'); return { ...saved } },
    createMerchantPlaceApplication: async () => { if (failSave) throw new Error('save failure'); return saved },
    uploadMerchantPlaceApplicationAttachment: async (id, type) => {
      uploads.push(type)
      if (failFile === type) throw new Error('upload failure')
      saved = { ...saved, attachments: [...saved.attachments, { documentType: type }] }
    },
    submitMerchantPlaceApplication: async () => {
      submissions++
      if (failSubmit) throw new Error('submit failure')
      return { ...saved, status: 'PENDING' }
    },
  })
  const onRequestReview = compile(`return (${wrapperExpression})`, {
    registration: { requestRegistrationReview: requestReview },
    setSelectedId: id => { selectedId = id },
  })
  async function run() {
    // Recreate the form handler as React does on render, retaining parent-owned files.
    const runHandler = compile(`const ${handler}; return requestReview`, {
      activeAction: null, canEdit: () => true,
      registration: selectedId === null ? null : saved,
      editable: saved.attachments.length === 0,
      draft: { isDirty: dirty, markSaved() { markedSaved++ } },
      buildRequest: () => ({ placeName: 'Test' }),
      stagedAttachments: pending,
      REQUIRED_ATTACHMENT_TYPES: ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'],
      ATTACHMENT_DOCUMENT_LABELS: {}, setFormError: error => { throw new Error(error) },
      onRequestReview,
      setStagedAttachments: value => { pending = typeof value === 'function' ? value(pending) : value },
      clearAttachmentFile() {},
    })
    await runHandler()
  }
  return { run, uploads, pending: () => pending, submissions: () => submissions, selectedId: () => selectedId,
    markedSaved: () => markedSaved,
    failSave: value => { failSave = value }, failRecovery: value => { failRecovery = value },
    failFile: value => { failFile = value }, failSubmit: value => { failSubmit = value } }
}
test('saved baseline advances before an upload fails', async () => {
  const s = scenario(true, true)
  await s.run()
  assert.equal(s.markedSaved(), 1)
  assert.equal(s.submissions(), 0)
})
test('saved baseline advances even when submission and recovery both fail', async () => {
  const s = scenario(true, true)
  s.failFile(null); s.failSubmit(true); s.failRecovery(true)
  await s.run()
  assert.equal(s.markedSaved(), 1)
  assert.equal(s.submissions(), 1)
})
test('failed save and read-only retry do not advance the saved baseline', async () => {
  const failed = scenario(true, true)
  failed.failSave(true)
  await failed.run()
  assert.equal(failed.markedSaved(), 0)
  assert.equal(failed.uploads.length, 0)
  const unchanged = scenario(true)
  await unchanged.run()
  assert.equal(unchanged.markedSaved(), 0)
})
for (const existing of [true, false]) {
  test(`${existing ? 'existing' : 'new'} draft retries only remaining files after partial failure`, async () => {
    const s = scenario(existing)
    await s.run()
    assert.equal(s.selectedId(), 7)
    assert.deepEqual(s.pending().map(f => f.documentType), ['IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'])
    assert.equal(s.submissions(), 0)
    s.failFile(null)
    await s.run()
    assert.deepEqual(s.uploads, ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'])
    assert.equal(s.submissions(), 1)
    assert.deepEqual(s.pending(), [])
  })
  test(`${existing ? 'existing' : 'new'} draft retries submission without reuploading successful files`, async () => {
    const s = scenario(existing)
    s.failFile(null); s.failSubmit(true)
    await s.run()
    assert.deepEqual(s.pending(), [])
    s.failSubmit(false)
    await s.run()
    assert.equal(s.uploads.length, 3)
    assert.equal(s.submissions(), 2)
  })
  test(`${existing ? 'existing' : 'new'} draft uploads each file once on success`, async () => {
    const s = scenario(existing)
    s.failFile(null)
    await s.run()
    assert.equal(s.uploads.length, 3)
    assert.equal(s.submissions(), 1)
    assert.deepEqual(s.pending(), [])
  })
}
