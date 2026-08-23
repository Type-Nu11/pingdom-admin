import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/adminPlaceRegistrationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceRegistrationApplication,
  AdminPlaceRegistrationErrorResponse,
} from '../types/adminPlaceRegistration.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '장소 등록 신청을 찾을 수 없습니다.',
  conflict: '다른 관리자가 먼저 처리했습니다. 목록을 새로고침해주세요.',
  network: '서버에 연결할 수 없습니다.',
  'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
} as const

export function useAdminPlaceRegistrations() {
  const { clearAuth } = useAuth()
  const [applications, setApplications] = useState<AdminPlaceRegistrationApplication[]>([])
  const [detail, setDetail] = useState<AdminPlaceRegistrationApplication | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const reviewRef = useRef(false)
  const pageRef = useRef(1)
  const detailRequestRef = useRef(0)

  const message = useCallback((error: unknown, fallback: string) => {
    if (!isApiError<AdminPlaceRegistrationErrorResponse>(error)) return fallback
    if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') {
      clearAuth()
    }
    return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
  }, [clearAuth])

  const fetchApplications = useCallback(async (nextPage = pageRef.current) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await api.getAdminPlaceRegistrations({ page: nextPage, limit: 20 })
      setApplications(data.applications)
      setPage(data.page)
      setTotalCount(data.totalCount)
      setTotalPages(data.totalPages)
      setHasNext(data.hasNext)
      pageRef.current = data.page
      return true
    } catch (error) {
      setErrorMessage(message(error, '장소 등록 신청 목록을 불러오지 못했습니다.'))
      logDebugError('관리자 장소 등록 신청 목록 조회 실패', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [message])

  const fetchDetail = useCallback(async (applicationId: number) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setIsDetailLoading(true)
    setDetailErrorMessage('')
    try {
      const data = await api.getAdminPlaceRegistration(applicationId)
      if (requestId !== detailRequestRef.current) return null
      setDetail(data)
      return data
    } catch (error) {
      if (requestId !== detailRequestRef.current) return null
      setDetail(null)
      setDetailErrorMessage(message(error, '장소 등록 신청 상세를 불러오지 못했습니다.'))
      logDebugError('관리자 장소 등록 신청 상세 조회 실패', error)
      return null
    } finally {
      if (requestId === detailRequestRef.current) setIsDetailLoading(false)
    }
  }, [message])

  const review = useCallback(async (approved: boolean, reason: string) => {
    if (!detail || reviewRef.current) return null
    reviewRef.current = true
    setIsReviewing(true)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const reviewed = approved
        ? await api.approveAdminPlaceRegistration(detail.id, { reason })
        : await api.rejectAdminPlaceRegistration(detail.id, { reason })
      setDetail(reviewed)
      setApplications((current) => current.map((item) => item.id === reviewed.id ? reviewed : item))
      setSuccessMessage(approved ? '장소 등록 신청을 승인했습니다.' : '장소 등록 신청을 반려했습니다.')
      return reviewed
    } catch (error) {
      setActionErrorMessage(message(error, '장소 등록 신청 심사를 처리하지 못했습니다.'))
      logDebugError('관리자 장소 등록 신청 심사 실패', error)
      if (isApiError(error) && error.category === 'conflict') void fetchDetail(detail.id)
      return null
    } finally {
      reviewRef.current = false
      setIsReviewing(false)
    }
  }, [detail, fetchDetail, message])

  useEffect(() => { void fetchApplications(1) }, [fetchApplications])

  return {
    applications,
    detail,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    isReviewing,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    successMessage,
    fetchApplications,
    fetchDetail,
    review,
  }
}
