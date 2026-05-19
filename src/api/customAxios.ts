import axios, { AxiosError } from 'axios'
import { AUTH_STORAGE_KEYS } from '../constants/auth'

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

export function isApiError<T = unknown>(error: unknown): error is ApiError<T> {
  return axios.isAxiosError(error)
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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

const AUTH_EXCLUDED_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/email/verify',
  '/auth/token/refresh',
]

function shouldAttachAccessToken(url = '') {
  return !AUTH_EXCLUDED_PATHS.some((path) => url.startsWith(path))
}

customAxios.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)

  if (accessToken && shouldAttachAccessToken(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

customAxios.interceptors.response.use(
  (response) => response,

  (error: AxiosError) => {
    const apiError = error as ApiError
    apiError.category = classifyApiError(error)
    apiError.status = error.response?.status

    return Promise.reject(apiError)
  }
)

export default customAxios
