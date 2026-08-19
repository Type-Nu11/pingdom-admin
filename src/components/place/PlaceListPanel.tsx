import type { RefObject } from 'react'
import SortDropdown from '../common/SortDropdown'
import type {
  AdminPlaceCategory,
  AdminPlaceItem,
  AdminPlaceListSortParam,
} from '../../types/adminPlace.types'
import {
  getPlaceCategoryIconName,
  getPlaceCategoryLabel,
} from '../../utils/placeCategory'
import * as S from '../../pages/place/PlaceManagePage.styles'

const SORT_OPTIONS = [
  { value: 'LATEST', label: '최신순' },
  { value: 'OLDEST', label: '오래된순' },
  { value: 'LEVEL_DESC', label: '레벨 높은순' },
]

const CATEGORY_OPTIONS: AdminPlaceCategory[] = [
  '음식점',
  '음악',
  '팝업',
  '패션',
  '뷰티',
  '전시',
  '카페',
  '문화재',
  '기타',
]

interface PlaceListPanelProps {
  listRef: RefObject<HTMLDivElement | null>
  collapsed: boolean
  places: AdminPlaceItem[]
  selectedPlaceId: number | null
  searchQuery: string
  sortParam: AdminPlaceListSortParam
  category: AdminPlaceCategory | ''
  page: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  isLoading: boolean
  isError: boolean
  errorMessage: string
  pageRangeLabel: string
  visiblePageNumbers: number[]
  hasActiveFilter: boolean
  onCollapse: () => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  onSortChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onRefresh: () => void
  onClearFilters: () => void
  onSelectPlace: (place: AdminPlaceItem) => void
  onPageChange: (page: number) => void
}

function formatOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '-'
}

function getDisplayName(place: AdminPlaceItem) {
  const name = place.name?.trim()
  return !name || name === place.address?.trim() ? '이름 없는 장소' : name
}

function getRegistrantLabel(place: AdminPlaceItem) {
  if (place.registrant) {
    return place.registrant
  }

  return typeof place.userId === 'number' && Number.isFinite(place.userId)
    ? `ID ${place.userId}`
    : '등록자 정보 없음'
}

export function PlaceListPanel({
  listRef,
  collapsed,
  places,
  selectedPlaceId,
  searchQuery,
  sortParam,
  category,
  page,
  totalCount,
  totalPages,
  hasNext,
  isLoading,
  isError,
  errorMessage,
  pageRangeLabel,
  visiblePageNumbers,
  hasActiveFilter,
  onCollapse,
  onSearchChange,
  onClearSearch,
  onSortChange,
  onCategoryChange,
  onRefresh,
  onClearFilters,
  onSelectPlace,
  onPageChange,
}: PlaceListPanelProps) {
  const showPagination = totalPages > 1
  const showEdgePageButtons = totalPages > 3
  const isUpdatingList = isLoading && places.length > 0

  return (
    <S.PlacePanel $collapsed={collapsed}>
      <S.PanelControls>
        <S.PanelSummary>
          <S.PanelCount>
            {hasActiveFilter ? '필터 결과' : '전체 장소'}{' '}
            <strong>{totalCount.toLocaleString()}</strong>개
          </S.PanelCount>
          <S.PanelCollapseButton
            type="button"
            aria-label="장소 목록 접기"
            title="장소 목록 접기"
            onClick={onCollapse}
          >
            <S.MaterialIcon aria-hidden="true">keyboard_double_arrow_left</S.MaterialIcon>
          </S.PanelCollapseButton>
        </S.PanelSummary>

        <S.SearchField>
          <S.SearchIcon aria-hidden="true">search</S.SearchIcon>
          <S.SearchInput
            type="search"
            value={searchQuery}
            placeholder="장소명, 등록자 ID, 주소 검색"
            aria-label="장소명, 등록자 ID, 주소 검색"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery ? (
            <S.SearchClearButton
              type="button"
              aria-label="검색어 지우기"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onClearSearch}
            >
              <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
            </S.SearchClearButton>
          ) : null}
        </S.SearchField>

        <S.PanelActionGroup>
          <SortDropdown
            ariaLabel="장소 목록 정렬"
            value={sortParam}
            options={SORT_OPTIONS}
            disabled={isLoading}
            width="100%"
            onChange={onSortChange}
          />
          <S.CategorySelect
            value={category}
            aria-label="장소 카테고리 필터"
            disabled={isLoading}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">전체 카테고리</option>
            {CATEGORY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </S.CategorySelect>
          <S.IconFilterButton
            type="button"
            aria-label={isLoading ? '장소 목록을 불러오는 중입니다' : '장소 목록 새로고침'}
            title={isLoading ? '불러오는 중' : '새로고침'}
            disabled={isLoading}
            onClick={onRefresh}
          >
            <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
          </S.IconFilterButton>
        </S.PanelActionGroup>

        <S.PanelResultSummary>
          <span>{pageRangeLabel}</span>
          {hasActiveFilter ? (
            <S.ClearFilterButton type="button" onClick={onClearFilters}>
              필터 초기화
            </S.ClearFilterButton>
          ) : null}
        </S.PanelResultSummary>
      </S.PanelControls>

      {isError && places.length > 0 ? (
        <S.ListInlineNotice role="alert">
          <span>{errorMessage} 기존 결과를 표시합니다.</span>
          <S.RetryButton type="button" disabled={isLoading} onClick={onRefresh}>
            다시 시도
          </S.RetryButton>
        </S.ListInlineNotice>
      ) : null}

      <S.PlaceList ref={listRef} aria-label="장소 목록" aria-busy={isLoading}>
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
            <S.RetryButton type="button" disabled={isLoading} onClick={onRefresh}>
              다시 시도
            </S.RetryButton>
          </S.EmptyState>
        ) : places.length > 0 ? (
          places.map((place) => {
            const displayName = getDisplayName(place)
            const isSelected = selectedPlaceId === place.id

            return (
              <S.PlaceItem
                key={place.id}
                type="button"
                $active={isSelected}
                aria-pressed={isSelected}
                onClick={() => onSelectPlace(place)}
              >
                <S.PlaceThumb>
                  <S.MaterialIcon aria-hidden="true">
                    {getPlaceCategoryIconName(place)}
                  </S.MaterialIcon>
                </S.PlaceThumb>
                <S.PlaceInfo>
                  <S.PlaceTitleRow>
                    <S.PlaceName title={displayName}>{displayName}</S.PlaceName>
                    <S.PlaceTitleBadges>
                      <S.PlaceCategoryBadge>
                        {getPlaceCategoryLabel(place)}
                      </S.PlaceCategoryBadge>
                      {place.discoveryStatus === 'HIDDEN' ? (
                        <S.PlaceDiscoveryStatusBadge>탐색 숨김</S.PlaceDiscoveryStatusBadge>
                      ) : null}
                    </S.PlaceTitleBadges>
                  </S.PlaceTitleRow>
                  <S.PlaceMeta>
                    <S.MaterialIcon aria-hidden="true">map</S.MaterialIcon>
                    <span title={place.address || '주소 정보 없음'}>
                      {place.address || '주소 정보 없음'}
                    </span>
                  </S.PlaceMeta>
                  <S.PlaceMetaLine aria-label={`${displayName} 장소 지표`}>
                    <span>등록자 {getRegistrantLabel(place)}</span>
                    <span>Lv.{formatOptionalNumber(place.placeGrowth?.level)}</span>
                    <span>사진 {formatOptionalNumber(place.placeGrowth?.photoCount)}장</span>
                  </S.PlaceMetaLine>
                </S.PlaceInfo>
              </S.PlaceItem>
            )
          })
        ) : hasActiveFilter ? (
          <S.EmptyState>
            선택한 조건에 맞는 장소가 없습니다.
            <S.RetryButton type="button" onClick={onClearFilters}>
              필터 초기화
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
              onClick={() => onPageChange(1)}
            >
              <S.MaterialIcon aria-hidden="true">first_page</S.MaterialIcon>
            </S.PageButton>
          ) : null}
          <S.PageButton
            type="button"
            aria-label="이전 페이지로 이동"
            disabled={isLoading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <S.MaterialIcon aria-hidden="true">chevron_left</S.MaterialIcon>
          </S.PageButton>
          <S.PageNumberList>
            {visiblePageNumbers.map((pageNumber) => (
              <S.PageNumberButton
                key={pageNumber}
                type="button"
                $active={page === pageNumber}
                aria-current={page === pageNumber ? 'page' : undefined}
                disabled={isLoading}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </S.PageNumberButton>
            ))}
          </S.PageNumberList>
          <S.PageButton
            type="button"
            aria-label="다음 페이지로 이동"
            disabled={isLoading || !hasNext}
            onClick={() => onPageChange(page + 1)}
          >
            <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
          </S.PageButton>
          {showEdgePageButtons ? (
            <S.PageButton
              type="button"
              aria-label="마지막 페이지로 이동"
              disabled={isLoading || page >= totalPages}
              onClick={() => onPageChange(totalPages)}
            >
              <S.MaterialIcon aria-hidden="true">last_page</S.MaterialIcon>
            </S.PageButton>
          ) : null}
        </S.PanelPagination>
      ) : null}
    </S.PlacePanel>
  )
}
