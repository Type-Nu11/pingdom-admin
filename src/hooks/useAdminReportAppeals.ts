import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  approveAdminReportAppeal,
  getAdminReportAppeals,
  rejectAdminReportAppeal,
} from '../api/adminReportAppealApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminReportAppealActionRequest,
  AdminReportAppealErrorResponse,
  AdminReportAppealItem,
  AdminReportAppealStatus,
} from '../types/adminReportAppeal.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const LIMIT = 10
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '이의제기를 찾을 수 없습니다.',
  conflict: '이미 처리된 이의제기입니다. 목록을 새로고침해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<AdminReportAppealErrorResponse>(error)) return fallbackMessage
  return getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
}

function shouldClearAuth(error: unknown) {
  return isApiError<AdminReportAppealErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
}

export function useAdminReportAppeals() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<AdminReportAppealStatus | ''>('SUBMITTED')
  const [appeals, setAppeals] = useState<AdminReportAppealItem[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [processingAppealId, setProcessingAppealId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  useAutoDismissMessage(actionSuccessMessage, setActionSuccessMessage)
  const latestRequestIdRef = useRef(0)
  const processingRef = useRef<number | null>(null)
  const queryRef = useRef({ status, page })

  const fetchAppeals = useCallback(async (
    nextStatus = queryRef.current.status,
    nextPage = queryRef.current.page
  ) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    queryRef.current = { status: nextStatus, page: nextPage }
    setStatus(nextStatus)
    setPage(nextPage)
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAdminReportAppeals({
        status: nextStatus || undefined,
        page: nextPage,
        limit: LIMIT,
      })
      if (requestId === latestRequestIdRef.current) {
        setAppeals(data.appeals)
        setPage(data.page)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
      }
      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        setAppeals([])
        setTotalCount(0)
        setTotalPages(0)
        setHasNext(false)
        setErrorMessage(getErrorMessage(error, '신고 이의제기 목록을 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 신고 이의제기 목록 조회 실패', error)
      return false
    } finally {
      if (requestId === latestRequestIdRef.current) setIsLoading(false)
    }
  }, [clearAuth])

  const processAppeal = useCallback(async (
    appealId: number,
    action: 'approve' | 'reject',
    request: AdminReportAppealActionRequest
  ) => {
    if (processingRef.current !== null) return null
    processingRef.current = appealId
    setProcessingAppealId(appealId)
    setActionErrorMessage('')
    setActionSuccessMessage('')
    try {
      const data = action === 'approve'
        ? await approveAdminReportAppeal(appealId, request)
        : await rejectAdminReportAppeal(appealId, request)
      setActionSuccessMessage(action === 'approve' ? '이의제기를 승인했습니다.' : '이의제기를 반려했습니다.')
      await fetchAppeals(queryRef.current.status, queryRef.current.page)
      return data
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, '이의제기를 처리하지 못했습니다.'))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError('관리자 신고 이의제기 처리 실패', error)
      return null
    } finally {
      processingRef.current = null
      setProcessingAppealId(null)
    }
  }, [clearAuth, fetchAppeals])

  useEffect(() => { void fetchAppeals('SUBMITTED', 1) }, [fetchAppeals])

  return {
    status,
    appeals,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    processingAppealId,
    errorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchAppeals,
    processAppeal,
  }
}
