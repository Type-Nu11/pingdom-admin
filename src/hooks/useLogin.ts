import { useState } from 'react'
import { isApiError } from '../api/customAxios'
import type { ApiError } from '../api/customAxios'
import { login } from '../api/authApi'
import type { LoginErrorResponse, LoginRequest } from '../types/auth.types'

function getLoginErrorMessage(error: ApiError<LoginErrorResponse>) {
  if (error.response?.data?.code === 'INVALID_CREDENTIALS') {
    return error.response.data.message
  }

  switch (error.category) {
    case 'unauthorized':
      return '아이디 또는 비밀번호가 올바르지 않습니다.'
    case 'network':
      return '네트워크 연결을 확인해주세요.'
    case 'timeout':
      return '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
    case 'server':
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    case 'bad-request':
      return '입력값을 다시 확인해주세요.'
    default:
      return '로그인 중 오류가 발생했습니다.'
  }
}

export function useLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async () => {
    setIsError(false)
    setErrorMessage('')

    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setIsError(true)
      setErrorMessage('아이디를 입력해주세요.')
      return false
    }

    if (!password) {
      setIsError(true)
      setErrorMessage('비밀번호를 입력해주세요.')
      return false
    }

    try {
      setIsLoading(true)

      const payload: LoginRequest = {
        username: trimmedUsername,
        password,
      }

      const data = await login(payload)

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('username', data.username)
      localStorage.setItem('name', data.name)

      return true
    } catch (error) {
      setIsError(true)

      if (isApiError<LoginErrorResponse>(error)) {
        setErrorMessage(getLoginErrorMessage(error))
        console.error('로그인 실패', error)
      } else {
        setErrorMessage('로그인 중 오류가 발생했습니다.')
        console.error('로그인 실패', error)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    isError,
    errorMessage,
    handleLogin,
  }
}
