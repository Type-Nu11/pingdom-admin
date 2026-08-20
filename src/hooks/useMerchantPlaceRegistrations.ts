import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelMerchantPlaceRegistration,
  completeMerchantPlaceRegistration,
  createMerchantPlaceRegistration,
  getMerchantPlaceRegistration,
  getMerchantPlaceRegistrations,
  reopenMerchantPlaceRegistration,
  submitMerchantPlaceRegistration,
  updateMerchantPlaceRegistration,
} from '../api/merchantPlaceRegistrationApi'
import { getMerchantOwnerProfile } from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { MerchantOwnerProfile } from '../types/merchantStore.types'
import type {
  MerchantPlaceRegistration,
  MerchantPlaceRegistrationErrorResponse,
  MerchantPlaceRegistrationRequest,
} from '../types/merchantPlaceRegistration.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'
type Action = 'save' | 'submit' | 'reopen' | 'complete' | 'cancel' | 'detail' | null

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<MerchantPlaceRegistrationErrorResponse>(error)) return fallbackMessage

  return getAuthErrorMessage(error, {
    fallbackMessage,
    codeMessages: {
      ACCESS_DENIED: '상점주 권한이 필요합니다.',
      INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해주세요.',
      PLACE_REGISTRATION_APPROVAL_REQUIRED: '승인된 등록 신청을 통해서만 장소를 등록할 수 있습니다.',
    },
  })
}

function replaceRegistration(
  current: MerchantPlaceRegistration[],
  next: MerchantPlaceRegistration,
) {
  const index = current.findIndex((registration) => registration.id === next.id)
  if (index === -1) return [next, ...current]
  return current.map((registration) => (registration.id === next.id ? next : registration))
}

export function useMerchantPlaceRegistrations() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerProfile | null>(null)
  const [registrations, setRegistrations] = useState<MerchantPlaceRegistration[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeAction, setActiveAction] = useState<Action>(null)
  const mountedRef = useRef(true)
  const actionRef = useRef<Action>(null)

  const clearUnauthorizedSession = useCallback((error: unknown) => {
    if (isApiError(error) && error.category === 'unauthorized') clearAuth()
  }, [clearAuth])

  const fetchRegistrations = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setErrorMessage('')
    const [profileResult, registrationsResult] = await Promise.allSettled([
      getMerchantOwnerProfile(),
      getMerchantPlaceRegistrations(),
    ])

    if (!mountedRef.current) return
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value)
    if (registrationsResult.status === 'fulfilled') setRegistrations(registrationsResult.value.applications)

    const failures = [profileResult, registrationsResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (failures.length === 2) {
      failures.forEach((result) => clearUnauthorizedSession(result.reason))
      setStatus('error')
      setErrorMessage('신규 장소 등록 신청 정보를 불러오지 못했습니다.')
      return
    }

    setStatus('ready')
    if (failures.length > 0) {
      failures.forEach((result) => logDebugError('신규 장소 등록 신청 일부 조회 실패', result.reason))
      setErrorMessage('일부 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [clearUnauthorizedSession])

  useEffect(() => {
    mountedRef.current = true
    void fetchRegistrations()
    return () => { mountedRef.current = false }
  }, [fetchRegistrations])

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
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await task()
      if (!mountedRef.current) return null
      apply(result)
      setSuccessMessage(success)
      return result
    } catch (error) {
      if (mountedRef.current) {
        clearUnauthorizedSession(error)
        setActionErrorMessage(getErrorMessage(error, fallback))
        logDebugError(`신규 장소 등록 신청 ${action} 실패`, error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setActiveAction(null)
    }
  }, [clearUnauthorizedSession])

  const selectRegistration = useCallback((applicationId: number) => runAction(
    'detail',
    () => getMerchantPlaceRegistration(applicationId),
    (next) => setRegistrations((current) => replaceRegistration(current, next)),
    '',
    '신청 상세를 불러오지 못했습니다.',
  ), [runAction])

  const saveRegistration = useCallback((applicationId: number | null, request: MerchantPlaceRegistrationRequest) => runAction(
    'save',
    () => applicationId ? updateMerchantPlaceRegistration(applicationId, request) : createMerchantPlaceRegistration(request),
    (next) => setRegistrations((current) => replaceRegistration(current, next)),
    applicationId ? '신규 장소 신청서를 저장했습니다.' : '신규 장소 신청서를 만들었습니다.',
    '신규 장소 신청서를 저장하지 못했습니다.',
  ), [runAction])

  const submitRegistration = useCallback((applicationId: number) => runAction(
    'submit',
    () => submitMerchantPlaceRegistration(applicationId),
    (next) => setRegistrations((current) => replaceRegistration(current, next)),
    '신규 장소 등록 신청을 제출했습니다.',
    '신규 장소 등록 신청을 제출하지 못했습니다.',
  ), [runAction])

  const reopenRegistration = useCallback((applicationId: number) => runAction(
    'reopen',
    () => reopenMerchantPlaceRegistration(applicationId),
    (next) => setRegistrations((current) => replaceRegistration(current, next)),
    '신청서를 다시 열었습니다. 내용을 보완한 뒤 제출해주세요.',
    '신청서를 다시 열지 못했습니다.',
  ), [runAction])

  const completeRegistration = useCallback(async (applicationId: number) => {
    const nextRegistration = await runAction(
      'complete',
      () => completeMerchantPlaceRegistration(applicationId),
      (next) => setRegistrations((current) => replaceRegistration(current, next)),
      '승인된 장소 등록을 완료했습니다. 가게 연결 상태를 확인해주세요.',
      '장소 등록을 완료하지 못했습니다.',
    )

    if (!nextRegistration) return null

    try {
      const nextProfile = await getMerchantOwnerProfile()
      if (mountedRef.current) setProfile(nextProfile)
    } catch (error) {
      logDebugError('장소 등록 완료 후 상점주 프로필 조회 실패', error)
    }

    return nextRegistration
  }, [runAction])

  const cancelRegistration = useCallback((applicationId: number) => runAction(
    'cancel',
    () => cancelMerchantPlaceRegistration(applicationId),
    (next) => setRegistrations((current) => replaceRegistration(current, next)),
    '신규 장소 등록 신청을 취소했습니다.',
    '신규 장소 등록 신청을 취소하지 못했습니다.',
  ), [runAction])

  return {
    status, profile, registrations, errorMessage, actionErrorMessage, successMessage, activeAction,
    fetchRegistrations, selectRegistration, saveRegistration, submitRegistration,
    reopenRegistration, completeRegistration, cancelRegistration,
  }
}
