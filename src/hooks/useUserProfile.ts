import { useCallback, useEffect, useState } from 'react'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { getUserProfile } from '../api/userApi'
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

export function useUserProfile() {
  const [profile, setProfile] = useState<MyPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchUserProfile = useCallback(async () => {
    setIsError(false)
    setErrorMessage('')

    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      setProfile(null)
      setIsError(true)
      setErrorMessage('로그인이 필요합니다.')
      return false
    }

    try {
      setIsLoading(true)

      const data = await getUserProfile()

      setProfile(data)

      return true
    } catch (error) {
      setProfile(null)
      setIsError(true)

      if (isApiError<MyPageErrorResponse>(error)) {
        setErrorMessage(
          getAuthErrorMessage(error, {
            fallbackMessage: USER_PROFILE_ERROR_MESSAGE,
            codeMessages: USER_PROFILE_CODE_MESSAGES,
            categoryMessages: USER_PROFILE_CATEGORY_MESSAGES,
          })
        )
        console.error('내 정보 조회 실패', error)
      } else {
        setErrorMessage(USER_PROFILE_ERROR_MESSAGE)
        console.error('내 정보 조회 실패', error)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUserProfile()
  }, [fetchUserProfile])

  return {
    profile,
    isLoading,
    isError,
    errorMessage,
    fetchUserProfile,
  }
}
