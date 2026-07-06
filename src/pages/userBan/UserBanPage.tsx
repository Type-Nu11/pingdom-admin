import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminBannedUsers } from '../../hooks/useAdminBannedUsers'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminBanType,
  AdminBannedUserListRequest,
  AdminBannedUserSortBy,
  AdminBannedUserSortDirection,
} from '../../types/adminUserBan.types'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

const ADMIN_BANNED_USER_PAGE_SIZE = 20
const DEFAULT_BANNED_USER_SORT_BY: AdminBannedUserSortBy = 'BANNED_AT'
const DEFAULT_BANNED_USER_SORT_DIRECTION: AdminBannedUserSortDirection = 'DESC'
const BANNED_USER_SORT_BY_OPTIONS: Array<{
  value: AdminBannedUserSortBy
  label: string
}> = [
  { value: 'BANNED_AT', label: '밴 처리일' },
  { value: 'EXPIRES_AT', label: '만료일' },
  { value: 'USER_ID', label: '사용자 ID' },
]
const BANNED_USER_SORT_DIRECTION_OPTIONS: Array<{
  value: AdminBannedUserSortDirection
  label: string
}> = [
  { value: 'DESC', label: '내림차순' },
  { value: 'ASC', label: '오름차순' },
]

type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral'
type FilterMenuKey = 'sortBy' | 'sortDirection'

function formatBanType(value: string) {
  if (value === 'PERMANENT') {
    return '영구 밴'
  }

  if (value === 'TEMPORARY') {
    return '기간 밴'
  }

  return value || '-'
}

function getBanTypeTone(value: string): BadgeTone {
  return value === 'TEMPORARY' ? 'warning' : 'danger'
}

function getBanStatusTone(isBanned: boolean): BadgeTone {
  return isBanned ? 'danger' : 'success'
}

function formatBanDate(value?: string | null) {
  if (!value) {
    return '-'
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

function formatBanExpiresAt(banType: string, value?: string | null) {
  if (value) {
    return formatBanDate(value)
  }

  if (banType === 'PERMANENT') {
    return '만료 없음'
  }

  if (banType === 'TEMPORARY') {
    return '확인 필요'
  }

  return '-'
}

function formatOptionalText(value?: string | number | null) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return '-'
  }

  return String(value)
}

function formatBanReason(value?: string | null) {
  if (!value) {
    return '등록된 밴 사유가 없습니다.'
  }

  return value
}

function formatFilterCount(value?: number | null) {
  if (typeof value !== 'number') {
    return '-'
  }

  return value.toLocaleString()
}

function toStartDateTime(value: string) {
  return value ? `${value}T00:00:00` : undefined
}

function toEndDateTime(value: string) {
  return value ? `${value}T23:59:59` : undefined
}

function getSortByLabel(value: AdminBannedUserSortBy) {
  return (
    BANNED_USER_SORT_BY_OPTIONS.find((option) => option.value === value)?.label ??
    value
  )
}

function getSortDirectionLabel(value: AdminBannedUserSortDirection) {
  return (
    BANNED_USER_SORT_DIRECTION_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  )
}

function UserBanPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [banSearchQuery, setBanSearchQuery] = useState('')
  const [selectedBanType, setSelectedBanType] = useState<AdminBanType | undefined>()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState<AdminBannedUserSortBy>(
    DEFAULT_BANNED_USER_SORT_BY
  )
  const [sortDirection, setSortDirection] =
    useState<AdminBannedUserSortDirection>(DEFAULT_BANNED_USER_SORT_DIRECTION)
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuKey | null>(null)
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [releaseReason, setReleaseReason] = useState('')
  const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState(false)
  const {
    users,
    page,
    totalCount,
    totalPages,
    hasNext,
    counts,
    isLoading,
    isError,
    errorMessage,
    selectedUserDetail,
    isDetailLoading,
    detailErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    releasingUserId,
    fetchAdminBannedUsers,
    fetchAdminBannedUserDetail,
    clearBannedUserDetail,
    releaseUserBan,
  } = useAdminBannedUsers({
    limit: ADMIN_BANNED_USER_PAGE_SIZE,
  })
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const safeTotalPages = Math.max(totalPages, 1)
  const hasUsers = users.length > 0
  const totalBannedUserCount = counts?.total ?? totalCount

  const buildListRequest = (
    nextPage = 1,
    nextBanType: AdminBanType | undefined = selectedBanType
  ): AdminBannedUserListRequest => ({
    page: nextPage,
    keyword: banSearchQuery.trim(),
    banType: nextBanType,
    from: toStartDateTime(fromDate),
    to: toEndDateTime(toDate),
    sortBy,
    sortDirection,
  })

  const clearSelection = () => {
    setSelectedUserId(null)
    setReleaseReason('')
    setIsReleaseConfirmOpen(false)
    clearBannedUserDetail()
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setOpenFilterMenu(null)
    clearSelection()
    void fetchAdminBannedUsers(buildListRequest(1))
  }

  const handleRefresh = () => {
    setOpenFilterMenu(null)
    clearSelection()
    void fetchAdminBannedUsers(buildListRequest(page))
  }

  const handleResetFilters = () => {
    setBanSearchQuery('')
    setSelectedBanType(undefined)
    setFromDate('')
    setToDate('')
    setSortBy(DEFAULT_BANNED_USER_SORT_BY)
    setSortDirection(DEFAULT_BANNED_USER_SORT_DIRECTION)
    setOpenFilterMenu(null)
    setIsAdvancedFilterOpen(false)
    clearSelection()
    void fetchAdminBannedUsers({
      page: 1,
      keyword: '',
      banType: undefined,
      from: undefined,
      to: undefined,
      sortBy: DEFAULT_BANNED_USER_SORT_BY,
      sortDirection: DEFAULT_BANNED_USER_SORT_DIRECTION,
    })
  }

  const handleBanTypeFilter = (nextBanType?: AdminBanType) => {
    setOpenFilterMenu(null)
    setSelectedBanType(nextBanType)
    clearSelection()
    void fetchAdminBannedUsers(buildListRequest(1, nextBanType))
  }

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > safeTotalPages || nextPage === page) {
      return
    }

    setOpenFilterMenu(null)
    void fetchAdminBannedUsers(buildListRequest(nextPage))
  }

  const handleSelectBannedUser = (userId: number) => {
    setSelectedUserId(userId)
    setReleaseReason('')
    setIsReleaseConfirmOpen(false)
    void fetchAdminBannedUserDetail(userId)
  }

  const handleReleaseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedUserDetail || releasingUserId !== null) {
      return
    }

    setIsReleaseConfirmOpen(true)
  }

  const handleSelectSortBy = (nextSortBy: AdminBannedUserSortBy) => {
    setSortBy(nextSortBy)
    setOpenFilterMenu(null)
  }

  const handleSelectSortDirection = (
    nextSortDirection: AdminBannedUserSortDirection
  ) => {
    setSortDirection(nextSortDirection)
    setOpenFilterMenu(null)
  }

  const handleToggleAdvancedFilter = () => {
    setOpenFilterMenu(null)
    setIsAdvancedFilterOpen((isOpen) => !isOpen)
  }

  const handleCloseReleaseConfirm = () => {
    if (releasingUserId !== null) {
      return
    }

    setIsReleaseConfirmOpen(false)
  }

  const handleConfirmRelease = () => {
    if (!selectedUserDetail || releasingUserId !== null) {
      return
    }

    void releaseUserBan(selectedUserDetail.userId, {
      reason: releaseReason.trim(),
    }).then((data) => {
      if (!data) {
        return
      }

      setSelectedUserId(null)
      setReleaseReason('')
      setIsReleaseConfirmOpen(false)
    })
  }

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
          <S.MenuButton type="button" onClick={() => navigate('/places')}>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/main')}>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>게시글 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" $active>
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
            <S.TopTitle>사용자 밴</S.TopTitle>
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

        <U.Content>
          <U.PageStack>
            <U.IntroBand>
              <U.IntroText>
                <U.Eyebrow>사용자 제재 관리</U.Eyebrow>
                <U.IntroTitle>밴 처리된 사용자를 확인하고 해제 여부를 검토합니다.</U.IntroTitle>
                <U.IntroDescription>
                  사용자 ID와 닉네임으로 현재 밴 상태를 검색하고, 상세 정보에서
                  해제 여부를 검토합니다.
                </U.IntroDescription>
              </U.IntroText>
              <U.StatusBadge>운영 관리</U.StatusBadge>
            </U.IntroBand>

            <U.FilterPanel>
              <U.FilterTopLine>
                <U.ResultSummary>
                  전체 밴 사용자 <strong>{totalBannedUserCount.toLocaleString()}명</strong>
                  {' · '}
                  현재 페이지 <strong>{users.length.toLocaleString()}명</strong> 표시
                </U.ResultSummary>
                <U.SegmentGroup aria-label="밴 유형 필터">
                  <U.SegmentButton
                    type="button"
                    $active={!selectedBanType}
                    onClick={() => handleBanTypeFilter(undefined)}
                  >
                    전체
                    <span>{formatFilterCount(counts?.total ?? totalCount)}</span>
                  </U.SegmentButton>
                  <U.SegmentButton
                    type="button"
                    $active={selectedBanType === 'PERMANENT'}
                    onClick={() => handleBanTypeFilter('PERMANENT')}
                  >
                    영구 밴
                    {typeof counts?.permanent === 'number' ? (
                      <span>{formatFilterCount(counts.permanent)}</span>
                    ) : null}
                  </U.SegmentButton>
                  <U.SegmentButton
                    type="button"
                    $active={selectedBanType === 'TEMPORARY'}
                    onClick={() => handleBanTypeFilter('TEMPORARY')}
                  >
                    기간 밴
                    {typeof counts?.temporary === 'number' ? (
                      <span>{formatFilterCount(counts.temporary)}</span>
                    ) : null}
                  </U.SegmentButton>
                </U.SegmentGroup>
              </U.FilterTopLine>

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
                </U.FilterField>
                <U.FilterActions>
                  <U.SecondaryButton type="button" onClick={handleToggleAdvancedFilter}>
                    상세 필터
                    <S.MaterialIcon aria-hidden="true">
                      {isAdvancedFilterOpen ? 'expand_less' : 'expand_more'}
                    </S.MaterialIcon>
                  </U.SecondaryButton>
                  <U.PrimaryButton type="submit" disabled={isLoading}>
                    <S.MaterialIcon aria-hidden="true">search</S.MaterialIcon>
                    {isLoading ? '조회 중' : '조회'}
                  </U.PrimaryButton>
                  <U.SecondaryButton
                    type="button"
                    disabled={isLoading}
                    onClick={handleRefresh}
                  >
                    <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                    새로고침
                  </U.SecondaryButton>
                </U.FilterActions>
                {isAdvancedFilterOpen ? (
                  <U.AdvancedFilterPanel>
                    <U.FilterField>
                      처리 시작일
                      <U.DateInput
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                      />
                    </U.FilterField>
                    <U.FilterField>
                      처리 종료일
                      <U.DateInput
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                      />
                    </U.FilterField>
                    <U.FilterField as="div">
                      정렬 기준
                      <U.FilterMenuRoot
                        onBlur={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget as Node | null
                            )
                          ) {
                            setOpenFilterMenu(null)
                          }
                        }}
                      >
                        <U.FilterMenuButton
                          type="button"
                          $open={openFilterMenu === 'sortBy'}
                          aria-haspopup="listbox"
                          aria-expanded={openFilterMenu === 'sortBy'}
                          onClick={() =>
                            setOpenFilterMenu((currentMenu) =>
                              currentMenu === 'sortBy' ? null : 'sortBy'
                            )
                          }
                        >
                          <span className="filter-menu-label">
                            {getSortByLabel(sortBy)}
                          </span>
                          <S.MaterialIcon
                            className="filter-menu-icon"
                            aria-hidden="true"
                          >
                            expand_more
                          </S.MaterialIcon>
                        </U.FilterMenuButton>
                        {openFilterMenu === 'sortBy' ? (
                          <U.FilterMenuList role="listbox">
                            {BANNED_USER_SORT_BY_OPTIONS.map((option) => (
                              <U.FilterMenuOption
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={sortBy === option.value}
                                $active={sortBy === option.value}
                                onClick={() => handleSelectSortBy(option.value)}
                              >
                                {option.label}
                                {sortBy === option.value ? (
                                  <S.MaterialIcon
                                    className="filter-menu-icon"
                                    aria-hidden="true"
                                  >
                                    check
                                  </S.MaterialIcon>
                                ) : null}
                              </U.FilterMenuOption>
                            ))}
                          </U.FilterMenuList>
                        ) : null}
                      </U.FilterMenuRoot>
                    </U.FilterField>
                    <U.FilterField as="div">
                      정렬 방향
                      <U.FilterMenuRoot
                        onBlur={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget as Node | null
                            )
                          ) {
                            setOpenFilterMenu(null)
                          }
                        }}
                      >
                        <U.FilterMenuButton
                          type="button"
                          $open={openFilterMenu === 'sortDirection'}
                          aria-haspopup="listbox"
                          aria-expanded={openFilterMenu === 'sortDirection'}
                          onClick={() =>
                            setOpenFilterMenu((currentMenu) =>
                              currentMenu === 'sortDirection'
                                ? null
                                : 'sortDirection'
                            )
                          }
                        >
                          <span className="filter-menu-label">
                            {getSortDirectionLabel(sortDirection)}
                          </span>
                          <S.MaterialIcon
                            className="filter-menu-icon"
                            aria-hidden="true"
                          >
                            expand_more
                          </S.MaterialIcon>
                        </U.FilterMenuButton>
                        {openFilterMenu === 'sortDirection' ? (
                          <U.FilterMenuList role="listbox">
                            {BANNED_USER_SORT_DIRECTION_OPTIONS.map((option) => (
                              <U.FilterMenuOption
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={sortDirection === option.value}
                                $active={sortDirection === option.value}
                                onClick={() =>
                                  handleSelectSortDirection(option.value)
                                }
                              >
                                {option.label}
                                {sortDirection === option.value ? (
                                  <S.MaterialIcon
                                    className="filter-menu-icon"
                                    aria-hidden="true"
                                  >
                                    check
                                  </S.MaterialIcon>
                                ) : null}
                              </U.FilterMenuOption>
                            ))}
                          </U.FilterMenuList>
                        ) : null}
                      </U.FilterMenuRoot>
                    </U.FilterField>
                    <U.FilterActions>
                      <U.SecondaryButton
                        type="button"
                        disabled={isLoading}
                        onClick={handleResetFilters}
                      >
                        초기화
                      </U.SecondaryButton>
                    </U.FilterActions>
                  </U.AdvancedFilterPanel>
                ) : null}
              </U.FilterForm>
            </U.FilterPanel>

            <U.WorkGrid>
              <U.Section>
                <U.SectionHeader>
                  <U.SectionTitle>밴 내역</U.SectionTitle>
                  <U.DetailMeta>
                    {page} / {safeTotalPages} 페이지
                  </U.DetailMeta>
                </U.SectionHeader>
                <U.SectionBody>
                  {isError ? (
                    <U.Notice $variant="error" role="alert">
                      {errorMessage}
                    </U.Notice>
                  ) : null}
                  <U.TableWrap>
                    <U.Table>
                      <thead>
                        <tr>
                          <U.TableHeadCell>사용자</U.TableHeadCell>
                          <U.TableHeadCell>밴 유형</U.TableHeadCell>
                          <U.TableHeadCell>상태</U.TableHeadCell>
                          <U.TableHeadCell>밴 처리일</U.TableHeadCell>
                          <U.TableHeadCell>만료일</U.TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading && !hasUsers ? (
                          <tr>
                            <U.EmptyRow colSpan={5}>밴 유저 목록을 불러오는 중입니다.</U.EmptyRow>
                          </tr>
                        ) : hasUsers ? (
                          users.map((bannedUser) => (
                            <U.TableRow
                              key={bannedUser.userId}
                              $active={selectedUserId === bannedUser.userId}
                              onClick={() => handleSelectBannedUser(bannedUser.userId)}
                            >
                              <U.TableCell>
                                <U.TableStrongText>
                                  {bannedUser.username || '사용자명 없음'}
                                </U.TableStrongText>
                                <U.TableSubText>ID {bannedUser.userId}</U.TableSubText>
                              </U.TableCell>
                              <U.TableCell>
                                <U.TableStatusBadge
                                  $tone={getBanTypeTone(bannedUser.banType)}
                                >
                                  {formatBanType(bannedUser.banType)}
                                </U.TableStatusBadge>
                              </U.TableCell>
                              <U.TableCell>
                                <U.TableStatusBadge
                                  $tone={getBanStatusTone(bannedUser.banned)}
                                >
                                  {bannedUser.banned ? '밴 중' : '해제됨'}
                                </U.TableStatusBadge>
                              </U.TableCell>
                              <U.TableCell>
                                {formatBanDate(bannedUser.bannedAt)}
                              </U.TableCell>
                              <U.TableCell>
                                {formatBanExpiresAt(
                                  bannedUser.banType,
                                  bannedUser.banExpiresAt
                                )}
                              </U.TableCell>
                            </U.TableRow>
                          ))
                        ) : (
                          <tr>
                            <U.EmptyRow colSpan={5}>표시할 밴 내역이 없습니다.</U.EmptyRow>
                          </tr>
                        )}
                      </tbody>
                    </U.Table>
                  </U.TableWrap>
                  <U.Pagination aria-label="밴 유저 목록 페이지네이션">
                    <U.SecondaryButton
                      type="button"
                      disabled={isLoading || page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      이전
                    </U.SecondaryButton>
                    <U.PaginationStatus>
                      {page} / {safeTotalPages}
                    </U.PaginationStatus>
                    <U.SecondaryButton
                      type="button"
                      disabled={isLoading || !hasNext}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      다음
                    </U.SecondaryButton>
                  </U.Pagination>
                </U.SectionBody>
              </U.Section>

              <U.Section>
                <U.SectionHeader>
                  <U.DetailHeaderStack>
                    <U.SectionTitle>밴 유저 상세</U.SectionTitle>
                    {selectedUserDetail ? (
                      <U.DetailMeta>
                        사용자 ID {selectedUserDetail.userId}
                      </U.DetailMeta>
                    ) : null}
                  </U.DetailHeaderStack>
                  {selectedUserDetail ? (
                    <U.BadgeGroup>
                      <U.TableStatusBadge
                        $tone={getBanTypeTone(selectedUserDetail.banType)}
                      >
                        {formatBanType(selectedUserDetail.banType)}
                      </U.TableStatusBadge>
                      <U.TableStatusBadge
                        $tone={getBanStatusTone(selectedUserDetail.banned)}
                      >
                        {selectedUserDetail.banned ? '밴 중' : '해제됨'}
                      </U.TableStatusBadge>
                    </U.BadgeGroup>
                  ) : (
                    <U.StatusBadge $tone="warning">선택 필요</U.StatusBadge>
                  )}
                </U.SectionHeader>
                <U.SectionBody>
                  {actionErrorMessage ? (
                    <U.Notice $variant="error" role="alert">
                      {actionErrorMessage}
                    </U.Notice>
                  ) : null}
                  {actionSuccessMessage ? (
                    <U.Notice role="status">{actionSuccessMessage}</U.Notice>
                  ) : null}
                  {!selectedUserId ? (
                    <U.DetailEmpty>
                      <S.MaterialIcon aria-hidden="true">manage_accounts</S.MaterialIcon>
                      <strong>밴 유저를 선택해 주세요.</strong>
                      <span>왼쪽 목록에서 사용자를 선택하면 상세 정보가 표시됩니다.</span>
                    </U.DetailEmpty>
                  ) : isDetailLoading ? (
                    <U.DetailEmpty>
                      <S.MaterialIcon aria-hidden="true">hourglass_empty</S.MaterialIcon>
                      <strong>상세 정보를 불러오는 중입니다.</strong>
                    </U.DetailEmpty>
                  ) : detailErrorMessage ? (
                    <U.Notice $variant="error" role="alert">
                      {detailErrorMessage}
                    </U.Notice>
                  ) : selectedUserDetail ? (
                    <U.DetailStack>
                      <U.DetailSummaryCard>
                        <U.DetailTitle>
                          {selectedUserDetail.username || '사용자명 없음'}
                        </U.DetailTitle>
                        <U.DetailMeta>
                          ID {selectedUserDetail.userId} ·{' '}
                          {formatOptionalText(selectedUserDetail.role)} ·{' '}
                          {formatOptionalText(selectedUserDetail.country)}
                        </U.DetailMeta>
                        <U.BadgeGroup>
                          <U.TableStatusBadge
                            $tone={getBanTypeTone(selectedUserDetail.banType)}
                          >
                            {formatBanType(selectedUserDetail.banType)}
                          </U.TableStatusBadge>
                          <U.TableStatusBadge
                            $tone={getBanStatusTone(selectedUserDetail.banned)}
                          >
                            {selectedUserDetail.banned ? '밴 중' : '해제됨'}
                          </U.TableStatusBadge>
                        </U.BadgeGroup>
                      </U.DetailSummaryCard>

                      <U.DetailGroup>
                        <U.DetailGroupTitle>밴 정보</U.DetailGroupTitle>
                        <U.DetailList>
                          <U.DetailRow>
                            <dt>상태</dt>
                            <dd>{selectedUserDetail.banned ? '밴 중' : '해제됨'}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>밴 유형</dt>
                            <dd>{formatBanType(selectedUserDetail.banType)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>밴 사유</dt>
                            <dd>{formatBanReason(selectedUserDetail.banReason)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>처리일</dt>
                            <dd>{formatBanDate(selectedUserDetail.bannedAt)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>만료일</dt>
                            <dd>
                              {formatBanExpiresAt(
                                selectedUserDetail.banType,
                                selectedUserDetail.banExpiresAt
                              )}
                            </dd>
                          </U.DetailRow>
                        </U.DetailList>
                      </U.DetailGroup>

                      <U.DetailGroup>
                        <U.DetailGroupTitle>계정 정보</U.DetailGroupTitle>
                        <U.DetailList>
                          <U.DetailRow>
                            <dt>이메일</dt>
                            <dd>{formatOptionalText(selectedUserDetail.email)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>출생연도</dt>
                            <dd>{formatOptionalText(selectedUserDetail.birthYear)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>언어</dt>
                            <dd>{formatOptionalText(selectedUserDetail.language)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>국가</dt>
                            <dd>{formatOptionalText(selectedUserDetail.country)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>권한</dt>
                            <dd>{formatOptionalText(selectedUserDetail.role)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>가입일</dt>
                            <dd>{formatBanDate(selectedUserDetail.createdAt)}</dd>
                          </U.DetailRow>
                        </U.DetailList>
                      </U.DetailGroup>

                      <U.DetailGroup>
                        <U.DetailGroupTitle>밴 해제</U.DetailGroupTitle>
                        <U.ActionPanel onSubmit={handleReleaseSubmit}>
                          <U.ActionLabel>
                            해제 사유
                            <U.TextArea
                              value={releaseReason}
                              maxLength={255}
                              placeholder="운영 검토 결과 해제 등 사유를 입력하세요."
                              onChange={(event) =>
                                setReleaseReason(event.target.value)
                              }
                            />
                          </U.ActionLabel>
                          <U.ActionHelpText>
                            사유는 최대 255자까지 저장됩니다.
                          </U.ActionHelpText>
                          <U.PrimaryButton
                            type="submit"
                            disabled={releasingUserId === selectedUserDetail.userId}
                          >
                            {releasingUserId === selectedUserDetail.userId
                              ? '해제 중'
                              : '밴 해제 요청'}
                          </U.PrimaryButton>
                        </U.ActionPanel>
                      </U.DetailGroup>
                    </U.DetailStack>
                  ) : null}
                </U.SectionBody>
              </U.Section>
            </U.WorkGrid>
          </U.PageStack>
        </U.Content>
      </S.MainArea>

      {isReleaseConfirmOpen && selectedUserDetail ? (
        <U.ConfirmOverlay role="presentation" onMouseDown={handleCloseReleaseConfirm}>
          <U.ConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-release-confirm-title"
            aria-describedby="ban-release-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <U.ConfirmIcon aria-hidden="true">
              <S.MaterialIcon>lock_open</S.MaterialIcon>
            </U.ConfirmIcon>
            <U.ConfirmTitle id="ban-release-confirm-title">
              이 사용자의 밴을 해제할까요?
            </U.ConfirmTitle>
            <U.ConfirmDescription id="ban-release-confirm-description">
              밴 해제는 사용자 제재 상태와 처리 이력에 반영됩니다. 입력한
              사유를 확인한 뒤 진행해 주세요.
            </U.ConfirmDescription>
            <U.ConfirmMeta>
              <span>사용자</span>
              {selectedUserDetail.username || '사용자명 없음'} · ID{' '}
              {selectedUserDetail.userId}
              <span>해제 사유</span>
              {releaseReason.trim() || '입력된 해제 사유가 없습니다.'}
            </U.ConfirmMeta>
            <U.ConfirmActions>
              <U.SecondaryButton
                type="button"
                disabled={releasingUserId !== null}
                onClick={handleCloseReleaseConfirm}
              >
                취소
              </U.SecondaryButton>
              <U.PrimaryButton
                type="button"
                disabled={releasingUserId === selectedUserDetail.userId}
                onClick={handleConfirmRelease}
              >
                {releasingUserId === selectedUserDetail.userId
                  ? '해제 중'
                  : '밴 해제'}
              </U.PrimaryButton>
            </U.ConfirmActions>
          </U.ConfirmDialog>
        </U.ConfirmOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default UserBanPage
