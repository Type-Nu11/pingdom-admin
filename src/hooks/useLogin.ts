import { useRef, useState } from 'react'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { login as requestLogin, type LoginMode } from '../api/authApi'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'
import type { LoginErrorResponse, LoginRequest } from '../types/auth.types'

const LOGIN_ERROR_MESSAGE = '로그인 중 오류가 발생했습니다.'
const LOGIN_CATEGORY_MESSAGES = {
  unauthorized: '아이디 또는 비밀번호가 올바르지 않습니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'bad-request': '입력값을 다시 확인해주세요.',
}
const LOGIN_CODE_MESSAGES = {
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다.',
  ADMIN_ACCESS_REQUIRED: '관리자 권한이 있는 계정으로 로그인해주세요.',
}

type LoginResult =
  | 'success'
  | 'username-required'
  | 'password-required'
  | 'credential-error'
  | 'failed'

export function useLogin(mode: LoginMode = 'admin') {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const isSubmittingRef = useRef(false)

  const handleLogin = async () => {
    setIsError(false)
    setErrorMessage('')

    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setIsError(true)
      setErrorMessage('아이디를 입력해주세요.')
      return 'username-required' satisfies LoginResult
    }

    if (!password) {
      setIsError(true)
      setErrorMessage('비밀번호를 입력해주세요.')
      return 'password-required' satisfies LoginResult
    }

    if (isSubmittingRef.current) {
      return 'failed' satisfies LoginResult
    }

    try {
      isSubmittingRef.current = true
      setIsLoading(true)

      const payload: LoginRequest = {
        username: trimmedUsername,
        password,
      }

      const data = await requestLogin(payload, mode)

      login(data)

      return 'success' satisfies LoginResult
    } catch (error) {
      setIsError(true)

      if (isApiError<LoginErrorResponse>(error)) {
        setErrorMessage(
          getAuthErrorMessage(error, {
            fallbackMessage: LOGIN_ERROR_MESSAGE,
            codeMessages: LOGIN_CODE_MESSAGES,
            categoryMessages: LOGIN_CATEGORY_MESSAGES,
          })
        )
        logDebugError('로그인 실패', error)

        if (
          error.response?.data?.code === 'INVALID_CREDENTIALS' ||
          error.category === 'unauthorized'
        ) {
          return 'credential-error' satisfies LoginResult
        }
      } else {
        setErrorMessage(LOGIN_ERROR_MESSAGE)
        logDebugError('로그인 실패', error)
      }

      return 'failed' satisfies LoginResult
    } finally {
      isSubmittingRef.current = false
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
