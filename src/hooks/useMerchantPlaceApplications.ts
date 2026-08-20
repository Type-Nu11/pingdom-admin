import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelMerchantPlaceApplication,
  createMerchantPlaceApplication,
  getMerchantPlaceApplications,
  getMerchantPlaceSuggestions,
  reopenMerchantPlaceApplication,
  submitMerchantPlaceApplication,
  updateMerchantPlaceApplication,
} from '../api/merchantPlaceApplicationApi'
import { getMerchantOwnerProfile } from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { MerchantOwnerProfile } from '../types/merchantStore.types'
import type {
  MerchantPlaceApplication,
  MerchantPlaceApplicationErrorResponse,
  MerchantPlaceApplicationRequest,
  MerchantPlaceSearchItem,
} from '../types/merchantPlaceApplication.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type Action = 'save' | 'submit' | 'reopen' | 'cancel' | null

function errorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<MerchantPlaceApplicationErrorResponse>(error)) return fallbackMessage

  return getAuthErrorMessage(error, {
    fallbackMessage,
    codeMessages: {
      ACCESS_DENIED: '상점주 권한이 필요합니다.',
      INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해주세요.',
      PLACE_NOT_FOUND: '선택한 장소를 찾을 수 없습니다. 다시 검색해주세요.',
    },
  })
}

function replaceApplication(
  current: MerchantPlaceApplication[],
  next: MerchantPlaceApplication,
) {
  const index = current.findIndex((application) => application.id === next.id)
  if (index === -1) return [next, ...current]
  return current.map((application) => (application.id === next.id ? next : application))
}

export function useMerchantPlaceApplications() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [applications, setApplications] = useState<MerchantPlaceApplication[]>([])
  const [suggestions, setSuggestions] = useState<MerchantPlaceSearchItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<Action>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<Action>(null)

  const clearUnauthorizedSession = useCallback(
    (requestError: unknown) => {
      if (isApiError(requestError) && requestError.category === 'unauthorized') clearAuth()
    },
    [clearAuth],
  )

  const fetchApplications = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setError('')

    const [profileResult, applicationsResult] = await Promise.allSettled([
      getMerchantOwnerProfile(),
      getMerchantPlaceApplications(),
    ])

    if (!mountedRef.current) return

    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value.items)

    const failures = [profileResult, applicationsResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    if (failures.length === 2) {
      failures.forEach((result) => clearUnauthorizedSession(result.reason))
      setStatus('error')
      setError('운영 장소 신청 정보를 불러오지 못했습니다.')
      return
    }

    setStatus('ready')
    if (failures.length > 0) {
      failures.forEach((result) => {
        clearUnauthorizedSession(result.reason)
        logDebugError('상점주 장소 신청 일부 조회 실패', result.reason)
      })
      setError('일부 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [clearUnauthorizedSession])

  useEffect(() => {
    mountedRef.current = true
    void fetchApplications()
    return () => { mountedRef.current = false }
  }, [fetchApplications])

  const searchPlaces = useCallback(async (keyword: string) => {
    const trimmedKeyword = keyword.trim()
    if (trimmedKeyword.length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const result = await getMerchantPlaceSuggestions(trimmedKeyword)
      if (mountedRef.current) setSuggestions(result.places)
    } catch (requestError) {
      if (mountedRef.current) {
        setSuggestions([])
        clearUnauthorizedSession(requestError)
        logDebugError('상점주 장소 검색 실패', requestError)
      }
    } finally {
      if (mountedRef.current) setIsSearching(false)
    }
  }, [clearUnauthorizedSession])

  const runAction = useCallback(async <T,>(
    action: Exclude<Action, null>,
    task: () => Promise<T>,
    apply: (value: T) => void,
    success: string,
    fallback: string,
  ) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionError('')
    setSuccessMessage('')

    try {
      const result = await task()
      if (!mountedRef.current) return null
      apply(result)
      setSuccessMessage(success)
      return result
    } catch (requestError) {
      if (mountedRef.current) {
        clearUnauthorizedSession(requestError)
        setActionError(errorMessage(requestError, fallback))
        logDebugError(`상점주 장소 신청 ${action} 실패`, requestError)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [clearUnauthorizedSession])

  const saveApplication = useCallback(async (
    applicationId: number | null,
    request: MerchantPlaceApplicationRequest,
  ) => runAction(
    'save',
    () => applicationId
      ? updateMerchantPlaceApplication(applicationId, request)
      : createMerchantPlaceApplication(request),
    (next) => setApplications((current) => replaceApplication(current, next)),
    applicationId ? '운영 장소 신청서를 저장했습니다.' : '운영 장소 신청서를 만들었습니다.',
    '운영 장소 신청서를 저장하지 못했습니다.',
  ), [runAction])

  const submitApplication = useCallback((applicationId: number) => runAction(
    'submit',
    () => submitMerchantPlaceApplication(applicationId),
    (next) => setApplications((current) => replaceApplication(current, next)),
    '운영 장소 신청서를 제출했습니다.',
    '운영 장소 신청서를 제출하지 못했습니다.',
  ), [runAction])

  const reopenApplication = useCallback((applicationId: number) => runAction(
    'reopen',
    () => reopenMerchantPlaceApplication(applicationId),
    (next) => setApplications((current) => replaceApplication(current, next)),
    '반려된 신청서를 다시 열었습니다. 내용을 보완한 뒤 제출해주세요.',
    '신청서를 다시 열지 못했습니다.',
  ), [runAction])

  const cancelApplication = useCallback((applicationId: number) => runAction(
    'cancel',
    () => cancelMerchantPlaceApplication(applicationId),
    (next) => setApplications((current) => replaceApplication(current, next)),
    '운영 장소 신청을 취소했습니다.',
    '운영 장소 신청을 취소하지 못했습니다.',
  ), [runAction])

  return {
    status,
    profile,
    applications,
    suggestions,
    isSearching,
    error,
    actionError,
    successMessage,
    activeAction,
    fetchApplications,
    searchPlaces,
    saveApplication,
    submitApplication,
    reopenApplication,
    cancelApplication,
  }
}
