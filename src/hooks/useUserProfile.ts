import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { getUserProfile } from '../api/userApi'
import { useAuth } from './useAuth'
import type { MyPageErrorResponse, MyPageResponse } from '../types/user.types'

const USER_PROFILE_ERROR_MESSAGE = '내 정보를 불러오는 중 오류가 발생했습니다.'
const USER_PROFILE_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  forbidden: '접근 권한이 없습니다.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const USER_PROFILE_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
}

interface UseUserProfileOptions {
  enabled?: boolean
}

function getUserProfileErrorMessage(error: unknown) {
  if (!isApiError<MyPageErrorResponse>(error)) {
    return USER_PROFILE_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: USER_PROFILE_ERROR_MESSAGE,
    codeMessages: USER_PROFILE_CODE_MESSAGES,
    categoryMessages: USER_PROFILE_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<MyPageErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

export function useUserProfile({ enabled = true }: UseUserProfileOptions = {}) {
  const { accessToken, clearAuth, updateUser } = useAuth()
  const [profile, setProfile] = useState<MyPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const hasFetchedOnMountRef = useRef(false)
  const latestRequestIdRef = useRef(0)

  const fetchUserProfile = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    setIsError(false)
    setErrorMessage('')

    const currentAccessToken = accessToken.trim()

    if (!currentAccessToken) {
      setProfile(null)
      setIsError(true)
      setErrorMessage('로그인이 필요합니다.')
      return false
    }

    try {
      setIsLoading(true)

      const data = await getUserProfile()

      if (requestId === latestRequestIdRef.current) {
        setProfile(data)
        updateUser({
          id: data.id,
          username: data.username,
          name: data.name,
        })
      }

      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        setProfile(null)
        setIsError(true)
        setErrorMessage(getUserProfileErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      console.error('내 정보 조회 실패', error)

      return false
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [accessToken, clearAuth, updateUser])

  useEffect(() => {
    if (!enabled || hasFetchedOnMountRef.current) {
      return
    }

    hasFetchedOnMountRef.current = true
    void fetchUserProfile()
  }, [enabled, fetchUserProfile])

  return {
    profile,
    isLoading,
    isError,
    errorMessage,
    fetchUserProfile,
  }
}
