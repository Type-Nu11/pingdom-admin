import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminMerchantVerification,
  getAdminMerchantVerifications,
  reviewAdminMerchantVerification,
} from '../api/adminMerchantVerificationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminMerchantVerificationDetail,
  AdminMerchantVerificationErrorResponse,
  AdminMerchantVerificationListItem,
  AdminMerchantVerificationReviewRequest,
  MerchantVerificationStatus,
} from '../types/adminMerchantVerification.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const LIMIT = 20
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': 'Merchant 검증 신청을 찾을 수 없습니다.',
  conflict: '현재 심사 상태에서 처리할 수 없습니다. 다시 조회해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
}

function getMessage(error: unknown, fallback: string) {
  if (!isApiError<AdminMerchantVerificationErrorResponse>(error)) return fallback
  return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
}

export function useAdminMerchantVerifications() {
  const { clearAuth } = useAuth()
  const [identityStatus, setIdentityStatus] = useState<MerchantVerificationStatus | ''>('PENDING')
  const [businessStatus, setBusinessStatus] = useState<MerchantVerificationStatus | ''>('PENDING')
  const [items, setItems] = useState<AdminMerchantVerificationListItem[]>([])
  const [detail, setDetail] = useState<AdminMerchantVerificationDetail | null>(null)
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
  const queryRef = useRef({ identityStatus, businessStatus, page })
  const reviewingRef = useRef(false)

  const handleError = useCallback((error: unknown, fallback: string) => {
    if (isApiError<AdminMerchantVerificationErrorResponse>(error) &&
      (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')) {
      clearAuth()
    }
    return getMessage(error, fallback)
  }, [clearAuth])

  const fetchItems = useCallback(async (
    nextIdentity = queryRef.current.identityStatus,
    nextBusiness = queryRef.current.businessStatus,
    nextPage = queryRef.current.page
  ) => {
    queryRef.current = { identityStatus: nextIdentity, businessStatus: nextBusiness, page: nextPage }
    setIdentityStatus(nextIdentity); setBusinessStatus(nextBusiness); setPage(nextPage)
    setIsLoading(true); setErrorMessage('')
    try {
      const data = await getAdminMerchantVerifications({
        identityStatus: nextIdentity || undefined,
        businessStatus: nextBusiness || undefined,
        page: nextPage,
        limit: LIMIT,
      })
      setItems(data.verifications); setPage(data.page); setTotalCount(data.totalElements)
      setTotalPages(data.totalPages); setHasNext(data.hasNext)
      return true
    } catch (error) {
      setItems([]); setTotalCount(0); setTotalPages(0); setHasNext(false)
      setErrorMessage(handleError(error, 'Merchant 검증 신청 목록을 불러오지 못했습니다.'))
      logDebugError('관리자 Merchant 검증 목록 조회 실패', error)
      return false
    } finally { setIsLoading(false) }
  }, [handleError])

  const fetchDetail = useCallback(async (userId: number) => {
    setIsDetailLoading(true); setDetailErrorMessage(''); setActionErrorMessage('')
    try { const data = await getAdminMerchantVerification(userId); setDetail(data); return data }
    catch (error) { setDetail(null); setDetailErrorMessage(handleError(error, 'Merchant 검증 상세를 불러오지 못했습니다.')); logDebugError('관리자 Merchant 검증 상세 조회 실패', error); return null }
    finally { setIsDetailLoading(false) }
  }, [handleError])

  const review = useCallback(async (userId: number, request: AdminMerchantVerificationReviewRequest) => {
    if (reviewingRef.current) return null
    reviewingRef.current = true; setIsReviewing(true); setActionErrorMessage(''); setSuccessMessage('')
    try {
      const data = await reviewAdminMerchantVerification(userId, request)
      setDetail(data); setSuccessMessage('Merchant 검증 심사 결과를 저장했습니다.')
      await fetchItems(queryRef.current.identityStatus, queryRef.current.businessStatus, queryRef.current.page)
      return data
    } catch (error) { setActionErrorMessage(handleError(error, 'Merchant 검증 심사를 처리하지 못했습니다.')); logDebugError('관리자 Merchant 검증 심사 실패', error); return null }
    finally { reviewingRef.current = false; setIsReviewing(false) }
  }, [fetchItems, handleError])

  const clearDetail = useCallback(() => { setDetail(null); setDetailErrorMessage('') }, [])
  useEffect(() => { void fetchItems('PENDING', 'PENDING', 1) }, [fetchItems])

  return { identityStatus, businessStatus, items, detail, page, totalCount, totalPages, hasNext, isLoading, isDetailLoading, isReviewing, errorMessage, detailErrorMessage, actionErrorMessage, successMessage, fetchItems, fetchDetail, review, clearDetail }
}
