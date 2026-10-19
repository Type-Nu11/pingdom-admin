import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createServer } from './helpers/isolated-vite.mjs'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
after(() => server.close())
const audit = await server.ssrLoadModule('/src/utils/adminAuditPresentation.ts')
const notification = await server.ssrLoadModule('/src/utils/adminNotificationLabels.ts')
const view = { action: 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED', targetType: 'MERCHANT_PLACE_APPLICATION_ATTACHMENT', targetId: '2',
  reason: '통합 신청 민감 첨부 메타데이터 조회: REPRESENTATIVE_IMAGE', beforeState: '{}', afterState: '{"applicationId":1}' }

test('attachment metadata access is presented as a read, not a change or a file download', () => {
  const original = structuredClone(view)
  assert.equal(audit.formatAuditAction(view.action, view.reason), '신청 첨부 정보 조회')
  assert.equal(audit.formatAuditTargetType(view.targetType), '신청 첨부파일')
  assert.equal(audit.formatAuditReason(view), '대표 이미지의 첨부 정보를 조회했습니다.')
  assert.equal(audit.auditApplicationId(view), 1)
  assert.equal(audit.isAuditReadOnly(view.action), true)
  assert.deepEqual(view, original)
  const fileRead = { ...view, reason: '통합 신청 민감 첨부 관리자 열람: REPRESENTATIVE_IMAGE' }
  assert.equal(audit.formatAuditAction(fileRead.action, fileRead.reason), '신청 첨부 조회')
  assert.equal(audit.formatAuditReason(fileRead), fileRead.reason)
})

test('only verified read operations get the non-mutation notice', () => {
  for (const action of ['MERCHANT_VERIFICATION_VIEWED', 'MERCHANT_PLACE_CLAIM_ATTACHMENT_VIEWED', 'MERCHANT_PLACE_APPLICATION_VIEWED']) assert.equal(audit.isAuditReadOnly(action), true)
  for (const action of ['NOTIFICATION_READ', 'USER_BAN_APPLIED', 'RESERVATION_CONFIRMED', 'NEW_ACTION_VIEWED', '']) assert.equal(audit.isAuditReadOnly(action), false)
})

test('all displayed filter labels round-trip to their exact API codes', () => {
  for (const [code, label] of Object.entries(audit.AUDIT_ACTION_LABELS)) {
    assert.equal(audit.auditActionCode(label), code)
    assert.equal(audit.auditActionCode(` ${code} `), code)
  }
  for (const [code, label] of Object.entries(audit.AUDIT_TARGET_TYPE_LABELS)) {
    assert.equal(audit.auditTargetTypeCode(label), code)
    assert.equal(audit.auditTargetTypeCode(code), code)
  }
  assert.equal(audit.auditActionCode('신청 첨부 정보 조회'), view.action)
  assert.equal(audit.auditActionCode(' NEW_SERVER_ACTION '), 'NEW_SERVER_ACTION')
  assert.equal(audit.auditTargetTypeCode(' NEW_SERVER_TARGET '), 'NEW_SERVER_TARGET')
  assert.equal(audit.auditActionCode(''), '')
})

for (const afterState of [null, '', 'not json', 'null', '[]', '1', '{"applicationId":"1"}', '{"applicationId":0}', '{"applicationId":-1}', '{"applicationId":1.5}', '{"applicationId":9007199254740992}']) {
  test(`invalid/missing related application does not invent an ID: ${afterState}`, () => assert.equal(audit.auditApplicationId({ ...view, afterState }), null))
}
test('unrelated actions cannot treat applicationId as a related application', () => {
  assert.equal(audit.auditApplicationId({ ...view, action: 'USER_BAN_APPLIED' }), null)
  assert.equal(audit.auditApplicationId({ ...view, action: 'MERCHANT_PLACE_APPLICATION_VIEWED', targetId: '123' }), 123)
})
test('unknown log codes and document kinds are not falsely translated', () => {
  for (const code of ['NEW_CODE', 'constructor', '__proto__']) {
    assert.equal(audit.formatAuditAction(code), '작업 유형 확인 필요')
    assert.equal(audit.formatAuditTargetType(code), '대상 유형 확인 필요')
  }
  const unknown = { ...view, reason: '통합 신청 민감 첨부 메타데이터 조회: NEW_DOCUMENT' }
  assert.match(audit.formatAuditReason(unknown), /첨부 종류는 기술 정보/)
  const reason = '관리자가 직접 작성한 사유'
  assert.equal(audit.formatAuditReason({ ...view, reason }), reason)
})
test('notification labels distinguish retrying, failed and final failure without changing codes', () => {
  assert.equal(notification.DELIVERY_STATUS_LABELS.RETRY_SCHEDULED, '재시도 예정')
  assert.equal(notification.DELIVERY_STATUS_LABELS.FAILED, '발송 실패')
  assert.equal(notification.DELIVERY_STATUS_LABELS.FINAL_FAILED, '최종 실패')
  assert.equal(notification.OUTBOX_STATUS_LABELS.RETRY, '재시도 대기')
  assert.equal(notification.DELIVERY_CHANNEL_LABELS.FCM, '앱 푸시')
})
test('admin ID examples are ordinary examples, never defaults or real operational data', async () => {
  for (const path of ['adminReservationReview/AdminReservationReviewPage', 'userRole/UserRolePage', 'trustScore/TrustScorePage']) {
    const source = await readFile(`src/pages/${path}.tsx`, 'utf8')
    assert.ok(source.includes('placeholder="예: 123"'))
  }
  const source = await readFile('src/pages/recommendationMetrics/RecommendationMetricsPage.tsx', 'utf8')
  assert.ok(source.includes('placeholder="추천 요청 번호를 붙여넣으세요"'))
  assert.doesNotMatch(source, /9f7263d5-65f1-4834-9ca3-86ad2fc4e7d0|추천 requestId|원본 CTR/)
  const application = await readFile('src/pages/merchantPlaceApplication/MerchantPlaceApplicationPage.tsx', 'utf8')
  assert.match(application, /placeholder="\+82-10-1234-5678"/)
  assert.doesNotMatch(application, /4997-7214/)
})
