import { useState } from 'react'
import { isApiError } from '../api/customAxios'
import type { ApiError } from '../api/customAxios'
import { verifyEmail } from '../api/authApi'
import type { EmailVerifyErrorResponse, EmailVerifyRequest } from '../types/auth.types'

function getEmailVerificationErrorMessage(error: ApiError<EmailVerifyErrorResponse>) {
  if (error.response?.data?.message) {
    return error.response.data.message
  }

  switch (error.category) {
    case 'network':
      return '네트워크 연결을 확인해주세요.'
    case 'timeout':
      return '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
    case 'unauthorized':
      return '인증 코드가 올바르지 않거나 만료되었습니다.'
    case 'not-found':
      return '사용자를 찾을 수 없습니다.'
    case 'bad-request':
      return '인증 코드를 다시 확인해주세요.'
    case 'server':
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    default:
      return '이메일 인증 중 오류가 발생했습니다.'
  }
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
        setErrorMessage(getEmailVerificationErrorMessage(error))
        console.error('이메일 인증 실패', error)
      } else {
        setErrorMessage('이메일 인증 중 오류가 발생했습니다.')
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
