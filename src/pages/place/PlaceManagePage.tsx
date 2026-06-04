import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KakaoMapHandle } from '../../components/map/KakaoMap'
import { useAdminPlaces } from '../../hooks/useAdminPlaces'
import { useAuth } from '../../hooks/useAuth'
import type { AdminPlaceItem } from '../../types/adminPlace.types'
import * as S from './PlaceManagePage.styles'

const ADMIN_PLACE_PAGE_SIZE = 10
const ADMIN_PLACE_USE_MOCK_DATA = true
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 3

function formatCoordinate(place: AdminPlaceItem) {
  if (
    typeof place.latitude !== 'number' ||
    typeof place.longitude !== 'number' ||
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude)
  ) {
    return '좌표 정보 없음'
  }

  return `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`
}

function getPlaceOwner(place: AdminPlaceItem) {
  return `사용자 ID: ${place.userId}`
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
  const { logout } = useAuth()
  const mapRef = useRef<KakaoMapHandle | null>(null)
  const placeListRef = useRef<HTMLDivElement | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<AdminPlaceItem | null>(null)
  const {
    places,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    fetchAdminPlaces,
  } = useAdminPlaces({
    limit: ADMIN_PLACE_PAGE_SIZE,
    useMockData: ADMIN_PLACE_USE_MOCK_DATA,
  })
  const safeTotalPages = Math.max(totalPages, 1)
  const showPagination = safeTotalPages > 1
  const visiblePageNumbers = getVisiblePageNumbers(page, safeTotalPages)
  const showEdgePageButtons = safeTotalPages > MAX_VISIBLE_PAGE_NUMBER_COUNT

  const handleRefresh = () => {
    void fetchAdminPlaces({ page })
  }

  const handlePageChange = (nextPage: number) => {
    const nextPageNumber = Math.min(Math.max(nextPage, 1), safeTotalPages)

    if (nextPageNumber === page || isLoading) {
      return
    }

    void fetchAdminPlaces({ page: nextPageNumber }).then((isSuccess) => {
      if (isSuccess) {
        setSelectedPlace(null)
        window.requestAnimationFrame(() => {
          placeListRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        })
      }
    })
  }

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.ProfileAvatar>
            <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
          </S.ProfileAvatar>
          <div>
            <S.SideTitle>관리자 패널</S.SideTitle>
            <S.SideCaption>운영 MVP</S.SideCaption>
          </div>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
          </S.MenuButton>
          <S.MenuButton type="button" $active>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 조회</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/main')}>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>콘텐츠 목록</span>
          </S.MenuButton>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">gavel</S.MaterialIcon>
            <span>신고 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">settings</S.MaterialIcon>
            <span>설정</span>
          </S.MenuButton>
        </S.SideMenu>

        <S.SideFooter>
          <S.LogoutButton
            type="button"
            onClick={() => {
              logout()
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

        <S.SplitContent>
          <S.PlacePanel>
            <S.PanelControls>
              <S.PanelSummary>
                <S.PanelCount>
                  전체 장소 <strong>{totalCount}</strong>개
                </S.PanelCount>
                <S.IconFilterButton
                  type="button"
                  aria-label="장소 목록 새로고침"
                  disabled={isLoading}
                  onClick={handleRefresh}
                >
                  <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                </S.IconFilterButton>
              </S.PanelSummary>
            </S.PanelControls>

            <S.PlaceList ref={placeListRef} aria-label="장소 목록">
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

                  return (
                    <S.PlaceItem
                      key={place.id}
                      type="button"
                      $active={isSelected}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <S.PlaceThumb>
                        <S.MaterialIcon aria-hidden="true">location_city</S.MaterialIcon>
                      </S.PlaceThumb>
                      <S.PlaceInfo>
                        <S.PlaceTitleRow>
                          <S.PlaceName>{place.name}</S.PlaceName>
                        </S.PlaceTitleRow>
                        <S.PlaceCaption>장소 ID: {place.id}</S.PlaceCaption>
                        <S.PlaceMeta>
                          <S.MaterialIcon aria-hidden="true">map</S.MaterialIcon>
                          <span>{place.address || '주소 정보 없음'}</span>
                        </S.PlaceMeta>
                        <S.PlaceMeta>
                          <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
                          <span>{formatCoordinate(place)}</span>
                        </S.PlaceMeta>
                        <S.PlaceFooter>
                          <span>{getPlaceOwner(place)}</span>
                        </S.PlaceFooter>
                      </S.PlaceInfo>
                    </S.PlaceItem>
                  )
                })
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

          <S.MapPanel>
            <S.AdminMap ref={mapRef} />
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
                  : '장소 목록 조회가 연결되었습니다.'}
              </span>
            </S.MapInfo>
          </S.MapPanel>
        </S.SplitContent>
      </S.MainArea>
    </S.AppShell>
  )
}

export default PlaceManagePage
