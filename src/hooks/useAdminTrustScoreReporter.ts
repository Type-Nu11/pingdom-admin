import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminTrustScore, getAdminTrustScoreHistory } from '../api/adminTrustScoreApi'
import { isApiError } from '../api/customAxios'
import type { AdminTrustScore, TrustScoreHistory, TrustScoreHistoryResponse } from '../types/adminTrustScore.types'
import { getAuthSessionId } from '../utils/authStorage'
import { useAuth } from './useAuth'

export const TRUST_SCORE_HISTORY_PAGE_SIZE = 20
type Phase = 'idle' | 'loading' | 'success' | 'error'
type OnError = (error: unknown, fallback: string, debug: string, setter: (message: string) => void) => void
interface ReporterState {
  owner: string
  selectedReporterId: number | null
  reporter: AdminTrustScore | null
  reporterPhase: Phase
  reporterError: string
  history: TrustScoreHistory[]
  historyPageInfo: Omit<TrustScoreHistoryResponse, 'items'> | null
  historyPhase: Phase
  historyError: string
  requestedHistoryPage: number
}
const emptyState = (owner: string): ReporterState => ({
  owner, selectedReporterId: null, reporter: null, reporterPhase: 'idle', reporterError: '',
  history: [], historyPageInfo: null, historyPhase: 'idle', historyError: '', requestedHistoryPage: 1,
})
const isRestricted = (error: unknown) => isApiError(error) && ['unauthorized', 'forbidden'].includes(error.category ?? '')

export function useAdminTrustScoreReporter(onError: OnError) {
  const { user } = useAuth()
  const session = getAuthSessionId()
  const owner = `${session}:${user?.id ?? ''}:${user?.role ?? ''}`
  const [state, setState] = useState(() => emptyState(owner))
  const mounted = useRef(true)
  const reporterRequest = useRef(0)
  const historyRequest = useRef(0)
  const selected = useRef<{ owner: string; id: number } | null>(null)

  useEffect(() => {
    const reporterRequests = reporterRequest
    const historyRequests = historyRequest
    mounted.current = true
    return () => {
      mounted.current = false
      reporterRequests.current++
      historyRequests.current++
      selected.current = null
    }
  }, [owner])

  const fetchHistory = useCallback(async (page = 1) => {
    const target = selected.current
    if (!target || target.owner !== owner || !Number.isSafeInteger(page) || page < 1) return false
    const request = ++historyRequest.current
    const current = () => mounted.current && historyRequest.current === request
      && selected.current === target && getAuthSessionId() === session
    setState(prev => ({ ...prev, historyPhase: 'loading', historyError: '', requestedHistoryPage: page }))
    try {
      let result = await getAdminTrustScoreHistory(target.id, page, TRUST_SCORE_HISTORY_PAGE_SIZE)
      if (!current()) return false
      if (result.page > Math.max(1, result.totalPages)) {
        const lastPage = Math.max(1, result.totalPages)
        setState(prev => ({ ...prev, requestedHistoryPage: lastPage }))
        result = await getAdminTrustScoreHistory(target.id, lastPage, TRUST_SCORE_HISTORY_PAGE_SIZE)
        if (!current()) return false
        if (result.page > Math.max(1, result.totalPages)) throw new Error('신뢰 점수 이력 페이지 정보가 일치하지 않습니다.')
      }
      const { items, ...historyPageInfo } = result
      setState(prev => ({ ...prev, history: items, historyPageInfo, historyPhase: 'success' }))
      return true
    } catch (error) {
      if (!current()) return false
      setState(prev => ({ ...prev, historyPhase: 'error', ...(isRestricted(error) ? { history: [], historyPageInfo: null } : {}) }))
      onError(error, '점수 변경 이력을 불러오지 못했습니다.', '관리자 Trust Score 이력 조회 실패', historyError => {
        setState(prev => ({ ...prev, historyError }))
      })
      return false
    }
  }, [onError, owner, session])

  const fetchReporter = useCallback(async (reporterUserId: number) => {
    if (!mounted.current || !Number.isSafeInteger(reporterUserId) || reporterUserId < 1) return null
    const request = ++reporterRequest.current
    const target = { owner, id: reporterUserId }
    selected.current = target
    historyRequest.current++
    setState(prev => ({
      ...(prev.owner === owner && prev.selectedReporterId === reporterUserId ? prev : emptyState(owner)),
      selectedReporterId: reporterUserId, reporterPhase: 'loading', reporterError: '',
    }))
    // History errors must not erase a successfully read score.
    void fetchHistory(1)
    const current = () => mounted.current && reporterRequest.current === request
      && selected.current === target && getAuthSessionId() === session
    try {
      const reporter = await getAdminTrustScore(reporterUserId)
      if (!current()) return null
      if (reporter.reporterUserId !== reporterUserId) throw new Error('신고자 응답의 대상이 일치하지 않습니다.')
      setState(prev => ({ ...prev, reporter, reporterPhase: 'success' }))
      return reporter
    } catch (error) {
      if (!current()) return null
      if (isRestricted(error)) {
        historyRequest.current++
        selected.current = null
      }
      setState(prev => ({ ...prev, reporterPhase: 'error', ...(isRestricted(error) ? { reporter: null, history: [], historyPageInfo: null, historyPhase: 'idle', historyError: '' } : {}) }))
      onError(error, '신고자 신뢰 점수를 불러오지 못했습니다.', '관리자 Trust Score 신고자 조회 실패', reporterError => {
        setState(prev => ({ ...prev, reporterError }))
      })
      return null
    }
  }, [fetchHistory, onError, owner, session])

  // Hide the old account before cleanup and late promises can run.
  const visible = state.owner === owner ? state : emptyState(owner)
  return { ...visible, owner, isReporterLoading: visible.reporterPhase === 'loading', fetchReporter, fetchHistory }
}
