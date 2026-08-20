import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMerchantOwnerApplicationProfile,
  createMerchantVerification,
  getMerchantOwnerApplicationProfile,
  getMerchantVerification,
  updateMerchantOwnerApplicationProfile,
  updateMerchantVerification,
} from '../api/merchantOnboardingApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantOnboardingErrorResponse,
  MerchantOwnerApplicationProfile,
  MerchantOwnerApplicationRequest,
  MerchantVerification,
  MerchantVerificationRequest,
} from '../types/merchantOnboarding.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type MerchantOnboardingLoadStatus = 'loading' | 'ready' | 'error'
type SavingSection = 'profile' | 'verification' | null

function isNotFoundError(error: unknown) {
  return isApiError(error) && error.category === 'not-found'
}

function getOnboardingErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<MerchantOnboardingErrorResponse>(error)) {
    return fallbackMessage
  }

  return getAuthErrorMessage(error, {
    fallbackMessage,
    codeMessages: {
      INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해주세요.',
      ACCESS_DENIED: '상점주 신청 권한이 없습니다.',
    },
  })
}

function optionalText(value: string) {
  return value.trim() || null
}

export function useMerchantOnboarding() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<MerchantOnboardingLoadStatus>('loading')
  const [profile, setProfile] = useState<MerchantOwnerApplicationProfile | null>(null)
  const [verification, setVerification] = useState<MerchantVerification | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [profileErrorMessage, setProfileErrorMessage] = useState('')
  const [verificationErrorMessage, setVerificationErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [savingSection, setSavingSection] = useState<SavingSection>(null)
  const mountedRef = useRef(true)
  const savingRef = useRef<SavingSection>(null)

  const clearUnauthorizedSession = useCallback(
    (error: unknown) => {
      if (isApiError<MerchantOnboardingErrorResponse>(error) && error.category === 'unauthorized') {
        clearAuth()
      }
    },
    [clearAuth],
  )

  const fetchOnboarding = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setErrorMessage('')

    const [profileResult, verificationResult] = await Promise.allSettled([
      getMerchantOwnerApplicationProfile(),
      getMerchantVerification(),
    ])

    if (!mountedRef.current) return

    const profileMissing = profileResult.status === 'rejected' && isNotFoundError(profileResult.reason)
    const verificationMissing = verificationResult.status === 'rejected' && isNotFoundError(verificationResult.reason)
    const profileFailed = profileResult.status === 'rejected' && !profileMissing
    const verificationFailed = verificationResult.status === 'rejected' && !verificationMissing

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value)
    } else if (profileMissing) {
      setProfile(null)
    }

    if (verificationResult.status === 'fulfilled') {
      setVerification(verificationResult.value)
    } else if (verificationMissing) {
      setVerification(null)
    }

    if (profileFailed) {
      clearUnauthorizedSession(profileResult.reason)
      logDebugError('상점주 신청 정보 조회 실패', profileResult.reason)
    }
    if (verificationFailed) {
      clearUnauthorizedSession(verificationResult.reason)
      logDebugError('상점주 사업자 검증 조회 실패', verificationResult.reason)
    }

    if (profileFailed && verificationFailed) {
      setStatus('error')
      setErrorMessage('상점주 신청 정보를 불러오지 못했습니다.')
      return
    }

    setStatus('ready')
    if (profileFailed || verificationFailed) {
      setErrorMessage('일부 신청 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [clearUnauthorizedSession])

  useEffect(() => {
    mountedRef.current = true
    void fetchOnboarding()

    return () => {
      mountedRef.current = false
    }
  }, [fetchOnboarding])

  const saveProfile = useCallback(
    async (values: MerchantOwnerApplicationRequest) => {
      if (savingRef.current) return false

      savingRef.current = 'profile'
      setSavingSection('profile')
      setProfileErrorMessage('')
      setSuccessMessage('')

      try {
        const request = { ...values, description: optionalText(values.description ?? '') }
        const nextProfile = profile
          ? await updateMerchantOwnerApplicationProfile(request)
          : await createMerchantOwnerApplicationProfile(request)

        if (!mountedRef.current) return false

        setProfile(nextProfile)
        setSuccessMessage(profile ? '상점주 신청 정보를 저장했습니다.' : '상점주 신청 정보를 제출했습니다.')
        return true
      } catch (error) {
        if (mountedRef.current) {
          clearUnauthorizedSession(error)
          setProfileErrorMessage(getOnboardingErrorMessage(error, '상점주 신청 정보를 저장하지 못했습니다.'))
          logDebugError('상점주 신청 정보 저장 실패', error)
        }
        return false
      } finally {
        savingRef.current = null
        if (mountedRef.current) setSavingSection(null)
      }
    },
    [clearUnauthorizedSession, profile],
  )

  const saveVerification = useCallback(
    async (request: MerchantVerificationRequest) => {
      if (savingRef.current) return false

      savingRef.current = 'verification'
      setSavingSection('verification')
      setVerificationErrorMessage('')
      setSuccessMessage('')

      try {
        const nextVerification = verification
          ? await updateMerchantVerification(request)
          : await createMerchantVerification(request)

        if (!mountedRef.current) return false

        setVerification(nextVerification)
        setSuccessMessage(verification ? '사업자 검증 정보를 저장했습니다.' : '사업자 검증을 신청했습니다.')
        return true
      } catch (error) {
        if (mountedRef.current) {
          clearUnauthorizedSession(error)
          setVerificationErrorMessage(getOnboardingErrorMessage(error, '사업자 검증 정보를 저장하지 못했습니다.'))
          logDebugError('상점주 사업자 검증 저장 실패', error)
        }
        return false
      } finally {
        savingRef.current = null
        if (mountedRef.current) setSavingSection(null)
      }
    },
    [clearUnauthorizedSession, verification],
  )

  return {
    status,
    profile,
    verification,
    errorMessage,
    profileErrorMessage,
    verificationErrorMessage,
    successMessage,
    isSavingProfile: savingSection === 'profile',
    isSavingVerification: savingSection === 'verification',
    fetchOnboarding,
    saveProfile,
    saveVerification,
  }
}
