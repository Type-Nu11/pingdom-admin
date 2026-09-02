import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  confirmAdminReservation,
  getAdminReservation,
  getAdminReservations,
  rejectAdminReservation,
} from '../api/adminReservationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminReservation,
  AdminReservationErrorResponse,
  AdminReservationQuery,
  AdminReservationReviewRequest,
  AdminReservationStatus,
} from '../types/adminReservation.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const LIMIT = 10
export type AdminReservationAction = 'confirm' | 'reject'

type ReservationQueryState = Required<Pick<AdminReservationQuery, 'page'>> & {
  status: AdminReservationStatus | ''
  placeId: number | undefined
}

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '예약 정보를 찾을 수 없습니다.',
  conflict: '예약 상태가 이미 변경되었습니다. 다시 조회해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!isApiError<AdminReservationErrorResponse>(error)) return fallback
  return getAuthErrorMessage(error, {
    fallbackMessage: fallback,
    categoryMessages: CATEGORY_MESSAGES,
    codeMessages: {
      RESERVATION_NOT_FOUND: '예약 정보를 찾을 수 없습니다.',
      INVALID_RESERVATION_STATUS: '현재 상태에서는 처리할 수 없는 예약입니다.',
    },
  })
}

function shouldClearAuth(error: unknown) {
  return isApiError<AdminReservationErrorResponse>(error)
    && (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
}

function normalizeQuery(query: ReservationQueryState): ReservationQueryState {
  return { ...query, page: Math.max(query.page, 1) }
}

function toReservationQueryParams(query: ReservationQueryState): AdminReservationQuery {
  return {
    status: query.status || undefined,
    placeId: query.placeId,
    page: query.page,
    limit: LIMIT,
  }
}

export function useAdminReservations() {
  const { clearAuth } = useAuth()
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [reservation, setReservation] = useState<AdminReservation | null>(null)
  const [query, setQuery] = useState<ReservationQueryState>({
    status: 'PENDING',
    placeId: undefined,
    page: 1,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<AdminReservationAction | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const listRef = useRef(0)
  const detailRef = useRef(0)
  const actionRef = useRef<AdminReservationAction | null>(null)
  const queryRef = useRef(query)

  const fetchReservations = useCallback(async (nextQuery = queryRef.current) => {
    const normalizedQuery = normalizeQuery(nextQuery)
    const requestId = ++listRef.current
    queryRef.current = normalizedQuery
    setQuery(normalizedQuery)
    setIsLoading(true)
    setErrorMessage('')
    try {
      let data = await getAdminReservations(toReservationQueryParams(normalizedQuery))
      let resolvedQuery = normalizedQuery

      if (data.totalPages > 0 && normalizedQuery.page > data.totalPages) {
        resolvedQuery = { ...normalizedQuery, page: data.totalPages }

        if (data.reservations.length === 0) {
          data = await getAdminReservations(toReservationQueryParams(resolvedQuery))
        }
      }

      if (requestId === listRef.current) {
        queryRef.current = resolvedQuery
        setQuery(resolvedQuery)
        setReservations(data.reservations)
        setTotalCount(data.totalElements)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
      }
      return true
    } catch (error) {
      if (requestId === listRef.current) {
        setReservations([])
        setTotalCount(0)
        setTotalPages(0)
        setHasNext(false)
        setErrorMessage(getErrorMessage(error, '예약 목록을 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 예약 목록 조회 실패', error)
      return false
    } finally {
      if (requestId === listRef.current) setIsLoading(false)
    }
  }, [clearAuth])

  const fetchDetail = useCallback(async (reservationId: number) => {
    const requestId = ++detailRef.current
    setIsDetailLoading(true)
    setDetailErrorMessage('')
    setActionErrorMessage('')
    try {
      const data = await getAdminReservation(reservationId)
      if (requestId === detailRef.current) setReservation(data)
      return data
    } catch (error) {
      if (requestId === detailRef.current) {
        setReservation(null)
        setDetailErrorMessage(getErrorMessage(error, '예약 상세를 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 예약 상세 조회 실패', error)
      return null
    } finally {
      if (requestId === detailRef.current) setIsDetailLoading(false)
    }
  }, [clearAuth])

  const clearDetail = useCallback(() => {
    ++detailRef.current
    setReservation(null)
    setDetailErrorMessage('')
  }, [])

  const runAction = useCallback(async (
    action: AdminReservationAction,
    reservationId: number,
    request: AdminReservationReviewRequest | undefined,
  ) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const data = action === 'confirm'
        ? await confirmAdminReservation(reservationId, request)
        : await rejectAdminReservation(reservationId, request ?? { reason: '' })
      setSuccessMessage(action === 'confirm' ? '예약을 승인했습니다.' : '예약을 반려했습니다.')
      await Promise.all([
        fetchReservations(queryRef.current),
        fetchDetail(reservationId),
      ])
      return data
    } catch (error) {
      setActionErrorMessage(getErrorMessage(
        error,
        action === 'confirm' ? '예약 승인에 실패했습니다.' : '예약 반려에 실패했습니다.',
      ))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError(`관리자 예약 ${action} 실패`, error)
      return null
    } finally {
      actionRef.current = null
      setActiveAction(null)
    }
  }, [clearAuth, fetchDetail, fetchReservations])

  useEffect(() => {
    void fetchReservations({ status: 'PENDING', placeId: undefined, page: 1 })
  }, [fetchReservations])

  return {
    reservations,
    reservation,
    query,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    successMessage,
    fetchReservations,
    fetchDetail,
    clearDetail,
    confirm: (reservationId: number, request?: AdminReservationReviewRequest) =>
      runAction('confirm', reservationId, request),
    reject: (reservationId: number, request: AdminReservationReviewRequest) =>
      runAction('reject', reservationId, request),
  }
}
