import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { RefreshTokenResponse } from '../types/auth.types'
import {
  clearStoredAuth,
  getStoredAccessToken,
  getAuthSessionId,
  saveRefreshedAuthTokens,
} from '../utils/authStorage'

export type ApiErrorCategory =
  | 'timeout'
  | 'offline'
  | 'request-blocked'
  | 'network'
  | 'bad-request'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'too-many-requests'
  | 'server'
  | 'unknown'

export type ApiError<T = unknown> = AxiosError<T> & {
  category?: ApiErrorCategory
  status?: number
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _authSessionId?: string
}

export function isApiError<T = unknown>(error: unknown): error is ApiError<T> {
  return axios.isAxiosError(error)
}

const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_PUBLIC_API_BASE_URL
const TOKEN_REFRESH_API_PATH = '/auth/token/refresh'
const tokenRefreshRequests = new Map<string, {
  controller: AbortController
  promise: Promise<RefreshTokenResponse>
}>()
let pendingAuthTransitions = 0
let authTransitionTail: Promise<unknown> = Promise.resolve()

// 같은 탭의 쿠키 변경 요청을 직렬화합니다. 쿠키가 다른 계정을 가리키는 경우에는 토큰 사용자 비교로 방어합니다.
export function runAuthTransition<T>(action: () => Promise<T>): Promise<T> {
  pendingAuthTransitions++
  const refreshes = [...tokenRefreshRequests.values()]
  refreshes.forEach(({ controller }) => controller.abort())
  const settled = Promise.allSettled(refreshes.map(({ promise }) => promise))
  const transition = authTransitionTail.then(async () => {
    await settled
    return action()
  })
  const result = transition.finally(() => { pendingAuthTransitions-- })
  authTransitionTail = result.catch(() => {})
  return result
}

function assertCurrentSession(sessionId: string) {
  if (pendingAuthTransitions > 0 || getAuthSessionId() !== sessionId) {
    throw new axios.CanceledError('로그인 세션이 변경되어 요청을 취소했습니다.')
  }
}

function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function hasRequestWithoutResponse(error: AxiosError) {
  return Boolean(error.request) && !error.response
}

function classifyApiError(error: AxiosError): ApiErrorCategory {
  const status = error.response?.status

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'timeout'
  }

  if (isBrowserOffline()) {
    return 'offline'
  }

  if (!error.response) {
    if (error.code === 'ERR_NETWORK' || hasRequestWithoutResponse(error)) {
      return 'request-blocked'
    }

    return 'network'
  }

  switch (status) {
    case 400:
      return 'bad-request'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not-found'
    case 409:
      return 'conflict'
    case 429:
      return 'too-many-requests'
    default:
      if (typeof status === 'number' && status >= 500) {
        return 'server'
      }

      return 'unknown'
  }
}

const customAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
})

const AUTH_EXCLUDED_PATHS = [
  '/auth/admin/login',
  '/auth/login',
  TOKEN_REFRESH_API_PATH,
  '/auth/logout',
]

function shouldAttachAccessToken(url = '') {
  return !AUTH_EXCLUDED_PATHS.some((path) => url.startsWith(path))
}

function setAuthorizationHeader(config: InternalAxiosRequestConfig, accessToken: string) {
  config.headers.Authorization = `Bearer ${accessToken}`
}

function getRequestAccessToken(config: InternalAxiosRequestConfig) {
  const authorizationHeader = config.headers.get('Authorization')

  if (!authorizationHeader) {
    return ''
  }

  const authorization = authorizationHeader.toString()

  if (!authorization.startsWith('Bearer ')) {
    return ''
  }

  return authorization.replace('Bearer ', '').trim()
}

function enrichApiError(error: AxiosError) {
  const apiError = error as ApiError
  apiError.category = classifyApiError(error)
  apiError.status = error.response?.status

  return apiError
}

function shouldRefreshAccessToken(
  error: AxiosError,
  config?: RetriableRequestConfig
) {
  return Boolean(
    config &&
      error.response?.status === 401 &&
      !config._retry &&
      shouldAttachAccessToken(config.url) &&
      getRequestAccessToken(config)
  )
}

async function requestTokenRefresh(sessionId: string) {
  assertCurrentSession(sessionId)
  const pending = tokenRefreshRequests.get(sessionId)
  if (pending) return pending.promise
  const controller = new AbortController()
  const request = axios
    .post<RefreshTokenResponse>(TOKEN_REFRESH_API_PATH, undefined, {
      baseURL: API_BASE_URL,
      timeout: 10000,
      withCredentials: true,
      signal: controller.signal,
    })
    .then(({ data }) => {
      assertCurrentSession(sessionId)
      saveRefreshedAuthTokens(data, sessionId)

      return data
    })
    .finally(() => {
      tokenRefreshRequests.delete(sessionId)
    })

  tokenRefreshRequests.set(sessionId, { controller, promise: request })
  return request
}

function shouldClearAuthAfterRefreshFailure(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return true
  }

  const status = error.response?.status

  return Boolean(error.response && (typeof status !== 'number' || status < 500))
}

customAxios.interceptors.request.use((config) => {
  const request = config as RetriableRequestConfig
  if (shouldAttachAccessToken(config.url)) {
    request._authSessionId ??= getAuthSessionId()
    assertCurrentSession(request._authSessionId)
  }
  const accessToken = getStoredAccessToken()

  if (accessToken && shouldAttachAccessToken(config.url)) {
    setAuthorizationHeader(config, accessToken)
  }

  return config
})

customAxios.interceptors.response.use(
  (response) => {
    const config = response.config as RetriableRequestConfig
    if (config._authSessionId) assertCurrentSession(config._authSessionId)
    return response
  },

  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    if (originalRequest?._authSessionId) assertCurrentSession(originalRequest._authSessionId)
    if (axios.isCancel(error)) return Promise.reject(error)
    const apiError = enrichApiError(error)

    if (originalRequest && shouldRefreshAccessToken(error, originalRequest)) {
      originalRequest._retry = true

      const currentAccessToken = getStoredAccessToken()
      const requestAccessToken = getRequestAccessToken(originalRequest)

      if (
        requestAccessToken &&
        currentAccessToken &&
        requestAccessToken !== currentAccessToken
      ) {
        setAuthorizationHeader(originalRequest, currentAccessToken)

        return customAxios(originalRequest)
      }

      try {
        const sessionId = originalRequest._authSessionId!
        const refreshedTokens = await requestTokenRefresh(sessionId)
        assertCurrentSession(sessionId)
        setAuthorizationHeader(originalRequest, refreshedTokens.accessToken)

        return customAxios(originalRequest)
      } catch (refreshError) {
        assertCurrentSession(originalRequest._authSessionId!)
        if (shouldClearAuthAfterRefreshFailure(refreshError)) {
          clearStoredAuth()
        }

        return Promise.reject(apiError)
      }
    }

    return Promise.reject(apiError)
  }
)

export default customAxios
