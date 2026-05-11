import axios, { AxiosError } from 'axios'

export type ApiErrorCategory =
  | 'timeout'
  | 'network'
  | 'bad-request'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'server'
  | 'unknown'

export type ApiError<T = unknown> = AxiosError<T> & {
  category?: ApiErrorCategory
}

export function isApiError<T = unknown>(error: unknown): error is ApiError<T> {
  return axios.isAxiosError(error)
}

function classifyApiError(error: AxiosError): ApiErrorCategory {
  const status = error.response?.status

  if (error.code === 'ECONNABORTED') {
    return 'timeout'
  }

  if (!error.response) {
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
    default:
      if (typeof status === 'number' && status >= 500) {
        return 'server'
      }

      return 'unknown'
  }
}

const customAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 10000,
})

customAxios.interceptors.response.use(
  (response) => response,

  (error: AxiosError) => {
    const apiError = error as ApiError
    apiError.category = classifyApiError(error)

    return Promise.reject(apiError)
  }
)

export default customAxios
