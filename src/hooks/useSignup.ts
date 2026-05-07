import { useState } from 'react'
import { isApiError } from '../api/customAxios'
import type { ApiError } from '../api/customAxios'
import { signup } from '../api/authApi'
import type {
  SignupField,
  SignupFieldErrors,
  SignupErrorResponse,
  SignupRequest,
} from '../types/auth.types'

const SIGNUP_FIELD_KEYS: SignupField[] = ['username', 'name', 'email', 'password']

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeSignupFieldErrors(errors?: SignupFieldErrors) {
  if (!errors) {
    return {}
  }

  return SIGNUP_FIELD_KEYS.reduce<SignupFieldErrors>((acc, key) => {
    if (errors[key]) {
      acc[key] = errors[key]
    }

    return acc
  }, {})
}

function getSignupErrorMessage(error: ApiError<SignupErrorResponse>) {
  if (error.response?.data?.code === 'DUPLICATE_USERNAME') {
    return error.response.data.message
  }

  if (error.response?.data?.message) {
    return error.response.data.message
  }

  switch (error.category) {
    case 'network':
      return '네트워크 연결을 확인해주세요.'
    case 'timeout':
      return '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
    case 'server':
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    case 'bad-request':
      return '입력값을 다시 확인해주세요.'
    default:
      return '회원가입 중 오류가 발생했습니다.'
  }
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
    } else if (password.length < 8) {
      nextFieldErrors.password = '비밀번호는 8자 이상이어야 합니다.'
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
        setErrorMessage(getSignupErrorMessage(error))
        setFieldErrors(normalizeSignupFieldErrors(error.response?.data?.errors))
        console.error('회원가입 실패', error)
      } else {
        setErrorMessage('회원가입 중 오류가 발생했습니다.')
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
