import type { AdminCommunityReport, CommunityReportDetail } from '../types/adminCommunity.types'

export const COMMUNITY_STATUS_LABELS = { PENDING: '처리 대기', ACCEPTED: '수락', DECLINED: '반려' }
export const COMMUNITY_TARGET_LABELS = { POST: '글', COMMENT: '댓글' }
export const COMMUNITY_REASON_LABELS: Record<string, string> = {
  SPAM: '스팸', ABUSE: '욕설·비방', INAPPROPRIATE_CONTENT: '부적절한 내용',
  PERSONAL_INFORMATION: '개인정보 노출', OTHER: '기타',
}
export function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
export function reportPostId(report: AdminCommunityReport) {
  if (!positiveId(report.targetId)) return null
  if (report.targetType === 'POST') {
    if (report.postId != null && report.postId !== report.targetId) return null
    return report.targetId
  }
  return report.targetType === 'COMMENT' && positiveId(report.postId) ? report.postId : null
}
export function canReviewCommunityReport(detail: CommunityReportDetail | null | undefined) {
  if (!detail || detail.unavailable || detail.report.status !== 'PENDING' || !detail.target) return false
  const { report, target } = detail
  if (!positiveId(report.reportId) || target.postId !== reportPostId(report)) return false
  return report.targetType === 'POST'
    ? !('commentId' in target)
    : 'commentId' in target && target.commentId === report.targetId
}
export function communityDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '정보 없음' : date.toLocaleString('ko-KR')
}
