import { useState } from 'react'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { verifyEmail } from '../api/authApi'
import type { EmailVerifyErrorResponse, EmailVerifyRequest } from '../types/auth.types'

const EMAIL_VERIFICATION_ERROR_MESSAGE = '이메일 인증 중 오류가 발생했습니다.'
const EMAIL_VERIFICATION_CATEGORY_MESSAGES = {
  network: '네트워크 연결을 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  unauthorized: '인증 코드가 올바르지 않거나 만료되었습니다.',
  'not-found': '사용자를 찾을 수 없습니다.',
  'bad-request': '인증 코드를 다시 확인해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

export function useEmailVerification() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleVerifyEmail = async (email: string) => {
    setIsError(false)
    setErrorMessage('')
    setIsSuccess(false)

    const trimmedEmail = email.trim()
    const trimmedCode = code.trim()

    if (!trimmedEmail) {
      setIsError(true)
      setErrorMessage('인증할 이메일 정보가 없습니다.')
      return false
    }

    if (!trimmedCode) {
      setIsError(true)
      setErrorMessage('인증 코드를 입력해주세요.')
      return false
    }

    try {
      setIsLoading(true)

      const payload: EmailVerifyRequest = {
        email: trimmedEmail,
        code: trimmedCode,
      }

      await verifyEmail(payload)
      setIsSuccess(true)
      return true
    } catch (error) {
      setIsError(true)

      if (isApiError<EmailVerifyErrorResponse>(error)) {
        setErrorMessage(
          getAuthErrorMessage(error, {
            fallbackMessage: EMAIL_VERIFICATION_ERROR_MESSAGE,
            categoryMessages: EMAIL_VERIFICATION_CATEGORY_MESSAGES,
          })
        )
        console.error('이메일 인증 실패', error)
      } else {
        setErrorMessage(EMAIL_VERIFICATION_ERROR_MESSAGE)
        console.error('이메일 인증 실패', error)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    code,
    setCode,
    isLoading,
    isError,
    errorMessage,
    isSuccess,
    handleVerifyEmail,
  }
}
