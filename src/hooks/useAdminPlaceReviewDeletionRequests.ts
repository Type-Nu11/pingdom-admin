import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminPlaceReviewDeletionRequest,
  getAdminPlaceReviewDeletionRequests,
  reviewAdminPlaceReviewDeletionRequest,
} from '../api/adminPlaceReviewDeletionApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceReviewDeletionErrorResponse,
  AdminPlaceReviewDeletionRequest,
  AdminPlaceReviewDeletionRequestReviewRequest,
  PlaceReviewDeletionRequestStatus,
} from '../types/adminPlaceReviewDeletion.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const LIMIT = 10

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '리뷰 삭제 요청을 찾을 수 없습니다.',
  conflict: '이미 처리된 요청입니다. 목록을 새로고침해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function message(error: unknown, fallback: string) {
  if (!isApiError<AdminPlaceReviewDeletionErrorResponse>(error)) return fallback
  return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
}

function shouldClearAuth(error: unknown) {
  return isApiError<AdminPlaceReviewDeletionErrorResponse>(error) && (
    error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized'
  )
}

export function useAdminPlaceReviewDeletionRequests() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<PlaceReviewDeletionRequestStatus | ''>('PENDING')
  const [items, setItems] = useState<AdminPlaceReviewDeletionRequest[]>([])
  const [detail, setDetail] = useState<AdminPlaceReviewDeletionRequest | null>(null)
  const [page, setPage] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const listRequestRef = useRef(0)
  const detailRequestRef = useRef(0)
  const reviewRequestRef = useRef(false)
  const queryRef = useRef({ status, page })

  const fetchItems = useCallback(async (
    nextStatus = queryRef.current.status,
    nextPage = queryRef.current.page
  ) => {
    const requestId = ++listRequestRef.current
    queryRef.current = { status: nextStatus, page: nextPage }
    setStatus(nextStatus)
    setPage(nextPage)
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAdminPlaceReviewDeletionRequests({
        status: nextStatus || undefined,
        page: nextPage,
        limit: LIMIT,
      })
      if (requestId === listRequestRef.current) {
        setItems(data.deletionRequests)
        setPage(data.page)
        setTotalElements(data.totalElements)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
      }
      return true
    } catch (error) {
      if (requestId === listRequestRef.current) {
        setItems([])
        setTotalElements(0)
        setTotalPages(0)
        setHasNext(false)
        setErrorMessage(message(error, '리뷰 삭제 요청을 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 리뷰 삭제 요청 목록 조회 실패', error)
      return false
    } finally {
      if (requestId === listRequestRef.current) setIsLoading(false)
    }
  }, [clearAuth])

  const fetchDetail = useCallback(async (deletionRequestId: number) => {
    const requestId = ++detailRequestRef.current
    setIsDetailLoading(true)
    setDetail(null)
    setDetailErrorMessage('')
    setActionErrorMessage('')
    try {
      const data = await getAdminPlaceReviewDeletionRequest(deletionRequestId)
      if (requestId === detailRequestRef.current) setDetail(data)
      return data
    } catch (error) {
      if (requestId === detailRequestRef.current) {
        setDetail(null)
        setDetailErrorMessage(message(error, '리뷰 삭제 요청 상세를 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 리뷰 삭제 요청 상세 조회 실패', error)
      return null
    } finally {
      if (requestId === detailRequestRef.current) setIsDetailLoading(false)
    }
  }, [clearAuth])

  const review = useCallback(async (
    deletionRequestId: number,
    request: AdminPlaceReviewDeletionRequestReviewRequest
  ) => {
    if (reviewRequestRef.current) return null
    reviewRequestRef.current = true
    setIsReviewing(true)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await reviewAdminPlaceReviewDeletionRequest(deletionRequestId, request)
      setDetail(data)
      setSuccessMessage(request.decision === 'APPROVED'
        ? '리뷰 삭제 요청을 승인했습니다.'
        : '리뷰 삭제 요청을 반려했습니다.')
      await fetchItems(queryRef.current.status, queryRef.current.page)
      return data
    } catch (error) {
      setActionErrorMessage(message(error, '리뷰 삭제 요청을 처리하지 못했습니다.'))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError('관리자 리뷰 삭제 요청 심사 실패', error)
      return null
    } finally {
      reviewRequestRef.current = false
      setIsReviewing(false)
    }
  }, [clearAuth, fetchItems])

  const clearDetail = useCallback(() => {
    detailRequestRef.current += 1
    setDetail(null)
    setDetailErrorMessage('')
    setActionErrorMessage('')
  }, [])

  useEffect(() => {
    void fetchItems('PENDING', 1)
  }, [fetchItems])

  return {
    status,
    items,
    detail,
    page,
    totalElements,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    isReviewing,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    successMessage,
    fetchItems,
    fetchDetail,
    review,
    clearDetail,
  }
}
