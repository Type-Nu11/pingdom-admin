import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import {
  AdminDatePicker,
  AdminTimePicker,
} from '../../components/common/AdminDateTimePicker'
import type {
  KakaoMapHandle,
  KakaoMapMarker,
} from '../../components/map/KakaoMap'
import SortDropdown from '../../components/common/SortDropdown'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaces } from '../../hooks/useAdminPlaces'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPlaceDayOfWeek,
  AdminPlaceDetail,
  AdminPlaceDiscoveryStatus,
  AdminPlaceItem,
  AdminPlaceListSortParam,
  AdminPlaceOperatingException,
  AdminPlaceOperatingStatus,
  AdminPlaceRegularOperatingHour,
} from '../../types/adminPlace.types'
import {
  getPlaceCategoryIconName,
  getPlaceCategoryLabel,
} from '../../utils/placeCategory'
import * as S from './PlaceManagePage.styles'

const ADMIN_PLACE_PAGE_SIZE = 10
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 3
const PLACE_DETAIL_POST_PREVIEW_LIMIT = 3
const PLACE_SEARCH_DEBOUNCE_MS = 300
const DEFAULT_PLACE_SORT_PARAM: AdminPlaceListSortParam = 'LATEST'
const PLACE_SORT_OPTIONS = [
  { value: 'LATEST', label: '최신순' },
  { value: 'OLDEST', label: '오래된순' },
  { value: 'LEVEL_DESC', label: '레벨 높은순' },
]

const PLACE_OPERATING_STATUS_OPTIONS: Array<{
  value: AdminPlaceOperatingStatus
  label: string
}> = [
  { value: 'OPERATING', label: '운영 중' },
  { value: 'TEMPORARILY_CLOSED', label: '임시 휴업' },
  { value: 'PERMANENTLY_CLOSED', label: '영구 폐업' },
]

const PLACE_DISCOVERY_STATUS_OPTIONS: Array<{
  value: AdminPlaceDiscoveryStatus
  label: string
}> = [
  { value: 'VISIBLE', label: '탐색 노출' },
  { value: 'HIDDEN', label: '탐색 숨김' },
]

const PLACE_OPERATING_STATUS_DESCRIPTIONS: Record<AdminPlaceOperatingStatus, string> = {
  OPERATING: '앱 장소 조회와 추천에 계속 노출됩니다.',
  TEMPORARILY_CLOSED: '일시적인 휴업 상태로 관리합니다.',
  PERMANENTLY_CLOSED: '앱 장소 조회와 추천에서 숨겨집니다.',
}

const PLACE_DISCOVERY_STATUS_DESCRIPTIONS: Record<AdminPlaceDiscoveryStatus, string> = {
  VISIBLE: '공개 탐색과 자동완성, 추천 후보에 노출합니다.',
  HIDDEN: '공개 탐색, 자동완성, 북마크 목록, 추천 후보에서 제외합니다.',
}

const PLACE_DAY_OF_WEEK_OPTIONS: Array<{
  value: AdminPlaceDayOfWeek
  label: string
}> = [
  { value: 'MONDAY', label: '월요일' },
  { value: 'TUESDAY', label: '화요일' },
  { value: 'WEDNESDAY', label: '수요일' },
  { value: 'THURSDAY', label: '목요일' },
  { value: 'FRIDAY', label: '금요일' },
  { value: 'SATURDAY', label: '토요일' },
  { value: 'SUNDAY', label: '일요일' },
]

interface RegularOperatingDayDraft {
  dayOfWeek: AdminPlaceDayOfWeek
  hours: OperatingTimeRangeDraft[]
}

interface OperatingTimeRangeDraft {
  id: string
  opensAt: string
  closesAt: string
}

interface OperatingExceptionDraft {
  id: string
  date: string
  closed: boolean
  hours: OperatingTimeRangeDraft[]
}

let operatingScheduleDraftId = 0

function createOperatingScheduleDraftId() {
  operatingScheduleDraftId += 1

  return `operating-schedule-${operatingScheduleDraftId}`
}
function hasValidCoordinate(place: AdminPlaceItem) {
  return (
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number' &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  )
}

function formatCoordinate(place: AdminPlaceItem) {
  if (!hasValidCoordinate(place)) {
    return '좌표 정보 없음'
  }

  return `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`
}

function formatOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '-'
}

function getPlaceLevel(place: AdminPlaceItem) {
  return formatOptionalNumber(place.placeGrowth?.level)
}

function getPlacePhotoCount(place: AdminPlaceItem) {
  return formatOptionalNumber(place.placeGrowth?.photoCount)
}

function getPlaceDisplayName(place: AdminPlaceItem) {
  const name = place.name?.trim()
  const address = place.address?.trim()

  if (!name || name === address) {
    return '이름 없는 장소'
  }

  return name
}

function getPlaceRegistrantLabel(place: AdminPlaceItem) {
  if (place.registrant) {
    return place.registrant
  }

  if (typeof place.userId === 'number' && Number.isFinite(place.userId)) {
    return `ID ${place.userId}`
  }

  return '등록자 정보 없음'
}

function getDetailGrowthProgress(placeDetail: AdminPlaceDetail) {
  const progressPercent = placeDetail.placeGrowth?.progressPercent

  if (typeof progressPercent !== 'number' || !Number.isFinite(progressPercent)) {
    return null
  }

  return Math.min(Math.max(Math.round(progressPercent), 0), 100)
}

function getDetailGrowthProgressLabel(placeDetail: AdminPlaceDetail) {
  const progressPercent = getDetailGrowthProgress(placeDetail)

  return progressPercent === null ? '-' : `${progressPercent}%`
}

function formatPlacePostDate(value: string) {
  if (!value) {
    return '작성일 정보 없음'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatPlacePostHiddenReason(hiddenReason?: string | null) {
  if (hiddenReason === 'ADMIN_HIDDEN') {
    return '관리자 숨김'
  }

  return '숨김 처리됨'
}

function formatOperatingStatus(status?: AdminPlaceOperatingStatus) {
  return (
    PLACE_OPERATING_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    '확인 전'
  )
}

function getOperatingStatusTone(status?: AdminPlaceOperatingStatus) {
  if (status === 'PERMANENTLY_CLOSED') {
    return 'danger'
  }

  if (status === 'TEMPORARILY_CLOSED') {
    return 'notice'
  }

  return 'normal'
}

function formatDiscoveryStatus(status?: AdminPlaceDiscoveryStatus) {
  return (
    PLACE_DISCOVERY_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    '상태 확인 전'
  )
}

function getDiscoveryStatusTone(status?: AdminPlaceDiscoveryStatus) {
  return status === 'HIDDEN' ? 'muted' : 'normal'
}

function formatOperatingStatusCheckedAt(value?: string | null) {
  if (!value) {
    return '확인 시각 정보 없음'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getTimeInputValue(value?: string) {
  if (!value) {
    return ''
  }

  const match = value.match(/^(\d{2}:\d{2})/)

  return match?.[1] ?? ''
}

function getApiTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function getDayOfWeekLabel(dayOfWeek: AdminPlaceDayOfWeek) {
  return (
    PLACE_DAY_OF_WEEK_OPTIONS.find((option) => option.value === dayOfWeek)?.label ??
    dayOfWeek
  )
}

function createOperatingHourDrafts(hours: AdminPlaceRegularOperatingHour[] = []) {
  const hoursByDay = new Map<
    AdminPlaceDayOfWeek,
    AdminPlaceRegularOperatingHour[]
  >()

  hours.forEach((hour) => {
    const dayHours = hoursByDay.get(hour.dayOfWeek) ?? []

    dayHours.push(hour)
    hoursByDay.set(hour.dayOfWeek, dayHours)
  })

  return PLACE_DAY_OF_WEEK_OPTIONS.map(({ value: dayOfWeek }) => {
    const dayHours = hoursByDay.get(dayOfWeek) ?? []

    return {
      dayOfWeek,
      hours: dayHours.map((hour) => ({
        id: createOperatingScheduleDraftId(),
        opensAt: getTimeInputValue(hour.opensAt) || '09:00',
        closesAt: getTimeInputValue(hour.closesAt) || '18:00',
      })),
    }
  })
}

function createOperatingExceptionDraft(
  exception?: AdminPlaceOperatingException
): OperatingExceptionDraft {
  const hours = (exception?.hours ?? []).map((hour) => ({
    id: createOperatingScheduleDraftId(),
    opensAt: getTimeInputValue(hour.opensAt) || '09:00',
    closesAt: getTimeInputValue(hour.closesAt) || '18:00',
  }))

  return {
    id: createOperatingScheduleDraftId(),
    date: exception?.date ?? '',
    closed: exception?.closed ?? true,
    hours:
      exception?.closed || hours.length > 0
        ? hours
        : [
            {
              id: createOperatingScheduleDraftId(),
              opensAt: '09:00',
              closesAt: '18:00',
            },
          ],
  }
}

function getOperatingScheduleValidationMessage(
  regularHours: RegularOperatingDayDraft[],
  exceptions: OperatingExceptionDraft[],
  reason: string
) {
  if (!reason.trim()) {
    return '수정 사유를 입력해주세요.'
  }

  const hasInvalidRegularHour = regularHours.some((day) =>
    day.hours.some((hour) => !hour.opensAt || !hour.closesAt)
  )

  if (hasInvalidRegularHour) {
    return '영업하는 요일의 시작 시간과 종료 시간을 모두 입력해주세요.'
  }

  const dates = new Set<string>()

  for (const exception of exceptions) {
    if (!exception.date) {
      return '예외 일정의 날짜를 입력해주세요.'
    }

    if (dates.has(exception.date)) {
      return '같은 날짜의 예외 일정은 한 번만 등록할 수 있습니다.'
    }

    dates.add(exception.date)

    if (
      !exception.closed &&
      (exception.hours.length === 0 ||
        exception.hours.some((hour) => !hour.opensAt || !hour.closesAt))
    ) {
      return '대체 영업일의 시작 시간과 종료 시간을 모두 입력해주세요.'
    }
  }

  return ''
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages < 1) {
    return []
  }

  const visiblePageCount = Math.min(MAX_VISIBLE_PAGE_NUMBER_COUNT, totalPages)
  const sidePageCount = Math.floor(visiblePageCount / 2)
  let startPage = Math.max(1, currentPage - sidePageCount)
  let endPage = Math.min(totalPages, startPage + visiblePageCount - 1)

  startPage = Math.max(1, endPage - visiblePageCount + 1)
  endPage = Math.min(totalPages, startPage + visiblePageCount - 1)

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  )
}

function PlaceManagePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const mapRef = useRef<KakaoMapHandle | null>(null)
  const mapPanelRef = useRef<HTMLElement | null>(null)
  const placeDetailPanelRef = useRef<HTMLElement | null>(null)
  const placeListRef = useRef<HTMLDivElement | null>(null)
  const isSearchEffectReadyRef = useRef(false)
  const latestSortParamRef = useRef(DEFAULT_PLACE_SORT_PARAM)
  const shouldSkipNextSearchEffectRef = useRef(false)
  const searchTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<AdminPlaceItem | null>(null)
  const [isPlacePanelCollapsed, setIsPlacePanelCollapsed] = useState(false)
  const [deleteConfirmPlace, setDeleteConfirmPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [hasDeleteConfirmAttempted, setHasDeleteConfirmAttempted] =
    useState(false)
  const [operatingStatusEditPlace, setOperatingStatusEditPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [operatingStatusDraft, setOperatingStatusDraft] =
    useState<AdminPlaceOperatingStatus>('OPERATING')
  const [operatingStatusReason, setOperatingStatusReason] = useState('')
  const [operatingStatusFormError, setOperatingStatusFormError] = useState('')
  const [discoveryStatusEditPlace, setDiscoveryStatusEditPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [discoveryStatusDraft, setDiscoveryStatusDraft] =
    useState<AdminPlaceDiscoveryStatus>('VISIBLE')
  const [discoveryStatusReason, setDiscoveryStatusReason] = useState('')
  const [discoveryStatusFormError, setDiscoveryStatusFormError] = useState('')
  const [operatingScheduleEditPlace, setOperatingScheduleEditPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [regularHourDrafts, setRegularHourDrafts] = useState<
    RegularOperatingDayDraft[]
  >([])
  const [operatingExceptionDrafts, setOperatingExceptionDrafts] = useState<
    OperatingExceptionDraft[]
  >([])
  const [operatingScheduleReason, setOperatingScheduleReason] = useState('')
  const [operatingScheduleFormError, setOperatingScheduleFormError] = useState('')
  const [selectedSortParam, setSelectedSortParam] = useState(DEFAULT_PLACE_SORT_PARAM)
  const [placeSearchQuery, setPlaceSearchQuery] = useState('')
  const {
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
    updatingPlaceId,
    updatingPlaceAction,
    fetchAdminPlaces,
    fetchAdminPlaceDetail,
    clearPlaceDetail,
    clearActionErrorMessage,
    deletePlace,
    updatePlaceDiscoveryStatus,
    updatePlaceOperatingStatus,
    updatePlaceOperatingSchedule,
  } = useAdminPlaces({
    limit: ADMIN_PLACE_PAGE_SIZE,
  })
  const safeTotalPages = Math.max(totalPages, 1)
  const visiblePageNumbers = getVisiblePageNumbers(page, safeTotalPages)
  const showEdgePageButtons = safeTotalPages > MAX_VISIBLE_PAGE_NUMBER_COUNT
  const placeKeyword = placeSearchQuery.trim()
  const showPagination = safeTotalPages > 1
  const hasActivePlaceFilter = placeKeyword.length > 0
  const isUpdatingList = isLoading && places.length > 0
  const pageStart = totalCount > 0 ? (page - 1) * ADMIN_PLACE_PAGE_SIZE + 1 : 0
  const pageEnd = totalCount > 0 ? pageStart + places.length - 1 : 0
  const pageRangeLabel =
    totalCount > 0
      ? `${pageStart.toLocaleString()}–${pageEnd.toLocaleString()} / ${totalCount.toLocaleString()}개`
      : '0개'
  const selectedPlaceHasCoordinate = selectedPlace
    ? hasValidCoordinate(selectedPlace)
    : false
  const isPlaceDetailOpen = selectedPlace !== null
  const isDeletingSelectedPlace =
    selectedPlace !== null && deletingPlaceId === selectedPlace.id
  const isOperatingStatusUnchanged =
    operatingStatusEditPlace?.operatingStatus === operatingStatusDraft
  const isDiscoveryStatusUnchanged =
    discoveryStatusEditPlace?.discoveryStatus === discoveryStatusDraft
  const detailGrowthProgress = placeDetail
    ? getDetailGrowthProgress(placeDetail)
    : null
  const detailGrowthProgressLabel = placeDetail
    ? getDetailGrowthProgressLabel(placeDetail)
    : '-'
  const detailPostPreviewItems = placeDetail
    ? placeDetail.posts.slice(0, PLACE_DETAIL_POST_PREVIEW_LIMIT)
    : []
  const shouldShowDetailPostAllAction = placeDetail
    ? placeDetail.postCount > PLACE_DETAIL_POST_PREVIEW_LIMIT
    : false
  const detailRegularHours = placeDetail?.regularHours ?? []
  const detailOperatingExceptions = placeDetail?.operatingExceptions ?? []
  const placeMapMarkers = useMemo<KakaoMapMarker[]>(
    () =>
      places.filter(hasValidCoordinate).map((place) => ({
        id: place.id,
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.name,
        category: place.category,
        categoryName: place.categoryName,
        level: place.placeGrowth?.level,
      })),
    [places]
  )
  const placeMapFitBoundsKey = useMemo(
    () =>
      placeMapMarkers
        .map((marker) => `${marker.id}:${marker.latitude}:${marker.longitude}`)
        .join('|'),
    [placeMapMarkers]
  )
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const handleOpenPostDetail = useCallback(
    (postId: number) => {
      navigate('/main', {
        state: {
          openPostId: postId,
        },
      })
    },
    [navigate]
  )

  const handleOpenPlacePosts = useCallback(
    (placeName: string) => {
      navigate('/main', {
        state: {
          postSearchKeyword: placeName,
        },
      })
    },
    [navigate]
  )

  const clearPendingPlaceSearch = useCallback(() => {
    if (!searchTimeoutRef.current) {
      return
    }

    window.clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = null
  }, [])

  const scrollPlaceListToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      placeListRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    })
  }, [])

  const handleClosePlaceDetail = useCallback(() => {
    setSelectedPlace(null)
    clearPlaceDetail()
  }, [clearPlaceDetail])

  const getSelectedPlaceMapOffsetX = useCallback(() => {
    const mapPanel = mapPanelRef.current
    const detailPanel = placeDetailPanelRef.current

    if (!isPlaceDetailOpen || !mapPanel || !detailPanel) {
      return 0
    }

    const mapRect = mapPanel.getBoundingClientRect()
    const detailRect = detailPanel.getBoundingClientRect()
    const coveredWidth = Math.min(
      mapRect.width,
      Math.max(0, detailRect.right - mapRect.left)
    )
    const remainingMapWidth = mapRect.width - coveredWidth

    if (coveredWidth <= 0 || remainingMapWidth < 240) {
      return 0
    }

    return coveredWidth / 2
  }, [isPlaceDetailOpen])

  const focusPlaceOnVisibleMap = useCallback(
    (place: AdminPlaceItem) => {
      if (!hasValidCoordinate(place)) {
        return
      }

      mapRef.current?.relayout()
      mapRef.current?.moveTo(place.latitude, place.longitude, {
        offsetX: getSelectedPlaceMapOffsetX(),
      })
    },
    [getSelectedPlaceMapOffsetX]
  )

  useEffect(() => {
    latestSortParamRef.current = selectedSortParam
  }, [selectedSortParam])

  useEffect(() => {
    if (!isSearchEffectReadyRef.current) {
      isSearchEffectReadyRef.current = true

      return
    }

    if (shouldSkipNextSearchEffectRef.current) {
      shouldSkipNextSearchEffectRef.current = false

      return
    }

    clearPendingPlaceSearch()

    const nextKeyword = placeSearchQuery.trim()
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTimeoutRef.current = null
      void fetchAdminPlaces({
        page: 1,
        sortParam: latestSortParamRef.current,
        keyword: nextKeyword,
      }).then((isSuccess) => {
        if (isSuccess) {
          scrollPlaceListToTop()
        }
      })
    }, PLACE_SEARCH_DEBOUNCE_MS)

    return clearPendingPlaceSearch
  }, [
    clearPendingPlaceSearch,
    fetchAdminPlaces,
    placeSearchQuery,
    scrollPlaceListToTop,
  ])

  const handleSelectPlace = useCallback(
    (place: AdminPlaceItem) => {
      setSelectedPlace(place)
      void fetchAdminPlaceDetail(place.id)
    },
    [fetchAdminPlaceDetail]
  )

  const handleSelectMapMarker = useCallback(
    (placeId: number) => {
      const nextPlace = places.find((place) => place.id === placeId)

      if (nextPlace) {
        handleSelectPlace(nextPlace)
      }
    },
    [handleSelectPlace, places]
  )

  const handleSearchQueryChange = (nextQuery: string) => {
    setPlaceSearchQuery(nextQuery)
    handleClosePlaceDetail()
  }

  const handleClearPlaceFilters = () => {
    clearPendingPlaceSearch()
    shouldSkipNextSearchEffectRef.current = true
    setPlaceSearchQuery('')
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page: 1,
      sortParam: selectedSortParam,
      keyword: '',
    }).then((isSuccess) => {
      if (isSuccess) {
        handleClosePlaceDetail()
      }
    })
  }

  const handleRefresh = () => {
    clearPendingPlaceSearch()
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page,
      sortParam: selectedSortParam,
      keyword: placeKeyword,
    }).then((isSuccess) => {
      if (isSuccess) {
        handleClosePlaceDetail()
      }
    })
  }

  const handleSortChange = (value: string) => {
    const nextSortParam = value as AdminPlaceListSortParam

    clearPendingPlaceSearch()
    setSelectedSortParam(nextSortParam)
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page: 1,
      sortParam: nextSortParam,
      keyword: placeKeyword,
    }).then((isSuccess) => {
      if (isSuccess) {
        handleClosePlaceDetail()
        scrollPlaceListToTop()
      }
    })
  }

  const handlePageChange = (nextPage: number) => {
    const nextPageNumber = Math.min(Math.max(nextPage, 1), safeTotalPages)

    if (nextPageNumber === page || isLoading) {
      return
    }

    clearPendingPlaceSearch()
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page: nextPageNumber,
      sortParam: selectedSortParam,
      keyword: placeKeyword,
    }).then((isSuccess) => {
      if (isSuccess) {
        handleClosePlaceDetail()
        scrollPlaceListToTop()
      }
    })
  }

  const handleOpenDeleteConfirm = () => {
    if (!placeDetail || isDeletingSelectedPlace) {
      return
    }

    setDeleteConfirmPlace(placeDetail)
    setHasDeleteConfirmAttempted(false)
  }

  const handleCloseDeleteConfirm = useCallback(() => {
    if (deletingPlaceId !== null) {
      return
    }

    setDeleteConfirmPlace(null)
    setHasDeleteConfirmAttempted(false)
  }, [deletingPlaceId])

  const handleConfirmDeletePlace = () => {
    if (!deleteConfirmPlace || isLoading || deletingPlaceId !== null) {
      return
    }

    setHasDeleteConfirmAttempted(true)

    void deletePlace(deleteConfirmPlace.id).then((isSuccess) => {
      if (!isSuccess) {
        return
      }

      setDeleteConfirmPlace(null)
      setHasDeleteConfirmAttempted(false)
      handleClosePlaceDetail()
    })
  }

  const handleOpenOperatingStatusEdit = () => {
    if (!placeDetail || updatingPlaceId !== null) {
      return
    }

    setOperatingStatusEditPlace(placeDetail)
    setOperatingStatusDraft(placeDetail.operatingStatus ?? 'OPERATING')
    setOperatingStatusReason('')
    setOperatingStatusFormError('')
    clearActionErrorMessage()
  }

  const handleCloseOperatingStatusEdit = useCallback(() => {
    if (updatingPlaceAction === 'operating-status') {
      return
    }

    setOperatingStatusEditPlace(null)
    setOperatingStatusFormError('')
  }, [updatingPlaceAction])

  const handleConfirmOperatingStatusEdit = () => {
    if (!operatingStatusEditPlace || updatingPlaceAction !== null) {
      return
    }

    if (operatingStatusEditPlace.operatingStatus === operatingStatusDraft) {
      return
    }

    if (!operatingStatusReason.trim()) {
      setOperatingStatusFormError('운영 상태 확인 사유를 입력해주세요.')
      return
    }

    setOperatingStatusFormError('')

    void updatePlaceOperatingStatus(operatingStatusEditPlace.id, {
      operatingStatus: operatingStatusDraft,
      reason: operatingStatusReason.trim(),
    }).then((isSuccess) => {
      if (isSuccess) {
        setOperatingStatusEditPlace(null)
      }
    })
  }

  const handleOpenDiscoveryStatusEdit = () => {
    if (!placeDetail || !placeDetail.discoveryStatus || updatingPlaceId !== null) {
      return
    }

    setDiscoveryStatusEditPlace(placeDetail)
    setDiscoveryStatusDraft(placeDetail.discoveryStatus)
    setDiscoveryStatusReason('')
    setDiscoveryStatusFormError('')
    clearActionErrorMessage()
  }

  const handleCloseDiscoveryStatusEdit = useCallback(() => {
    if (updatingPlaceAction === 'discovery-status') {
      return
    }

    setDiscoveryStatusEditPlace(null)
    setDiscoveryStatusFormError('')
  }, [updatingPlaceAction])

  const handleConfirmDiscoveryStatusEdit = () => {
    if (!discoveryStatusEditPlace || updatingPlaceAction !== null) {
      return
    }

    if (discoveryStatusEditPlace.discoveryStatus === discoveryStatusDraft) {
      return
    }

    if (!discoveryStatusReason.trim()) {
      setDiscoveryStatusFormError('탐색 상태 변경 사유를 입력해주세요.')
      return
    }

    setDiscoveryStatusFormError('')

    void updatePlaceDiscoveryStatus(discoveryStatusEditPlace.id, {
      discoveryStatus: discoveryStatusDraft,
      reason: discoveryStatusReason.trim(),
    }).then((isSuccess) => {
      if (isSuccess) {
        setSelectedPlace((currentPlace) =>
          currentPlace?.id === discoveryStatusEditPlace.id
            ? {
                ...currentPlace,
                discoveryStatus: discoveryStatusDraft,
              }
            : currentPlace
        )
        setDiscoveryStatusEditPlace(null)
      }
    })
  }

  const handleOpenOperatingScheduleEdit = () => {
    if (!placeDetail || updatingPlaceId !== null) {
      return
    }

    setOperatingScheduleEditPlace(placeDetail)
    setRegularHourDrafts(createOperatingHourDrafts(placeDetail.regularHours))
    setOperatingExceptionDrafts(
      (placeDetail.operatingExceptions ?? []).map((exception) =>
        createOperatingExceptionDraft(exception)
      )
    )
    setOperatingScheduleReason('')
    setOperatingScheduleFormError('')
    clearActionErrorMessage()
  }

  const handleCloseOperatingScheduleEdit = useCallback(() => {
    if (updatingPlaceAction === 'operating-schedule') {
      return
    }

    setOperatingScheduleEditPlace(null)
    setOperatingScheduleFormError('')
  }, [updatingPlaceAction])

  const handleRegularOperatingDayEnabledChange = (
    dayOfWeek: AdminPlaceDayOfWeek,
    enabled: boolean
  ) => {
    setRegularHourDrafts((prevHours) =>
      prevHours.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day
        }

        return {
          ...day,
          hours: enabled
            ? day.hours.length > 0
              ? day.hours
              : [
                  {
                    id: createOperatingScheduleDraftId(),
                    opensAt: '09:00',
                    closesAt: '18:00',
                  },
                ]
            : [],
        }
      })
    )
  }

  const handleRegularOperatingHourChange = (
    dayOfWeek: AdminPlaceDayOfWeek,
    hourId: string,
    patch: Partial<Pick<OperatingTimeRangeDraft, 'opensAt' | 'closesAt'>>
  ) => {
    setRegularHourDrafts((prevHours) =>
      prevHours.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              hours: day.hours.map((hour) =>
                hour.id === hourId ? { ...hour, ...patch } : hour
              ),
            }
          : day
      )
    )
  }

  const handleAddRegularOperatingHour = (dayOfWeek: AdminPlaceDayOfWeek) => {
    setRegularHourDrafts((prevHours) =>
      prevHours.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              hours: [
                ...day.hours,
                {
                  id: createOperatingScheduleDraftId(),
                  opensAt: '09:00',
                  closesAt: '18:00',
                },
              ],
            }
          : day
      )
    )
  }

  const handleRemoveRegularOperatingHour = (
    dayOfWeek: AdminPlaceDayOfWeek,
    hourId: string
  ) => {
    setRegularHourDrafts((prevHours) =>
      prevHours.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              hours: day.hours.filter((hour) => hour.id !== hourId),
            }
          : day
      )
    )
  }

  const handleAddOperatingException = () => {
    setOperatingExceptionDrafts((prevExceptions) => [
      ...prevExceptions,
      createOperatingExceptionDraft(),
    ])
  }

  const handleOperatingExceptionChange = (
    exceptionId: string,
    patch: Partial<Pick<OperatingExceptionDraft, 'date' | 'closed'>>
  ) => {
    setOperatingExceptionDrafts((prevExceptions) =>
      prevExceptions.map((exception) => {
        if (exception.id !== exceptionId) {
          return exception
        }

        const nextException = { ...exception, ...patch }

        if (patch.closed === false && nextException.hours.length === 0) {
          nextException.hours = [
            {
              id: createOperatingScheduleDraftId(),
              opensAt: '09:00',
              closesAt: '18:00',
            },
          ]
        }

        return nextException
      })
    )
  }

  const handleRemoveOperatingException = (exceptionId: string) => {
    setOperatingExceptionDrafts((prevExceptions) =>
      prevExceptions.filter((exception) => exception.id !== exceptionId)
    )
  }

  const handleOperatingExceptionHourChange = (
    exceptionId: string,
    hourId: string,
    patch: Partial<Pick<OperatingTimeRangeDraft, 'opensAt' | 'closesAt'>>
  ) => {
    setOperatingExceptionDrafts((prevExceptions) =>
      prevExceptions.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              hours: exception.hours.map((hour) =>
                hour.id === hourId ? { ...hour, ...patch } : hour
              ),
            }
          : exception
      )
    )
  }

  const handleAddOperatingExceptionHour = (exceptionId: string) => {
    setOperatingExceptionDrafts((prevExceptions) =>
      prevExceptions.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              hours: [
                ...exception.hours,
                {
                  id: createOperatingScheduleDraftId(),
                  opensAt: '09:00',
                  closesAt: '18:00',
                },
              ],
            }
          : exception
      )
    )
  }

  const handleRemoveOperatingExceptionHour = (exceptionId: string, hourId: string) => {
    setOperatingExceptionDrafts((prevExceptions) =>
      prevExceptions.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              hours: exception.hours.filter((hour) => hour.id !== hourId),
            }
          : exception
      )
    )
  }

  const handleConfirmOperatingScheduleEdit = () => {
    if (!operatingScheduleEditPlace || updatingPlaceAction !== null) {
      return
    }

    const validationMessage = getOperatingScheduleValidationMessage(
      regularHourDrafts,
      operatingExceptionDrafts,
      operatingScheduleReason
    )

    if (validationMessage) {
      setOperatingScheduleFormError(validationMessage)
      return
    }

    setOperatingScheduleFormError('')

    void updatePlaceOperatingSchedule(operatingScheduleEditPlace.id, {
      regularHours: regularHourDrafts.flatMap((day) =>
        day.hours.map((hour) => ({
          dayOfWeek: day.dayOfWeek,
          opensAt: getApiTimeValue(hour.opensAt),
          closesAt: getApiTimeValue(hour.closesAt),
        }))
      ),
      exceptions: operatingExceptionDrafts.map((exception) => ({
        date: exception.date,
        closed: exception.closed,
        hours: exception.closed
          ? []
          : exception.hours.map((hour) => ({
              opensAt: getApiTimeValue(hour.opensAt),
              closesAt: getApiTimeValue(hour.closesAt),
            })),
      })),
      reason: operatingScheduleReason.trim(),
    }).then((isSuccess) => {
      if (isSuccess) {
        setOperatingScheduleEditPlace(null)
      }
    })
  }

  useEffect(() => {
    if (!selectedPlace || !hasValidCoordinate(selectedPlace)) {
      return
    }

    const recenterSelectedPlace = () => focusPlaceOnVisibleMap(selectedPlace)

    const recenterAnimationFrame = window.requestAnimationFrame(recenterSelectedPlace)
    const recenterTimer = window.setTimeout(recenterSelectedPlace, 220)

    return () => {
      window.cancelAnimationFrame(recenterAnimationFrame)
      window.clearTimeout(recenterTimer)
    }
  }, [focusPlaceOnVisibleMap, isPlacePanelCollapsed, selectedPlace])

  useEffect(() => {
    function closeDeleteConfirmOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleCloseDeleteConfirm()
      }
    }

    if (!deleteConfirmPlace) {
      return
    }

    window.addEventListener('keydown', closeDeleteConfirmOnEscape)

    return () => {
      window.removeEventListener('keydown', closeDeleteConfirmOnEscape)
    }
  }, [deleteConfirmPlace, handleCloseDeleteConfirm])

  useEffect(() => {
    function closeOperatingDialogOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      if (discoveryStatusEditPlace) {
        handleCloseDiscoveryStatusEdit()
        return
      }

      if (operatingStatusEditPlace) {
        handleCloseOperatingStatusEdit()
        return
      }

      handleCloseOperatingScheduleEdit()
    }

    if (
      !discoveryStatusEditPlace &&
      !operatingStatusEditPlace &&
      !operatingScheduleEditPlace
    ) {
      return
    }

    window.addEventListener('keydown', closeOperatingDialogOnEscape)

    return () => {
      window.removeEventListener('keydown', closeOperatingDialogOnEscape)
    }
  }, [
    discoveryStatusEditPlace,
    handleCloseDiscoveryStatusEdit,
    handleCloseOperatingScheduleEdit,
    handleCloseOperatingStatusEdit,
    operatingScheduleEditPlace,
    operatingStatusEditPlace,
  ])

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.BrandLockup>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </S.BrandLockup>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button" onClick={() => navigate('/dashboard')}>
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
          </S.MenuButton>
          <S.MenuButton type="button" $active>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/main')}>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>게시글 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/bans')}>
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
        </S.SideMenu>

        <S.SideFooter>
          <S.AdminProfile aria-label="관리자 계정">
            <S.AdminProfileIcon>
              <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
            </S.AdminProfileIcon>
            <S.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </S.AdminProfileText>
          </S.AdminProfile>
          <S.LogoutButton
            type="button"
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
          >
            <S.MaterialIcon aria-hidden="true">logout</S.MaterialIcon>
            <span>로그아웃</span>
          </S.LogoutButton>
        </S.SideFooter>
      </S.SideNav>

      <S.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <S.TopBar>
          <S.TopTitleGroup>
            <S.TopTitle>장소 관리</S.TopTitle>
          </S.TopTitleGroup>
          <S.TopActions>
            <S.TopActionButton
              type="button"
              onClick={() => navigate('/places/duplicates')}
            >
              <S.MaterialIcon aria-hidden="true">merge_type</S.MaterialIcon>
              중복 장소 관리
            </S.TopActionButton>
            <AdminNotificationButton />
            <S.IconButton type="button" aria-label="도움말">
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
          </S.TopActions>
        </S.TopBar>

        <S.SplitContent $isPanelCollapsed={isPlacePanelCollapsed}>
          <S.PlacePanel $collapsed={isPlacePanelCollapsed}>
            <S.PanelControls>
              <S.PanelSummary>
                <S.PanelCount>
                  {placeKeyword ? '검색 결과' : '전체 장소'}{' '}
                  <strong>{totalCount.toLocaleString()}</strong>개
                </S.PanelCount>
                <S.PanelCollapseButton
                  type="button"
                  aria-label="장소 목록 접기"
                  title="장소 목록 접기"
                  onClick={() => setIsPlacePanelCollapsed(true)}
                >
                  <S.MaterialIcon aria-hidden="true">keyboard_double_arrow_left</S.MaterialIcon>
                </S.PanelCollapseButton>
              </S.PanelSummary>

              <S.SearchField>
                <S.SearchIcon aria-hidden="true">search</S.SearchIcon>
                <S.SearchInput
                  type="search"
                  value={placeSearchQuery}
                  placeholder="장소명, 등록자 ID, 주소 검색"
                  aria-label="장소명, 등록자 ID, 주소 검색"
                  onChange={(event) =>
                    handleSearchQueryChange(event.target.value)
                  }
                />
                {placeSearchQuery ? (
                  <S.SearchClearButton
                    type="button"
                    aria-label="검색어 지우기"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleClearPlaceFilters}
                  >
                    <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
                  </S.SearchClearButton>
                ) : null}
              </S.SearchField>

              <S.PanelActionGroup>
                <SortDropdown
                  ariaLabel="장소 목록 정렬"
                  value={selectedSortParam}
                  options={PLACE_SORT_OPTIONS}
                  disabled={isLoading}
                  width="124px"
                  onChange={handleSortChange}
                />
                <S.IconFilterButton
                  type="button"
                  aria-label={
                    isLoading ? '장소 목록을 불러오는 중입니다' : '장소 목록 새로고침'
                  }
                  title={isLoading ? '불러오는 중' : '새로고침'}
                  disabled={isLoading}
                  onClick={handleRefresh}
                >
                  <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                </S.IconFilterButton>
              </S.PanelActionGroup>

              <S.PanelResultSummary>
                <span>{pageRangeLabel}</span>
                {hasActivePlaceFilter ? (
                  <S.ClearFilterButton type="button" onClick={handleClearPlaceFilters}>
                    검색 초기화
                  </S.ClearFilterButton>
                ) : null}
              </S.PanelResultSummary>
            </S.PanelControls>

            {isError && places.length > 0 ? (
              <S.ListInlineNotice role="alert">
                <span>{errorMessage} 기존 결과를 표시합니다.</span>
                <S.RetryButton type="button" disabled={isLoading} onClick={handleRefresh}>
                  다시 시도
                </S.RetryButton>
              </S.ListInlineNotice>
            ) : null}

            <S.PlaceList
              ref={placeListRef}
              aria-label="장소 목록"
              aria-busy={isLoading}
            >
              {isUpdatingList ? (
                <S.ListStatus role="status" aria-live="polite">
                  장소 목록을 업데이트하고 있습니다.
                </S.ListStatus>
              ) : null}

              {isLoading && places.length === 0 ? (
                <S.PlaceListSkeleton aria-label="장소 목록을 불러오는 중입니다">
                  {Array.from({ length: 6 }, (_, index) => (
                    <S.PlaceSkeletonItem key={index}>
                      <S.PlaceSkeletonThumbnail />
                      <S.PlaceSkeletonContent>
                        <S.PlaceSkeletonLine $width="68%" />
                        <S.PlaceSkeletonLine $width="92%" />
                        <S.PlaceSkeletonLine $width="52%" />
                      </S.PlaceSkeletonContent>
                    </S.PlaceSkeletonItem>
                  ))}
                </S.PlaceListSkeleton>
              ) : isError && places.length === 0 ? (
                <S.EmptyState>
                  {errorMessage}
                  <S.RetryButton
                    type="button"
                    disabled={isLoading}
                    onClick={handleRefresh}
                  >
                    다시 시도
                  </S.RetryButton>
                </S.EmptyState>
              ) : places.length > 0 ? (
                <>
                  {places.map((place) => {
                    const isSelected = selectedPlace?.id === place.id
                    const placeCategoryLabel = getPlaceCategoryLabel(place)
                    const placeDisplayName = getPlaceDisplayName(place)

                    return (
                      <S.PlaceItem
                        key={place.id}
                        type="button"
                        $active={isSelected}
                        aria-pressed={isSelected}
                        onClick={() => handleSelectPlace(place)}
                      >
                        <S.PlaceThumb>
                          <S.MaterialIcon aria-hidden="true">
                            {getPlaceCategoryIconName(place)}
                          </S.MaterialIcon>
                        </S.PlaceThumb>
                        <S.PlaceInfo>
                          <S.PlaceTitleRow>
                            <S.PlaceName title={placeDisplayName}>
                              {placeDisplayName}
                            </S.PlaceName>
                            <S.PlaceTitleBadges>
                              <S.PlaceCategoryBadge>{placeCategoryLabel}</S.PlaceCategoryBadge>
                              {place.discoveryStatus === 'HIDDEN' ? (
                                <S.PlaceDiscoveryStatusBadge>
                                  탐색 숨김
                                </S.PlaceDiscoveryStatusBadge>
                              ) : null}
                            </S.PlaceTitleBadges>
                          </S.PlaceTitleRow>
                          <S.PlaceMeta>
                            <S.MaterialIcon aria-hidden="true">map</S.MaterialIcon>
                            <span title={place.address || '주소 정보 없음'}>
                              {place.address || '주소 정보 없음'}
                            </span>
                          </S.PlaceMeta>
                          <S.PlaceMetaLine aria-label={`${placeDisplayName} 장소 지표`}>
                            <span>등록자 {getPlaceRegistrantLabel(place)}</span>
                            <span>Lv.{getPlaceLevel(place)}</span>
                            <span>사진 {getPlacePhotoCount(place)}장</span>
                          </S.PlaceMetaLine>
                        </S.PlaceInfo>
                      </S.PlaceItem>
                    )
                  })}
                </>
              ) : placeKeyword ? (
                <S.EmptyState>
                  검색 결과가 없습니다.
                  <S.RetryButton type="button" onClick={handleClearPlaceFilters}>
                    검색 초기화
                  </S.RetryButton>
                </S.EmptyState>
              ) : (
                <S.EmptyState>등록된 장소가 없습니다.</S.EmptyState>
              )}
            </S.PlaceList>

            {showPagination ? (
              <S.PanelPagination>
                {showEdgePageButtons ? (
                  <S.PageButton
                    type="button"
                    aria-label="첫 페이지로 이동"
                    disabled={isLoading || page <= 1}
                    onClick={() => handlePageChange(1)}
                  >
                    <S.MaterialIcon aria-hidden="true">first_page</S.MaterialIcon>
                  </S.PageButton>
                ) : null}
                <S.PageButton
                  type="button"
                  aria-label="이전 페이지로 이동"
                  disabled={isLoading || page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <S.MaterialIcon aria-hidden="true">chevron_left</S.MaterialIcon>
                </S.PageButton>
                <S.PageNumberList>
                  {visiblePageNumbers.map((pageNumber) => {
                    return (
                      <S.PageNumberButton
                        key={pageNumber}
                        type="button"
                        $active={page === pageNumber}
                        aria-current={page === pageNumber ? 'page' : undefined}
                        disabled={isLoading}
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </S.PageNumberButton>
                    )
                  })}
                </S.PageNumberList>
                <S.PageButton
                  type="button"
                  aria-label="다음 페이지로 이동"
                  disabled={isLoading || !hasNext}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
                </S.PageButton>
                {showEdgePageButtons ? (
                  <S.PageButton
                    type="button"
                    aria-label="마지막 페이지로 이동"
                    disabled={isLoading || page >= safeTotalPages}
                    onClick={() => handlePageChange(safeTotalPages)}
                  >
                    <S.MaterialIcon aria-hidden="true">last_page</S.MaterialIcon>
                  </S.PageButton>
                ) : null}
              </S.PanelPagination>
            ) : null}
          </S.PlacePanel>

          <S.MapPanel ref={mapPanelRef}>
            <S.AdminMap
              ref={mapRef}
              activeMarkerId={selectedPlace?.id ?? null}
              fitBoundsKey={placeMapFitBoundsKey}
              markers={placeMapMarkers}
              onMarkerClick={handleSelectMapMarker}
            />
            <S.PlaceDetailPanel
              ref={placeDetailPanelRef}
              $open={isPlaceDetailOpen}
            >
              {selectedPlace ? (
                <>
                  <S.DetailHeader>
                    <S.DetailTitleGroup>
                      <S.DetailEyebrow>장소 상세</S.DetailEyebrow>
                      <S.DetailTitle>
                        {placeDetail?.name ?? selectedPlace.name}
                      </S.DetailTitle>
                    </S.DetailTitleGroup>
                    <S.DetailCloseButton
                      type="button"
                      aria-label="장소 상세 닫기"
                      onClick={handleClosePlaceDetail}
                    >
                      <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
                    </S.DetailCloseButton>
                  </S.DetailHeader>

                  <S.DetailBody>
                    {isDetailLoading ? (
                      <S.DetailStatus role="status" aria-live="polite">
                        장소 상세 정보를 불러오는 중입니다.
                      </S.DetailStatus>
                    ) : detailErrorMessage ? (
                      <S.DetailErrorState role="alert">
                        <p>{detailErrorMessage}</p>
                        <S.RetryButton
                          type="button"
                          disabled={isDetailLoading}
                          onClick={() => {
                            if (selectedPlace) {
                              void fetchAdminPlaceDetail(selectedPlace.id)
                            }
                          }}
                        >
                          다시 시도
                        </S.RetryButton>
                      </S.DetailErrorState>
                    ) : placeDetail ? (
                      <>
                        <S.DetailMetaList>
                          <S.DetailMetaGroup>
                            <S.DetailMetaGroupTitle>장소 정보</S.DetailMetaGroupTitle>
                            <S.DetailMetaRow>
                              <span>장소 ID</span>
                              <strong>{placeDetail.id}</strong>
                            </S.DetailMetaRow>
                            <S.DetailMetaRow>
                              <span>카테고리</span>
                              <strong>{getPlaceCategoryLabel(placeDetail)}</strong>
                            </S.DetailMetaRow>
                            <S.DetailMetaRow>
                              <span>등록자</span>
                              <strong>
                                {placeDetail.username || `사용자 ID: ${placeDetail.userId}`}
                              </strong>
                            </S.DetailMetaRow>
                            <S.DetailMetaRow>
                              <span>주소</span>
                              <strong>{placeDetail.address || '주소 정보 없음'}</strong>
                            </S.DetailMetaRow>
                            <S.DetailMetaRow>
                              <span>좌표</span>
                              <strong>{formatCoordinate(placeDetail)}</strong>
                            </S.DetailMetaRow>
                          </S.DetailMetaGroup>
                        </S.DetailMetaList>

                        <S.DetailSection>
                          <S.DetailSectionHeader>
                            <S.DetailSectionTitle>운영 및 탐색 관리</S.DetailSectionTitle>
                          </S.DetailSectionHeader>
                          <S.OperatingSummary>
                            <S.OperatingSummaryRow>
                              <S.OperatingSummaryLabel>
                                <span>운영 상태</span>
                                <small>
                                  {formatOperatingStatusCheckedAt(
                                    placeDetail.operatingStatusCheckedAt
                                  )}
                                </small>
                              </S.OperatingSummaryLabel>
                              <S.OperatingSummaryAction>
                                <S.OperatingStatusBadge
                                  $tone={getOperatingStatusTone(
                                    placeDetail.operatingStatus
                                  )}
                                >
                                  {formatOperatingStatus(placeDetail.operatingStatus)}
                                </S.OperatingStatusBadge>
                                <S.DetailInlineButton
                                  type="button"
                                  disabled={updatingPlaceId !== null}
                                  onClick={handleOpenOperatingStatusEdit}
                                >
                                  상태 변경
                                </S.DetailInlineButton>
                              </S.OperatingSummaryAction>
                            </S.OperatingSummaryRow>
                            <S.OperatingSummaryRow>
                              <S.OperatingSummaryLabel>
                                <span>탐색 상태</span>
                                <small>
                                  {placeDetail.discoveryStatus === 'HIDDEN'
                                    ? '공개 탐색·자동완성·북마크 목록·추천 후보에서 제외됩니다.'
                                    : placeDetail.discoveryStatus === 'VISIBLE'
                                      ? '공개 탐색과 자동완성, 추천 후보에 노출됩니다.'
                                      : '서버 응답에서 탐색 상태를 확인하지 못했습니다.'}
                                </small>
                              </S.OperatingSummaryLabel>
                              <S.OperatingSummaryAction>
                                <S.OperatingStatusBadge
                                  $tone={getDiscoveryStatusTone(
                                    placeDetail.discoveryStatus
                                  )}
                                >
                                  {formatDiscoveryStatus(placeDetail.discoveryStatus)}
                                </S.OperatingStatusBadge>
                                <S.DetailInlineButton
                                  type="button"
                                  disabled={
                                    updatingPlaceId !== null || !placeDetail.discoveryStatus
                                  }
                                  onClick={handleOpenDiscoveryStatusEdit}
                                >
                                  상태 변경
                                </S.DetailInlineButton>
                              </S.OperatingSummaryAction>
                            </S.OperatingSummaryRow>
                            <S.OperatingSummaryRow>
                              <S.OperatingSummaryLabel>
                                <span>정규 영업시간</span>
                                <small>
                                  {detailRegularHours.length > 0
                                    ? `${detailRegularHours.length}개 요일 설정됨`
                                    : '등록된 정규 영업시간 없음'}
                                </small>
                              </S.OperatingSummaryLabel>
                              <S.DetailInlineButton
                                type="button"
                                disabled={updatingPlaceId !== null}
                                onClick={handleOpenOperatingScheduleEdit}
                              >
                                영업시간 수정
                              </S.DetailInlineButton>
                            </S.OperatingSummaryRow>
                            <S.OperatingSummaryRow>
                              <S.OperatingSummaryLabel>
                                <span>예외 일정</span>
                                <small>{detailOperatingExceptions.length}건 등록됨</small>
                              </S.OperatingSummaryLabel>
                              <S.DetailInlineButton
                                type="button"
                                disabled={updatingPlaceId !== null}
                                onClick={handleOpenOperatingScheduleEdit}
                              >
                                일정 관리
                              </S.DetailInlineButton>
                            </S.OperatingSummaryRow>
                          </S.OperatingSummary>
                        </S.DetailSection>

                        <S.DetailSection>
                          <S.DetailSectionTitle>장소 성장</S.DetailSectionTitle>
                          <S.PlaceMetaLine>
                            <span>
                              Lv.{formatOptionalNumber(placeDetail.placeGrowth?.level)}
                            </span>
                            <span>
                              사진{' '}
                              {formatOptionalNumber(placeDetail.placeGrowth?.photoCount)}장
                            </span>
                          </S.PlaceMetaLine>
                          <S.DetailGrowthProgress>
                            <S.DetailGrowthProgressHeader>
                              <span>다음 레벨까지</span>
                              <strong>{detailGrowthProgressLabel}</strong>
                            </S.DetailGrowthProgressHeader>
                            <S.DetailGrowthTrack
                              role="progressbar"
                              aria-label="다음 레벨 진행률"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={detailGrowthProgress ?? undefined}
                              aria-valuetext={detailGrowthProgressLabel}
                            >
                              <S.DetailGrowthBar
                                $progress={detailGrowthProgress ?? 0}
                              />
                            </S.DetailGrowthTrack>
                          </S.DetailGrowthProgress>
                        </S.DetailSection>

                        <S.DetailSection>
                          <S.DetailSectionTitle>
                            연결 게시글 {placeDetail.postCount.toLocaleString()}개
                          </S.DetailSectionTitle>
                          {detailPostPreviewItems.length > 0 ? (
                            <>
                              <S.DetailPostList>
                                {detailPostPreviewItems.map((post) => (
                                  <S.DetailPostItem
                                    key={post.id}
                                    type="button"
                                    onClick={() => handleOpenPostDetail(post.id)}
                                  >
                                    <S.DetailPostImage>
                                      {post.imageUrl ? (
                                        <img
                                          src={post.imageUrl}
                                          alt={`${post.title || `게시글 ${post.id}`} 이미지`}
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      ) : (
                                        <S.DetailPostFallback>
                                          <S.MaterialIcon aria-hidden="true">image</S.MaterialIcon>
                                        </S.DetailPostFallback>
                                      )}
                                    </S.DetailPostImage>
                                    <S.DetailPostText>
                                      <S.DetailPostTitleRow>
                                        <S.DetailPostTitle
                                          title={post.title || `게시글 #${post.id}`}
                                        >
                                          {post.title || `게시글 #${post.id}`}
                                        </S.DetailPostTitle>
                                      </S.DetailPostTitleRow>
                                      <p title={post.description || '설명 없음'}>
                                        {post.description || '설명 없음'}
                                      </p>
                                      {post.visibilityStatus === 'HIDDEN' ? (
                                        <S.DetailPostVisibilityReason>
                                          <S.DetailPostVisibilityBadge>숨김</S.DetailPostVisibilityBadge>
                                          <span>
                                            숨김 사유: {formatPlacePostHiddenReason(post.hiddenReason)}
                                          </span>
                                        </S.DetailPostVisibilityReason>
                                      ) : null}
                                      <S.DetailPostMeta>
                                        {post.username || `사용자 ID: ${post.userId}`} · 좋아요{' '}
                                        {post.likeCount.toLocaleString()} ·{' '}
                                        {formatPlacePostDate(post.createdAt)}
                                      </S.DetailPostMeta>
                                    </S.DetailPostText>
                                  </S.DetailPostItem>
                                ))}
                              </S.DetailPostList>
                              {shouldShowDetailPostAllAction ? (
                                <S.DetailPostListAction
                                  type="button"
                                  onClick={() => handleOpenPlacePosts(placeDetail.name)}
                                >
                                  <span>연결 게시글 전체 보기</span>
                                  <S.MaterialIcon aria-hidden="true">
                                    chevron_right
                                  </S.MaterialIcon>
                                </S.DetailPostListAction>
                              ) : null}
                            </>
                          ) : (
                            <S.DetailStatus>연결된 게시글이 없습니다.</S.DetailStatus>
                          )}
                        </S.DetailSection>
                      </>
                    ) : (
                      <S.DetailStatus>장소를 선택하면 상세 정보가 표시됩니다.</S.DetailStatus>
                    )}
                  </S.DetailBody>

                  <S.DetailFooter>
                    <S.DetailActionButton
                      type="button"
                      disabled={!selectedPlaceHasCoordinate}
                      onClick={() => focusPlaceOnVisibleMap(selectedPlace)}
                    >
                      <S.MaterialIcon aria-hidden="true">my_location</S.MaterialIcon>
                      <span>위치 보기</span>
                    </S.DetailActionButton>
                    <S.DetailDeleteButton
                      type="button"
                      disabled={!placeDetail || isDetailLoading || isDeletingSelectedPlace}
                      onClick={handleOpenDeleteConfirm}
                    >
                      <S.MaterialIcon aria-hidden="true">delete</S.MaterialIcon>
                      <span>{isDeletingSelectedPlace ? '삭제 중' : '장소 삭제'}</span>
                    </S.DetailDeleteButton>
                  </S.DetailFooter>
                </>
              ) : null}
            </S.PlaceDetailPanel>
            {isPlacePanelCollapsed ? (
              <S.MapListToggleButton
                type="button"
                aria-label="장소 목록 열기"
                onClick={() => setIsPlacePanelCollapsed(false)}
              >
                <S.MaterialIcon aria-hidden="true">keyboard_double_arrow_right</S.MaterialIcon>
                <span>목록</span>
              </S.MapListToggleButton>
            ) : null}
            <S.MapControlGroup>
              <S.MapControlButton
                type="button"
                aria-label="지도 확대"
                onClick={() => mapRef.current?.zoomIn()}
              >
                <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
              </S.MapControlButton>
              <S.MapControlButton
                type="button"
                aria-label="지도 축소"
                onClick={() => mapRef.current?.zoomOut()}
              >
                <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
              </S.MapControlButton>
            </S.MapControlGroup>
            {!isPlaceDetailOpen ? (
              <S.MapInfo $offsetForListToggle={isPlacePanelCollapsed}>
                <S.MapInfoDot />
                <S.MapInfoText>
                  <strong>{places.length.toLocaleString()}개 장소 표시</strong>
                </S.MapInfoText>
              </S.MapInfo>
            ) : null}
          </S.MapPanel>
        </S.SplitContent>
      </S.MainArea>

      {actionSuccessMessage ? (
        <S.ActionToast role="status">
          <S.MaterialIcon aria-hidden="true">check_circle</S.MaterialIcon>
          <span>{actionSuccessMessage}</span>
        </S.ActionToast>
      ) : null}

      {operatingStatusEditPlace ? (
        <S.OperatingDialogOverlay
          role="presentation"
          onMouseDown={handleCloseOperatingStatusEdit}
        >
          <S.OperatingDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="operating-status-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.OperatingDialogHeader>
              <div>
                <S.OperatingDialogTitle id="operating-status-dialog-title">
                  운영 상태 변경
                </S.OperatingDialogTitle>
              </div>
              <S.OperatingDialogCloseButton
                type="button"
                aria-label="운영 상태 변경 닫기"
                disabled={updatingPlaceAction === 'operating-status'}
                onClick={handleCloseOperatingStatusEdit}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.OperatingDialogCloseButton>
            </S.OperatingDialogHeader>
            <S.OperatingDialogBody>
              <S.OperatingDialogDescription>
                {operatingStatusEditPlace.name}의 운영 상태를 변경합니다. 비운영 상태의
                장소는 앱 장소 조회와 추천에서 숨겨집니다.
              </S.OperatingDialogDescription>
              <S.OperatingFormField as="fieldset">
                <legend>운영 상태</legend>
                <S.OperatingOptionGrid>
                  {PLACE_OPERATING_STATUS_OPTIONS.map((option) => (
                    <S.OperatingOption
                      key={option.value}
                      $selected={operatingStatusDraft === option.value}
                      $tone={option.value === 'PERMANENTLY_CLOSED' ? 'danger' : 'normal'}
                    >
                      <input
                        type="radio"
                        name="place-operating-status"
                        value={option.value}
                        checked={operatingStatusDraft === option.value}
                        disabled={updatingPlaceAction === 'operating-status'}
                        onChange={() => {
                          setOperatingStatusDraft(option.value)
                          setOperatingStatusFormError('')
                        }}
                      />
                      <strong>{option.label}</strong>
                      <small>{PLACE_OPERATING_STATUS_DESCRIPTIONS[option.value]}</small>
                    </S.OperatingOption>
                  ))}
                </S.OperatingOptionGrid>
              </S.OperatingFormField>
              {operatingStatusDraft === 'PERMANENTLY_CLOSED' ? (
                <S.OperatingDangerNotice>
                  영구 폐업으로 변경하면 해당 장소는 앱에서 노출되지 않습니다.
                </S.OperatingDangerNotice>
              ) : null}
              <S.OperatingFormField>
                <span>확인 사유</span>
                <S.OperatingTextArea
                  value={operatingStatusReason}
                  maxLength={500}
                  placeholder="예: 현장 확인 결과 임시 휴업"
                  disabled={updatingPlaceAction === 'operating-status'}
                  onChange={(event) => {
                    setOperatingStatusReason(event.target.value)
                    setOperatingStatusFormError('')
                  }}
                />
                <small>{operatingStatusReason.length}/500</small>
              </S.OperatingFormField>
              {operatingStatusFormError ? (
                <S.OperatingFormNotice role="alert">
                  {operatingStatusFormError}
                </S.OperatingFormNotice>
              ) : null}
              {actionErrorMessage && !operatingStatusFormError ? (
                <S.OperatingFormNotice role="alert">
                  {actionErrorMessage}
                </S.OperatingFormNotice>
              ) : null}
            </S.OperatingDialogBody>
            <S.OperatingDialogActions>
              <S.SecondaryButton
                type="button"
                disabled={updatingPlaceAction === 'operating-status'}
                onClick={handleCloseOperatingStatusEdit}
              >
                취소
              </S.SecondaryButton>
              <S.OperatingPrimaryButton
                type="button"
                $danger={operatingStatusDraft === 'PERMANENTLY_CLOSED'}
                disabled={
                  updatingPlaceAction === 'operating-status' || isOperatingStatusUnchanged
                }
                onClick={handleConfirmOperatingStatusEdit}
              >
                {updatingPlaceAction === 'operating-status'
                  ? '저장 중'
                  : '상태 저장'}
              </S.OperatingPrimaryButton>
            </S.OperatingDialogActions>
          </S.OperatingDialog>
        </S.OperatingDialogOverlay>
      ) : null}

      {discoveryStatusEditPlace ? (
        <S.OperatingDialogOverlay
          role="presentation"
          onMouseDown={handleCloseDiscoveryStatusEdit}
        >
          <S.OperatingDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="discovery-status-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.OperatingDialogHeader>
              <div>
                <S.OperatingDialogTitle id="discovery-status-dialog-title">
                  탐색 상태 변경
                </S.OperatingDialogTitle>
              </div>
              <S.OperatingDialogCloseButton
                type="button"
                aria-label="탐색 상태 변경 닫기"
                disabled={updatingPlaceAction === 'discovery-status'}
                onClick={handleCloseDiscoveryStatusEdit}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.OperatingDialogCloseButton>
            </S.OperatingDialogHeader>
            <S.OperatingDialogBody>
              <S.OperatingDialogDescription>
                {discoveryStatusEditPlace.name}의 공개 탐색 노출 여부를 변경합니다.
                장소는 관리자 목록과 지도에서 계속 관리할 수 있습니다.
              </S.OperatingDialogDescription>
              <S.OperatingFormField as="fieldset">
                <legend>탐색 상태</legend>
                <S.OperatingOptionGrid>
                  {PLACE_DISCOVERY_STATUS_OPTIONS.map((option) => (
                    <S.OperatingOption
                      key={option.value}
                      $selected={discoveryStatusDraft === option.value}
                      $tone={option.value === 'HIDDEN' ? 'muted' : 'normal'}
                    >
                      <input
                        type="radio"
                        name="place-discovery-status"
                        value={option.value}
                        checked={discoveryStatusDraft === option.value}
                        disabled={updatingPlaceAction === 'discovery-status'}
                        onChange={() => {
                          setDiscoveryStatusDraft(option.value)
                          setDiscoveryStatusFormError('')
                        }}
                      />
                      <strong>{option.label}</strong>
                      <small>{PLACE_DISCOVERY_STATUS_DESCRIPTIONS[option.value]}</small>
                    </S.OperatingOption>
                  ))}
                </S.OperatingOptionGrid>
              </S.OperatingFormField>
              {discoveryStatusDraft === 'HIDDEN' ? (
                <S.OperatingInfoNotice>
                  탐색 숨김으로 변경하면 공개 탐색·자동완성·북마크 목록·추천 후보에서
                  제외됩니다.
                </S.OperatingInfoNotice>
              ) : null}
              <S.OperatingFormField>
                <span>변경 사유</span>
                <S.OperatingTextArea
                  value={discoveryStatusReason}
                  maxLength={500}
                  placeholder="예: 운영 정책 검토를 위해 탐색 노출을 중지"
                  disabled={updatingPlaceAction === 'discovery-status'}
                  onChange={(event) => {
                    setDiscoveryStatusReason(event.target.value)
                    setDiscoveryStatusFormError('')
                  }}
                />
                <small>{discoveryStatusReason.length}/500</small>
              </S.OperatingFormField>
              {discoveryStatusFormError ? (
                <S.OperatingFormNotice role="alert">
                  {discoveryStatusFormError}
                </S.OperatingFormNotice>
              ) : null}
              {actionErrorMessage && !discoveryStatusFormError ? (
                <S.OperatingFormNotice role="alert">
                  {actionErrorMessage}
                </S.OperatingFormNotice>
              ) : null}
            </S.OperatingDialogBody>
            <S.OperatingDialogActions>
              <S.SecondaryButton
                type="button"
                disabled={updatingPlaceAction === 'discovery-status'}
                onClick={handleCloseDiscoveryStatusEdit}
              >
                취소
              </S.SecondaryButton>
              <S.OperatingPrimaryButton
                type="button"
                disabled={
                  updatingPlaceAction === 'discovery-status' || isDiscoveryStatusUnchanged
                }
                onClick={handleConfirmDiscoveryStatusEdit}
              >
                {updatingPlaceAction === 'discovery-status' ? '저장 중' : '상태 저장'}
              </S.OperatingPrimaryButton>
            </S.OperatingDialogActions>
          </S.OperatingDialog>
        </S.OperatingDialogOverlay>
      ) : null}

      {operatingScheduleEditPlace ? (
        <S.OperatingDialogOverlay
          role="presentation"
          onMouseDown={handleCloseOperatingScheduleEdit}
        >
          <S.OperatingDialog
            $wide
            role="dialog"
            aria-modal="true"
            aria-labelledby="operating-schedule-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.OperatingDialogHeader>
              <div>
                <S.OperatingDialogTitle id="operating-schedule-dialog-title">
                  영업시간 수정
                </S.OperatingDialogTitle>
              </div>
              <S.OperatingDialogCloseButton
                type="button"
                aria-label="영업시간 수정 닫기"
                disabled={updatingPlaceAction === 'operating-schedule'}
                onClick={handleCloseOperatingScheduleEdit}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.OperatingDialogCloseButton>
            </S.OperatingDialogHeader>
            <S.OperatingDialogBody>
              <S.OperatingDialogDescription>
                {operatingScheduleEditPlace.name}의 영업시간과 예외 일정을 수정합니다.
              </S.OperatingDialogDescription>

              <S.OperatingEditorSection>
                <S.OperatingEditorSectionHeader>
                  <strong>정규 영업시간</strong>
                  <span>영업하는 요일을 선택하세요.</span>
                </S.OperatingEditorSectionHeader>
                <S.OperatingWeekList>
                  {regularHourDrafts.map((hour) => (
                    <S.OperatingWeekRow key={hour.dayOfWeek}>
                      <S.OperatingWeekRowHeader>
                        <S.OperatingCheckLabel>
                          <input
                            type="checkbox"
                            checked={hour.hours.length > 0}
                            disabled={updatingPlaceAction === 'operating-schedule'}
                            onChange={(event) =>
                              handleRegularOperatingDayEnabledChange(
                                hour.dayOfWeek,
                                event.target.checked
                              )
                            }
                          />
                          <span>{getDayOfWeekLabel(hour.dayOfWeek)}</span>
                        </S.OperatingCheckLabel>
                      </S.OperatingWeekRowHeader>
                      {hour.hours.length > 0 ? (
                        <S.OperatingExceptionHours>
                          {hour.hours.map((timeRange) => (
                            <S.OperatingExceptionTimeRow key={timeRange.id}>
                              <S.OperatingTimeControls>
                                <AdminTimePicker
                                  value={timeRange.opensAt}
                                  ariaLabel={`${getDayOfWeekLabel(hour.dayOfWeek)} 시작 시간`}
                                  disabled={
                                    updatingPlaceAction === 'operating-schedule'
                                  }
                                  onChange={(value) =>
                                    handleRegularOperatingHourChange(
                                      hour.dayOfWeek,
                                      timeRange.id,
                                      { opensAt: value }
                                    )
                                  }
                                />
                                <span>-</span>
                                <AdminTimePicker
                                  value={timeRange.closesAt}
                                  ariaLabel={`${getDayOfWeekLabel(hour.dayOfWeek)} 종료 시간`}
                                  disabled={
                                    updatingPlaceAction === 'operating-schedule'
                                  }
                                  onChange={(value) =>
                                    handleRegularOperatingHourChange(
                                      hour.dayOfWeek,
                                      timeRange.id,
                                      { closesAt: value }
                                    )
                                  }
                                />
                              </S.OperatingTimeControls>
                              <S.OperatingIconButton
                                type="button"
                                aria-label={`${getDayOfWeekLabel(hour.dayOfWeek)} 영업시간 삭제`}
                                title="시간 삭제"
                                disabled={
                                  updatingPlaceAction === 'operating-schedule'
                                }
                                onClick={() =>
                                  handleRemoveRegularOperatingHour(
                                    hour.dayOfWeek,
                                    timeRange.id
                                  )
                                }
                              >
                                <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
                              </S.OperatingIconButton>
                            </S.OperatingExceptionTimeRow>
                          ))}
                          <S.OperatingTextButton
                            type="button"
                            disabled={updatingPlaceAction === 'operating-schedule'}
                            onClick={() =>
                              handleAddRegularOperatingHour(hour.dayOfWeek)
                            }
                          >
                            <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                            시간대 추가
                          </S.OperatingTextButton>
                        </S.OperatingExceptionHours>
                      ) : null}
                    </S.OperatingWeekRow>
                  ))}
                </S.OperatingWeekList>
              </S.OperatingEditorSection>

              <S.OperatingEditorSection>
                <S.OperatingEditorSectionHeader>
                  <strong>예외 일정</strong>
                  <S.DetailInlineButton
                    type="button"
                    disabled={updatingPlaceAction === 'operating-schedule'}
                    onClick={handleAddOperatingException}
                  >
                    <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                    일정 추가
                  </S.DetailInlineButton>
                </S.OperatingEditorSectionHeader>
                {operatingExceptionDrafts.length > 0 ? (
                  <S.OperatingExceptionEditorList>
                    {operatingExceptionDrafts.map((exception) => (
                      <S.OperatingExceptionEditor key={exception.id}>
                        <S.OperatingExceptionEditorHeader>
                          <AdminDatePicker
                            value={exception.date}
                            ariaLabel="예외 일정 날짜"
                            disabled={updatingPlaceAction === 'operating-schedule'}
                            onChange={(value) =>
                              handleOperatingExceptionChange(exception.id, {
                                date: value,
                              })
                            }
                          />
                          <S.OperatingIconButton
                            type="button"
                            aria-label="예외 일정 삭제"
                            title="일정 삭제"
                            disabled={updatingPlaceAction === 'operating-schedule'}
                            onClick={() => handleRemoveOperatingException(exception.id)}
                          >
                            <S.MaterialIcon aria-hidden="true">delete</S.MaterialIcon>
                          </S.OperatingIconButton>
                        </S.OperatingExceptionEditorHeader>
                        <S.OperatingCheckLabel>
                          <input
                            type="checkbox"
                            checked={exception.closed}
                            disabled={updatingPlaceAction === 'operating-schedule'}
                            onChange={(event) =>
                              handleOperatingExceptionChange(exception.id, {
                                closed: event.target.checked,
                              })
                            }
                          />
                          <span>종일 휴무</span>
                        </S.OperatingCheckLabel>
                        {!exception.closed ? (
                          <S.OperatingExceptionHours>
                            {exception.hours.map((hour) => (
                              <S.OperatingExceptionTimeRow key={hour.id}>
                                <S.OperatingTimeControls>
                                  <AdminTimePicker
                                    value={hour.opensAt}
                                    ariaLabel="대체 영업 시작 시간"
                                    disabled={
                                      updatingPlaceAction === 'operating-schedule'
                                    }
                                    onChange={(value) =>
                                      handleOperatingExceptionHourChange(
                                        exception.id,
                                        hour.id,
                                        { opensAt: value }
                                      )
                                    }
                                  />
                                  <span>-</span>
                                  <AdminTimePicker
                                    value={hour.closesAt}
                                    ariaLabel="대체 영업 종료 시간"
                                    disabled={
                                      updatingPlaceAction === 'operating-schedule'
                                    }
                                    onChange={(value) =>
                                      handleOperatingExceptionHourChange(
                                        exception.id,
                                        hour.id,
                                        { closesAt: value }
                                      )
                                    }
                                  />
                                </S.OperatingTimeControls>
                                <S.OperatingIconButton
                                  type="button"
                                  aria-label="대체 영업 시간 삭제"
                                  title="시간 삭제"
                                  disabled={
                                    exception.hours.length <= 1 ||
                                    updatingPlaceAction === 'operating-schedule'
                                  }
                                  onClick={() =>
                                    handleRemoveOperatingExceptionHour(
                                      exception.id,
                                      hour.id
                                    )
                                  }
                                >
                                  <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
                                </S.OperatingIconButton>
                              </S.OperatingExceptionTimeRow>
                            ))}
                            <S.OperatingTextButton
                              type="button"
                              disabled={updatingPlaceAction === 'operating-schedule'}
                              onClick={() => handleAddOperatingExceptionHour(exception.id)}
                            >
                              <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                              시간대 추가
                            </S.OperatingTextButton>
                          </S.OperatingExceptionHours>
                        ) : null}
                      </S.OperatingExceptionEditor>
                    ))}
                  </S.OperatingExceptionEditorList>
                ) : (
                  <S.OperatingEmptyState>
                    등록된 예외 일정이 없습니다.
                  </S.OperatingEmptyState>
                )}
              </S.OperatingEditorSection>

              <S.OperatingFormField>
                <span>수정 사유</span>
                <S.OperatingTextArea
                  value={operatingScheduleReason}
                  maxLength={500}
                  placeholder="예: 광복절 휴무와 주말 영업시간 반영"
                  disabled={updatingPlaceAction === 'operating-schedule'}
                  onChange={(event) => {
                    setOperatingScheduleReason(event.target.value)
                    setOperatingScheduleFormError('')
                  }}
                />
                <small>{operatingScheduleReason.length}/500</small>
              </S.OperatingFormField>
              {operatingScheduleFormError ? (
                <S.OperatingFormNotice role="alert">
                  {operatingScheduleFormError}
                </S.OperatingFormNotice>
              ) : null}
              {actionErrorMessage && !operatingScheduleFormError ? (
                <S.OperatingFormNotice role="alert">
                  {actionErrorMessage}
                </S.OperatingFormNotice>
              ) : null}
            </S.OperatingDialogBody>
            <S.OperatingDialogActions>
              <S.SecondaryButton
                type="button"
                disabled={updatingPlaceAction === 'operating-schedule'}
                onClick={handleCloseOperatingScheduleEdit}
              >
                취소
              </S.SecondaryButton>
              <S.OperatingPrimaryButton
                type="button"
                disabled={updatingPlaceAction === 'operating-schedule'}
                onClick={handleConfirmOperatingScheduleEdit}
              >
                {updatingPlaceAction === 'operating-schedule' ? '저장 중' : '영업시간 저장'}
              </S.OperatingPrimaryButton>
            </S.OperatingDialogActions>
          </S.OperatingDialog>
        </S.OperatingDialogOverlay>
      ) : null}

      {deleteConfirmPlace ? (
        <S.DeleteConfirmOverlay
          role="presentation"
          onMouseDown={handleCloseDeleteConfirm}
        >
          <S.DeleteConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-delete-confirm-title"
            aria-describedby="place-delete-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.DeleteConfirmIcon aria-hidden="true">
              <S.MaterialIcon>delete</S.MaterialIcon>
            </S.DeleteConfirmIcon>
            <S.DeleteConfirmTitle id="place-delete-confirm-title">
              장소를 삭제할까요?
            </S.DeleteConfirmTitle>
            <S.DeleteConfirmDescription id="place-delete-confirm-description">
              장소 #{deleteConfirmPlace.id}은 삭제 후 관리자 화면에서 다시 복구할 수
              없습니다.
            </S.DeleteConfirmDescription>
            <S.DeleteConfirmMeta>
              {deleteConfirmPlace.name} · {deleteConfirmPlace.address || '주소 정보 없음'}
            </S.DeleteConfirmMeta>
            <S.DeleteConfirmWarning>
              {deleteConfirmPlace.postCount > 0
                ? `연결된 게시글 ${deleteConfirmPlace.postCount.toLocaleString()}개도 함께 삭제됩니다. 삭제 전에 연결 게시글을 확인해 주세요.`
                : '연결된 게시글은 없지만 삭제 후 복구가 어려울 수 있습니다.'}
            </S.DeleteConfirmWarning>

            {hasDeleteConfirmAttempted && actionErrorMessage ? (
              <S.DeleteConfirmNotice role="alert">
                {actionErrorMessage}
              </S.DeleteConfirmNotice>
            ) : null}

            <S.DeleteConfirmActions>
              <S.SecondaryButton
                type="button"
                disabled={deletingPlaceId !== null}
                onClick={handleCloseDeleteConfirm}
              >
                취소
              </S.SecondaryButton>
              <S.DangerButton
                type="button"
                disabled={deletingPlaceId !== null}
                onClick={handleConfirmDeletePlace}
              >
                {deletingPlaceId === deleteConfirmPlace.id ? '삭제 중' : '삭제하기'}
              </S.DangerButton>
            </S.DeleteConfirmActions>
          </S.DeleteConfirmDialog>
        </S.DeleteConfirmOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default PlaceManagePage
