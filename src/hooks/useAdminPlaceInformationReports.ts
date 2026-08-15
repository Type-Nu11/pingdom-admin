import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminPlaceInformationReport,
  getAdminPlaceInformationReports,
  reviewAdminPlaceInformationDispute,
  reviewAdminPlaceInformationReport,
} from '../api/adminPlaceVerificationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceVerificationErrorResponse,
  PlaceInformationDisputeReviewRequest,
  PlaceInformationReport,
  PlaceInformationReportReviewRequest,
  PlaceInformationReportStatus,
} from '../types/adminPlaceVerification.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const PAGE_LIMIT = 20

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '신고 또는 반박 정보를 찾을 수 없습니다.',
  conflict: '처리 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<AdminPlaceVerificationErrorResponse>(error)) {
    return fallbackMessage
  }
  return getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPlaceVerificationErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

export type PlaceReportAction = 'review-report' | 'review-dispute'

export function useAdminPlaceInformationReports() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<PlaceInformationReportStatus | ''>('SUBMITTED')
  const [reports, setReports] = useState<PlaceInformationReport[]>([])
  const [reportDetail, setReportDetail] = useState<PlaceInformationReport | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<PlaceReportAction | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  const latestListRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const activeActionRef = useRef<PlaceReportAction | null>(null)
  const queryRef = useRef({ status, page })

  const fetchReports = useCallback(
    async (nextStatus = queryRef.current.status, nextPage = queryRef.current.page) => {
      const requestId = latestListRequestIdRef.current + 1
      latestListRequestIdRef.current = requestId
      queryRef.current = { status: nextStatus, page: nextPage }
      setStatus(nextStatus)
      setPage(nextPage)
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getAdminPlaceInformationReports({
          status: nextStatus || undefined,
          page: nextPage,
          limit: PAGE_LIMIT,
        })
        if (requestId === latestListRequestIdRef.current) {
          setReports(data.reports)
          setPage(data.page)
          setTotalCount(data.totalCount)
          setTotalPages(data.totalPages)
          setHasNext(data.hasNext)
        }
        return true
      } catch (error) {
        if (requestId === latestListRequestIdRef.current) {
          setReports([])
          setTotalCount(0)
          setTotalPages(0)
          setHasNext(false)
          setErrorMessage(getErrorMessage(error, '장소 정보 신고 목록을 불러오지 못했습니다.'))
          if (shouldClearAuth(error)) clearAuth()
        }
        logDebugError('관리자 장소 정보 신고 목록 조회 실패', error)
        return false
      } finally {
        if (requestId === latestListRequestIdRef.current) setIsLoading(false)
      }
    },
    [clearAuth]
  )

  const fetchReportDetail = useCallback(
    async (reportId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId
      setIsDetailLoading(true)
      setDetailErrorMessage('')
      setActionErrorMessage('')
      try {
        const data = await getAdminPlaceInformationReport(reportId)
        if (requestId === latestDetailRequestIdRef.current) setReportDetail(data)
        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setReportDetail(null)
          setDetailErrorMessage(getErrorMessage(error, '장소 정보 신고 상세를 불러오지 못했습니다.'))
          if (shouldClearAuth(error)) clearAuth()
        }
        logDebugError('관리자 장소 정보 신고 상세 조회 실패', error)
        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) setIsDetailLoading(false)
      }
    },
    [clearAuth]
  )

  const runAction = useCallback(
    async (
      action: PlaceReportAction,
      request: () => Promise<PlaceInformationReport>,
      successMessage: string,
      debugLabel: string
    ) => {
      if (activeActionRef.current) return null
      activeActionRef.current = action
      setActiveAction(action)
      setActionErrorMessage('')
      setActionSuccessMessage('')
      try {
        const data = await request()
        setReportDetail(data)
        setActionSuccessMessage(successMessage)
        await fetchReports(queryRef.current.status, queryRef.current.page)
        return data
      } catch (error) {
        setActionErrorMessage(getErrorMessage(error, '신고 검토 결과를 저장하지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
        logDebugError(debugLabel, error)
        return null
      } finally {
        activeActionRef.current = null
        setActiveAction(null)
      }
    },
    [clearAuth, fetchReports]
  )

  const reviewReport = useCallback(
    (reportId: number, request: PlaceInformationReportReviewRequest) =>
      runAction(
        'review-report',
        () => reviewAdminPlaceInformationReport(reportId, request),
        '신고 검토 결과를 저장했습니다.',
        '관리자 장소 정보 신고 검토 실패'
      ),
    [runAction]
  )

  const reviewDispute = useCallback(
    (reportId: number, disputeId: number, request: PlaceInformationDisputeReviewRequest) =>
      runAction(
        'review-dispute',
        () => reviewAdminPlaceInformationDispute(reportId, disputeId, request),
        '반박 검토 결과를 저장했습니다.',
        '관리자 장소 정보 신고 반박 검토 실패'
      ),
    [runAction]
  )

  const clearReportDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setReportDetail(null)
    setDetailErrorMessage('')
    setActionErrorMessage('')
  }, [])

  useEffect(() => {
    void fetchReports('SUBMITTED', 1)
  }, [fetchReports])

  return {
    status,
    reports,
    reportDetail,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchReports,
    fetchReportDetail,
    clearReportDetail,
    reviewReport,
    reviewDispute,
  }
}
