import type { ApiError, ApiErrorCategory } from './customAxios'
import type { AuthErrorResponse } from '../types/auth.types'

type ErrorMessageMap = Partial<Record<string, string>>
type CategoryMessageMap = Partial<Record<ApiErrorCategory, string>>

interface GetAuthErrorMessageOptions {
  fallbackMessage: string
  codeMessages?: ErrorMessageMap
  categoryMessages?: CategoryMessageMap
}

export function getAuthErrorMessage<T extends AuthErrorResponse>(
  error: ApiError<T>,
  options: GetAuthErrorMessageOptions
) {
  const responseCode = error.response?.data?.code

  if (responseCode && options.codeMessages?.[responseCode]) {
    return options.codeMessages[responseCode] ?? options.fallbackMessage
  }

  const responseMessage = error.response?.data?.message

  if (responseMessage) {
    return responseMessage
  }

  if (error.category && options.categoryMessages?.[error.category]) {
    return options.categoryMessages[error.category] ?? options.fallbackMessage
  }

  return options.fallbackMessage
}

export function normalizeFieldErrors<T extends string>(
  errors: Record<string, string> | Partial<Record<T, string>> | undefined,
  allowedKeys: readonly T[]
) {
  if (!errors) {
    return {}
  }

  return allowedKeys.reduce<Partial<Record<T, string>>>((acc, key) => {
    const value = errors[key]

    if (value) {
      acc[key] = value
    }

    return acc
  }, {})
}
