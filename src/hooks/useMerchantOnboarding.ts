import { useCallback, useEffect, useRef, useState } from 'react'
import { getOptionalMerchantApplicationProfile } from '../api/merchantOnboardingApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { MerchantOwnerApplicationProfile, MerchantOnboardingErrorResponse } from '../types/merchantOnboarding.types'
import { useAuth } from './useAuth'

export function useMerchantOnboarding() {
  const { clearAuth } = useAuth()
  const [profile, setProfile] = useState<MerchantOwnerApplicationProfile | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const requestRef = useRef(0)
  const fetchOnboarding = useCallback(async () => {
    const id = ++requestRef.current
    setStatus('loading')
    setErrorMessage('')
    try {
      const next = await getOptionalMerchantApplicationProfile()
      if (id !== requestRef.current) return
      setProfile(next)
      setStatus('ready')
    } catch (error) {
      if (id !== requestRef.current) return
      if (shouldClearAuth(error)) clearAuth()
      setErrorMessage(isApiError<MerchantOnboardingErrorResponse>(error)
        ? getAuthErrorMessage(error, { fallbackMessage: '신청 정보를 불러오지 못했습니다.' })
        : '신청 정보를 불러오지 못했습니다.')
      setStatus('error')
    }
  }, [clearAuth])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void fetchOnboarding() })
    return () => { active = false; requestRef.current += 1 }
  }, [fetchOnboarding])

  return { profile, status, errorMessage, fetchOnboarding }
}
