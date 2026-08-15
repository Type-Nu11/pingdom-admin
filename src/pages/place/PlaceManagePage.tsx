import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import {
  PlaceOperationPanel,
  type PlaceOperation,
} from '../../components/place/PlaceOperationPanel'
import { PlaceOperatingNoticeDialog } from '../../components/place/PlaceOperatingNoticeDialog'
import { PlaceTouristInfoDialog } from '../../components/place/PlaceTouristInfoDialog'
import {
  PlaceDataCorrectionDialog,
  type PlaceDataCorrectionAction,
} from '../../components/place/PlaceDataCorrectionDialog'
import { PlaceDangerZoneDialog } from '../../components/place/PlaceDangerZoneDialog'
import { PlaceInspector } from '../../components/place/PlaceInspector'
import { PlaceMapPanel } from '../../components/place/PlaceMapPanel'
import { PlaceListPanel } from '../../components/place/PlaceListPanel'
import type {
  KakaoMapHandle,
  KakaoMapMarker,
} from '../../components/map/KakaoMap'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaceOperatingNotices } from '../../hooks/useAdminPlaceOperatingNotices'
import { useAdminPlaces } from '../../hooks/useAdminPlaces'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPlaceCategory,
  AdminPlaceCoordinatesUpdateRequest,
  AdminPlaceDetail,
  AdminPlaceDiscoveryStatus,
  AdminPlaceGeocodingUpdateRequest,
  AdminPlaceItem,
  AdminPlaceListSortParam,
} from '../../types/adminPlace.types'
import * as S from './PlaceManagePage.styles'

const ADMIN_PLACE_PAGE_SIZE = 10
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 3
const PLACE_SEARCH_DEBOUNCE_MS = 300
const DEFAULT_PLACE_SORT_PARAM: AdminPlaceListSortParam = 'LATEST'
function hasValidCoordinate(place: AdminPlaceItem) {
  return (
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number' &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  )
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
  const latestCategoryRef = useRef<AdminPlaceCategory | undefined>(undefined)
  const shouldSkipNextSearchEffectRef = useRef(false)
  const searchTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<AdminPlaceItem | null>(null)
  const [isPlacePanelCollapsed, setIsPlacePanelCollapsed] = useState(false)
  const [deleteConfirmPlace, setDeleteConfirmPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [placeOperation, setPlaceOperation] = useState<{
    action: PlaceOperation
    place: AdminPlaceDetail
  } | null>(null)
  const [touristInfoEditPlace, setTouristInfoEditPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [operatingNoticePlace, setOperatingNoticePlace] =
    useState<AdminPlaceDetail | null>(null)
  const [dataCorrectionPlace, setDataCorrectionPlace] =
    useState<AdminPlaceDetail | null>(null)
  const [selectedSortParam, setSelectedSortParam] = useState(DEFAULT_PLACE_SORT_PARAM)
  const [selectedCategory, setSelectedCategory] = useState<AdminPlaceCategory | ''>('')
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
    updatePlaceDiscoveryStatus,
    updatePlaceOperatingStatus,
    updatePlaceOperatingSchedule,
    updatePlaceTouristInfo,
    updatePlaceKakaoPlaceId,
    updatePlaceCoordinates,
    updatePlaceGeocoding,
  } = useAdminPlaces({
    limit: ADMIN_PLACE_PAGE_SIZE,
  })
  const {
    runningActions: noticeRunningActions,
    actionErrors: noticeActionErrors,
    clearActionError: clearNoticeActionError,
    createNotice,
    updateNotice,
    cancelNotice,
    expireNotices,
  } = useAdminPlaceOperatingNotices()
  const safeTotalPages = Math.max(totalPages, 1)
  const visiblePageNumbers = getVisiblePageNumbers(page, safeTotalPages)
  const placeKeyword = placeSearchQuery.trim()
  const hasActivePlaceFilter = placeKeyword.length > 0 || selectedCategory !== ''
  const pageStart = totalCount > 0 ? (page - 1) * ADMIN_PLACE_PAGE_SIZE + 1 : 0
  const pageEnd = totalCount > 0 ? pageStart + places.length - 1 : 0
  const pageRangeLabel =
    totalCount > 0
      ? `${pageStart.toLocaleString()}–${pageEnd.toLocaleString()} / ${totalCount.toLocaleString()}개`
      : '0개'
  const isPlaceDetailOpen = selectedPlace !== null
  const isDeletingSelectedPlace =
    selectedPlace !== null && deletingPlaceId === selectedPlace.id
  const activeOperationErrorMessage = placeOperation
    ? updateErrorMessages[placeOperation.action]
    : ''
  const activeUpdatingAction =
    placeOperation && updatingPlaceIds[placeOperation.action] !== null
      ? placeOperation.action
      : null
  const activeDataCorrectionAction: PlaceDataCorrectionAction | null =
    updatingPlaceIds.geocoding !== null
      ? 'geocoding'
      : updatingPlaceIds.coordinates !== null
        ? 'coordinates'
        : updatingPlaceIds['kakao-place-id'] !== null
          ? 'kakao-place-id'
          : null
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
    latestCategoryRef.current = selectedCategory || undefined
  }, [selectedCategory])

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
        category: latestCategoryRef.current,
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

  const handleClearPlaceSearch = () => {
    clearPendingPlaceSearch()
    shouldSkipNextSearchEffectRef.current = true
    setPlaceSearchQuery('')
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page: 1,
      sortParam: selectedSortParam,
      keyword: '',
      category: selectedCategory || undefined,
    }).then((isSuccess) => {
      if (isSuccess) {
        scrollPlaceListToTop()
      }
    })
  }

  const handleClearPlaceFilters = () => {
    clearPendingPlaceSearch()
    shouldSkipNextSearchEffectRef.current = true
    setPlaceSearchQuery('')
    setSelectedCategory('')
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page: 1,
      sortParam: selectedSortParam,
      keyword: '',
      category: undefined,
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
      category: selectedCategory || undefined,
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
      category: selectedCategory || undefined,
    }).then((isSuccess) => {
      if (isSuccess) {
        handleClosePlaceDetail()
        scrollPlaceListToTop()
      }
    })
  }

  const handleCategoryChange = (value: string) => {
    const nextCategory = value as AdminPlaceCategory | ''

    clearPendingPlaceSearch()
    setSelectedCategory(nextCategory)
    handleClosePlaceDetail()

    void fetchAdminPlaces({
      page: 1,
      sortParam: selectedSortParam,
      keyword: placeKeyword,
      category: nextCategory || undefined,
    }).then((isSuccess) => {
      if (isSuccess) {
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
      category: selectedCategory || undefined,
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
  }

  const handleCloseDeleteConfirm = useCallback(() => {
    if (deletingPlaceId !== null) {
      return
    }

    setDeleteConfirmPlace(null)
  }, [deletingPlaceId])

  const handleDeleteCompleted = () => {
    setDeleteConfirmPlace(null)
    handleClosePlaceDetail()
  }

  const handleOpenPlaceOperation = (action: PlaceOperation) => {
    if (!placeDetail || updatingPlaceIds[action] !== null) {
      return
    }

    clearUpdateErrorMessage(action)
    setPlaceOperation({ action, place: placeDetail })
  }

  const handleClosePlaceOperation = useCallback(() => {
    if (
      placeOperation &&
      updatingPlaceIds[placeOperation.action] !== null
    ) {
      return
    }

    setPlaceOperation(null)
  }, [placeOperation, updatingPlaceIds])

  const handleDiscoveryStatusUpdated = useCallback(
    (discoveryStatus: AdminPlaceDiscoveryStatus) => {
      setSelectedPlace((currentPlace) =>
        currentPlace && placeOperation?.place.id === currentPlace.id
          ? { ...currentPlace, discoveryStatus }
          : currentPlace
      )
    },
    [placeOperation?.place.id]
  )

  const handleOpenTouristInfo = () => {
    if (!placeDetail || updatingPlaceIds['tourist-info'] !== null) {
      return
    }

    clearUpdateErrorMessage('tourist-info')
    setTouristInfoEditPlace(placeDetail)
  }

  const handleCloseTouristInfo = useCallback(() => {
    if (updatingPlaceIds['tourist-info'] !== null) {
      return
    }

    setTouristInfoEditPlace(null)
  }, [updatingPlaceIds])

  const handleOpenOperatingNotices = () => {
    if (!placeDetail) {
      return
    }

    clearNoticeActionError('create')
    clearNoticeActionError('update')
    clearNoticeActionError('cancel')
    clearNoticeActionError('expire')
    setOperatingNoticePlace(placeDetail)
  }

  const handleCloseOperatingNotices = useCallback(() => {
    if (Object.values(noticeRunningActions).some(Boolean)) {
      return
    }

    setOperatingNoticePlace(null)
  }, [noticeRunningActions])

  const handleOpenDataCorrection = () => {
    if (!placeDetail || activeDataCorrectionAction) {
      return
    }

    clearUpdateErrorMessage('geocoding')
    clearUpdateErrorMessage('coordinates')
    clearUpdateErrorMessage('kakao-place-id')
    setDataCorrectionPlace(placeDetail)
  }

  const handleCloseDataCorrection = useCallback(() => {
    if (activeDataCorrectionAction) {
      return
    }

    setDataCorrectionPlace(null)
  }, [activeDataCorrectionAction])

  const handleUpdateCoordinates = useCallback(
    async (payload: AdminPlaceCoordinatesUpdateRequest) => {
      if (!dataCorrectionPlace) {
        return false
      }

      const isSuccess = await updatePlaceCoordinates(dataCorrectionPlace.id, payload)
      if (isSuccess) {
        setSelectedPlace((current) =>
          current?.id === dataCorrectionPlace.id ? { ...current, ...payload } : current
        )
      }

      return isSuccess
    },
    [dataCorrectionPlace, updatePlaceCoordinates]
  )

  const handleUpdateGeocoding = useCallback(
    async (payload: AdminPlaceGeocodingUpdateRequest) => {
      if (!dataCorrectionPlace) {
        return false
      }

      const isSuccess = await updatePlaceGeocoding(dataCorrectionPlace.id, payload)
      if (isSuccess) {
        setSelectedPlace((current) =>
          current?.id === dataCorrectionPlace.id
            ? {
                ...current,
                address: payload.address,
                roadAddress: payload.roadAddress,
                jibunAddress: payload.jibunAddress,
                postalCode: payload.postalCode,
                latitude: payload.latitude,
                longitude: payload.longitude,
              }
            : current
        )
      }

      return isSuccess
    },
    [dataCorrectionPlace, updatePlaceGeocoding]
  )

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
          <PlaceListPanel
            listRef={placeListRef}
            collapsed={isPlacePanelCollapsed}
            places={places}
            selectedPlaceId={selectedPlace?.id ?? null}
            searchQuery={placeSearchQuery}
            sortParam={selectedSortParam}
            category={selectedCategory}
            page={page}
            totalCount={totalCount}
            totalPages={safeTotalPages}
            hasNext={hasNext}
            isLoading={isLoading}
            isError={isError}
            errorMessage={errorMessage}
            pageRangeLabel={pageRangeLabel}
            visiblePageNumbers={visiblePageNumbers}
            hasActiveFilter={hasActivePlaceFilter}
            onCollapse={() => setIsPlacePanelCollapsed(true)}
            onSearchChange={handleSearchQueryChange}
            onClearSearch={handleClearPlaceSearch}
            onSortChange={handleSortChange}
            onCategoryChange={handleCategoryChange}
            onRefresh={handleRefresh}
            onClearFilters={handleClearPlaceFilters}
            onSelectPlace={handleSelectPlace}
            onPageChange={handlePageChange}
          />

          <PlaceMapPanel
            panelRef={mapPanelRef}
            mapRef={mapRef}
            markers={placeMapMarkers}
            displayCount={places.length}
            fitBoundsKey={placeMapFitBoundsKey}
            selectedPlaceId={selectedPlace?.id ?? null}
            isListCollapsed={isPlacePanelCollapsed}
            isInspectorOpen={isPlaceDetailOpen}
            onMarkerSelect={handleSelectMapMarker}
            onOpenList={() => setIsPlacePanelCollapsed(false)}
            inspector={
              <PlaceInspector
                ref={placeDetailPanelRef}
                selectedPlace={selectedPlace}
                placeDetail={placeDetail}
                isLoading={isDetailLoading}
                errorMessage={detailErrorMessage}
                updatingPlaceIds={updatingPlaceIds}
                deletingPlaceId={deletingPlaceId}
                onClose={handleClosePlaceDetail}
                onRetry={(placeId) => void fetchAdminPlaceDetail(placeId)}
                onFocusMap={focusPlaceOnVisibleMap}
                onOpenOperation={handleOpenPlaceOperation}
                onOpenTouristInfo={handleOpenTouristInfo}
                onOpenOperatingNotices={handleOpenOperatingNotices}
                onOpenDataCorrection={handleOpenDataCorrection}
                onOpenPost={handleOpenPostDetail}
                onOpenPlacePosts={handleOpenPlacePosts}
                onOpenDelete={handleOpenDeleteConfirm}
              />
            }
          />
        </S.SplitContent>
      </S.MainArea>

      {actionSuccessMessage ? (
        <S.ActionToast role="status">
          <S.MaterialIcon aria-hidden="true">check_circle</S.MaterialIcon>
          <span>{actionSuccessMessage}</span>
        </S.ActionToast>
      ) : null}

      {placeOperation ? (
        <PlaceOperationPanel
          action={placeOperation.action}
          place={placeOperation.place}
          actionErrorMessage={activeOperationErrorMessage}
          updatingAction={activeUpdatingAction}
          onClose={handleClosePlaceOperation}
          onDiscoveryStatusUpdated={handleDiscoveryStatusUpdated}
          onUpdateOperatingStatus={updatePlaceOperatingStatus}
          onUpdateDiscoveryStatus={updatePlaceDiscoveryStatus}
          onUpdateOperatingSchedule={updatePlaceOperatingSchedule}
        />
      ) : null}

      {touristInfoEditPlace ? (
        <PlaceTouristInfoDialog
          place={touristInfoEditPlace}
          isSaving={updatingPlaceIds['tourist-info'] !== null}
          errorMessage={updateErrorMessages['tourist-info']}
          onClose={handleCloseTouristInfo}
          onSubmit={updatePlaceTouristInfo}
        />
      ) : null}

      {operatingNoticePlace ? (
        <PlaceOperatingNoticeDialog
          place={operatingNoticePlace}
          runningActions={noticeRunningActions}
          actionErrors={noticeActionErrors}
          onClearActionError={clearNoticeActionError}
          onClose={handleCloseOperatingNotices}
          onCreate={createNotice}
          onUpdate={updateNotice}
          onCancel={cancelNotice}
          onExpire={expireNotices}
        />
      ) : null}

      {dataCorrectionPlace ? (
        <PlaceDataCorrectionDialog
          place={dataCorrectionPlace}
          updatingAction={activeDataCorrectionAction}
          errorMessages={{
            geocoding: updateErrorMessages.geocoding,
            coordinates: updateErrorMessages.coordinates,
            'kakao-place-id': updateErrorMessages['kakao-place-id'],
          }}
          onClearError={clearUpdateErrorMessage}
          onClose={handleCloseDataCorrection}
          onUpdateKakaoPlaceId={(payload) =>
            updatePlaceKakaoPlaceId(dataCorrectionPlace.id, payload)
          }
          onUpdateCoordinates={handleUpdateCoordinates}
          onUpdateGeocoding={handleUpdateGeocoding}
        />
      ) : null}

      {deleteConfirmPlace ? (
        <PlaceDangerZoneDialog
          place={deleteConfirmPlace}
          deletingPlaceId={deletingPlaceId}
          errorMessage={deleteErrorMessage}
          onClose={handleCloseDeleteConfirm}
          onDelete={deletePlace}
          onDeleted={handleDeleteCompleted}
        />
      ) : null}
    </S.AppShell>
  )
}

export default PlaceManagePage
