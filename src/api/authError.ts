import type { ApiError, ApiErrorCategory } from './customAxios'
import type { AuthErrorResponse } from '../types/auth.types'

type ErrorMessageMap = Partial<Record<string, string>>
type CategoryMessageMap = Partial<Record<ApiErrorCategory, string>>

const DEFAULT_CATEGORY_MESSAGES: CategoryMessageMap = {
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  offline: '인터넷 연결이 끊겨 있습니다. 네트워크 상태를 확인해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'bad-request': '입력값을 다시 확인해주세요.',
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '접근 권한이 없습니다.',
  'not-found': '요청한 정보를 찾을 수 없습니다.',
  conflict: '이미 처리되었거나 중복된 요청입니다.',
  'too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  unknown: '알 수 없는 오류가 발생했습니다.',
}

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

  if (error.category) {
    return (
      options.categoryMessages?.[error.category] ??
      DEFAULT_CATEGORY_MESSAGES[error.category] ??
      options.fallbackMessage
    )
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
