import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminBannedUsers } from '../../hooks/useAdminBannedUsers'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminBanType,
  AdminBannedUserListRequest,
  AdminBannedUserListSortBy,
  AdminUserBanRequest,
  AdminSortDirection,
  AdminUserSanctionAction,
  AdminUserSanctionHistoryItem,
} from '../../types/adminUserBan.types'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

const ADMIN_BANNED_USER_PAGE_SIZE = 20
const DEFAULT_TEMPORARY_BAN_DURATION_DAYS = '7'
const BAN_TYPE_FILTER_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'PERMANENT', label: '영구 밴' },
  { value: 'TEMPORARY', label: '기간 밴' },
]
const BAN_LIST_SORT_OPTIONS = [
  { value: 'BANNED_AT', label: '밴 처리일' },
  { value: 'EXPIRES_AT', label: '만료일' },
  { value: 'USER_ID', label: '사용자 ID' },
]
const SORT_DIRECTION_OPTIONS = [
  { value: 'DESC', label: '내림차순' },
  { value: 'ASC', label: '오름차순' },
]
const SANCTION_ACTION_FILTER_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'APPLIED', label: '밴 처리' },
  { value: 'RELEASED', label: '밴 해제' },
  { value: 'EXPIRED', label: '기간 만료' },
]

const ADMIN_ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  MODERATOR: '운영자',
  USER: '일반 사용자',
}

const COUNTRY_LABELS: Record<string, string> = {
  KR: '대한민국',
  JP: '일본',
  US: '미국',
}

const BAN_REASON_LABELS: Record<string, string> = {
  POLICY_VIOLATION: '운영 정책 위반',
  REPORT_BULK_ACCEPTED: '신고 일괄 승인으로 처리',
  SPAM: '스팸 또는 도배',
  HARASSMENT: '괴롭힘 또는 부적절한 행위',
}

type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral'

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
  return value === 'TEMPORARY' ? 'warning' : 'neutral'
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

  return `${date.getFullYear()}.${padDatePart(date.getMonth() + 1)}.${padDatePart(
    date.getDate()
  )} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`
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

function formatRole(value?: string | null) {
  if (!value) {
    return '-'
  }

  return ADMIN_ROLE_LABELS[value] ?? value.replaceAll('_', ' ')
}

function formatCountry(value?: string | null) {
  if (!value) {
    return '-'
  }

  return COUNTRY_LABELS[value] ?? value
}

function formatBanReason(value?: string | null) {
  if (!value) {
    return '등록된 밴 사유가 없습니다.'
  }

  return BAN_REASON_LABELS[value] ?? value.replaceAll('_', ' ')
}

function formatSanctionAction(value: AdminUserSanctionAction) {
  if (value === 'APPLIED') {
    return '밴 처리'
  }

  if (value === 'RELEASED') {
    return '밴 해제'
  }

  if (value === 'EXPIRED') {
    return '기간 만료'
  }

  return value
}

function getSanctionActionTone(value: AdminUserSanctionAction): BadgeTone {
  if (value === 'APPLIED') {
    return 'danger'
  }

  if (value === 'RELEASED') {
    return 'success'
  }

  return 'neutral'
}

function formatSanctionHistorySummary(history: AdminUserSanctionHistoryItem) {
  const processedAt = formatBanDate(history.processedAt)
  const adminName = history.adminUsername || `관리자 ID ${history.adminUserId ?? '-'}`

  return `${adminName} · ${processedAt}`
}

function formatSanctionHistoryPeriod(history: AdminUserSanctionHistoryItem) {
  if (history.banType === 'PERMANENT') {
    return '만료 없음'
  }

  if (history.endedAt) {
    return `${formatBanDate(history.startedAt)} ~ ${formatBanDate(history.endedAt)}`
  }

  return formatBanDate(history.startedAt)
}

function parsePositiveInteger(value: string) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null
  }

  return parsedValue
}

function formatCountWithUnit(value?: number | null, unit = '건') {
  return typeof value === 'number' ? `${value.toLocaleString()}${unit}` : '-'
}

function hasInvalidDateRange(from: string, to: string) {
  return Boolean(from && to && new Date(from).getTime() > new Date(to).getTime())
}

function normalizeDateTimeInput(value: string) {
  if (!value) {
    return undefined
  }

  return value.length === 16 ? `${value}:00` : value
}

interface FilterMenuOption {
  value: string
  label: string
}

interface AdminFilterMenuProps {
  ariaLabel: string
  options: FilterMenuOption[]
  value: string
  onChange: (value: string) => void
}

function AdminFilterMenu({
  ariaLabel,
  options,
  value,
  onChange,
}: AdminFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <U.FilterMenuRoot ref={rootRef}>
      <U.FilterMenuButton
        type="button"
        $open={isOpen}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="filter-menu-label">
          {selectedOption?.label ?? options[0]?.label ?? '-'}
        </span>
        <S.MaterialIcon className="filter-menu-icon" aria-hidden="true">
          expand_more
        </S.MaterialIcon>
      </U.FilterMenuButton>
      {isOpen ? (
        <U.FilterMenuList role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <U.FilterMenuOption
              key={option.value || 'ALL'}
              type="button"
              role="option"
              $active={option.value === value}
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
              {option.value === value ? (
                <S.MaterialIcon className="filter-menu-icon" aria-hidden="true">
                  check
                </S.MaterialIcon>
              ) : null}
            </U.FilterMenuOption>
          ))}
        </U.FilterMenuList>
      ) : null}
    </U.FilterMenuRoot>
  )
}

const DATE_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => padDatePart(index))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => padDatePart(index))

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function parseDateTimeInput(value: string) {
  const parsed = value ? new Date(value) : new Date()

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatDateTimeInput(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate()
  )}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`
}

function formatDatePickerLabel(value: string) {
  if (!value) {
    return '일시 선택'
  }

  const date = parseDateTimeInput(value)

  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. ${padDatePart(
    date.getHours()
  )}:${padDatePart(date.getMinutes())}`
}

function getCalendarDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const calendarStart = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1 - firstDay.getDay()
  )

  return Array.from({ length: 42 }, (_, index) =>
    new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      calendarStart.getDate() + index
    )
  )
}

function isSameDate(left: Date | null, right: Date) {
  return Boolean(
    left &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  )
}

interface AdminDatePickerProps {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
}

function AdminDatePicker({
  ariaLabel,
  value,
  onChange,
}: AdminDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseDateTimeInput(value))
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedDate = value ? parseDateTimeInput(value) : null
  const calendarDays = getCalendarDays(viewDate)
  const selectedTime = selectedDate
    ? `${padDatePart(selectedDate.getHours())}:${padDatePart(selectedDate.getMinutes())}`
    : '00:00'

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setIsTimePickerOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setIsTimePickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleDateSelect = (date: Date) => {
    const nextDate = selectedDate ? new Date(selectedDate) : new Date(date)

    nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    if (!selectedDate) {
      nextDate.setHours(0, 0, 0, 0)
    }

    onChange(formatDateTimeInput(nextDate))
  }

  const handleTimeChange = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const nextDate = selectedDate ? new Date(selectedDate) : new Date(viewDate)

    nextDate.setHours(hours || 0, minutes || 0, 0, 0)
    onChange(formatDateTimeInput(nextDate))
  }

  return (
    <U.DatePickerRoot ref={rootRef}>
      <U.DatePickerButton
        type="button"
        aria-label={`${ariaLabel}, ${formatDatePickerLabel(value)}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (value) {
            setViewDate(parseDateTimeInput(value))
          }
          setIsTimePickerOpen(false)
          setIsOpen((open) => !open)
        }}
      >
        <span className="date-picker-label">{formatDatePickerLabel(value)}</span>
        <S.MaterialIcon className="date-picker-icon" aria-hidden="true">
          calendar_month
        </S.MaterialIcon>
      </U.DatePickerButton>
      {isOpen ? (
        <U.DatePickerPopover role="dialog" aria-label={ariaLabel}>
          <U.DatePickerHeader>
            <U.DatePickerIconButton
              type="button"
              aria-label="이전 달"
              onClick={() =>
                setViewDate(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
            >
              <S.MaterialIcon aria-hidden="true">chevron_left</S.MaterialIcon>
            </U.DatePickerIconButton>
            <U.DatePickerTitle>
              {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
            </U.DatePickerTitle>
            <U.DatePickerIconButton
              type="button"
              aria-label="다음 달"
              onClick={() =>
                setViewDate(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
            >
              <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
            </U.DatePickerIconButton>
          </U.DatePickerHeader>
          <U.DatePickerWeekdays aria-hidden="true">
            {DATE_WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </U.DatePickerWeekdays>
          <U.DatePickerGrid>
            {calendarDays.map((date) => (
              <U.DatePickerDayButton
                key={date.toISOString()}
                type="button"
                $outside={date.getMonth() !== viewDate.getMonth()}
                $selected={isSameDate(selectedDate, date)}
                $today={isSameDate(new Date(), date)}
                aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
                aria-pressed={isSameDate(selectedDate, date)}
                onClick={() => handleDateSelect(date)}
              >
                {date.getDate()}
              </U.DatePickerDayButton>
            ))}
          </U.DatePickerGrid>
          <U.DatePickerFooter>
            <U.DatePickerTimeField>
              <U.DatePickerTimeLabel>시간 설정</U.DatePickerTimeLabel>
              <U.DatePickerTimePicker>
                <U.DatePickerTimeButton
                  type="button"
                  aria-label="선택한 날짜의 시간"
                  aria-expanded={isTimePickerOpen}
                  aria-haspopup="listbox"
                  onClick={() => setIsTimePickerOpen((open) => !open)}
                >
                  <S.MaterialIcon aria-hidden="true">schedule</S.MaterialIcon>
                  <span>{selectedTime}</span>
                  <S.MaterialIcon aria-hidden="true">expand_more</S.MaterialIcon>
                </U.DatePickerTimeButton>
                {isTimePickerOpen ? (
                  <U.DatePickerTimeMenu aria-label="시간 선택">
                    <U.DatePickerTimeMenuTitle>시간 선택</U.DatePickerTimeMenuTitle>
                    <U.DatePickerTimeColumns>
                      <U.DatePickerTimeColumn>
                        <U.DatePickerTimeColumnLabel>시</U.DatePickerTimeColumnLabel>
                        <U.DatePickerTimeOptions role="listbox" aria-label="시 선택">
                          {HOUR_OPTIONS.map((hour) => (
                            <U.DatePickerTimeOption
                              key={hour}
                              type="button"
                              role="option"
                              $selected={selectedTime.slice(0, 2) === hour}
                              aria-selected={selectedTime.slice(0, 2) === hour}
                              onClick={() => {
                                handleTimeChange(`${hour}:${selectedTime.slice(3)}`)
                              }}
                            >
                              {hour}
                            </U.DatePickerTimeOption>
                          ))}
                        </U.DatePickerTimeOptions>
                      </U.DatePickerTimeColumn>
                      <U.DatePickerTimeSeparator>:</U.DatePickerTimeSeparator>
                      <U.DatePickerTimeColumn>
                        <U.DatePickerTimeColumnLabel>분</U.DatePickerTimeColumnLabel>
                        <U.DatePickerTimeOptions role="listbox" aria-label="분 선택">
                          {MINUTE_OPTIONS.map((minute) => (
                            <U.DatePickerTimeOption
                              key={minute}
                              type="button"
                              role="option"
                              $selected={selectedTime.slice(3) === minute}
                              aria-selected={selectedTime.slice(3) === minute}
                              onClick={() => {
                                handleTimeChange(`${selectedTime.slice(0, 2)}:${minute}`)
                              }}
                            >
                              {minute}
                            </U.DatePickerTimeOption>
                          ))}
                        </U.DatePickerTimeOptions>
                      </U.DatePickerTimeColumn>
                    </U.DatePickerTimeColumns>
                  </U.DatePickerTimeMenu>
                ) : null}
              </U.DatePickerTimePicker>
            </U.DatePickerTimeField>
            <U.FilterActions>
              <U.SecondaryButton
                type="button"
                onClick={() => {
                  onChange('')
                  setIsTimePickerOpen(false)
                  setIsOpen(false)
                }}
              >
                초기화
              </U.SecondaryButton>
              <U.PrimaryButton
                type="button"
                onClick={() => {
                  setIsTimePickerOpen(false)
                  setIsOpen(false)
                }}
              >
                적용
              </U.PrimaryButton>
            </U.FilterActions>
          </U.DatePickerFooter>
        </U.DatePickerPopover>
      ) : null}
    </U.DatePickerRoot>
  )
}

function UserBanPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [banSearchQuery, setBanSearchQuery] = useState('')
  const [banTypeFilter, setBanTypeFilter] = useState<AdminBanType | ''>('')
  const [banFrom, setBanFrom] = useState('')
  const [banTo, setBanTo] = useState('')
  const [banSortBy, setBanSortBy] =
    useState<AdminBannedUserListSortBy>('BANNED_AT')
  const [banSortDirection, setBanSortDirection] =
    useState<AdminSortDirection>('DESC')
  const [banTargetUserId, setBanTargetUserId] = useState('')
  const [banType, setBanType] = useState<AdminBanType>('PERMANENT')
  const [banDurationDays, setBanDurationDays] = useState(
    DEFAULT_TEMPORARY_BAN_DURATION_DAYS
  )
  const [banReason, setBanReason] = useState('')
  const [banFormError, setBanFormError] = useState('')
  const [listFilterError, setListFilterError] = useState('')
  const [isBanConfirmOpen, setIsBanConfirmOpen] = useState(false)
  const [isBanFormOpen, setIsBanFormOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info')
  const [isSanctionHistoryFilterOpen, setIsSanctionHistoryFilterOpen] =
    useState(false)
  const [releaseReason, setReleaseReason] = useState('')
  const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState(false)
  const [sanctionHistoryBanType, setSanctionHistoryBanType] = useState<
    AdminBanType | ''
  >('')
  const [sanctionHistoryAction, setSanctionHistoryAction] = useState<
    AdminUserSanctionAction | ''
  >('')
  const [sanctionHistoryFrom, setSanctionHistoryFrom] = useState('')
  const [sanctionHistoryTo, setSanctionHistoryTo] = useState('')
  const [sanctionHistoryFilterError, setSanctionHistoryFilterError] =
    useState('')
  const {
    users,
    page,
    totalCount,
    totalPages,
    hasNext,
    counts,
    isLoading,
    hasSuccessfulListResponse,
    isError,
    errorMessage,
    selectedUserDetail,
    isDetailLoading,
    detailErrorMessage,
    banTargetStatus,
    isBanTargetStatusLoading,
    banTargetStatusErrorMessage,
    sanctionHistories,
    sanctionHistoryPage,
    sanctionHistoryTotalPages,
    sanctionHistoryTotalCount,
    sanctionHistoryHasNext,
    isSanctionHistoryLoading,
    sanctionHistoryErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    banningUserId,
    releasingUserId,
    fetchAdminBannedUsers,
    fetchAdminBannedUserDetail,
    fetchBanTargetStatus,
    fetchUserSanctionHistories,
    clearBannedUserDetail,
    clearBanTargetStatus,
    applyUserBan,
    releaseUserBan,
  } = useAdminBannedUsers({
    limit: ADMIN_BANNED_USER_PAGE_SIZE,
  })
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const safeTotalPages = Math.max(totalPages, 1)
  const hasUsers = users.length > 0
  const totalBannedUserCount = hasSuccessfulListResponse
    ? counts?.total ?? totalCount
    : null
  const resultRangeLabel = (() => {
    if (!hasSuccessfulListResponse) {
      return isLoading ? '조회 중' : '-'
    }

    if (totalCount === 0) {
      return '0건'
    }

    const rangeStart = (page - 1) * ADMIN_BANNED_USER_PAGE_SIZE + 1
    const rangeEnd = Math.min(
      rangeStart + users.length - 1,
      totalCount
    )

    return `${rangeStart}–${rangeEnd} / ${totalCount.toLocaleString()}건`
  })()
  const banPreviewTargetUserId = parsePositiveInteger(banTargetUserId)
  const banPreviewDurationDays = parsePositiveInteger(banDurationDays)
  const safeSanctionHistoryTotalPages = Math.max(sanctionHistoryTotalPages, 1)
  const hasActiveListFilters = Boolean(
    banSearchQuery.trim() ||
      banTypeFilter ||
      banFrom ||
      banTo ||
      banSortBy !== 'BANNED_AT' ||
      banSortDirection !== 'DESC'
  )
  const isBanTargetStatusCurrent =
    typeof banPreviewTargetUserId === 'number' &&
    banTargetStatus?.userId === banPreviewTargetUserId
  const isBanTargetAlreadyBanned =
    isBanTargetStatusCurrent && banTargetStatus?.banned === true

  const buildListRequest = (nextPage = 1): AdminBannedUserListRequest => ({
    page: nextPage,
    keyword: banSearchQuery.trim(),
    banType: banTypeFilter || undefined,
    from: normalizeDateTimeInput(banFrom),
    to: normalizeDateTimeInput(banTo),
    sortBy: banSortBy,
    sortDirection: banSortDirection,
  })

  const buildSanctionHistoryRequest = (nextPage = 1) => ({
    page: nextPage,
    banType: sanctionHistoryBanType || undefined,
    action: sanctionHistoryAction || undefined,
    from: normalizeDateTimeInput(sanctionHistoryFrom),
    to: normalizeDateTimeInput(sanctionHistoryTo),
  })

  const buildBanRequest = () => {
    const targetUserId = parsePositiveInteger(banTargetUserId)

    if (targetUserId === null) {
      setBanFormError('밴 처리할 사용자 ID를 숫자로 입력해 주세요.')
      return null
    }

    const payload: AdminUserBanRequest = {
      reason: banReason.trim() || undefined,
    }

    if (banType === 'TEMPORARY') {
      const durationDays = parsePositiveInteger(banDurationDays)

      if (durationDays === null) {
        setBanFormError('기간 밴은 1일 이상의 밴 기간을 입력해 주세요.')
        return null
      }

      payload.durationDays = durationDays
    }

    setBanFormError('')

    return {
      targetUserId,
      payload,
    }
  }

  const clearSelection = () => {
    setSelectedUserId(null)
    setReleaseReason('')
    setIsReleaseConfirmOpen(false)
    setSanctionHistoryBanType('')
    setSanctionHistoryAction('')
    setSanctionHistoryFrom('')
    setSanctionHistoryTo('')
    setSanctionHistoryFilterError('')
    setIsSanctionHistoryFilterOpen(false)
    clearBannedUserDetail()
  }

  const handleBanTargetUserIdChange = (value: string) => {
    setBanTargetUserId(value)
    setBanFormError('')
    clearBanTargetStatus()
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (hasInvalidDateRange(banFrom, banTo)) {
      setListFilterError('처리 종료일은 처리 시작일 이후여야 합니다.')
      return
    }

    setListFilterError('')
    clearSelection()
    void fetchAdminBannedUsers(buildListRequest(1))
  }

  const handleRefresh = () => {
    if (hasInvalidDateRange(banFrom, banTo)) {
      setListFilterError('처리 종료일은 처리 시작일 이후여야 합니다.')
      return
    }

    setListFilterError('')
    clearSelection()
    void fetchAdminBannedUsers(buildListRequest(page))
  }

  const handleResetFilters = () => {
    setBanSearchQuery('')
    setBanTypeFilter('')
    setBanFrom('')
    setBanTo('')
    setBanSortBy('BANNED_AT')
    setBanSortDirection('DESC')
    setListFilterError('')
    clearSelection()
    void fetchAdminBannedUsers({
      page: 1,
      keyword: '',
      banType: undefined,
      from: undefined,
      to: undefined,
      sortBy: 'BANNED_AT',
      sortDirection: 'DESC',
    })
  }

  const handleResetSanctionHistoryFilters = () => {
    if (!selectedUserId) {
      return
    }

    setSanctionHistoryBanType('')
    setSanctionHistoryAction('')
    setSanctionHistoryFrom('')
    setSanctionHistoryTo('')
    setSanctionHistoryFilterError('')
    void fetchUserSanctionHistories(selectedUserId, { page: 1 })
  }

  const handleDetailTabChange = (nextTab: 'info' | 'history') => {
    setDetailTab(nextTab)

    if (nextTab === 'history' && selectedUserId) {
      void fetchUserSanctionHistories(selectedUserId, { page: 1 })
    }
  }

  const handleSanctionHistorySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedUserId) {
      return
    }

    if (hasInvalidDateRange(sanctionHistoryFrom, sanctionHistoryTo)) {
      setSanctionHistoryFilterError('처리 종료일은 처리 시작일 이후여야 합니다.')
      return
    }

    setSanctionHistoryFilterError('')
    void fetchUserSanctionHistories(
      selectedUserId,
      buildSanctionHistoryRequest()
    )
  }

  const handleBanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (banningUserId !== null) {
      return
    }

    const request = buildBanRequest()

    if (!request) {
      return
    }

    if (
      banTargetStatus?.userId === request.targetUserId &&
      banTargetStatus.banned
    ) {
      setBanFormError('이미 밴 처리된 사용자입니다. 상세 상태를 확인해 주세요.')
      return
    }

    setIsBanConfirmOpen(true)
  }

  const handleCheckBanTargetStatus = () => {
    const targetUserId = parsePositiveInteger(banTargetUserId)

    if (targetUserId === null) {
      setBanFormError('상태를 확인할 사용자 ID를 숫자로 입력해 주세요.')
      return
    }

    setBanFormError('')
    void fetchBanTargetStatus(targetUserId)
  }

  const handleCloseBanConfirm = () => {
    if (banningUserId !== null) {
      return
    }

    setIsBanConfirmOpen(false)
  }

  const handleConfirmBan = () => {
    if (banningUserId !== null) {
      return
    }

    const request = buildBanRequest()

    if (!request) {
      setIsBanConfirmOpen(false)
      return
    }

    if (
      banTargetStatus?.userId === request.targetUserId &&
      banTargetStatus.banned
    ) {
      setBanFormError('이미 밴 처리된 사용자입니다. 상세 상태를 확인해 주세요.')
      setIsBanConfirmOpen(false)
      return
    }

    void applyUserBan(request.targetUserId, request.payload).then((data) => {
      if (!data) {
        return
      }

      setSelectedUserId(request.targetUserId)
      setDetailTab('info')
      setIsBanFormOpen(false)
      setReleaseReason('')
      setIsReleaseConfirmOpen(false)
      setSanctionHistoryBanType('')
      setSanctionHistoryAction('')
      setSanctionHistoryFrom('')
      setSanctionHistoryTo('')
      setSanctionHistoryFilterError('')
      void fetchAdminBannedUserDetail(request.targetUserId)
      setBanTargetUserId('')
      setBanType('PERMANENT')
      setBanDurationDays(DEFAULT_TEMPORARY_BAN_DURATION_DAYS)
      setBanReason('')
      setBanFormError('')
      setIsBanConfirmOpen(false)
    })
  }

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > safeTotalPages || nextPage === page) {
      return
    }

    void fetchAdminBannedUsers(buildListRequest(nextPage))
  }

  const handleSelectBannedUser = (userId: number) => {
    setSelectedUserId(userId)
    setDetailTab('info')
    setIsBanFormOpen(false)
    setReleaseReason('')
    setIsReleaseConfirmOpen(false)
    setSanctionHistoryBanType('')
    setSanctionHistoryAction('')
    setSanctionHistoryFrom('')
    setSanctionHistoryTo('')
    setSanctionHistoryFilterError('')
    setIsSanctionHistoryFilterOpen(false)
    void fetchAdminBannedUserDetail(userId)
  }

  const handleSanctionHistoryPageChange = (nextPage: number) => {
    if (
      !selectedUserId ||
      nextPage < 1 ||
      nextPage > safeSanctionHistoryTotalPages ||
      nextPage === sanctionHistoryPage
    ) {
      return
    }

    void fetchUserSanctionHistories(selectedUserId, {
      ...buildSanctionHistoryRequest(nextPage),
    })
  }

  const handleCloseReleaseConfirm = () => {
    if (releasingUserId !== null) {
      return
    }

    setIsReleaseConfirmOpen(false)
  }

  const handleCloseBanForm = () => {
    if (banningUserId !== null) {
      return
    }

    setIsBanFormOpen(false)
    setBanFormError('')
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
          <S.MenuButton type="button" onClick={() => navigate('/dashboard')}>
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
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

      <S.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
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
                <U.IntroDescription>
                  밴 사용자를 조회하고 제재 처리 및 해제를 관리합니다.
                </U.IntroDescription>
              </U.IntroText>
            </U.IntroBand>

            <U.SummaryBar aria-label="밴 현황">
              <U.SummaryBarTitle>밴 현황</U.SummaryBarTitle>
              <U.SummaryBarItems>
                <U.SummaryBarItem>
                  <span>전체</span>
                  <strong>{formatCountWithUnit(totalBannedUserCount, '명')}</strong>
                </U.SummaryBarItem>
                <U.SummaryBarItem>
                  <span>영구 밴</span>
                  <strong>{formatCountWithUnit(counts?.permanent, '명')}</strong>
                </U.SummaryBarItem>
                <U.SummaryBarItem>
                  <span>기간 밴</span>
                  <strong>{formatCountWithUnit(counts?.temporary, '명')}</strong>
                </U.SummaryBarItem>
              </U.SummaryBarItems>
            </U.SummaryBar>

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
                      <AdminDatePicker
                        ariaLabel="밴 처리 시작일"
                        value={banFrom}
                        onChange={setBanFrom}
                      />
                      <U.FilterRangeSeparator aria-hidden="true">—</U.FilterRangeSeparator>
                      <AdminDatePicker
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

            <U.ResultSummary>
              조회 결과 <strong>{resultRangeLabel}</strong>
            </U.ResultSummary>

            {listFilterError ? (
              <U.Notice $variant="error" role="alert">
                {listFilterError}
              </U.Notice>
            ) : null}

            {actionErrorMessage ? (
              <U.Notice $variant="error" role="alert">
                {actionErrorMessage}
              </U.Notice>
            ) : null}
            {actionSuccessMessage ? (
              <U.Notice role="status">{actionSuccessMessage}</U.Notice>
            ) : null}

            <U.WorkGrid>
              <U.WorkSection>
                <U.SectionHeader>
                  <U.SectionTitle>밴 사용자 목록</U.SectionTitle>
                  <U.CompactButton
                    type="button"
                    aria-expanded={isBanFormOpen}
                    onClick={() => {
                      setBanFormError('')
                      setIsBanFormOpen(true)
                    }}
                  >
                    <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                    새 밴 처리
                  </U.CompactButton>
                </U.SectionHeader>
                <U.WorkSectionBody>
                  {isError ? (
                    <>
                      <U.Notice $variant="error" role="alert">
                        {errorMessage}
                      </U.Notice>
                      <U.FilterActions>
                        <U.SecondaryButton
                          type="button"
                          disabled={isLoading}
                          onClick={handleRefresh}
                        >
                          다시 시도
                        </U.SecondaryButton>
                      </U.FilterActions>
                    </>
                  ) : null}
                  {isError && !hasUsers ? null : (
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
                            <U.EmptyRow colSpan={5}>밴 사용자 목록을 불러오는 중입니다.</U.EmptyRow>
                          </tr>
                        ) : hasUsers ? (
                          users.map((bannedUser) => (
                            <U.TableRow
                              key={bannedUser.userId}
                              $active={selectedUserId === bannedUser.userId}
                              tabIndex={0}
                              role="button"
                              aria-current={
                                selectedUserId === bannedUser.userId ? 'true' : undefined
                              }
                              onClick={() => handleSelectBannedUser(bannedUser.userId)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  handleSelectBannedUser(bannedUser.userId)
                                }
                              }}
                            >
                              <U.TableCell>
                                <U.TableStrongText>
                                  {bannedUser.username || '사용자명 없음'}
                                </U.TableStrongText>
                                <U.TableSubText>사용자 ID {bannedUser.userId}</U.TableSubText>
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
                              <U.TableDateCell>
                                {formatBanDate(bannedUser.bannedAt)}
                              </U.TableDateCell>
                              <U.TableDateCell>
                                {formatBanExpiresAt(
                                  bannedUser.banType,
                                  bannedUser.banExpiresAt
                                )}
                              </U.TableDateCell>
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
                  )}
                  {hasUsers && !isError && totalCount > 0 && safeTotalPages > 1 ? (
                    <U.Pagination aria-label="밴 사용자 목록 페이지네이션">
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
                  ) : null}
                </U.WorkSectionBody>
              </U.WorkSection>

              <U.WorkSection>
                <U.SectionHeader>
                  <U.DetailHeaderStack>
                    <U.SectionTitle>선택 사용자 상세</U.SectionTitle>
                  </U.DetailHeaderStack>
                </U.SectionHeader>
                <U.WorkSectionBody>
                  {!selectedUserId ? (
                    <U.DetailEmpty>
                      <S.MaterialIcon aria-hidden="true">manage_accounts</S.MaterialIcon>
                      <strong>사용자를 선택해 주세요.</strong>
                      <span>목록에서 선택하면 제재 정보와 이력이 표시됩니다.</span>
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
                          사용자 ID {selectedUserDetail.userId} ·{' '}
                          {formatRole(selectedUserDetail.role)} ·{' '}
                          {formatCountry(selectedUserDetail.country)}
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

                      <U.DetailTabList role="tablist" aria-label="사용자 상세 탭">
                        <U.DetailTabButton
                          type="button"
                          role="tab"
                          aria-selected={detailTab === 'info'}
                          $active={detailTab === 'info'}
                          onClick={() => handleDetailTabChange('info')}
                        >
                          상세 정보
                        </U.DetailTabButton>
                        <U.DetailTabButton
                          type="button"
                          role="tab"
                          aria-selected={detailTab === 'history'}
                          $active={detailTab === 'history'}
                          onClick={() => handleDetailTabChange('history')}
                        >
                          제재 이력
                        </U.DetailTabButton>
                      </U.DetailTabList>

                      {detailTab === 'info' ? (
                        <>
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
                            <dd>{formatCountry(selectedUserDetail.country)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>권한</dt>
                            <dd>{formatRole(selectedUserDetail.role)}</dd>
                          </U.DetailRow>
                          <U.DetailRow>
                            <dt>가입일</dt>
                            <dd>{formatBanDate(selectedUserDetail.createdAt)}</dd>
                          </U.DetailRow>
                        </U.DetailList>
                      </U.DetailGroup>
                        </>
                      ) : (
                      <U.DetailGroup>
                        <U.DetailGroupHeader>
                          <U.DetailGroupTitle>
                            제재 이력 {formatCountWithUnit(sanctionHistoryTotalCount)}
                          </U.DetailGroupTitle>
                          <U.CompactButton
                            type="button"
                            aria-expanded={isSanctionHistoryFilterOpen}
                            onClick={() =>
                              setIsSanctionHistoryFilterOpen((isOpen) => !isOpen)
                            }
                          >
                            <S.MaterialIcon aria-hidden="true">
                              {isSanctionHistoryFilterOpen ? 'expand_less' : 'tune'}
                            </S.MaterialIcon>
                            {isSanctionHistoryFilterOpen ? '필터 닫기' : '필터'}
                          </U.CompactButton>
                        </U.DetailGroupHeader>
                        {isSanctionHistoryFilterOpen ? (
                          <U.FilterForm onSubmit={handleSanctionHistorySearch}>
                            <U.DetailFilterPanel>
                            <U.FilterField>
                              제재 유형
                              <AdminFilterMenu
                                ariaLabel="제재 이력 유형 필터"
                                options={BAN_TYPE_FILTER_OPTIONS}
                                value={sanctionHistoryBanType}
                                onChange={(value) =>
                                  setSanctionHistoryBanType(value as AdminBanType | '')
                                }
                              />
                            </U.FilterField>
                            <U.FilterField>
                              처리 상태
                              <AdminFilterMenu
                                ariaLabel="제재 이력 처리 상태 필터"
                                options={SANCTION_ACTION_FILTER_OPTIONS}
                                value={sanctionHistoryAction}
                                onChange={(value) =>
                                  setSanctionHistoryAction(
                                    value as AdminUserSanctionAction | ''
                                  )
                                }
                              />
                            </U.FilterField>
                            <U.FilterField>
                              처리 시작일
                              <AdminDatePicker
                                ariaLabel="제재 이력 처리 시작일"
                                value={sanctionHistoryFrom}
                                onChange={setSanctionHistoryFrom}
                              />
                            </U.FilterField>
                            <U.FilterField>
                              처리 종료일
                              <AdminDatePicker
                                ariaLabel="제재 이력 처리 종료일"
                                value={sanctionHistoryTo}
                                onChange={setSanctionHistoryTo}
                              />
                            </U.FilterField>
                            <U.DetailFilterActions>
                              <U.PrimaryButton
                                type="submit"
                                disabled={isSanctionHistoryLoading}
                              >
                                <S.MaterialIcon aria-hidden="true">search</S.MaterialIcon>
                                {isSanctionHistoryLoading ? '조회 중' : '조회'}
                              </U.PrimaryButton>
                              <U.SecondaryButton
                                type="button"
                                disabled={
                                  isSanctionHistoryLoading ||
                                  !(
                                    sanctionHistoryBanType ||
                                    sanctionHistoryAction ||
                                    sanctionHistoryFrom ||
                                    sanctionHistoryTo
                                  )
                                }
                                onClick={handleResetSanctionHistoryFilters}
                              >
                                초기화
                              </U.SecondaryButton>
                            </U.DetailFilterActions>
                            </U.DetailFilterPanel>
                          </U.FilterForm>
                        ) : null}
                        {sanctionHistoryFilterError ? (
                          <U.Notice $variant="error" role="alert">
                            {sanctionHistoryFilterError}
                          </U.Notice>
                        ) : null}
                        {isSanctionHistoryLoading ? (
                          <U.DetailEmpty>
                            <S.MaterialIcon aria-hidden="true">hourglass_empty</S.MaterialIcon>
                            <strong>제재 이력을 불러오는 중입니다.</strong>
                          </U.DetailEmpty>
                        ) : sanctionHistoryErrorMessage ? (
                          <U.Notice $variant="error" role="alert">
                            {sanctionHistoryErrorMessage}
                          </U.Notice>
                        ) : sanctionHistories.length > 0 ? (
                          <>
                            <U.DetailList>
                              {sanctionHistories.map((history) => (
                                <U.DetailRow key={history.historyId}>
                                  <dt>
                                    <U.TableStatusBadge
                                      $tone={getSanctionActionTone(history.action)}
                                    >
                                      {formatSanctionAction(history.action)}
                                    </U.TableStatusBadge>
                                  </dt>
                                  <dd>
                                    <U.SanctionHistoryHeader>
                                      <strong>{formatBanType(history.banType)}</strong>
                                    </U.SanctionHistoryHeader>
                                    <U.SanctionHistoryMeta>
                                      {formatBanReason(history.reason)}
                                    </U.SanctionHistoryMeta>
                                    <U.SanctionHistoryMeta>
                                      {formatSanctionHistoryPeriod(history)} ·{' '}
                                      {formatSanctionHistorySummary(history)}
                                    </U.SanctionHistoryMeta>
                                  </dd>
                                </U.DetailRow>
                              ))}
                            </U.DetailList>
                            {safeSanctionHistoryTotalPages > 1 ? (
                              <U.Pagination aria-label="사용자 제재 이력 페이지네이션">
                                <U.SecondaryButton
                                  type="button"
                                  disabled={
                                    isSanctionHistoryLoading ||
                                    sanctionHistoryPage <= 1
                                  }
                                  onClick={() =>
                                    handleSanctionHistoryPageChange(
                                      sanctionHistoryPage - 1
                                    )
                                  }
                                >
                                  이전
                                </U.SecondaryButton>
                                <U.PaginationStatus>
                                  {sanctionHistoryPage} /{' '}
                                  {safeSanctionHistoryTotalPages}
                                </U.PaginationStatus>
                                <U.SecondaryButton
                                  type="button"
                                  disabled={
                                    isSanctionHistoryLoading ||
                                    !sanctionHistoryHasNext
                                  }
                                  onClick={() =>
                                    handleSanctionHistoryPageChange(
                                      sanctionHistoryPage + 1
                                    )
                                  }
                                >
                                  다음
                                </U.SecondaryButton>
                              </U.Pagination>
                            ) : null}
                          </>
                        ) : (
                          <U.DetailEmpty>
                            <S.MaterialIcon aria-hidden="true">history</S.MaterialIcon>
                            <strong>제재 이력이 없습니다.</strong>
                            <span>이 사용자에게 기록된 밴 처리, 해제, 만료 이력이 없습니다.</span>
                          </U.DetailEmpty>
                        )}
                      </U.DetailGroup>
                      )}

                      <U.DetailGroup>
                        <U.DetailGroupTitle>밴 해제</U.DetailGroupTitle>
                        {selectedUserDetail.banned ? (
                          <U.FilterActions>
                            <U.SecondaryButton
                              type="button"
                              disabled={releasingUserId === selectedUserDetail.userId}
                              onClick={() => setIsReleaseConfirmOpen(true)}
                            >
                              <S.MaterialIcon aria-hidden="true">lock_open</S.MaterialIcon>
                              밴 해제
                            </U.SecondaryButton>
                          </U.FilterActions>
                        ) : (
                          <U.Notice role="status">
                            이 사용자는 밴 해제 처리되었습니다. 제재 이력에서 해제
                            기록을 확인할 수 있습니다.
                          </U.Notice>
                        )}
                      </U.DetailGroup>
                    </U.DetailStack>
                  ) : null}
                </U.WorkSectionBody>
              </U.WorkSection>
            </U.WorkGrid>
          </U.PageStack>
        </U.Content>
      </S.MainArea>

      {isBanFormOpen ? (
        <U.ConfirmOverlay role="presentation" onMouseDown={handleCloseBanForm}>
          <U.FormDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <U.ConfirmIcon aria-hidden="true">
              <S.MaterialIcon>block</S.MaterialIcon>
            </U.ConfirmIcon>
            <U.ConfirmTitle id="ban-form-title">새 사용자 밴 처리</U.ConfirmTitle>
            <U.ConfirmDescription>
              사용자 상태를 확인한 뒤 밴 유형과 사유를 입력해 제재를 처리합니다.
            </U.ConfirmDescription>
            {banFormError ? (
              <U.Notice $variant="error" role="alert">
                {banFormError}
              </U.Notice>
            ) : null}
            <U.ActionPanel onSubmit={handleBanSubmit}>
              <U.FormGrid>
                <U.Field>
                  사용자 ID
                  <U.FieldInput
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={banTargetUserId}
                    placeholder="밴 처리할 사용자 ID"
                    onChange={(event) =>
                      handleBanTargetUserIdChange(event.target.value)
                    }
                  />
                </U.Field>
                <U.Field as="div">
                  밴 유형
                  <U.SegmentGroup aria-label="밴 유형 선택">
                    <U.SegmentButton
                      type="button"
                      $active={banType === 'PERMANENT'}
                      aria-pressed={banType === 'PERMANENT'}
                      onClick={() => setBanType('PERMANENT')}
                    >
                      영구 밴
                    </U.SegmentButton>
                    <U.SegmentButton
                      type="button"
                      $active={banType === 'TEMPORARY'}
                      aria-pressed={banType === 'TEMPORARY'}
                      onClick={() => setBanType('TEMPORARY')}
                    >
                      기간 밴
                    </U.SegmentButton>
                  </U.SegmentGroup>
                </U.Field>
                {banType === 'TEMPORARY' ? (
                  <U.Field>
                    밴 기간
                    <U.FieldInput
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={banDurationDays}
                      placeholder="일 단위"
                      onChange={(event) => setBanDurationDays(event.target.value)}
                    />
                  </U.Field>
                ) : null}
              </U.FormGrid>
              <U.ActionLabel>
                밴 사유
                <U.TextArea
                  value={banReason}
                  maxLength={255}
                  placeholder="반복 신고, 운영 정책 위반 등 밴 사유를 입력하세요."
                  onChange={(event) => setBanReason(event.target.value)}
                />
              </U.ActionLabel>
              {banTargetStatusErrorMessage ? (
                <U.Notice $variant="error" role="alert">
                  {banTargetStatusErrorMessage}
                </U.Notice>
              ) : null}
              {isBanTargetStatusCurrent && banTargetStatus ? (
                <U.DetailSummaryCard>
                  <U.DetailTitle>
                    {banTargetStatus.username || '사용자명 없음'}
                  </U.DetailTitle>
                  <U.DetailMeta>
                    사용자 ID {banTargetStatus.userId} · 현재 상태{' '}
                    {banTargetStatus.banned ? '밴 중' : '제재 없음'}
                  </U.DetailMeta>
                  <U.BadgeGroup>
                    <U.TableStatusBadge $tone={getBanStatusTone(banTargetStatus.banned)}>
                      {banTargetStatus.banned ? '밴 중' : '제재 없음'}
                    </U.TableStatusBadge>
                    {banTargetStatus.banned && banTargetStatus.banType ? (
                      <U.TableStatusBadge $tone={getBanTypeTone(banTargetStatus.banType)}>
                        {formatBanType(banTargetStatus.banType)}
                      </U.TableStatusBadge>
                    ) : null}
                  </U.BadgeGroup>
                  {banTargetStatus.banned ? (
                    <U.DetailMeta>
                      {formatBanReason(banTargetStatus.banReason)} · 만료일{' '}
                      {formatBanExpiresAt(
                        banTargetStatus.banType ?? '',
                        banTargetStatus.banExpiresAt
                      )}
                    </U.DetailMeta>
                  ) : null}
                </U.DetailSummaryCard>
              ) : null}
              <U.ActionInfoText>
                <S.MaterialIcon aria-hidden="true">info</S.MaterialIcon>
                <span>
                  기간 밴은 입력한 일수 동안 적용됩니다. 영구 밴은 만료일이 없습니다.
                  <br />
                  밴 처리 후에도 기존 게시글은 유지됩니다.
                </span>
              </U.ActionInfoText>
              <U.FilterActions>
                <U.SecondaryButton
                  type="button"
                  disabled={isBanTargetStatusLoading || !banTargetUserId.trim()}
                  onClick={handleCheckBanTargetStatus}
                >
                  <S.MaterialIcon aria-hidden="true">policy</S.MaterialIcon>
                  {isBanTargetStatusLoading ? '확인 중' : '상태 확인'}
                </U.SecondaryButton>
                <U.PrimaryButton
                  type="submit"
                  disabled={banningUserId !== null || isBanTargetAlreadyBanned}
                >
                  <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
                  {banningUserId !== null ? '처리 중' : '밴 처리'}
                </U.PrimaryButton>
              </U.FilterActions>
            </U.ActionPanel>
          </U.FormDialog>
        </U.ConfirmOverlay>
      ) : null}

      {isBanConfirmOpen ? (
        <U.ConfirmOverlay role="presentation" onMouseDown={handleCloseBanConfirm}>
          <U.ConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-confirm-title"
            aria-describedby="ban-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <U.ConfirmIcon aria-hidden="true">
              <S.MaterialIcon>block</S.MaterialIcon>
            </U.ConfirmIcon>
            <U.ConfirmTitle id="ban-confirm-title">
              이 사용자를 밴 처리할까요?
            </U.ConfirmTitle>
            <U.ConfirmDescription id="ban-confirm-description">
              밴 처리 후 사용자는 서비스 이용이 제한됩니다. 대상 사용자와 밴 유형을
              확인한 뒤 진행해 주세요.
            </U.ConfirmDescription>
            <U.ConfirmMeta>
              <span>사용자 ID</span>
              {banPreviewTargetUserId ?? '-'}
              <span>밴 유형</span>
              {formatBanType(banType)}
              <span>밴 기간</span>
              {banType === 'TEMPORARY'
                ? `${banPreviewDurationDays ?? (banDurationDays || '-')}일`
                : '만료 없음'}
              <span>밴 사유</span>
              {banReason.trim() || '입력된 밴 사유가 없습니다.'}
            </U.ConfirmMeta>
            <U.ConfirmActions>
              <U.SecondaryButton
                type="button"
                disabled={banningUserId !== null}
                onClick={handleCloseBanConfirm}
              >
                취소
              </U.SecondaryButton>
              <U.PrimaryButton
                type="button"
                disabled={banningUserId !== null}
                onClick={handleConfirmBan}
              >
                {banningUserId !== null ? '처리 중' : '밴 처리'}
              </U.PrimaryButton>
            </U.ConfirmActions>
          </U.ConfirmDialog>
        </U.ConfirmOverlay>
      ) : null}

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
            <U.ActionLabel>
              해제 사유
              <U.TextArea
                value={releaseReason}
                maxLength={255}
                placeholder="운영 검토 결과 해제 등 사유를 입력하세요."
                onChange={(event) => setReleaseReason(event.target.value)}
              />
              <U.ActionHelpText>사유는 최대 255자까지 저장됩니다.</U.ActionHelpText>
            </U.ActionLabel>
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
