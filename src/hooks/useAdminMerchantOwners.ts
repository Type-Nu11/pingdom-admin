import { useCallback, useEffect, useRef, useState } from 'react'
import {
  approveAdminMerchantOwner,
  getAdminMerchantOwner,
  getAdminMerchantOwnerPlaces,
  getAdminMerchantOwners,
  rejectAdminMerchantOwner,
  replaceAdminMerchantOwnerPlaces,
  revokeAdminMerchantOwner,
  updateAdminMerchantOwnerOnboarding,
  updateAdminMerchantOwnerPlaceQuality,
} from '../api/adminMerchantOwnerApi'
import { getAdminMerchantVerification } from '../api/adminMerchantVerificationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminMerchantOnboardingUpdateRequest,
  AdminMerchantOwnerErrorResponse,
  AdminMerchantOwnerPlace,
  AdminMerchantOwnerPlaceQualityUpdateRequest,
  AdminMerchantOwnerPlaceUpdateRequest,
  AdminMerchantOwnerProfile,
  AdminMerchantOwnerReviewRequest,
  MerchantOwnerStatus,
} from '../types/adminMerchantOwner.types'
import type {
  AdminMerchantVerificationDetail,
  AdminMerchantVerificationErrorResponse,
} from '../types/adminMerchantVerification.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const LIMIT = 20
export type MerchantOwnerAction = 'approve' | 'reject' | 'revoke' | 'places' | 'onboarding' | 'quality'
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': 'Merchant Owner 또는 연결 장소를 찾을 수 없습니다.',
  conflict: '신청 또는 운영 상태가 이미 변경되었습니다. 다시 조회해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!isApiError<AdminMerchantOwnerErrorResponse>(error)) return fallback
  return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
}
function shouldClearAuth(error: unknown) {
  return isApiError<AdminMerchantOwnerErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
}

function isVerificationNotFound(error: unknown) {
  return isApiError<AdminMerchantVerificationErrorResponse>(error) &&
    error.category === 'not-found'
}

function getVerificationErrorMessage(error: unknown) {
  if (!isApiError<AdminMerchantVerificationErrorResponse>(error)) {
    return 'Merchant 검증 상태를 불러오지 못했습니다.'
  }
  return getAuthErrorMessage(error, {
    fallbackMessage: 'Merchant 검증 상태를 불러오지 못했습니다.',
    categoryMessages: CATEGORY_MESSAGES,
  })
}

export function useAdminMerchantOwners() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<MerchantOwnerStatus | ''>('PENDING')
  const [profiles, setProfiles] = useState<AdminMerchantOwnerProfile[]>([])
  const [profile, setProfile] = useState<AdminMerchantOwnerProfile | null>(null)
  const [places, setPlaces] = useState<AdminMerchantOwnerPlace[]>([])
  const [verification, setVerification] = useState<AdminMerchantVerificationDetail | null>(null)
  const [verificationLoadStatus, setVerificationLoadStatus] = useState<
    'idle' | 'loading' | 'success' | 'missing' | 'error'
  >('idle')
  const [verificationErrorMessage, setVerificationErrorMessage] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<MerchantOwnerAction | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const listRef = useRef(0)
  const detailRef = useRef(0)
  const actionRef = useRef<MerchantOwnerAction | null>(null)
  const queryRef = useRef({ status, page })

  const fetchProfiles = useCallback(async (nextStatus = queryRef.current.status, nextPage = queryRef.current.page) => {
    const requestId = ++listRef.current
    queryRef.current = { status: nextStatus, page: nextPage }
    setStatus(nextStatus)
    setPage(nextPage)
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAdminMerchantOwners({ status: nextStatus || undefined, page: nextPage, limit: LIMIT })
      if (requestId === listRef.current) {
        setProfiles(data.profiles)
        setPage(data.page)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
      }
      return true
    } catch (error) {
      if (requestId === listRef.current) {
        setProfiles([]); setTotalCount(0); setTotalPages(0); setHasNext(false)
        setErrorMessage(getErrorMessage(error, 'Merchant Owner 신청 목록을 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 Merchant Owner 목록 조회 실패', error)
      return false
    } finally { if (requestId === listRef.current) setIsLoading(false) }
  }, [clearAuth])

  const fetchDetail = useCallback(async (userId: number) => {
    const requestId = ++detailRef.current
    setIsDetailLoading(true); setDetailErrorMessage(''); setActionErrorMessage('')
    setVerification(null); setVerificationLoadStatus('loading'); setVerificationErrorMessage('')
    try {
      const verificationRequest = getAdminMerchantVerification(userId)
        .then((data) => ({ kind: 'success' as const, data }))
        .catch((error: unknown) => ({
          kind: isVerificationNotFound(error) ? 'missing' as const : 'error' as const,
          error,
        }))
      const [nextProfile, nextPlaces, verificationResult] = await Promise.all([
        getAdminMerchantOwner(userId), getAdminMerchantOwnerPlaces(userId), verificationRequest,
      ])
      if (requestId === detailRef.current) {
        setProfile(nextProfile); setPlaces(nextPlaces)
        if (verificationResult.kind === 'success') {
          setVerification(verificationResult.data)
          setVerificationLoadStatus('success')
        } else if (verificationResult.kind === 'missing') {
          setVerificationLoadStatus('missing')
        } else {
          setVerificationLoadStatus('error')
          setVerificationErrorMessage(getVerificationErrorMessage(verificationResult.error))
          if (shouldClearAuth(verificationResult.error)) clearAuth()
          logDebugError('관리자 Merchant 검증 상태 조회 실패', verificationResult.error)
        }
      }
      return nextProfile
    } catch (error) {
      if (requestId === detailRef.current) {
        setProfile(null); setPlaces([]); setVerification(null); setVerificationLoadStatus('idle')
        setDetailErrorMessage(getErrorMessage(error, 'Merchant Owner 상세를 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 Merchant Owner 상세 조회 실패', error)
      return null
    } finally { if (requestId === detailRef.current) setIsDetailLoading(false) }
  }, [clearAuth])

  const runAction = useCallback(async <T,>(action: MerchantOwnerAction, userId: number, request: () => Promise<T>, message: string) => {
    if (actionRef.current) return null
    actionRef.current = action; setActiveAction(action); setActionErrorMessage(''); setSuccessMessage('')
    try {
      const data = await request()
      setSuccessMessage(message)
      await Promise.all([fetchProfiles(queryRef.current.status, queryRef.current.page), fetchDetail(userId)])
      return data
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, 'Merchant Owner 작업을 처리하지 못했습니다.'))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError(`관리자 Merchant Owner ${action} 실패`, error)
      return null
    } finally { actionRef.current = null; setActiveAction(null) }
  }, [clearAuth, fetchDetail, fetchProfiles])

  const review = useCallback((action: Extract<MerchantOwnerAction, 'approve' | 'reject' | 'revoke'>, userId: number, request: AdminMerchantOwnerReviewRequest) => {
    const functions = { approve: approveAdminMerchantOwner, reject: rejectAdminMerchantOwner, revoke: revokeAdminMerchantOwner }
    const messages = { approve: 'Merchant Owner 신청을 승인했습니다.', reject: 'Merchant Owner 신청을 거절했습니다.', revoke: 'Merchant Owner 권한을 회수했습니다.' }
    return runAction(action, userId, () => functions[action](userId, request), messages[action])
  }, [runAction])
  const replacePlaces = useCallback((userId: number, request: AdminMerchantOwnerPlaceUpdateRequest) => runAction('places', userId, () => replaceAdminMerchantOwnerPlaces(userId, request), '연결 장소를 변경했습니다.'), [runAction])
  const updateOnboarding = useCallback((userId: number, request: AdminMerchantOnboardingUpdateRequest) => runAction('onboarding', userId, () => updateAdminMerchantOwnerOnboarding(userId, request), '온보딩 상태를 변경했습니다.'), [runAction])
  const updateQuality = useCallback((userId: number, placeId: number, request: AdminMerchantOwnerPlaceQualityUpdateRequest) => runAction('quality', userId, () => updateAdminMerchantOwnerPlaceQuality(userId, placeId, request), '장소 운영 품질을 변경했습니다.'), [runAction])
  const clearDetail = useCallback(() => {
    ++detailRef.current
    setProfile(null); setPlaces([]); setVerification(null)
    setVerificationLoadStatus('idle'); setVerificationErrorMessage(''); setDetailErrorMessage('')
  }, [])

  const isApprovalEligible = verificationLoadStatus === 'success' &&
    verification?.identityStatus === 'APPROVED' &&
    verification.businessStatus === 'APPROVED' &&
    verification.businessName === profile?.businessName

  useEffect(() => { void fetchProfiles('PENDING', 1) }, [fetchProfiles])

  return { status, profiles, profile, places, verification, verificationLoadStatus, verificationErrorMessage, isApprovalEligible, page, totalCount, totalPages, hasNext, isLoading, isDetailLoading, activeAction, errorMessage, detailErrorMessage, actionErrorMessage, successMessage, fetchProfiles, fetchDetail, clearDetail, review, replacePlaces, updateOnboarding, updateQuality }
}
