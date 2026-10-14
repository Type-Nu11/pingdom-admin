import type { FormEvent } from 'react'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import type { AdminBanType, AdminBannedUserListSortBy, AdminSortDirection } from '../../types/adminUserBan.types'
import { AdminFilterMenu } from './UserBanFilterMenu'
import { BAN_TYPE_FILTER_OPTIONS, BAN_LIST_SORT_OPTIONS, SORT_DIRECTION_OPTIONS } from './userBan.options'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

interface UserBanListFiltersProps {
  banSearchQuery: string
  banTypeFilter: AdminBanType | ''
  banFrom: string
  banTo: string
  banSortBy: AdminBannedUserListSortBy
  banSortDirection: AdminSortDirection
  isLoading: boolean
  hasActiveListFilters: boolean
  setBanSearchQuery: (value: string) => void
  setBanTypeFilter: (value: AdminBanType | '') => void
  setBanFrom: (value: string) => void
  setBanTo: (value: string) => void
  setBanSortBy: (value: AdminBannedUserListSortBy) => void
  setBanSortDirection: (value: AdminSortDirection) => void
  handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void
  handleResetFilters: () => void
  handleRefresh: () => void
}

export function UserBanListFilters({
  banSearchQuery,
  banTypeFilter,
  banFrom,
  banTo,
  banSortBy,
  banSortDirection,
  isLoading,
  hasActiveListFilters,
  setBanSearchQuery,
  setBanTypeFilter,
  setBanFrom,
  setBanTo,
  setBanSortBy,
  setBanSortDirection,
  handleSearchSubmit,
  handleResetFilters,
  handleRefresh,
}: UserBanListFiltersProps) {
  return (
    <U.FilterPanel>
      <U.FilterForm onSubmit={handleSearchSubmit}>
        <U.FilterField>
          검색어
          <U.SearchInput
            type="search"
            value={banSearchQuery}
            placeholder="사용자 ID 또는 닉네임 검색"
            aria-label="사용자 ID 또는 닉네임 검색"
            onChange={(event) => setBanSearchQuery(event.target.value)}
          />
          <U.FilterHelpText>
            숫자는 사용자 ID, 문자는 닉네임 기준으로 검색합니다.
          </U.FilterHelpText>
        </U.FilterField>
        <U.FilterActions $alignWithField>
          <U.PrimaryButton type="submit" disabled={isLoading}>
            <S.MaterialIcon aria-hidden="true">search</S.MaterialIcon>
            {isLoading ? '조회 중' : '조회'}
          </U.PrimaryButton>
        </U.FilterActions>

        <U.AdvancedFilterPanel>
          <U.FilterField>
            밴 유형
            <AdminFilterMenu
              ariaLabel="밴 유형 필터"
              options={BAN_TYPE_FILTER_OPTIONS}
              value={banTypeFilter}
              onChange={(value) =>
                setBanTypeFilter(value as AdminBanType | '')
              }
            />
          </U.FilterField>
          <U.FilterGroup>
            <U.FilterGroupLabel>처리 기간</U.FilterGroupLabel>
            <U.FilterGroupControls>
              <AdminDateTimePicker
                ariaLabel="밴 처리 시작일"
                value={banFrom}
                onChange={setBanFrom}
              />
              <U.FilterRangeSeparator aria-hidden="true">—</U.FilterRangeSeparator>
              <AdminDateTimePicker
                ariaLabel="밴 처리 종료일"
                value={banTo}
                onChange={setBanTo}
              />
            </U.FilterGroupControls>
          </U.FilterGroup>
          <U.FilterGroup>
            <U.FilterGroupLabel>정렬</U.FilterGroupLabel>
            <U.FilterGroupControls>
              <AdminFilterMenu
                ariaLabel="밴 사용자 정렬 기준"
                options={BAN_LIST_SORT_OPTIONS}
                value={banSortBy}
                onChange={(value) =>
                  setBanSortBy(value as AdminBannedUserListSortBy)
                }
              />
              <U.FilterRangeSeparator aria-hidden="true">·</U.FilterRangeSeparator>
              <AdminFilterMenu
                ariaLabel="밴 사용자 정렬 방향"
                options={SORT_DIRECTION_OPTIONS}
                value={banSortDirection}
                onChange={(value) =>
                  setBanSortDirection(value as AdminSortDirection)
                }
              />
            </U.FilterGroupControls>
          </U.FilterGroup>
          <U.FilterActions>
            <U.SecondaryButton
              type="button"
              disabled={isLoading || !hasActiveListFilters}
              onClick={handleResetFilters}
            >
              필터 초기화
            </U.SecondaryButton>
            <U.IconActionButton
              type="button"
              aria-label="밴 사용자 목록 새로고침"
              title="목록 새로고침"
              disabled={isLoading}
              onClick={handleRefresh}
            >
              <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
            </U.IconActionButton>
          </U.FilterActions>
        </U.AdvancedFilterPanel>
      </U.FilterForm>
    </U.FilterPanel>
  )
}
