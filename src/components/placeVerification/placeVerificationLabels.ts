import type {
  PlaceInformationDisputeStatus,
  PlaceInformationEvidenceType,
  PlaceInformationReportReasonType,
  PlaceInformationReportStatus,
  PlaceInformationReportTargetType,
  PlaceInformationReverificationStatus,
  PlaceInformationSourceType,
  PlaceInformationVerificationStatus,
} from '../../types/adminPlaceVerification.types'

export const REPORT_STATUS_LABELS: Record<PlaceInformationReportStatus, string> = {
  SUBMITTED: '접수',
  UNDER_REVIEW: '검토 중',
  ACCEPTED: '신고 수용',
  REJECTED: '신고 반려',
  DISPUTED: '반박 접수',
  RESOLVED: '처리 완료',
  CANCELED: '취소',
}

export const DISPUTE_STATUS_LABELS: Record<PlaceInformationDisputeStatus, string> = {
  SUBMITTED: '반박 접수',
  ACCEPTED: '반박 수용',
  REJECTED: '반박 반려',
}

export const TARGET_TYPE_LABELS: Record<PlaceInformationReportTargetType, string> = {
  NAME: '장소명',
  ADDRESS: '주소',
  GEOLOCATION: '좌표',
  OPERATING_STATUS: '운영 상태',
  TOURIST_INFORMATION: '관광 정보',
  SOURCE_EVIDENCE: '출처·증빙',
  MEDIA: '미디어',
  OTHER: '기타',
}

export const REASON_TYPE_LABELS: Record<PlaceInformationReportReasonType, string> = {
  INCORRECT: '잘못된 정보',
  OUTDATED: '오래된 정보',
  MISSING: '누락된 정보',
  MISLEADING: '오해의 소지',
  DUPLICATE: '중복 장소',
  CLOSED_OR_MOVED: '폐업·이전',
  SPAM_OR_ABUSE: '스팸·악용',
  OTHER: '기타',
}

export const SOURCE_TYPE_LABELS: Record<PlaceInformationSourceType, string> = {
  LEGACY: '기존 데이터',
  KAKAO: 'Kakao',
  MERCHANT_OWNER: '업주 제출',
  ADMIN: '관리자 확인',
  USER_REPORT: '사용자 신고',
  SYSTEM: '시스템',
}

export const EVIDENCE_TYPE_LABELS: Record<PlaceInformationEvidenceType, string> = {
  EXTERNAL_PLACE_ID: '외부 장소 ID',
  BUSINESS_CLAIM: '사업자 소유 증명',
  DOCUMENT: '문서',
  PHOTO: '사진',
  ADMIN_REVIEW: '관리자 검토',
  USER_VISIT: '사용자 방문',
  SYSTEM_SIGNAL: '시스템 신호',
}

export const VERIFICATION_STATUS_LABELS: Record<PlaceInformationVerificationStatus, string> = {
  UNVERIFIED: '미검증',
  SOURCE_CONFIRMED: '출처 확인',
  OWNER_SUBMITTED: '업주 제출',
  ADMIN_VERIFIED: '관리자 검증',
  REJECTED: '반려',
  DISPUTED: '이의 제기',
  EXPIRED: '만료',
}

export const REVERIFICATION_STATUS_LABELS: Record<PlaceInformationReverificationStatus, string> = {
  REQUESTED: '요청됨',
  RESPONDED: '응답 완료',
  COMPLETED: '검토 완료',
  CANCELED: '취소',
  EXPIRED: '기한 만료',
}

export function formatVerificationDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export function getStatusTone(status: string): 'success' | 'warning' | 'danger' | undefined {
  if (['ACCEPTED', 'RESOLVED', 'ADMIN_VERIFIED', 'COMPLETED'].includes(status)) {
    return 'success'
  }
  if (['REJECTED', 'CANCELED', 'EXPIRED'].includes(status)) return 'danger'
  if (['SUBMITTED', 'UNDER_REVIEW', 'DISPUTED', 'REQUESTED', 'RESPONDED'].includes(status)) {
    return 'warning'
  }
  return undefined
}
