import { useState } from 'react'
import { getAuthErrorMessage, normalizeFieldErrors } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { changeUsername } from '../api/userApi'
import type {
  ChangeUsernameErrorResponse,
  ChangeUsernameField,
  ChangeUsernameFieldErrors,
  ChangeUsernameRequest,
} from '../types/user.types'

const CHANGE_USERNAME_FIELD_KEYS: ChangeUsernameField[] = ['newUsername']
const CHANGE_USERNAME_ERROR_MESSAGE = '아이디 변경 중 오류가 발생했습니다.'
const CHANGE_USERNAME_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  network: '네트워크 연결을 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'bad-request': '입력값을 다시 확인해주세요.',
}

export function useChangeUsername() {
  const [newUsername, setNewUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ChangeUsernameFieldErrors>({})

  const handleChangeUsername = async () => {
    setIsError(false)
    setErrorMessage('')
    setSuccessMessage('')
    setFieldErrors({})

    const trimmedUsername = newUsername.trim()

    if (!trimmedUsername) {
      setIsError(true)
      setFieldErrors({ newUsername: '새 아이디를 입력해주세요.' })
      setErrorMessage('입력값을 다시 확인해주세요.')
      return false
    }

    if (trimmedUsername.length < 4 || trimmedUsername.length > 50) {
      setIsError(true)
      setFieldErrors({ newUsername: '아이디는 4자 이상 50자 이하여야 합니다.' })
      setErrorMessage('입력값을 다시 확인해주세요.')
      return false
    }

    try {
      setIsLoading(true)

      const payload: ChangeUsernameRequest = {
        newUsername: trimmedUsername,
      }

      const message = await changeUsername(payload)

      localStorage.setItem('username', trimmedUsername)
      setNewUsername('')
      setSuccessMessage(message || '아이디가 변경되었습니다.')

      return true
    } catch (error) {
      setIsError(true)

      if (isApiError<ChangeUsernameErrorResponse>(error)) {
        setErrorMessage(
          getAuthErrorMessage(error, {
            fallbackMessage: CHANGE_USERNAME_ERROR_MESSAGE,
            categoryMessages: CHANGE_USERNAME_CATEGORY_MESSAGES,
          })
        )
        setFieldErrors(
          normalizeFieldErrors(error.response?.data?.errors, CHANGE_USERNAME_FIELD_KEYS)
        )
        console.error('아이디 변경 실패', error)
      } else {
        setErrorMessage(CHANGE_USERNAME_ERROR_MESSAGE)
        console.error('아이디 변경 실패', error)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    newUsername,
    setNewUsername,
    isLoading,
    isError,
    errorMessage,
    successMessage,
    fieldErrors,
    handleChangeUsername,
  }
}
