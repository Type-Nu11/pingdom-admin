import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  closeMerchantOffer,
  createMerchantOffer,
  getMerchantOffer,
  getMerchantOffers,
  getMerchantOwnerProfile,
  publishMerchantOffer,
  redeemMerchantCoupon,
} from '../api/merchantStoreApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantCouponRedeemRequest,
  MerchantOffer,
  MerchantOfferCreateRequest,
  MerchantOfferPageResponse,
  MerchantOwnerProfile,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { useAuth } from './useAuth'

export const MERCHANT_OFFER_PAGE_LIMIT = 20

type LoadStatus = 'loading' | 'ready' | 'error'
type OfferAction = 'create' | 'publish' | 'close' | 'redeem' | null

export type OfferStatusFilter = 'ALL' | MerchantOffer['status']
type Query = { placeId: number | null; page: number; status: OfferStatusFilter }

export function useMerchantOffers() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const { selectedPlaceId, selectPlace: selectSharedPlace, syncPlaces } = useMerchantPlaceSelection()
  const [query, setQuery] = useState<Query>({ placeId: null, page: 1, status: 'ALL' })
  const queryRef = useRef(query)
  const [result, setResult] = useState<MerchantOfferPageResponse | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<MerchantOffer | null>(null)
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null)
  const [editorVersion, setEditorVersion] = useState(0)
  const [isListLoading, setIsListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const [activeAction, setActiveAction] = useState<OfferAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<OfferAction>(null)
  const listRequestRef = useRef(0)
  const detailRequestRef = useRef(0)
  const profileRequestRef = useRef(0)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (shouldClearAuth(error)) clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        OFFER_NOT_FOUND: '혜택 정보를 찾을 수 없습니다.',
        COUPON_NOT_FOUND: '쿠폰 코드를 찾을 수 없습니다.',
        COUPON_ALREADY_REDEEMED: '이미 사용 처리된 쿠폰입니다.',
        COUPON_EXPIRED: '만료된 쿠폰입니다.',
      },
    })
  }, [clearAuth])

  const clearSelectedOffer = useCallback((resetEditor = true) => {
    ++detailRequestRef.current
    setSelectedOfferId(null)
    if (resetEditor) setEditorVersion(value => value + 1)
    setSelectedOffer(null)
    setIsDetailLoading(false)
    setDetailErrorMessage('')
  }, [])

  const fetchOffers = useCallback(async () => {
    const requestId = ++listRequestRef.current
    const requested = queryRef.current
    setResult(null)
    setErrorMessage('')
    if (requested.placeId === null) { setIsListLoading(false); return true }
    setIsListLoading(true)
    const current = () => mountedRef.current && requestId === listRequestRef.current
    try {
      const params = { placeId: requested.placeId, page: requested.page, limit: MERCHANT_OFFER_PAGE_LIMIT, status: requested.status === 'ALL' ? undefined : requested.status }
      let next = await getMerchantOffers(params)
      if (!current()) return false
      // Correct an emptied last page once instead of walking through all history.
      const lastPage = Math.max(1, next.totalPages)
      if (requested.page > lastPage) {
        queryRef.current = { ...requested, page: lastPage }
        setQuery(queryRef.current)
        next = await getMerchantOffers({ ...params, page: lastPage })
        if (!current()) return false
      }
      setResult(next)
      return true
    } catch (error) {
      if (current()) {
        setErrorMessage(getErrorMessage(error, '혜택 목록을 불러오지 못했습니다. 다시 조회해주세요.'))
        logDebugError('상점주 혜택 목록 조회 실패', error)
      }
      return false
    } finally {
      if (current()) setIsListLoading(false)
    }
  }, [getErrorMessage])

  const changeQuery = useCallback((next: Query) => {
    const previous = queryRef.current
    if (previous.placeId === next.placeId && previous.status === next.status && previous.page === next.page) return
    queryRef.current = next
    setQuery(next)
    clearSelectedOffer(previous.placeId !== next.placeId)
    void fetchOffers()
  }, [clearSelectedOffer, fetchOffers])

  const fetchInitialData = useCallback(async () => {
    if (actionRef.current) return
    const requestId = ++profileRequestRef.current
    ++listRequestRef.current
    clearSelectedOffer()
    setResult(null)
    setStatus('loading')
    setErrorMessage('')
    try {
      const next = await getMerchantOwnerProfile()
      if (!mountedRef.current || requestId !== profileRequestRef.current) return
      const placeId = syncPlaces(next.placeIds)
      setProfile(next)
      const previous = queryRef.current
      queryRef.current = { ...previous, placeId, page: previous.placeId === placeId ? previous.page : 1 }
      setQuery(queryRef.current)
      setStatus('ready')
      await fetchOffers()
    } catch (error) {
      if (!mountedRef.current || requestId !== profileRequestRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '혜택 관리 정보를 불러오지 못했습니다.'))
    }
  }, [clearSelectedOffer, syncPlaces, fetchOffers, getErrorMessage])

  const invalidateRequests = useCallback(() => {
    ++profileRequestRef.current
    ++listRequestRef.current
    ++detailRequestRef.current
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => {
      mountedRef.current = false
      invalidateRequests()
    }
  }, [fetchInitialData, invalidateRequests])

  useEffect(() => {
    if (!profile || status !== 'ready' || selectedPlaceId === queryRef.current.placeId) return
    const timer = window.setTimeout(() => {
      changeQuery({ ...queryRef.current, placeId: selectedPlaceId, page: 1 })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile, status, selectedPlaceId, changeQuery])

  const fetchOfferDetail = useCallback(async (offerId: number) => {
    if (actionRef.current) return null
    setSelectedOfferId(offerId)
    const placeId = queryRef.current.placeId
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setIsDetailLoading(true)
    setDetailErrorMessage('')
    setSelectedOffer(null)

    try {
      const next = await getMerchantOffer(offerId)
      if (!mountedRef.current || requestId !== detailRequestRef.current) return null
      if (next.id !== offerId || next.placeId !== placeId) throw new Error('혜택 대상이 일치하지 않습니다.')
      setSelectedOffer(next)
      return next
    } catch (error) {
      if (mountedRef.current && requestId === detailRequestRef.current) {
        setDetailErrorMessage(getErrorMessage(error, '혜택 상세를 불러오지 못했습니다.'))
        logDebugError('상점주 혜택 상세 조회 실패', error)
      }
      return null
    } finally {
      if (mountedRef.current && requestId === detailRequestRef.current) setIsDetailLoading(false)
    }
  }, [getErrorMessage])

  const selectPlace = useCallback((placeId: number) => {
    if (actionRef.current || !profile?.placeIds.includes(placeId) || placeId === queryRef.current.placeId) return
    selectSharedPlace(placeId)
    changeQuery({ ...queryRef.current, placeId, page: 1 })
  }, [profile, selectSharedPlace, changeQuery])

  const setPage = useCallback((page: number) => {
    if (actionRef.current || !Number.isSafeInteger(page) || page < 1) return
    changeQuery({ ...queryRef.current, page })
  }, [changeQuery])
  const setStatusFilter = useCallback((filter: OfferStatusFilter) => {
    if (actionRef.current || filter === queryRef.current.status) return
    changeQuery({ ...queryRef.current, status: filter, page: 1 })
  }, [changeQuery])

  const runAction = useCallback(async <T,>(
    action: Exclude<OfferAction, null>,
    request: () => Promise<T>,
    successText: string,
    fallbackMessage: string,
  ) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')

    const target = queryRef.current
    try {
      const result = await request()
      if (!mountedRef.current) return null
      setSuccessMessage(successText)
      if (action !== 'redeem' && target === queryRef.current) {
        clearSelectedOffer()
        await fetchOffers()
      }
      return result
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, fallbackMessage))
        logDebugError(`상점주 혜택 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [getErrorMessage, clearSelectedOffer, fetchOffers])

  const createOffer = useCallback((request: MerchantOfferCreateRequest) => runAction(
    'create',
    () => createMerchantOffer(request),
    '혜택 초안을 등록했습니다.',
    '혜택 초안을 등록하지 못했습니다.',
  ), [runAction])

  const publishOffer = useCallback((offerId: number) => runAction(
    'publish',
    () => publishMerchantOffer(offerId),
    '혜택을 공개했습니다.',
    '혜택을 공개하지 못했습니다.',
  ), [runAction])

  const closeOffer = useCallback((offerId: number) => runAction(
    'close',
    () => closeMerchantOffer(offerId),
    '혜택을 종료했습니다.',
    '혜택을 종료하지 못했습니다.',
  ), [runAction])

  const redeemCoupon = useCallback((request: MerchantCouponRedeemRequest) => runAction(
    'redeem',
    () => redeemMerchantCoupon(request),
    '쿠폰을 사용 처리했습니다.',
    '쿠폰을 사용 처리하지 못했습니다.',
  ), [runAction])

  return {
    status,
    profile,
    selectedPlaceId: query.placeId,
    offers: result?.offers ?? [],
    totalElements: result?.totalElements,
    totalPages: result?.totalPages ?? 0,
    page: query.page,
    statusFilter: query.status,
    setPage,
    setStatusFilter,
    selectedOffer,
    selectedOfferId,
    editorVersion,
    isListLoading,
    isDetailLoading,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    successMessage,
    activeAction,
    selectPlace,
    clearSelectedOffer,
    fetchInitialData,
    fetchOffers,
    fetchOfferDetail,
    createOffer,
    publishOffer,
    closeOffer,
    redeemCoupon,
  }
}
