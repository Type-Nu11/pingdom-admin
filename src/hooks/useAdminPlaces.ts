import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminPlaces } from '../api/adminPlaceApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { useAuth } from './useAuth'
import type {
  AdminPlaceItem,
  AdminPlaceListErrorResponse,
  AdminPlaceListRequest,
  AdminPlaceListSortParam,
} from '../types/adminPlace.types'

const DEFAULT_ADMIN_PLACE_PAGE = 1
const DEFAULT_ADMIN_PLACE_LIMIT = 10
const DEFAULT_ADMIN_PLACE_SORT_PARAM: AdminPlaceListSortParam = 'LATEST'
const ADMIN_PLACE_ERROR_MESSAGE = '장소 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_PLACE_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const ADMIN_PLACE_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  PLACE_NOT_FOUND: '장소를 찾을 수 없습니다.',
}

function getAdminPlaceErrorMessage(error: unknown) {
  if (!isApiError<AdminPlaceListErrorResponse>(error)) {
    return ADMIN_PLACE_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_PLACE_ERROR_MESSAGE,
    codeMessages: ADMIN_PLACE_CODE_MESSAGES,
    categoryMessages: ADMIN_PLACE_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPlaceListErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

interface UseAdminPlacesOptions {
  initialPage?: number
  limit?: number
  sortParam?: AdminPlaceListSortParam
}

export function useAdminPlaces({
  initialPage = DEFAULT_ADMIN_PLACE_PAGE,
  limit = DEFAULT_ADMIN_PLACE_LIMIT,
  sortParam = DEFAULT_ADMIN_PLACE_SORT_PARAM,
}: UseAdminPlacesOptions = {}) {
  const { clearAuth } = useAuth()
  const [places, setPlaces] = useState<AdminPlaceItem[]>([])
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const latestRequestIdRef = useRef(0)
  const latestListRequestRef = useRef<Required<AdminPlaceListRequest>>({
    page: initialPage,
    limit,
    sortParam,
  })

  const fetchAdminPlaces = useCallback(async (request: AdminPlaceListRequest = {}) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    setIsError(false)
    setErrorMessage('')

    const nextRequest = {
      page: request.page ?? latestListRequestRef.current.page,
      limit: request.limit ?? latestListRequestRef.current.limit,
      sortParam: request.sortParam ?? latestListRequestRef.current.sortParam,
    }

    try {
      setIsLoading(true)

      const data = await getAdminPlaces(nextRequest)

      if (requestId === latestRequestIdRef.current) {
        setPlaces(data.places)
        setPage(data.page)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
        latestListRequestRef.current = {
          page: data.page,
          limit: data.limit,
          sortParam: nextRequest.sortParam,
        }
      }

      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        setPlaces([])
        setIsError(true)
        setErrorMessage(getAdminPlaceErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      console.error('관리자 장소 목록 조회 실패', error)

      return false
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [clearAuth])

  useEffect(() => {
    void fetchAdminPlaces()
  }, [fetchAdminPlaces])

  return {
    places,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    fetchAdminPlaces,
  }
}
