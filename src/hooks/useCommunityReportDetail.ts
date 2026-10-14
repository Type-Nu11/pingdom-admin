import { useCallback } from 'react'
import { getCommunityComment, getCommunityPost, getCommunityReport } from '../api/adminCommunityApi'
import { reportPostId } from '../utils/community'
import { communityError, useCommunityQuery } from './useCommunityQuery'
import { shouldClearAuth } from '../api/authError'
import type { CommunityReportDetail } from '../types/adminCommunity.types'

export function useCommunityReportDetail(reportId: number | null) {
  const loader = useCallback(async (signal: AbortSignal): Promise<CommunityReportDetail> => {
    const report = await getCommunityReport(reportId!, signal)
    if (report.reportId !== reportId) throw new Error('신고 응답 대상 불일치')
    const postId = reportPostId(report)
    if (!postId) return { report, target: null, unavailable: '원문 연결 정보가 없어 심사할 수 없습니다. 서버 반영 여부를 확인한 뒤 다시 조회해주세요.' }
    try {
      const target = report.targetType === 'POST'
        ? await getCommunityPost(postId, signal)
        : await getCommunityComment(postId, report.targetId, signal)
      if (target.postId !== postId || (report.targetType === 'COMMENT' && (!('commentId' in target) || target.commentId !== report.targetId))) {
        throw new Error('원문 응답 대상 불일치')
      }
      return { report, target, unavailable: '' }
    } catch (error) {
      if (signal.aborted || shouldClearAuth(error)) throw error
      return { report, target: null, unavailable: `원문을 확인하지 못해 심사할 수 없습니다. ${communityError(error)}` }
    }
  }, [reportId])
  return useCommunityQuery(reportId === null ? null : `report:${reportId}`, loader)
}
