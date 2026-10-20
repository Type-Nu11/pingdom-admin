import type { AdminAuditLogItem } from '../types/adminOperationHistory.types'

// Display names only. Keep API codes, request filters and original log data intact.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ADMIN_ROLE_ASSIGNED: '관리자 권한 부여', ADMIN_ROLE_REVOKED: '관리자 권한 해제',
  USER_BAN_APPLIED: '사용자 밴 처리', USER_BAN_RELEASED: '사용자 밴 해제',
  REPORT_ACCEPTED: '신고 수락', REPORT_DECLINED: '신고 반려',
  COMMUNITY_REPORT_ACCEPTED: '커뮤니티 신고 수락', COMMUNITY_REPORT_DECLINED: '커뮤니티 신고 반려',
  POST_DELETED: '게시글 삭제', POST_HIDDEN: '게시글 숨김', POST_RESTORED: '게시글 복원',
  APPEAL_APPROVED: '이의 신청 승인', APPEAL_REJECTED: '이의 신청 반려',
  PLACE_CREATED: '장소 등록', PLACE_UPDATED: '장소 정보 수정', PLACE_DELETED: '장소 삭제', PLACE_MERGED: '장소 병합',
  PLACE_STATUS_CHANGED: '장소 상태 변경', PLACE_BASIC_INFORMATION_UPDATED: '장소 기본 정보 수정',
  PLACE_KAKAO_PLACE_ID_UPDATED: '외부 지도 장소 연결 수정', PLACE_GEOCODING_UPDATED: '장소 주소·좌표 수정',
  PLACE_TOURIST_INFO_UPDATED: '방문객 안내 정보 수정', PLACE_INFORMATION_EVIDENCE_UPDATED: '장소 증빙 정보 수정',
  PLACE_INFORMATION_VERIFICATION_UPDATED: '장소 정보 검증 결과 수정', PLACE_INFORMATION_REPORT_REVIEWED: '장소 정보 신고 검토',
  PLACE_INFORMATION_DISPUTE_REVIEWED: '장소 정보 반박 검토',
  PLACE_INFORMATION_REVERIFICATION_REQUESTED: '장소 정보 재확인 요청',
  PLACE_INFORMATION_REVERIFICATION_REMINDER_REQUESTED: '장소 정보 재확인 안내 재발송',
  PLACE_INFORMATION_REVERIFICATION_COMPLETED: '장소 정보 재확인 완료',
  PLACE_INFORMATION_REVERIFICATION_CANCELED: '장소 정보 재확인 취소',
  PLACE_INFORMATION_REVERIFICATION_EXPIRED: '장소 정보 재확인 기한 만료',
  VISITOR_VERIFICATION_REPORT_REVIEWED: '방문자 검증 제보 검토',
  VISITOR_VERIFICATION_REPORT_CORRECTION_REVIEWED: '방문자 정정 요청 검토',
  SCOUT_FIELD_REPORT_REVIEWED: 'Scout 현장 제보 검토', SCOUT_PROFILE_REVIEWED: 'Scout 프로필 검토',
  SCOUT_ACTIVITY_ELIGIBILITY_REVIEWED: 'Scout 활동 자격 검토',
  PLACE_DISCOVERY_STATUS_UPDATED: '장소 탐색 노출 상태 변경', PLACE_OPERATING_STATUS_UPDATED: '장소 영업 상태 변경',
  PLACE_OPERATING_SCHEDULE_UPDATED: '장소 영업시간 변경',
  PLACE_OPERATING_NOTICE_CREATED: '운영 공지 등록', PLACE_OPERATING_NOTICE_UPDATED: '운영 공지 수정',
  PLACE_OPERATING_NOTICE_CANCELED: '운영 공지 취소', PLACE_OPERATING_NOTICE_EXPIRED: '운영 공지 기한 만료',
  PLACE_EVENT_CREATED: '이벤트 등록', PLACE_EVENT_UPDATED: '이벤트 수정', PLACE_EVENT_PUBLISHED: '이벤트 공개', PLACE_EVENT_CANCELLED: '이벤트 취소',
  PLACE_RECOMMENDATION_TRAFFIC_UPDATED: '추천 노출 배분 변경', PLACE_RECOMMENDATION_KILL_SWITCH_UPDATED: '추천 노출 긴급 중지 설정 변경',
  TRUST_SCORE_ANOMALY_RESOLVED: '신뢰 점수 이상 징후 해결', TRUST_SCORE_INTERVENTION_RULE_CREATED: '신뢰 점수 신뢰 점수 관리 규칙 등록',
  TRUST_SCORE_INTERVENTION_RULE_UPDATED: '신뢰 점수 신뢰 점수 관리 규칙 수정', TRUST_SCORE_INTERVENTION_RULE_ENABLED: '신뢰 점수 신뢰 점수 관리 규칙 활성화',
  TRUST_SCORE_INTERVENTION_RULE_DISABLED: '신뢰 점수 신뢰 점수 관리 규칙 비활성화', TRUST_SCORE_INTERVENTION_EVALUATED: '신뢰 점수 신뢰 점수 관리 규칙 평가',
  NOTIFICATION_READ: '알림 읽음 처리', NOTIFICATION_READ_ALL: '알림 전체 읽음 처리',
  PLACE_DUPLICATE_CONFIRMED: '중복 장소 후보 확인', PLACE_DUPLICATE_REJECTED: '중복 장소 후보 제외',
  MERCHANT_OWNER_APPROVED: '상점주 승인', MERCHANT_OWNER_REJECTED: '상점주 반려', MERCHANT_OWNER_REVOKED: '상점주 권한 회수',
  MERCHANT_OWNER_PLACES_UPDATED: '상점주 연결 장소 변경', MERCHANT_ONBOARDING_UPDATED: '상점주 시작 설정 변경',
  MERCHANT_OPERATIONAL_QUALITY_UPDATED: '상점주 운영 품질 변경', MERCHANT_VERIFICATION_REVIEWED: '상점주 검증 심사',
  MERCHANT_VERIFICATION_APPROVED: '상점주 검증 승인', MERCHANT_VERIFICATION_REJECTED: '상점주 검증 반려',
  MERCHANT_VERIFICATION_VIEWED: '상점주 검증 정보 조회', MERCHANT_PLACE_CLAIM_ATTACHMENT_VIEWED: '운영 권한 신청 첨부 조회',
  MERCHANT_PLACE_CLAIM_APPROVED: '운영 권한 신청 승인', MERCHANT_PLACE_CLAIM_REJECTED: '운영 권한 신청 반려',
  MERCHANT_PLACE_APPLICATION_APPROVED: '상점주 장소 신청 승인', MERCHANT_PLACE_APPLICATION_REJECTED: '상점주 장소 신청 반려',
  MERCHANT_PLACE_APPLICATION_VIEWED: '상점주 장소 신청 조회', MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED: '신청 첨부 조회',
  OUTBOX_EVENT_RETRIED: '실패한 처리 작업 재시도', AD_CREATED: '광고 등록', AD_DELETED: '광고 삭제',
  RESERVATION_CONFIRMED: '예약 승인', RESERVATION_REJECTED: '예약 반려',
}

export const AUDIT_TARGET_TYPE_LABELS: Record<string, string> = {
  USER: '사용자', REPORT: '신고', COMMUNITY_REPORT: '커뮤니티 신고', APPEAL: '이의 신청', POST: '게시글', PLACE: '장소',
  PLACE_DUPLICATE_CANDIDATE: '중복 장소 후보', PLACE_INFORMATION_EVIDENCE: '장소 증빙', PLACE_INFORMATION_REPORT: '장소 정보 신고',
  PLACE_INFORMATION_DISPUTE: '장소 정보 반박', PLACE_INFORMATION_REVERIFICATION: '장소 정보 재확인',
  VISITOR_VERIFICATION_REPORT: '방문자 검증 제보', VISITOR_VERIFICATION_REPORT_CORRECTION: '방문자 정정 요청',
  SCOUT_FIELD_REPORT: 'Scout 현장 제보', SCOUT_PROFILE: 'Scout 프로필', SCOUT_ACTIVITY_ELIGIBILITY: 'Scout 활동 자격',
  PLACE_OPERATING_NOTICE: '운영 공지', PLACE_EVENT: '이벤트', TRUST_SCORE_ANOMALY: '신뢰 점수 이상 징후',
  TRUST_SCORE_INTERVENTION_RULE: '신뢰 점수 신뢰 점수 관리 규칙', NOTIFICATION: '알림', OUTBOX_EVENT: '처리 작업',
  MERCHANT: '상점주(이전 기록)', MERCHANT_OWNER: '상점주', MERCHANT_VERIFICATION: '상점주 검증',
  MERCHANT_PLACE_CLAIM_ATTACHMENT: '운영 권한 신청 첨부파일', MERCHANT_PLACE_CLAIM: '운영 권한 신청',
  MERCHANT_PLACE_APPLICATION: '상점주 장소 신청', MERCHANT_PLACE_APPLICATION_ATTACHMENT: '신청 첨부파일',
  AD: '광고', RESERVATION: '예약', REVIEW: '리뷰', EVENT: '이벤트(이전 기록)',
}

export function formatAuditAction(action: string, reason?: string | null) {
  if (action === 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED' && reason?.startsWith('통합 신청 민감 첨부 메타데이터 조회:')) return '신청 첨부 정보 조회'
  return Object.hasOwn(AUDIT_ACTION_LABELS, action) ? AUDIT_ACTION_LABELS[action] : '작업 유형 확인 필요'
}
export const formatAuditTargetType = (type: string) => Object.hasOwn(AUDIT_TARGET_TYPE_LABELS, type) ? AUDIT_TARGET_TYPE_LABELS[type] : '대상 유형 확인 필요'

// Accept both human labels and existing/raw API codes, including new server codes.
const filterCode = (value: string, labels: Record<string, string>) => Object.entries(labels).find(([, label]) => label === value.trim())?.[0] ?? value.trim()
export const auditActionCode = (value: string) => value.trim() === '신청 첨부 정보 조회' ? 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED' : filterCode(value, AUDIT_ACTION_LABELS)
export const auditTargetTypeCode = (value: string) => filterCode(value, AUDIT_TARGET_TYPE_LABELS)

export function isAuditReadOnly(action: string) {
  return ['MERCHANT_VERIFICATION_VIEWED', 'MERCHANT_PLACE_CLAIM_ATTACHMENT_VIEWED', 'MERCHANT_PLACE_APPLICATION_VIEWED', 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED'].includes(action)
}

export function auditApplicationId(item: AdminAuditLogItem): number | null {
  if (!['MERCHANT_PLACE_APPLICATION_VIEWED', 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED'].includes(item.action)) return null
  if (item.action === 'MERCHANT_PLACE_APPLICATION_VIEWED') {
    if (!/^\d+$/.test(item.targetId)) return null
    const id = Number(item.targetId)
    return Number.isSafeInteger(id) && id > 0 ? id : null
  }
  try {
    const value: unknown = JSON.parse(item.afterState ?? '')
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('applicationId' in value)) return null
    const id = value.applicationId
    return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
  } catch { return null }
}

export function formatAuditReason(item: AdminAuditLogItem) {
  if (item.action === 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED' && item.reason?.startsWith('통합 신청 민감 첨부 메타데이터 조회:')) {
    const type = item.reason.split(':').slice(1).join(':').trim()
    const documents: Record<string, string> = { REPRESENTATIVE_IMAGE: '대표 이미지', BUSINESS_REGISTRATION: '사업자 등록증', IDENTITY_DOCUMENT: '신분 확인 서류' }
    return documents[type] ? `${documents[type]}의 첨부 정보를 조회했습니다.` : '신청 첨부 정보를 조회했습니다. 첨부 종류는 기술 정보에서 확인할 수 있습니다.'
  }
  if (item.action === 'MERCHANT_PLACE_APPLICATION_VIEWED' && item.reason === '통합 신청 민감정보 상세 조회') return '상점주 장소 신청의 상세 정보를 조회했습니다.'
  return item.reason || '기록된 사유가 없습니다.'
}
