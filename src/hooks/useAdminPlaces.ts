import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAdminPlace, getAdminPlace, getAdminPlaces } from '../api/adminPlaceApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'
import type {
  AdminPlaceDeleteErrorResponse,
  AdminPlaceDetail,
  AdminPlaceDetailErrorResponse,
  AdminPlaceDetailRequest,
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
  ACCESS_DENIED: '관리자 권한이 필요합니다.',
  PLACE_NOT_FOUND: '장소를 찾을 수 없습니다.',
}

type AdminPlaceApiErrorResponse =
  | AdminPlaceListErrorResponse
  | AdminPlaceDetailErrorResponse
  | AdminPlaceDeleteErrorResponse

function getAdminPlaceErrorMessage(error: unknown) {
  if (!isApiError<AdminPlaceApiErrorResponse>(error)) {
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
    isApiError<AdminPlaceApiErrorResponse>(error) &&
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
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  const [placeDetail, setPlaceDetail] = useState<AdminPlaceDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [deletingPlaceId, setDeletingPlaceId] = useState<number | null>(null)
  const latestRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const deletingPlaceIdRef = useRef<number | null>(null)
  const actionSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const latestListRequestRef = useRef<Required<AdminPlaceListRequest>>({
    page: initialPage,
    limit,
    sortParam,
    keyword: '',
  })

  const clearActionSuccessTimeout = useCallback(() => {
    if (!actionSuccessTimeoutRef.current) {
      return
    }

    clearTimeout(actionSuccessTimeoutRef.current)
    actionSuccessTimeoutRef.current = null
  }, [])

  const clearActionSuccessMessage = useCallback(() => {
    clearActionSuccessTimeout()
    setActionSuccessMessage('')
  }, [clearActionSuccessTimeout])

  const showActionSuccessMessage = useCallback(
    (message: string) => {
      clearActionSuccessTimeout()
      setActionSuccessMessage(message)

      actionSuccessTimeoutRef.current = setTimeout(() => {
        actionSuccessTimeoutRef.current = null
        setActionSuccessMessage('')
      }, 5000)
    },
    [clearActionSuccessTimeout]
  )

  const fetchAdminPlaces = useCallback(async (request: AdminPlaceListRequest = {}) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    setIsError(false)
    setErrorMessage('')
    setActionErrorMessage('')
    clearActionSuccessMessage()

    const nextRequest = {
      page: request.page ?? latestListRequestRef.current.page,
      limit: request.limit ?? latestListRequestRef.current.limit,
      sortParam: request.sortParam ?? latestListRequestRef.current.sortParam,
      keyword: request.keyword ?? latestListRequestRef.current.keyword,
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
          keyword: nextRequest.keyword,
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

      logDebugError('관리자 장소 목록 조회 실패', error)

      return false
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [clearActionSuccessMessage, clearAuth])

  const clearPlaceDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setPlaceDetail(null)
    setIsDetailLoading(false)
    setDetailErrorMessage('')
  }, [])

  const fetchAdminPlaceDetail = useCallback(
    async (placeId: number, request: AdminPlaceDetailRequest = {}) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId

      setIsDetailLoading(true)
      setPlaceDetail(null)
      setDetailErrorMessage('')
      setActionErrorMessage('')

      try {
        const data = await getAdminPlace(placeId, request)

        if (requestId === latestDetailRequestIdRef.current) {
          setPlaceDetail(data)
        }

        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setPlaceDetail(null)
          setDetailErrorMessage(getAdminPlaceErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        logDebugError('관리자 장소 상세 조회 실패', error)

        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const deletePlace = useCallback(
    async (placeId: number) => {
      if (deletingPlaceIdRef.current !== null) {
        return false
      }

      deletingPlaceIdRef.current = placeId
      setActionErrorMessage('')
      clearActionSuccessMessage()

      try {
        setDeletingPlaceId(placeId)

        await deleteAdminPlace(placeId)
        setPlaces((prevPlaces) =>
          prevPlaces.filter((place) => place.id !== placeId)
        )
        setPlaceDetail((prevPlaceDetail) =>
          prevPlaceDetail?.id === placeId ? null : prevPlaceDetail
        )

        const isLastItemOnPage = places.length === 1
        const targetPage = isLastItemOnPage && page > 1 ? page - 1 : page
        const isRefreshSuccess = await fetchAdminPlaces({ page: targetPage })

        if (!isRefreshSuccess) {
          setActionErrorMessage('장소는 삭제됐지만 목록을 다시 불러오지 못했습니다.')
        }

        showActionSuccessMessage(`장소 #${placeId}을 삭제했습니다.`)

        return true
      } catch (error) {
        clearActionSuccessMessage()
        setActionErrorMessage(getAdminPlaceErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 삭제 실패', error)

        return false
      } finally {
        if (deletingPlaceIdRef.current === placeId) {
          deletingPlaceIdRef.current = null
          setDeletingPlaceId(null)
        }
      }
    },
    [
      clearActionSuccessMessage,
      clearAuth,
      fetchAdminPlaces,
      page,
      places.length,
      showActionSuccessMessage,
    ]
  )

  useEffect(() => {
    void fetchAdminPlaces()
  }, [fetchAdminPlaces])

  useEffect(() => {
    return () => {
      clearActionSuccessTimeout()
    }
  }, [clearActionSuccessTimeout])

  return {
    places,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    placeDetail,
    isDetailLoading,
    detailErrorMessage,
    deletingPlaceId,
    fetchAdminPlaces,
    fetchAdminPlaceDetail,
    clearPlaceDetail,
    deletePlace,
  }
}
