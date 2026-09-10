import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('Registration.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
// Execute the actual form handlers without mounting the unrelated map SDK.
function declaration(name) {
  let result
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(ast)
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) result = `const ${node.getText(ast)};`
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(result, `source declaration exists: ${name}`)
  return result
}
const code = ts.transpileModule([
  'canEdit', 'normalizeE164Phone', 'toTime', 'E164_PHONE_PATTERN',
  'ATTACHMENT_DOCUMENT_LABELS', 'ATTACHMENT_DOCUMENT_OPTIONS', 'REQUIRED_ATTACHMENT_TYPES',
  'hasExistingAttachments', 'editable', 'numericLatitude', 'numericLongitude', 'hasValidCoordinate',
  'buildRequest', 'requestReview',
].map(declaration).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

function form(overrides = {}) {
  const calls = []
  let error = ''
  const values = {
    registration: { id: 1, status: 'DRAFT', attachments: [] }, activeAction: null,
    activeBusinessName: null, legalName: 'Test', businessName: 'Test shop',
    businessRegistrationNumber: '1234567890', merchantDisplayName: 'Shop',
    merchantContactEmail: 'test@example.com', merchantContactPhone: '+82-010-1234-5678',
    placeName: 'Edited place', roadAddress: 'Road', jibunAddress: 'Address', postalCode: '12345',
    description: 'Edited description', businessPhone: '+821012345678', applicantPhone: '+821012345678',
    latitude: '37.5', longitude: '127', category: 'RESTAURANT', tags: [],
    schedule: [{ dayOfWeek: 'MONDAY', status: 'OPEN', opensAt: '09:00', closesAt: '18:00' }],
    stagedAttachments: ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'].map(documentType => ({ documentType, file: {} })),
    setFormError: message => { error = message },
    setStagedAttachments() {}, clearAttachmentFile() {},
    onRequestReview: async (...args) => { calls.push(args); return { status: 'PENDING' } },
    ...overrides,
  }
  const run = new Function(...Object.keys(values), `${code}\nreturn requestReview;`)(...Object.values(values))
  return { run, calls, error: () => error }
}

const invalid = [
  ['required field', { placeName: ' ' }, '필수 항목'],
  ['empty coordinate', { latitude: '' }, '위도'],
  ['out-of-range coordinate', { longitude: '181' }, '위도'],
  ['invalid coordinate', { latitude: 'invalid' }, '위도'],
  ['opening hours', { schedule: [{ status: 'OPEN', opensAt: '18:00', closesAt: '09:00' }] }, '시작 시간'],
  ['business phone', { businessPhone: 'invalid' }, '연락처'],
  ['applicant phone', { applicantPhone: 'invalid' }, '연락처'],
  ['merchant phone', { merchantContactPhone: 'invalid' }, '연락처'],
  ['email', { merchantContactEmail: 'invalid' }, '이메일'],
]
for (const existing of [false, true]) {
  for (const [label, values, message] of invalid) {
    test(`${existing ? 'existing draft' : 'new application'} blocks submission for ${label}`, async () => {
      const scenario = form({ registration: existing ? { id: 1, status: 'DRAFT', attachments: [] } : null, ...values })
      await scenario.run()
      assert.equal(scenario.calls.length, 0, 'save/upload/submit flow must not be invoked')
      assert.ok(scenario.error().includes(message))
    })
  }
  test(`${existing ? 'existing draft' : 'new application'} submits current valid input`, async () => {
    const scenario = form({ registration: existing ? { id: 1, status: 'DRAFT', attachments: [] } : null })
    await scenario.run()
    assert.equal(scenario.calls.length, 1)
    const [id, request, attachments] = scenario.calls[0]
    assert.equal(id, existing ? 1 : null)
    assert.equal(request.placeName, 'Edited place')
    assert.equal(request.merchantContactPhone, '+821012345678')
    assert.equal(attachments.length, 3)
  })
}
test('attachment-locked draft submits saved content without revalidating disabled fields', async () => {
  const scenario = form({
    registration: { id: 1, status: 'DRAFT', attachments: ['BUSINESS_REGISTRATION', 'IDENTITY_DOCUMENT', 'REPRESENTATIVE_IMAGE'].map(documentType => ({ documentType })) },
    stagedAttachments: [], businessRegistrationNumber: '',
  })
  await scenario.run()
  assert.equal(scenario.calls.length, 1)
  assert.equal(scenario.calls[0][0], 1)
  assert.equal(scenario.calls[0][1], null)
})
for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']) {
  test(`${status} cannot enter submission flow`, async () => {
    const scenario = form({ registration: { id: 1, status, attachments: [] } })
    await scenario.run()
    assert.equal(scenario.calls.length, 0)
  })
}
test('missing evidence blocks submission', async () => {
  const scenario = form({ stagedAttachments: [] })
  await scenario.run()
  assert.equal(scenario.calls.length, 0)
  assert.ok(scenario.error().includes('추가해주세요'))
})
test('an active action blocks submission', async () => {
  const scenario = form({ activeAction: 'request' })
  await scenario.run()
  assert.equal(scenario.calls.length, 0)
})
