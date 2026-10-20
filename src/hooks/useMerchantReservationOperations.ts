import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import { cancelMerchantReservation, getMerchantAvailabilities, getMerchantOwnerProfile, getMerchantReservation, getMerchantReservations } from '../api/merchantStoreApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { MerchantAvailability, MerchantReservation, MerchantReservationDetail, MerchantReservationPageResponse, MerchantReservationQuery, MerchantStoreErrorResponse } from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { getAuthSessionId } from '../utils/authStorage'
import { useAuth } from './useAuth'
import { reservationCancellationRestriction } from '../utils/reservationConditions'
import { MERCHANT_RESERVATION_LIMIT, merchantReservationQueryKey } from '../utils/merchantReservationQuery'
import { reservationTimestamp } from '../utils/reservationTime'

const emptyPage = { page: 1, limit: MERCHANT_RESERVATION_LIMIT, totalElements: 0, totalPages: 0, hasNext: false }
type PageInfo = Omit<MerchantReservationPageResponse, 'reservations'>

export function useMerchantReservationOperations(initialPlaceId?: number) {
  const { clearAuth, user } = useAuth()
  const owner = String(user?.id ?? '') + ':' + (user?.role ?? '')
  const [resultOwner, setResultOwner] = useState(owner)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reservations, setReservations] = useState<MerchantReservation[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo>(emptyPage)
  const [query, setQuery] = useState<MerchantReservationQuery>({ placeId: initialPlaceId, page: 1, limit: MERCHANT_RESERVATION_LIMIT })
  const [hasListResult, setHasListResult] = useState(false)
  const [availabilities, setAvailabilities] = useState<MerchantAvailability[]>([])
  const [placeIds, setPlaceIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [referenceErrorMessage, setReferenceErrorMessage] = useState('')
  const [detail, setDetail] = useState<MerchantReservationDetail | null>(null)
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionErrorKind, setActionErrorKind] = useState<'policy' | 'refund' | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [activeReservationId, setActiveReservationId] = useState<number | null>(null)
  const [activeAction, setActiveAction] = useState<'cancel' | null>(null)
  const lifecycle = useRef(0)
  const ownerRef = useRef(owner)
  const listRef = useRef(0)
  const detailRef = useRef(0)
  const referenceRef = useRef(0)
  const selectedRef = useRef<number | null>(null)
  const queryRef = useRef(query)
  const rowsRef = useRef<MerchantReservation[]>([])
  const readableRef = useRef(false)
  const actionRef = useRef<object | null>(null)
  useAutoDismissMessage(successMessage, setSuccessMessage)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (shouldClearAuth(error)) clearAuth()
    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        RESERVATION_FORBIDDEN: '현재 소유한 매장의 예약만 조회·처리할 수 있습니다.',
        RESERVATION_NOT_FOUND: '예약 정보를 찾을 수 없습니다.',
        INVALID_RESERVATION_STATUS: '현재 상태에서는 처리할 수 없는 예약입니다.',
        INVALID_RESERVATION_STATE: '예약 상태가 변경되었습니다. 목록을 다시 확인해주세요.',
        CANCELLATION_NOT_ALLOWED: '수락한 취소 정책 또는 기한에 따라 취소할 수 없습니다. 예약 조건을 확인해주세요.',
        RESERVATION_REFUND_REQUIRED: '결제 처리 중이거나 환불되지 않은 결제가 있습니다. 결제·환불 내역을 확인하고 필요한 환불을 완료한 뒤 다시 시도해주세요.',
      },
    })
  }, [clearAuth])

  const clearDetail = useCallback((clearSelection = true) => {
    ++detailRef.current
    if (clearSelection) { selectedRef.current = null; setSelectedReservationId(null) }
    setDetail(null)
    setDetailErrorMessage('')
    setIsDetailLoading(false)
  }, [])

  const fetchDetail = useCallback(async (id: number) => {
    if (owner !== ownerRef.current || !readableRef.current || !rowsRef.current.some(row => row.id === id)) return null
    const request = ++detailRef.current
    const generation = lifecycle.current
    const session = getAuthSessionId()
    const current = () => generation === lifecycle.current && request === detailRef.current && session === getAuthSessionId()
    selectedRef.current = id
    setSelectedReservationId(id)
    setDetail(null)
    setDetailErrorMessage('')
    setIsDetailLoading(true)
    try {
      const next = await getMerchantReservation(id)
      if (!current()) return null
      const startsAt = reservationTimestamp(next.reservation.reservationStartsAt ?? next.reservation.confirmation?.startsAt)
      const from = reservationTimestamp(queryRef.current.reservationFrom)
      const to = reservationTimestamp(queryRef.current.reservationTo)
      if ((queryRef.current.placeId && next.placeId !== queryRef.current.placeId)
        || (queryRef.current.status && next.reservation.status !== queryRef.current.status)
        || ((from !== null || to !== null) && (startsAt === null || from !== null && startsAt < from || to !== null && startsAt >= to))) {
        setDetailErrorMessage('예약 상태 또는 연결 매장이 변경되었습니다. 목록을 새로고침해주세요.')
        return null
      }
      setDetail(next)
      return next
    } catch (error) {
      if (current()) {
        setDetail(null)
        setDetailErrorMessage(getErrorMessage(error, '예약 상세와 처리 이력을 불러오지 못했습니다.'))
        if (isApiError(error) && [401, 403, 404].includes(error.response?.status ?? error.status ?? 0)) {
          rowsRef.current = rowsRef.current.filter(row => row.id !== id)
          setReservations(rowsRef.current)
          readableRef.current = false
          setSectionErrorMessage('예약 접근 권한 또는 상태가 변경되었습니다. 목록을 다시 조회해주세요.')
        }
        logDebugError('상점주 예약 상세 조회 실패', error)
      }
      return null
    } finally { if (current()) setIsDetailLoading(false) }
  }, [getErrorMessage, owner])

  const fetchReferences = useCallback(async () => {
    const request = ++referenceRef.current
    const generation = lifecycle.current
    const session = getAuthSessionId()
    const results = await Promise.allSettled([getMerchantOwnerProfile(), getMerchantAvailabilities()])
    if (generation !== lifecycle.current || request !== referenceRef.current || session !== getAuthSessionId()) return
    const [profile, availability] = results
    if (profile.status === 'fulfilled' && Array.isArray(profile.value?.placeIds)) setPlaceIds(profile.value.placeIds)
    else setPlaceIds([])
    if (availability.status === 'fulfilled' && Array.isArray(availability.value)) setAvailabilities(availability.value)
    else setAvailabilities([])
    const failures = results.filter(result => result.status === 'rejected')
    for (const result of failures) if (shouldClearAuth(result.reason)) { getErrorMessage(result.reason, '인증 확인이 필요합니다.'); return }
    const missing = profile.status !== 'fulfilled' || !Array.isArray(profile.value?.placeIds)
      || availability.status !== 'fulfilled' || !Array.isArray(availability.value)
    setReferenceErrorMessage(missing ? '매장 또는 예약 가능 시간 정보를 불러오지 못했습니다. 예약 목록은 조회할 수 있으며, 상세에서 장소·예약 시간을 확인해주세요.' : '')
  }, [getErrorMessage])

  const fetchReservations = useCallback(async (next: number | MerchantReservationQuery = queryRef.current, initial = false) => {
    if (owner !== ownerRef.current) return false
    const nextQuery = { ...(typeof next === 'number' ? { ...queryRef.current, page: next } : next), limit: MERCHANT_RESERVATION_LIMIT }
    nextQuery.page = Math.max(1, nextQuery.page ?? 1)
    const request = ++listRef.current
    const generation = lifecycle.current
    const session = getAuthSessionId()
    const current = () => generation === lifecycle.current && request === listRef.current && session === getAuthSessionId()
    const same = merchantReservationQueryKey(queryRef.current) === merchantReservationQueryKey(nextQuery)
    const selected = same ? selectedRef.current : null
    readableRef.current = false
    clearDetail(!same)
    queryRef.current = nextQuery
    setQuery(nextQuery)
    setIsLoading(true)
    setSectionErrorMessage('')
    setErrorMessage('')
    if (initial) setStatus('loading')
    if (!same || initial) {
      rowsRef.current = []
      setReservations([])
      setHasListResult(false)
      setPageInfo({ ...emptyPage, page: nextQuery.page })
    }
    try {
      let data = await getMerchantReservations(nextQuery)
      if (!current()) return false
      if (data.totalPages > 0 && nextQuery.page > data.totalPages) {
        nextQuery.page = data.totalPages
        data = await getMerchantReservations(nextQuery)
        if (!current()) return false
      }
      if (data.totalPages === 0) nextQuery.page = 1
      queryRef.current = { ...nextQuery }
      setQuery({ ...nextQuery })
      rowsRef.current = data.reservations
      setReservations(data.reservations)
      setPageInfo({ page: nextQuery.page, limit: data.limit, totalElements: data.totalElements, totalPages: data.totalPages, hasNext: data.hasNext })
      setHasListResult(true)
      setStatus('ready')
      readableRef.current = true
      if (selected && data.reservations.some(row => row.id === selected)) void fetchDetail(selected)
      else clearDetail()
      return true
    } catch (error) {
      if (current()) {
        const message = getErrorMessage(error, '예약 목록을 불러오지 못했습니다.')
        const restricted = isApiError(error) && [401, 403, 404].includes(error.response?.status ?? error.status ?? 0)
        if (restricted) { rowsRef.current = []; setReservations([]); setHasListResult(false); setPageInfo(emptyPage); clearDetail() }
        if (initial) { setStatus('error'); setErrorMessage(message) }
        else setSectionErrorMessage(message)
        logDebugError('상점주 예약 목록 조회 실패', error)
      }
      return false
    } finally { if (current()) setIsLoading(false) }
  }, [clearDetail, fetchDetail, getErrorMessage, owner])

  const invalidateRequests = useCallback(() => {
    ++lifecycle.current
    ++listRef.current
    ++detailRef.current
    ++referenceRef.current
    readableRef.current = false
  }, [])

  useEffect(() => {
    ++lifecycle.current
    ownerRef.current = owner
    setResultOwner(owner)
    setPlaceIds([])
    setAvailabilities([])
    setActionErrorMessage('')
    setSuccessMessage('')
    setActiveAction(null)
    setActiveReservationId(null)
    actionRef.current = null
    void fetchReservations({ placeId: initialPlaceId, page: 1 }, true)
    void fetchReferences()
    return invalidateRequests
  }, [owner, initialPlaceId, fetchReservations, fetchReferences, invalidateRequests])

  const cancelReservation = useCallback(async (reservation: MerchantReservation) => {
    if (owner !== ownerRef.current || actionRef.current !== null || !readableRef.current) return null
    const currentRow = rowsRef.current.find(row => row.id === reservation.id)
    if (!currentRow || currentRow.status !== 'CONFIRMED') {
      setActionErrorKind(null)
      setActionErrorMessage('현재 상태에서는 처리할 수 없는 예약입니다. 목록을 다시 확인해주세요.')
      return null
    }
    const restriction = reservationCancellationRestriction(currentRow.confirmation)
    if (restriction) { setActionErrorKind('policy'); setActionErrorMessage(restriction); return null }
    const token = {}
    actionRef.current = token
    const generation = lifecycle.current
    const session = getAuthSessionId()
    const key = merchantReservationQueryKey(queryRef.current)
    const sameScope = () => generation === lifecycle.current && session === getAuthSessionId()
    const current = () => sameScope() && merchantReservationQueryKey(queryRef.current) === key
    setActiveReservationId(reservation.id)
    setActiveAction('cancel')
    setActionErrorMessage('')
    setActionErrorKind(null)
    setSuccessMessage('')
    try {
      const next = await cancelMerchantReservation(reservation.id)
      if (!current()) return null
      rowsRef.current = rowsRef.current.map(row => row.id === next.id ? next : row)
      setReservations(rowsRef.current)
      setSuccessMessage('예약을 취소했습니다.')
      if (queryRef.current.status && next.status !== queryRef.current.status) void fetchReservations()
      else if (selectedRef.current === next.id) void fetchDetail(next.id)
      return next
    } catch (error) {
      if (current()) {
        const code = isApiError<MerchantStoreErrorResponse>(error) && error.response?.status === 409 ? error.response.data.code : null
        setActionErrorKind(code === 'RESERVATION_REFUND_REQUIRED' ? 'refund' : code === 'CANCELLATION_NOT_ALLOWED' ? 'policy' : null)
        setActionErrorMessage(getErrorMessage(error, '예약 취소에 실패했습니다.'))
        logDebugError('상점주 예약 취소 실패', error)
      }
      return null
    } finally {
      if (actionRef.current === token) actionRef.current = null
      if (sameScope()) { setActiveReservationId(null); setActiveAction(null) }
    }
  }, [fetchDetail, fetchReservations, getErrorMessage, owner])

  const clearActionError = () => { setActionErrorMessage(''); setActionErrorKind(null) }
  const sameOwner = resultOwner === owner
  return {
    status: sameOwner ? status : 'loading' as const, reservations: sameOwner ? reservations : [],
    pageInfo: sameOwner ? pageInfo : emptyPage, query, hasListResult: sameOwner && hasListResult,
    availabilities: sameOwner ? availabilities : [], placeIds: sameOwner ? placeIds : [],
    isLoading, errorMessage, sectionErrorMessage, referenceErrorMessage,
    detail: sameOwner ? detail : null, selectedReservationId: sameOwner ? selectedReservationId : null,
    isDetailLoading, detailErrorMessage, actionErrorMessage, actionErrorKind, clearActionError,
    successMessage, activeReservationId, activeAction,
    fetchReservations, fetchReferences, fetchDetail, clearDetail, cancelReservation,
  }
}
