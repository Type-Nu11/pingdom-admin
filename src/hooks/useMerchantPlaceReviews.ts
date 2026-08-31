import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMerchantPlaceReviewDeletionRequest,
  getMerchantOwnerProfile,
  getMerchantPlaceDetail,
  getMerchantPlaceReviews,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantOwnerProfile,
  MerchantPlaceDetail,
  MerchantPlaceReview,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'

const PAGE_LIMIT = 20

export function useMerchantPlaceReviews() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const [place, setPlace] = useState<MerchantPlaceDetail | null>(null)
  const [reviews, setReviews] = useState<MerchantPlaceReview[]>([])
  const [pageInfo, setPageInfo] = useState({ page: 1, totalElements: 0, totalPages: 0, hasNext: false })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null)
  const mountedRef = useRef(true)
  const requestRef = useRef(0)
  const actionRef = useRef<number | null>(null)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '연결된 장소의 리뷰만 관리할 수 있습니다.',
        PLACE_NOT_FOUND: '연결된 장소 정보를 찾을 수 없습니다.',
        REVIEW_NOT_FOUND: '리뷰 정보를 찾을 수 없습니다.',
        DUPLICATE_DELETION_REQUEST: '이미 삭제 요청이 접수된 리뷰입니다.',
      },
    })
  }, [clearAuth])

  const fetchReviews = useCallback(async (placeId: number, page = 1, initial = false) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    if (initial) setStatus('loading')
    setIsLoading(true)
    setSectionErrorMessage('')
    setActionErrorMessage('')

    const [reviewsResult, placeResult] = await Promise.allSettled([
      getMerchantPlaceReviews(placeId, page, PAGE_LIMIT),
      getMerchantPlaceDetail(placeId),
    ])

    if (!mountedRef.current || requestId !== requestRef.current) return false

    if (reviewsResult.status === 'rejected') {
      const nextMessage = getErrorMessage(reviewsResult.reason, '리뷰 목록을 불러오지 못했습니다.')
      if (initial) {
        setStatus('error')
        setErrorMessage(nextMessage)
      } else {
        setSectionErrorMessage(nextMessage)
      }
      if (isApiError(reviewsResult.reason) && reviewsResult.reason.category === 'unauthorized') clearAuth()
      logDebugError('상점주 장소 리뷰 조회 실패', reviewsResult.reason)
      setIsLoading(false)
      return false
    }

    setReviews(reviewsResult.value.reviews)
    setPageInfo({
      page: reviewsResult.value.page,
      totalElements: reviewsResult.value.totalElements,
      totalPages: reviewsResult.value.totalPages,
      hasNext: reviewsResult.value.hasNext,
    })
    if (placeResult.status === 'fulfilled') setPlace(placeResult.value)
    if (placeResult.status === 'rejected') {
      logDebugError('상점주 장소 리뷰의 장소 상세 조회 실패', placeResult.reason)
    }
    setStatus('ready')
    setIsLoading(false)
    return true
  }, [clearAuth, getErrorMessage])

  const fetchInitialData = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (!mountedRef.current) return
      const firstPlaceId = nextProfile.placeIds[0] ?? null
      setProfile(nextProfile)
      setSelectedPlaceId(firstPlaceId)
      if (!firstPlaceId) {
        setStatus('ready')
        return
      }
      await fetchReviews(firstPlaceId, 1, true)
    } catch (error) {
      if (!mountedRef.current) return
      setStatus('error')
      setErrorMessage(getErrorMessage(error, '리뷰 관리 정보를 불러오지 못했습니다.'))
      logDebugError('상점주 리뷰 관리 초기 조회 실패', error)
    }
  }, [fetchReviews, getErrorMessage])

  useEffect(() => {
    mountedRef.current = true
    void fetchInitialData()
    return () => { mountedRef.current = false }
  }, [fetchInitialData])

  const selectPlace = useCallback((placeId: number) => {
    if (!profile?.placeIds.includes(placeId) || placeId === selectedPlaceId) return
    setSelectedPlaceId(placeId)
    setPlace(null)
    setReviews([])
    void fetchReviews(placeId, 1)
  }, [fetchReviews, profile?.placeIds, selectedPlaceId])

  const requestDeletion = useCallback(async (review: MerchantPlaceReview, requestReason: string) => {
    if (!selectedPlaceId || review.placeId !== selectedPlaceId || actionRef.current !== null) return null
    if (review.deletionRequest?.status === 'PENDING' || review.deletionRequest?.status === 'APPROVED') return null

    actionRef.current = review.reviewId
    setActiveReviewId(review.reviewId)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await createMerchantPlaceReviewDeletionRequest(selectedPlaceId, review.reviewId, { requestReason })
      if (!mountedRef.current) return null
      await fetchReviews(selectedPlaceId, pageInfo.page)
      if (mountedRef.current) setSuccessMessage('리뷰 삭제 요청을 제출했습니다. 리뷰는 즉시 숨김 처리되며 최종 삭제는 관리자 심사 후 결정됩니다.')
      return result
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, '리뷰 삭제 요청을 제출하지 못했습니다.'))
        logDebugError('상점주 리뷰 삭제 요청 실패', error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveReviewId(null)
    }
  }, [fetchReviews, getErrorMessage, pageInfo.page, selectedPlaceId])

  return {
    status,
    profile,
    selectedPlaceId,
    place,
    reviews,
    pageInfo,
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    activeReviewId,
    selectPlace,
    fetchInitialData,
    fetchReviews,
    requestDeletion,
  }
}
