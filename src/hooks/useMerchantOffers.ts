import { useCallback, useEffect, useRef, useState } from 'react'
import {
  closeMerchantOffer,
  createMerchantOffer,
  getMerchantOffer,
  getMerchantOffers,
  getMerchantOwnerProfile,
  publishMerchantOffer,
  redeemMerchantCoupon,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantCouponRedeemRequest,
  MerchantOffer,
  MerchantOfferCreateRequest,
  MerchantOwnerProfile,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useMerchantPlaceSelection } from '../app/providers/MerchantPlaceContext'
import { useAuth } from './useAuth'

export const MERCHANT_OFFER_PAGE_LIMIT = 20

type LoadStatus = 'loading' | 'ready' | 'error'
type OfferAction = 'create' | 'publish' | 'close' | 'redeem' | null

function replaceById<T extends { id: number }>(items: T[], next: T) {
  const index = items.findIndex((item) => item.id === next.id)
  return index === -1 ? [next, ...items] : items.map((item) => item.id === next.id ? next : item)
}

async function getAllMerchantOffers() {
  const firstPage = await getMerchantOffers({ page: 1, limit: 100 })
  if (firstPage.totalPages <= 1) return firstPage.offers

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getMerchantOffers({ page: index + 2, limit: 100 })
    )
  )

  return [firstPage.offers, ...remainingPages.map((page) => page.offers)].flat()
}

export function useMerchantOffers() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const { selectedPlaceId, selectPlace: selectSharedPlace, syncPlaces } = useMerchantPlaceSelection()
  const [offers, setOffers] = useState<MerchantOffer[]>([])
  const [selectedOffer, setSelectedOffer] = useState<MerchantOffer | null>(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<OfferAction>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<OfferAction>(null)
  const listRequestRef = useRef(0)
  const detailRequestRef = useRef(0)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

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

  const fetchOffers = useCallback(async () => {
    const requestId = listRequestRef.current + 1
    listRequestRef.current = requestId
    setIsListLoading(true)
    setErrorMessage('')

    try {
      const next = await getAllMerchantOffers()
      if (!mountedRef.current || requestId !== listRequestRef.current) return false
      setOffers(next)
      return true
    } catch (error) {
      if (mountedRef.current && requestId === listRequestRef.current) {
        setErrorMessage(getErrorMessage(error, '혜택 목록을 불러오지 못했습니다.'))
        logDebugError('상점주 혜택 목록 조회 실패', error)
      }
      return false
    } finally {
      if (mountedRef.current && requestId === listRequestRef.current) setIsListLoading(false)
    }
  }, [getErrorMessage])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    setIsListLoading(true)

    const [profileResult, offerResult] = await Promise.allSettled([
      getMerchantOwnerProfile(),
      getAllMerchantOffers(),
    ])

    if (!mountedRef.current) return
    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value)
      syncPlaces(profileResult.value.placeIds)
    }
    if (offerResult.status === 'fulfilled') setOffers(offerResult.value)

    if (profileResult.status === 'rejected' || offerResult.status === 'rejected') {
      ;[profileResult, offerResult].forEach((result) => {
        if (result.status !== 'rejected') return
        if (isApiError(result.reason) && result.reason.category === 'unauthorized') clearAuth()
        logDebugError('상점주 혜택 초기 조회 실패', result.reason)
      })
      setErrorMessage('혜택 관리 정보를 불러오지 못했습니다.')
      setStatus('error')
      setIsListLoading(false)
      return
    }

    setStatus('ready')
    setIsListLoading(false)
  }, [clearAuth, syncPlaces])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const fetchOfferDetail = useCallback(async (offerId: number) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setIsDetailLoading(true)
    setDetailErrorMessage('')
    setSelectedOffer(null)

    try {
      const next = await getMerchantOffer(offerId)
      if (!mountedRef.current || requestId !== detailRequestRef.current) return null
      setSelectedOffer(next)
      setOffers((current) => replaceById(current, next))
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
    if (!profile?.placeIds.includes(placeId) || placeId === selectedPlaceId) return
    selectSharedPlace(placeId)
    detailRequestRef.current += 1
    setSelectedOffer(null)
    setDetailErrorMessage('')
  }, [profile?.placeIds, selectSharedPlace, selectedPlaceId])

  const clearSelectedOffer = useCallback(() => {
    detailRequestRef.current += 1
    setSelectedOffer(null)
    setDetailErrorMessage('')
  }, [])

  const runAction = useCallback(async <T,>(
    action: Exclude<OfferAction, null>,
    request: () => Promise<T>,
    apply: (value: T) => void,
    successText: string,
    fallbackMessage: string,
  ) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await request()
      if (!mountedRef.current) return null
      apply(result)
      setSuccessMessage(successText)
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
  }, [getErrorMessage])

  const createOffer = useCallback((request: MerchantOfferCreateRequest) => runAction(
    'create',
    () => createMerchantOffer(request),
    (next) => {
      setOffers((current) => replaceById(current, next))
      setSelectedOffer(next)
      void fetchOffers()
    },
    '혜택 초안을 등록했습니다.',
    '혜택 초안을 등록하지 못했습니다.',
  ), [fetchOffers, runAction])

  const publishOffer = useCallback((offerId: number) => runAction(
    'publish',
    () => publishMerchantOffer(offerId),
    (next) => {
      setOffers((current) => replaceById(current, next))
      setSelectedOffer((current) => current?.id === next.id ? next : current)
    },
    '혜택을 공개했습니다.',
    '혜택을 공개하지 못했습니다.',
  ), [runAction])

  const closeOffer = useCallback((offerId: number) => runAction(
    'close',
    () => closeMerchantOffer(offerId),
    (next) => {
      setOffers((current) => replaceById(current, next))
      setSelectedOffer((current) => current?.id === next.id ? next : current)
    },
    '혜택을 종료했습니다.',
    '혜택을 종료하지 못했습니다.',
  ), [runAction])

  const redeemCoupon = useCallback((request: MerchantCouponRedeemRequest) => runAction(
    'redeem',
    () => redeemMerchantCoupon(request),
    () => undefined,
    '쿠폰을 사용 처리했습니다.',
    '쿠폰을 사용 처리하지 못했습니다.',
  ), [runAction])

  return {
    status,
    profile,
    selectedPlaceId,
    offers,
    selectedOffer,
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
