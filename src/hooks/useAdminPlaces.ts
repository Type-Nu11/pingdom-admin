import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  deleteAdminPlace,
  getAdminPlace,
  getAdminPlaces,
  updateAdminPlaceBasicInformation,
  updateAdminPlaceCoordinates,
  updateAdminPlaceDiscoveryStatus,
  updateAdminPlaceGeocoding,
  updateAdminPlaceKakaoPlaceId,
  updateAdminPlaceOperatingSchedule,
  updateAdminPlaceOperatingStatus,
  updateAdminPlaceTouristInfo,
} from '../api/adminPlaceApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { logDebugError } from '../utils/debugLogger'
import { getPlaceCategoryLabel } from '../utils/placeCategory'
import { useAuth } from './useAuth'
import type {
  AdminPlaceCategory,
  AdminPlaceBasicInformationUpdateRequest,
  AdminPlaceCoordinatesUpdateRequest,
  AdminPlaceDeleteErrorResponse,
  AdminPlaceDetail,
  AdminPlaceDetailErrorResponse,
  AdminPlaceDiscoveryStatusUpdateRequest,
  AdminPlaceItem,
  AdminPlaceGeocodingUpdateRequest,
  AdminPlaceKakaoPlaceIdUpdateRequest,
  AdminPlaceListErrorResponse,
  AdminPlaceListRequest,
  AdminPlaceListSortParam,
  AdminPlaceOperatingScheduleUpdateRequest,
  AdminPlaceOperatingStatusUpdateRequest,
  AdminPlaceTouristInfoUpdateRequest,
  AdminPlaceUpdateErrorResponse,
} from '../types/adminPlace.types'

const DEFAULT_ADMIN_PLACE_PAGE = 1
const DEFAULT_ADMIN_PLACE_LIMIT = 10
const DEFAULT_ADMIN_PLACE_SORT_PARAM: AdminPlaceListSortParam = 'LATEST'
const ADMIN_PLACE_ERROR_MESSAGE = '장소 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_PLACE_UPDATE_ERROR_MESSAGE = '장소 운영 정보를 수정하는 중 오류가 발생했습니다.'
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
  PLACE_EVENT_CONNECTED:
    '연결된 기간형 이벤트가 있어 장소를 삭제할 수 없습니다.',
  PLACE_CHECK_IN_CONNECTED:
    '연결된 체크인 이력이 있어 장소를 삭제할 수 없습니다.',
  PLACE_SCOUT_FIELD_REPORT_CONNECTED:
    '연결된 Scout 현장 제보가 있어 장소를 삭제할 수 없습니다.',
  PLACE_KAKAO_PLACE_ID_CONFLICT:
    '이미 다른 장소에 연결된 Kakao place id입니다.',
}

type AdminPlaceApiErrorResponse =
  | AdminPlaceListErrorResponse
  | AdminPlaceDetailErrorResponse
  | AdminPlaceDeleteErrorResponse
  | AdminPlaceUpdateErrorResponse

type PlaceUpdateAction =
  | 'basic-information'
  | 'operating-status'
  | 'operating-schedule'
  | 'discovery-status'
  | 'tourist-info'
  | 'kakao-place-id'
  | 'coordinates'
  | 'geocoding'

type PlaceUpdateState<T> = Record<PlaceUpdateAction, T>

const EMPTY_PLACE_UPDATE_IDS: PlaceUpdateState<number | null> = {
  'basic-information': null,
  'operating-status': null,
  'operating-schedule': null,
  'discovery-status': null,
  'tourist-info': null,
  'kakao-place-id': null,
  coordinates: null,
  geocoding: null,
}

const EMPTY_PLACE_UPDATE_ERRORS: PlaceUpdateState<string> = {
  'basic-information': '',
  'operating-status': '',
  'operating-schedule': '',
  'discovery-status': '',
  'tourist-info': '',
  'kakao-place-id': '',
  coordinates: '',
  geocoding: '',
}

type LatestAdminPlaceListRequest = {
  page: number
  limit: number
  sortParam: AdminPlaceListSortParam
  keyword: string
  category?: AdminPlaceCategory
}

function hasOwnRequestProperty(
  request: AdminPlaceListRequest,
  property: keyof AdminPlaceListRequest
) {
  return Object.prototype.hasOwnProperty.call(request, property)
}

function getAdminPlaceErrorMessage(
  error: unknown,
  fallbackMessage = ADMIN_PLACE_ERROR_MESSAGE
) {
  if (!isApiError<AdminPlaceApiErrorResponse>(error)) {
    return fallbackMessage
  }

  return getAuthErrorMessage(error, {
    fallbackMessage,
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
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')
  const [updateErrorMessages, setUpdateErrorMessages] =
    useState<PlaceUpdateState<string>>(EMPTY_PLACE_UPDATE_ERRORS)
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  useAutoDismissMessage(actionSuccessMessage, setActionSuccessMessage)
  const [placeDetail, setPlaceDetail] = useState<AdminPlaceDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [deletingPlaceId, setDeletingPlaceId] = useState<number | null>(null)
  const [updatingPlaceIds, setUpdatingPlaceIds] =
    useState<PlaceUpdateState<number | null>>(EMPTY_PLACE_UPDATE_IDS)
  const latestRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const deletingPlaceIdRef = useRef<number | null>(null)
  const updatingPlaceIdsRef = useRef<PlaceUpdateState<number | null>>({
    ...EMPTY_PLACE_UPDATE_IDS,
  })
  const actionSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const latestListRequestRef = useRef<LatestAdminPlaceListRequest>({
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

  const clearUpdateErrorMessage = useCallback((action: PlaceUpdateAction) => {
    setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
  }, [])

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
    clearActionSuccessMessage()

    const nextRequest = {
      page: request.page ?? latestListRequestRef.current.page,
      limit: request.limit ?? latestListRequestRef.current.limit,
      sortParam: request.sortParam ?? latestListRequestRef.current.sortParam,
      keyword: request.keyword ?? latestListRequestRef.current.keyword,
      category: hasOwnRequestProperty(request, 'category')
        ? request.category
        : latestListRequestRef.current.category,
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
          category: nextRequest.category,
        }
      }

      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
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
    async (placeId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId

      setIsDetailLoading(true)
      setPlaceDetail(null)
      setDetailErrorMessage('')

      try {
        const data = await getAdminPlace(placeId)

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
      setDeleteErrorMessage('')
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
          setDeleteErrorMessage('장소는 삭제됐지만 목록을 다시 불러오지 못했습니다.')
        }

        showActionSuccessMessage(`장소 #${placeId}을 삭제했습니다.`)

        return true
      } catch (error) {
        clearActionSuccessMessage()
        setDeleteErrorMessage(getAdminPlaceErrorMessage(error))

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

  const updatePlaceBasicInformation = useCallback(
    async (placeId: number, payload: AdminPlaceBasicInformationUpdateRequest) => {
      const action: PlaceUpdateAction = 'basic-information'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceBasicInformation(placeId, payload)
        const basicInformationPatch = {
          name: data.name,
          category: data.category,
          categoryName: getPlaceCategoryLabel({ category: data.category }),
        }

        setPlaces((current) =>
          current.map((place) =>
            place.id === placeId ? { ...place, ...basicInformationPatch } : place
          )
        )
        setPlaceDetail((current) =>
          current?.id === placeId ? { ...current, ...basicInformationPatch } : current
        )
        showActionSuccessMessage(data.message || '장소 기본 정보를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            '장소 기본 정보를 수정하지 못했습니다.'
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 기본 정보 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceOperatingStatus = useCallback(
    async (placeId: number, payload: AdminPlaceOperatingStatusUpdateRequest) => {
      const action: PlaceUpdateAction = 'operating-status'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceOperatingStatus(placeId, payload)

        setPlaces((prevPlaces) =>
          prevPlaces.map((place) =>
            place.id === placeId
              ? {
                  ...place,
                  operatingStatus: data.operatingStatus,
                  operatingStatusCheckedAt: data.operatingStatusCheckedAt,
                }
              : place
          )
        )
        setPlaceDetail((prevPlaceDetail) =>
          prevPlaceDetail?.id === placeId
            ? {
                ...prevPlaceDetail,
                operatingStatus: data.operatingStatus,
                operatingStatusCheckedAt: data.operatingStatusCheckedAt,
              }
            : prevPlaceDetail
        )
        showActionSuccessMessage(data.message || '장소 운영 상태를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            ADMIN_PLACE_UPDATE_ERROR_MESSAGE
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 운영 상태 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceOperatingSchedule = useCallback(
    async (placeId: number, payload: AdminPlaceOperatingScheduleUpdateRequest) => {
      const action: PlaceUpdateAction = 'operating-schedule'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceOperatingSchedule(placeId, payload)

        setPlaceDetail((prevPlaceDetail) =>
          prevPlaceDetail?.id === placeId
            ? {
                ...prevPlaceDetail,
                regularHours: data.regularHours,
                operatingExceptions: data.exceptions,
              }
            : prevPlaceDetail
        )
        showActionSuccessMessage(data.message || '장소 영업시간을 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            ADMIN_PLACE_UPDATE_ERROR_MESSAGE
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 영업시간 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceDiscoveryStatus = useCallback(
    async (placeId: number, payload: AdminPlaceDiscoveryStatusUpdateRequest) => {
      const action: PlaceUpdateAction = 'discovery-status'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceDiscoveryStatus(placeId, payload)

        setPlaces((prevPlaces) =>
          prevPlaces.map((place) =>
            place.id === placeId
              ? {
                  ...place,
                  discoveryStatus: data.discoveryStatus,
                }
              : place
          )
        )
        setPlaceDetail((prevPlaceDetail) =>
          prevPlaceDetail?.id === placeId
            ? {
                ...prevPlaceDetail,
                discoveryStatus: data.discoveryStatus,
              }
            : prevPlaceDetail
        )
        showActionSuccessMessage(data.message || '장소 탐색 노출 상태를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            ADMIN_PLACE_UPDATE_ERROR_MESSAGE
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 탐색 노출 상태 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceTouristInfo = useCallback(
    async (placeId: number, payload: AdminPlaceTouristInfoUpdateRequest) => {
      const action: PlaceUpdateAction = 'tourist-info'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceTouristInfo(placeId, payload)

        setPlaces((current) =>
          current.map((place) =>
            place.id === placeId
              ? {
                  ...place,
                  englishName: data.englishName,
                  touristSummary: data.touristSummary,
                  touristCategories: data.touristCategories,
                }
              : place
          )
        )
        setPlaceDetail((current) =>
          current?.id === placeId
            ? {
                ...current,
                englishName: data.englishName,
                touristSummary: data.touristSummary,
                touristCategories: data.touristCategories,
              }
            : current
        )
        showActionSuccessMessage(data.message || '장소 방문객 안내 정보를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            ADMIN_PLACE_UPDATE_ERROR_MESSAGE
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 방문객 안내 정보 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceKakaoPlaceId = useCallback(
    async (placeId: number, payload: AdminPlaceKakaoPlaceIdUpdateRequest) => {
      const action: PlaceUpdateAction = 'kakao-place-id'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceKakaoPlaceId(placeId, payload)

        setPlaceDetail((current) =>
          current?.id === placeId
            ? { ...current, kakaoPlaceId: data.kakaoPlaceId || null }
            : current
        )
        showActionSuccessMessage(data.message || 'Kakao place id를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            'Kakao place id를 수정하지 못했습니다.'
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 Kakao place id 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceCoordinates = useCallback(
    async (placeId: number, payload: AdminPlaceCoordinatesUpdateRequest) => {
      const action: PlaceUpdateAction = 'coordinates'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceCoordinates(placeId, payload)
        const coordinatePatch = {
          latitude: data.latitude,
          longitude: data.longitude,
        }

        setPlaces((current) =>
          current.map((place) =>
            place.id === placeId ? { ...place, ...coordinatePatch } : place
          )
        )
        setPlaceDetail((current) =>
          current?.id === placeId ? { ...current, ...coordinatePatch } : current
        )
        showActionSuccessMessage(data.message || '장소 좌표를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(error, '장소 좌표를 수정하지 못했습니다.'),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 좌표 수정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
  )

  const updatePlaceGeocoding = useCallback(
    async (placeId: number, payload: AdminPlaceGeocodingUpdateRequest) => {
      const action: PlaceUpdateAction = 'geocoding'
      if (updatingPlaceIdsRef.current[action] !== null) {
        return false
      }

      updatingPlaceIdsRef.current[action] = placeId
      setUpdatingPlaceIds((current) => ({ ...current, [action]: placeId }))
      setUpdateErrorMessages((current) => ({ ...current, [action]: '' }))
      clearActionSuccessMessage()

      try {
        const data = await updateAdminPlaceGeocoding(placeId, payload)
        const geocodingPatch = {
          address: data.address,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          postalCode: data.postalCode,
          geocodingSource: data.geocodingSource,
          latitude: data.latitude,
          longitude: data.longitude,
        }

        setPlaces((current) =>
          current.map((place) =>
            place.id === placeId ? { ...place, ...geocodingPatch } : place
          )
        )
        setPlaceDetail((current) =>
          current?.id === placeId ? { ...current, ...geocodingPatch } : current
        )
        showActionSuccessMessage(data.message || '장소 주소와 좌표를 저장했습니다.')

        return true
      } catch (error) {
        setUpdateErrorMessages((current) => ({
          ...current,
          [action]: getAdminPlaceErrorMessage(
            error,
            '장소 주소와 좌표를 수정하지 못했습니다.'
          ),
        }))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 주소와 좌표 보정 실패', error)

        return false
      } finally {
        updatingPlaceIdsRef.current[action] = null
        setUpdatingPlaceIds((current) => ({ ...current, [action]: null }))
      }
    },
    [clearActionSuccessMessage, clearAuth, showActionSuccessMessage]
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
    deleteErrorMessage,
    updateErrorMessages,
    actionSuccessMessage,
    placeDetail,
    isDetailLoading,
    detailErrorMessage,
    deletingPlaceId,
    updatingPlaceIds,
    fetchAdminPlaces,
    fetchAdminPlaceDetail,
    clearPlaceDetail,
    clearUpdateErrorMessage,
    deletePlace,
    updatePlaceBasicInformation,
    updatePlaceDiscoveryStatus,
    updatePlaceOperatingStatus,
    updatePlaceOperatingSchedule,
    updatePlaceTouristInfo,
    updatePlaceKakaoPlaceId,
    updatePlaceCoordinates,
    updatePlaceGeocoding,
  }
}
