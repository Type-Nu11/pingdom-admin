import { useState } from 'react'
import { getAuthErrorMessage, normalizeFieldErrors } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { changePassword } from '../api/userApi'
import type {
  ChangePasswordErrorResponse,
  ChangePasswordField,
  ChangePasswordFieldErrors,
  ChangePasswordRequest,
} from '../types/user.types'

const CHANGE_PASSWORD_FIELD_KEYS: ChangePasswordField[] = [
  'currentPassword',
  'newPassword',
  'confirmPassword',
]
const CHANGE_PASSWORD_ERROR_MESSAGE = '비밀번호 변경 중 오류가 발생했습니다.'
const CHANGE_PASSWORD_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  network: '네트워크 연결을 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'bad-request': '입력값을 다시 확인해주세요.',
}
const CHANGE_PASSWORD_CODE_MESSAGES = {
  INVALID_CREDENTIALS: '현재 비밀번호가 올바르지 않습니다.',
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
}

function validateChangePassword(payload: ChangePasswordRequest) {
  const nextFieldErrors: ChangePasswordFieldErrors = {}

  if (!payload.currentPassword) {
    nextFieldErrors.currentPassword = '현재 비밀번호를 입력해주세요.'
  }

  if (!payload.newPassword) {
    nextFieldErrors.newPassword = '새 비밀번호를 입력해주세요.'
  } else if (payload.newPassword.length < 8) {
    nextFieldErrors.newPassword = '비밀번호는 8자 이상이어야 합니다.'
  }

  if (!payload.confirmPassword) {
    nextFieldErrors.confirmPassword = '새 비밀번호 확인을 입력해주세요.'
  } else if (payload.newPassword && payload.newPassword !== payload.confirmPassword) {
    nextFieldErrors.confirmPassword = '새 비밀번호가 일치하지 않습니다.'
  }

  return nextFieldErrors
}

export function useChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({})

  const handleChangePassword = async () => {
    setIsError(false)
    setErrorMessage('')
    setSuccessMessage('')
    setFieldErrors({})

    const payload: ChangePasswordRequest = {
      currentPassword,
      newPassword,
      confirmPassword,
    }
    const nextFieldErrors = validateChangePassword(payload)

    if (Object.keys(nextFieldErrors).length > 0) {
      setIsError(true)
      setFieldErrors(nextFieldErrors)
      setErrorMessage('입력값을 다시 확인해주세요.')
      return false
    }

    try {
      setIsLoading(true)

      const message = await changePassword(payload)

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccessMessage(message || '비밀번호가 변경되었습니다.')

      return true
    } catch (error) {
      setIsError(true)

      if (isApiError<ChangePasswordErrorResponse>(error)) {
        setErrorMessage(
          getAuthErrorMessage(error, {
            fallbackMessage: CHANGE_PASSWORD_ERROR_MESSAGE,
            codeMessages: CHANGE_PASSWORD_CODE_MESSAGES,
            categoryMessages: CHANGE_PASSWORD_CATEGORY_MESSAGES,
          })
        )

        setFieldErrors(
          normalizeFieldErrors(error.response?.data?.errors, CHANGE_PASSWORD_FIELD_KEYS)
        )
        console.error('비밀번호 변경 실패', error)
      } else {
        setErrorMessage(CHANGE_PASSWORD_ERROR_MESSAGE)
        console.error('비밀번호 변경 실패', error)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    isError,
    errorMessage,
    successMessage,
    fieldErrors,
    handleChangePassword,
  }
}
