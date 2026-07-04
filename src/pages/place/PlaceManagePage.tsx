import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  KakaoMapHandle,
  KakaoMapMarker,
} from '../../components/map/KakaoMap'
import SortDropdown from '../../components/common/SortDropdown'
import { useAdminPlaces } from '../../hooks/useAdminPlaces'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPlaceDetail,
  AdminPlaceItem,
  AdminPlaceListSortParam,
} from '../../types/adminPlace.types'
import {
  getPlaceCategoryIconName,
  getPlaceCategoryLabel,
} from '../../utils/placeCategory'
import * as S from './PlaceManagePage.styles'

const ADMIN_PLACE_PAGE_SIZE = 10
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 3
const PLACE_SEARCH_DEBOUNCE_MS = 300
const DEFAULT_PLACE_SORT_PARAM: AdminPlaceListSortParam = 'LATEST'
const PLACE_SORT_OPTIONS = [
  { value: 'LATEST', label: '최신순' },
  { value: 'OLDEST', label: '오래된순' },
]
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

function getPlaceOwner(place: AdminPlaceItem) {
  return place.registrant || `사용자 ID: ${place.userId}`
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

function getPlaceGrowthProgress(place: AdminPlaceItem) {
  const progressPercent = place.placeGrowth?.progressPercent

  if (typeof progressPercent !== 'number' || !Number.isFinite(progressPercent)) {
    return null
  }

  return Math.min(Math.max(Math.round(progressPercent), 0), 100)
}

function getPlaceGrowthProgressLabel(place: AdminPlaceItem) {
  const progressPercent = getPlaceGrowthProgress(place)

  return progressPercent === null ? '-' : `${progressPercent}%`
}

function getDetailGrowthProgressLabel(placeDetail: AdminPlaceDetail) {
  const progressPercent = placeDetail.placeGrowth?.progressPercent

  if (typeof progressPercent !== 'number' || !Number.isFinite(progressPercent)) {
    return '-'
  }

  return `${Math.min(Math.max(Math.round(progressPercent), 0), 100)}%`
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
    fetchAdminPlaces,
    fetchAdminPlaceDetail,
    clearPlaceDetail,
    deletePlace,
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
  const selectedPlaceHasCoordinate = selectedPlace
    ? hasValidCoordinate(selectedPlace)
    : false
  const isPlaceDetailOpen = selectedPlace !== null
  const isDeletingSelectedPlace =
    selectedPlace !== null && deletingPlaceId === selectedPlace.id
  const placeMapMarkers = useMemo<KakaoMapMarker[]>(
    () =>
      places.filter(hasValidCoordinate).map((place) => ({
        id: place.id,
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.name,
        category: place.category,
        categoryName: place.categoryName,
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

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.BrandLockup>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </S.BrandLockup>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button" disabled aria-label="대시보드 점검 중">
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
            <S.MenuStatusText>점검 중</S.MenuStatusText>
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

      <S.MainArea>
        <S.TopBar>
          <S.TopTitleGroup>
            <S.TopTitle>장소 관리</S.TopTitle>
          </S.TopTitleGroup>
          <S.TopActions>
            <S.IconButton type="button" aria-label="알림">
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
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

              <S.PanelActionGroup>
                <SortDropdown
                  ariaLabel="장소 목록 정렬"
                  value={selectedSortParam}
                  options={PLACE_SORT_OPTIONS}
                  disabled={isLoading}
                  width="104px"
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
              </S.SearchField>

              <S.PanelResultSummary>
                현재 페이지 장소 {places.length.toLocaleString()}개 표시
                {hasActivePlaceFilter ? (
                  <S.ClearFilterButton type="button" onClick={handleClearPlaceFilters}>
                    검색 초기화
                  </S.ClearFilterButton>
                ) : null}
              </S.PanelResultSummary>
            </S.PanelControls>

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
                <S.EmptyState>장소 목록을 불러오는 중입니다.</S.EmptyState>
              ) : isError ? (
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
                places.map((place) => {
                  const isSelected = selectedPlace?.id === place.id
                  const placeCategoryLabel = getPlaceCategoryLabel(place)

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
                          <S.PlaceName>{place.name}</S.PlaceName>
                          <S.PlaceCategoryBadge>{placeCategoryLabel}</S.PlaceCategoryBadge>
                        </S.PlaceTitleRow>
                        <S.PlaceCaption>
                          장소 ID: {place.id} · {getPlaceOwner(place)}
                        </S.PlaceCaption>
                        <S.PlaceMeta>
                          <S.MaterialIcon aria-hidden="true">map</S.MaterialIcon>
                          <span>{place.address || '주소 정보 없음'}</span>
                        </S.PlaceMeta>
                        <S.PlaceMeta>
                          <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
                          <span>{formatCoordinate(place)}</span>
                        </S.PlaceMeta>
                        <S.PlaceStatList aria-label={`${place.name} 장소 지표`}>
                          <S.PlaceStat>
                            <S.MaterialIcon aria-hidden="true">military_tech</S.MaterialIcon>
                            <span>레벨 {getPlaceLevel(place)}</span>
                          </S.PlaceStat>
                          <S.PlaceStat>
                            <S.MaterialIcon aria-hidden="true">photo_camera</S.MaterialIcon>
                            <span>사진 {getPlacePhotoCount(place)}장</span>
                          </S.PlaceStat>
                          <S.PlaceStat>
                            <S.MaterialIcon aria-hidden="true">trending_up</S.MaterialIcon>
                            <span>다음 레벨까지 {getPlaceGrowthProgressLabel(place)}</span>
                          </S.PlaceStat>
                        </S.PlaceStatList>
                      </S.PlaceInfo>
                    </S.PlaceItem>
                  )
                })
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
                      <S.DetailEyebrow>PLACE DETAIL</S.DetailEyebrow>
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
                      <S.DetailNotice role="alert">{detailErrorMessage}</S.DetailNotice>
                    ) : placeDetail ? (
                      <>
                        <S.DetailMetaList>
                          <S.DetailMetaItem>
                            <span>장소 ID</span>
                            <strong>{placeDetail.id}</strong>
                          </S.DetailMetaItem>
                          <S.DetailMetaItem>
                            <span>주소</span>
                            <strong>{placeDetail.address || '주소 정보 없음'}</strong>
                          </S.DetailMetaItem>
                          <S.DetailMetaItem>
                            <span>카테고리</span>
                            <strong>{getPlaceCategoryLabel(placeDetail)}</strong>
                          </S.DetailMetaItem>
                          <S.DetailMetaItem>
                            <span>등록자</span>
                            <strong>
                              {placeDetail.username || `사용자 ID: ${placeDetail.userId}`}
                            </strong>
                          </S.DetailMetaItem>
                          <S.DetailMetaItem>
                            <span>좌표</span>
                            <strong>
                              {placeDetail.latitude.toFixed(6)},{' '}
                              {placeDetail.longitude.toFixed(6)}
                            </strong>
                          </S.DetailMetaItem>
                        </S.DetailMetaList>

                        <S.DetailSection>
                          <S.DetailSectionTitle>장소 성장</S.DetailSectionTitle>
                          <S.PlaceStatList>
                            <S.PlaceStat>
                              <S.MaterialIcon aria-hidden="true">military_tech</S.MaterialIcon>
                              <span>
                                레벨 {formatOptionalNumber(placeDetail.placeGrowth?.level)}
                              </span>
                            </S.PlaceStat>
                            <S.PlaceStat>
                              <S.MaterialIcon aria-hidden="true">photo_camera</S.MaterialIcon>
                              <span>
                                사진{' '}
                                {formatOptionalNumber(placeDetail.placeGrowth?.photoCount)}장
                              </span>
                            </S.PlaceStat>
                            <S.PlaceStat>
                              <S.MaterialIcon aria-hidden="true">trending_up</S.MaterialIcon>
                              <span>
                                다음 레벨까지 {getDetailGrowthProgressLabel(placeDetail)}
                              </span>
                            </S.PlaceStat>
                          </S.PlaceStatList>
                        </S.DetailSection>

                        <S.DetailSection>
                          <S.DetailSectionTitle>
                            연결 게시글 {placeDetail.postCount.toLocaleString()}개
                          </S.DetailSectionTitle>
                          {placeDetail.posts.length > 0 ? (
                            <S.DetailPostList>
                              {placeDetail.posts.map((post) => (
                                <S.DetailPostItem key={post.id}>
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
                                    <S.DetailPostTitleButton
                                      type="button"
                                      onClick={() =>
                                        navigate('/main', {
                                          state: {
                                            openPostId: post.id,
                                          },
                                        })
                                      }
                                    >
                                      {post.title || `게시글 #${post.id}`}
                                    </S.DetailPostTitleButton>
                                    <p>
                                      {post.description || '설명 없음'}
                                    </p>
                                    <S.DetailPostMeta>
                                      {post.username || `사용자 ID: ${post.userId}`} · 좋아요{' '}
                                      {post.likeCount.toLocaleString()} ·{' '}
                                      {formatPlacePostDate(post.createdAt)}
                                    </S.DetailPostMeta>
                                  </S.DetailPostText>
                                </S.DetailPostItem>
                              ))}
                            </S.DetailPostList>
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
            <S.MapInfo>
              <S.MapInfoDot />
              <span>
                {selectedPlace
                  ? `선택된 장소: ${selectedPlace.name}`
                  : `${places.length.toLocaleString()}개 장소를 확인 중입니다.`}
              </span>
            </S.MapInfo>
          </S.MapPanel>
        </S.SplitContent>
      </S.MainArea>

      {actionSuccessMessage ? (
        <S.ActionToast role="status">
          <S.MaterialIcon aria-hidden="true">check_circle</S.MaterialIcon>
          <span>{actionSuccessMessage}</span>
        </S.ActionToast>
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
