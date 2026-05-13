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
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'bad-request': '입력값을 다시 확인해주세요.',
}
const CHANGE_USERNAME_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  USERNAME_ALREADY_EXISTS: '이미 사용 중인 아이디입니다.',
}

function validateChangeUsername(newUsername: string) {
  const nextFieldErrors: ChangeUsernameFieldErrors = {}

  if (!newUsername) {
    nextFieldErrors.newUsername = '새 아이디를 입력해주세요.'
  } else if (newUsername.length < 4 || newUsername.length > 50) {
    nextFieldErrors.newUsername = '아이디는 4자 이상 50자 이하여야 합니다.'
  }

  return nextFieldErrors
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
    const nextFieldErrors = validateChangeUsername(trimmedUsername)

    if (Object.keys(nextFieldErrors).length > 0) {
      setErrorMessage('입력값을 다시 확인해주세요.')
      setFieldErrors(nextFieldErrors)
      setIsError(true)
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
            codeMessages: CHANGE_USERNAME_CODE_MESSAGES,
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
