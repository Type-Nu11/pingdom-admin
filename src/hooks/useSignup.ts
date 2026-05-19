import { useState } from 'react'
import { getAuthErrorMessage, normalizeFieldErrors } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { signup } from '../api/authApi'
import { MIN_PASSWORD_LENGTH } from '../constants/auth'
import type {
  SignupField,
  SignupFieldErrors,
  SignupErrorResponse,
  SignupRequest,
} from '../types/auth.types'

const SIGNUP_FIELD_KEYS: SignupField[] = ['username', 'name', 'email', 'password']
const SIGNUP_ERROR_MESSAGE = '회원가입 중 오류가 발생했습니다.'
const SIGNUP_CATEGORY_MESSAGES = {
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'bad-request': '입력값을 다시 확인해주세요.',
}
const SIGNUP_CODE_MESSAGES = {
  DUPLICATE_USERNAME: '이미 사용 중인 아이디입니다.',
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function useSignup() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({})

  const handleSignup = async () => {
    setIsError(false)
    setErrorMessage('')
    setFieldErrors({})

    const trimmedUsername = username.trim()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    const nextFieldErrors: SignupFieldErrors = {}

    if (!trimmedUsername) {
      nextFieldErrors.username = '아이디를 입력해주세요.'
    } else if (trimmedUsername.length < 4 || trimmedUsername.length > 50) {
      nextFieldErrors.username = '아이디는 4자 이상 50자 이하여야 합니다.'
    }

    if (!trimmedName) {
      nextFieldErrors.name = '이름을 입력해주세요.'
    }

    if (!trimmedEmail) {
      nextFieldErrors.email = '이메일을 입력해주세요.'
    } else if (!isValidEmail(trimmedEmail)) {
      nextFieldErrors.email = '이메일 형식이 올바르지 않습니다.'
    }

    if (!password) {
      nextFieldErrors.password = '비밀번호를 입력해주세요.'
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextFieldErrors.password = `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setIsError(true)
      setFieldErrors(nextFieldErrors)
      setErrorMessage('입력값을 다시 확인해주세요.')
      return false
    }

    try {
      setIsLoading(true)

      const payload: SignupRequest = {
        username: trimmedUsername,
        name: trimmedName,
        email: trimmedEmail,
        password,
      }

      await signup(payload)

      return true
    } catch (error) {
      setIsError(true)

      if (isApiError<SignupErrorResponse>(error)) {
        setErrorMessage(
          getAuthErrorMessage(error, {
            fallbackMessage: SIGNUP_ERROR_MESSAGE,
            codeMessages: SIGNUP_CODE_MESSAGES,
            categoryMessages: SIGNUP_CATEGORY_MESSAGES,
          })
        )
        setFieldErrors(normalizeFieldErrors(error.response?.data?.errors, SIGNUP_FIELD_KEYS))
        console.error('회원가입 실패', error)
      } else {
        setErrorMessage(SIGNUP_ERROR_MESSAGE)
        console.error('회원가입 실패', error)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    username,
    setUsername,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    isError,
    errorMessage,
    fieldErrors,
    handleSignup,
  }
}
