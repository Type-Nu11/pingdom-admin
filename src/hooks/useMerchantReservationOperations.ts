import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelMerchantReservation,
  getMerchantAvailabilities,
  getMerchantReservations,
  getMerchantReservableProducts,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantAvailability,
  MerchantReservableProduct,
  MerchantReservation,
  MerchantReservationPageResponse,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type ReservationAction = 'cancel' | null

const PAGE_LIMIT = 20

function replaceReservation(items: MerchantReservation[], next: MerchantReservation) {
  return items.map((item) => (item.id === next.id ? next : item))
}

export function useMerchantReservationOperations() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [reservations, setReservations] = useState<MerchantReservation[]>([])
  const [pageInfo, setPageInfo] = useState<Omit<MerchantReservationPageResponse, 'reservations'>>({
    page: 1,
    limit: PAGE_LIMIT,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [products, setProducts] = useState<MerchantReservableProduct[]>([])
  const [availabilities, setAvailabilities] = useState<MerchantAvailability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeReservationId, setActiveReservationId] = useState<number | null>(null)
  const [activeAction, setActiveAction] = useState<ReservationAction>(null)
  const mountedRef = useRef(true)
  const requestRef = useRef(0)
  const actionRef = useRef<number | null>(null)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        RESERVATION_NOT_FOUND: '예약 정보를 찾을 수 없습니다.',
        INVALID_RESERVATION_STATUS: '현재 상태에서는 처리할 수 없는 예약입니다.',
      },
    })
  }, [clearAuth])

  const fetchReservations = useCallback(async (page = 1, initial = false) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    if (initial) setStatus('loading')
    setIsLoading(true)
    setErrorMessage('')
    setSectionErrorMessage('')

    const [reservationResult, productResult, availabilityResult] = await Promise.allSettled([
      getMerchantReservations(page, PAGE_LIMIT),
      getMerchantReservableProducts(),
      getMerchantAvailabilities(),
    ])

    if (!mountedRef.current || requestId !== requestRef.current) return

    if (reservationResult.status === 'rejected') {
      setIsLoading(false)
      const nextMessage = getErrorMessage(reservationResult.reason, '예약 목록을 불러오지 못했습니다.')
      if (isApiError(reservationResult.reason) && reservationResult.reason.category === 'unauthorized') {
        clearAuth()
      }
      if (initial) {
        setStatus('error')
        setErrorMessage(nextMessage)
      } else {
        setSectionErrorMessage(nextMessage)
      }
      logDebugError('상점주 예약 목록 조회 실패', reservationResult.reason)
      return
    }

    setReservations(reservationResult.value.reservations)
    setPageInfo({
      page: reservationResult.value.page,
      limit: reservationResult.value.limit,
      totalElements: reservationResult.value.totalElements,
      totalPages: reservationResult.value.totalPages,
      hasNext: reservationResult.value.hasNext,
    })
    if (productResult.status === 'fulfilled') setProducts(productResult.value)
    if (availabilityResult.status === 'fulfilled') setAvailabilities(availabilityResult.value)

    const referenceFailures = [productResult, availabilityResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (referenceFailures.length > 0) {
      referenceFailures.forEach((result) => {
        if (isApiError(result.reason) && result.reason.category === 'unauthorized') clearAuth()
        logDebugError('상점주 예약 참조 정보 조회 실패', result.reason)
      })
      setSectionErrorMessage('상품 또는 예약 시간 일부를 불러오지 못해 ID로 표시합니다. 새로고침 후 다시 시도해주세요.')
    }

    setStatus('ready')
    setIsLoading(false)
  }, [clearAuth, getErrorMessage])

  useEffect(() => {
    mountedRef.current = true
    void fetchReservations(1, true)
    return () => { mountedRef.current = false }
  }, [fetchReservations])

  const cancelReservation = useCallback(async (reservation: MerchantReservation) => {
    if (reservation.status !== 'PENDING' || actionRef.current !== null) return null
    actionRef.current = reservation.id
    setActiveReservationId(reservation.id)
    setActiveAction('cancel')
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const next = await cancelMerchantReservation(reservation.id)
      if (!mountedRef.current) return null
      setReservations((items) => replaceReservation(items, next))
      setSuccessMessage('예약을 취소했습니다.')
      return next
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, '예약 취소에 실패했습니다.'))
        logDebugError('상점주 예약 취소 실패', error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) {
        setActiveReservationId(null)
        setActiveAction(null)
      }
    }
  }, [getErrorMessage])

  return {
    status,
    reservations,
    pageInfo,
    products,
    availabilities,
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    activeReservationId,
    activeAction,
    fetchReservations,
    cancelReservation,
  }
}
