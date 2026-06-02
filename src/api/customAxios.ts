import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { RefreshTokenResponse } from '../types/auth.types'
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredRefreshToken,
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
}

export function isApiError<T = unknown>(error: unknown): error is ApiError<T> {
  return axios.isAxiosError(error)
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN_REFRESH_API_PATH = '/auth/token/refresh'
let tokenRefreshRequest: Promise<RefreshTokenResponse> | null = null

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
})

const AUTH_EXCLUDED_PATHS = ['/auth/admin/login', TOKEN_REFRESH_API_PATH]

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
      getStoredRefreshToken()
  )
}

async function requestTokenRefresh() {
  const refreshToken = getStoredRefreshToken()

  if (!refreshToken) {
    throw new Error('리프레시 토큰이 없습니다.')
  }

  tokenRefreshRequest ??= axios
    .post<RefreshTokenResponse>(
      TOKEN_REFRESH_API_PATH,
      {
        refreshToken,
      },
      {
        baseURL: API_BASE_URL,
        timeout: 10000,
      }
    )
    .then(({ data }) => {
      saveRefreshedAuthTokens(data)

      return data
    })
    .finally(() => {
      tokenRefreshRequest = null
    })

  return tokenRefreshRequest
}

function shouldClearAuthAfterRefreshFailure(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return true
  }

  const status = error.response?.status

  return Boolean(error.response && (typeof status !== 'number' || status < 500))
}

customAxios.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken()

  if (accessToken && shouldAttachAccessToken(config.url)) {
    setAuthorizationHeader(config, accessToken)
  }

  return config
})

customAxios.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const apiError = enrichApiError(error)
    const originalRequest = error.config as RetriableRequestConfig | undefined

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
        const refreshedTokens = await requestTokenRefresh()
        setAuthorizationHeader(originalRequest, refreshedTokens.accessToken)

        return customAxios(originalRequest)
      } catch (refreshError) {
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
