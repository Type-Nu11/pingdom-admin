import { useEffect, useRef, useState } from 'react'
import { reviewCommunityReport } from '../api/adminCommunityApi'
import { shouldClearAuth } from '../api/authError'
import { canReviewCommunityReport } from '../utils/community'
import { communityError } from './useCommunityQuery'
import { useAuth } from './useAuth'
import type { CommunityDecision, CommunityReportDetail } from '../types/adminCommunity.types'

export function useCommunityReview() {
  const { clearAuth } = useAuth()
  const locked = useRef(false)
  const mounted = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [warning, setWarning] = useState('')
  const [completed, setCompleted] = useState<number[]>([])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const review = async (detail: CommunityReportDetail | null, reportId: number, decision: CommunityDecision, refresh: () => Promise<boolean[]>) => {
    if (locked.current || completed.includes(reportId) || detail?.report.reportId !== reportId || !canReviewCommunityReport(detail)) return false
    locked.current = true
    setBusy(true); setError(''); setSuccess(''); setWarning('')
    let succeeded = false
    try {
      await reviewCommunityReport(reportId, decision)
      succeeded = true
      if (!mounted.current) return true
      setCompleted(ids => [...ids, reportId])
      setSuccess(`신고 #${reportId}: ${decision === 'accept' ? '수락했습니다. 대상이 숨김 처리됩니다.' : '반려했습니다. 대상 노출 상태는 변경하지 않습니다.'}`)
    } catch (error) {
      if (!mounted.current) return false
      if (shouldClearAuth(error)) clearAuth()
      setError(communityError(error))
    } finally {
      if (mounted.current) {
        // Re-query even on conflict/uncertain failure before allowing another review.
        try {
          const results = await refresh()
          if (mounted.current && succeeded && results.some(result => !result)) {
            setWarning('신고 처리는 완료됐지만 화면 갱신에 실패했습니다. 다시 처리하지 말고 목록·상세를 새로고침해주세요.')
          }
        } catch {
          if (mounted.current && succeeded) setWarning('신고 처리는 완료됐지만 화면 갱신에 실패했습니다. 다시 조회해주세요.')
        }
        if (mounted.current) setBusy(false)
      }
      locked.current = false
    }
    return succeeded
  }
  return { review, busy, error, success, warning, completed, dismissError: () => setError('') }
}
