import { AdminTargetSearch } from '../../components/common/AdminTargetSearch'
import { searchAdminPlaces } from '../../api/adminTargetSearchApi'
import { PlaceDetailLink } from '../../components/place/PlaceDetailLink'
import { FeedbackMessage } from '../../components/common/FeedbackMessage'
import { ListQueryBoundary } from '../../components/common/ListQueryBoundary'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { ListPane } from '../../components/common/ListPane'
import { ListDetailPage, ListDetailWorkspace } from '../../components/common/ListDetailWorkspace'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { ADMIN_RESERVATION_PAGE_SIZE, useAdminReservations } from '../../hooks/useAdminReservations'
import { formatListRange } from '../../utils/listRange'
import { formatReservationSchedule, formatReservationEventTime as formatDate } from '../../utils/reservationTime'
import { listQueryKey } from '../../hooks/useListQueryState'
import {
  DEFAULT_RESERVATION_QUERY,
  readReservationReviewContext,
  reservationReviewOwnerMismatch,
  writeReservationReviewContext,
  type ReservationReviewQuery,
} from '../../utils/reservationReviewContext'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminReservation,
  AdminReservationStatus,
} from '../../types/adminReservation.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'
import * as ReviewUI from './AdminReservationReviewPage.styles'

const STATUS: Record<AdminReservationStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  PENDING: { label: '승인 대기', tone: 'warning' },
  CONFIRMED: { label: '확정', tone: 'success' },
  REJECTED: { label: '반려', tone: 'danger' },
  CANCELED: { label: '취소', tone: 'danger' },
}


function formatSchedule(reservation: AdminReservation) {
  if (!reservation.reservationStartsAt && !reservation.reservationEndsAt) return '예약 시간 정보 없음'
  return `${formatReservationSchedule(reservation.reservationStartsAt)} - ${formatReservationSchedule(reservation.reservationEndsAt)}`
}

function formatPerson(name: string | null, id: number | null) {
  if (name && id !== null) return `${name} · 사용자 #${id}`
  if (name) return name
  return id !== null ? `사용자 #${id}` : '정보 없음'
}

function parsePlaceId(value: string) {
  if (!value.trim()) return undefined
  const placeId = Number(value)
  return Number.isSafeInteger(placeId) && placeId > 0 ? placeId : null
}

function ReservationHistoryWorkspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const ownerMismatch = reservationReviewOwnerMismatch(location.state, user?.id, user?.role)
  const context = useMemo(() => ownerMismatch
    ? { query: DEFAULT_RESERVATION_QUERY, selectedReservationId: null }
    : readReservationReviewContext(location.search), [location.search, ownerMismatch])
  const { query, selectedReservationId } = context
  const queryKey = listQueryKey(query)
  const draftKey = listQueryKey({ ...query, page: 1 })
  const hook = useAdminReservations(query)
  const { fetchDetail, clearDetail } = hook
  const appliedKey = listQueryKey(hook.query)
  const [draft, setDraft] = useState({ key: draftKey, status: query.status, placeId: query.placeId ? String(query.placeId) : '', placeName: '' })
  const currentDraft = draft.key === draftKey ? draft : { key: draftKey, status: query.status, placeId: query.placeId ? String(query.placeId) : '', placeName: '' }
  const { status, placeId, placeName } = currentDraft
  const setStatus = (value: AdminReservationStatus | '') => setDraft({ ...currentDraft, status: value })
  const setPlaceId = (value: string, name = '') => setDraft({ ...currentDraft, placeId: value, placeName: name })
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false)
  const [filterError, setFilterError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const canonicalSearch = writeReservationReviewContext(context)
  const notice = ownerMismatch ? 'account' : location.state?.reservationReviewNotice
  const noticeMessages: Record<string, string> = {
    account: '계정 또는 역할이 변경되어 이전 예약 조회 조건과 선택을 초기화했습니다.',
    absent: '선택한 예약이 현재 조회 조건 또는 페이지에 없어 선택을 해제했습니다. 처리 상태가 변경되었을 수 있습니다.',
    unavailable: '선택한 예약이 삭제되었거나 조회 권한이 변경되어 선택을 해제했습니다.',
    changed: '예약 상태 또는 연결 장소가 조회 조건과 달라져 선택을 해제했습니다.',
  }
  const updateContext = useCallback((nextQuery: ReservationReviewQuery, reservationId: number | null, replace = false, message?: string) => {
    navigate({ pathname: location.pathname, search: writeReservationReviewContext({ query: nextQuery, selectedReservationId: reservationId }) }, {
      replace,
      state: { reservationReviewOwner: { userId: user?.id, role: user?.role }, ...(message ? { reservationReviewNotice: message } : {}) },
    })
  }, [navigate, location.pathname, user?.id, user?.role])

  useEffect(() => {
    if (ownerMismatch || location.search !== canonicalSearch || !location.state?.reservationReviewOwner) {
      updateContext(query, selectedReservationId, true, ownerMismatch ? 'account' : undefined)
    }
  }, [ownerMismatch, location.search, location.state, canonicalSearch, query, selectedReservationId, updateContext])

  const selectionVerified = hook.listState.phase === 'success' && hook.listState.hasResult
    && hook.resultRequestKey === queryKey && appliedKey === queryKey && hook.reservations.some(item => item.id === selectedReservationId)
  useEffect(() => {
    if (selectedReservationId === null || !selectionVerified) return
    void fetchDetail(selectedReservationId)
    return clearDetail
  }, [selectedReservationId, selectionVerified, hook.reservations, fetchDetail, clearDetail])

  useEffect(() => {
    if (hook.listState.restricted && appliedKey === queryKey && selectedReservationId !== null) {
      updateContext(query, null, true, 'unavailable')
      return
    }
    if (hook.listState.phase !== 'success' || !hook.listState.hasResult || hook.resultRequestKey !== queryKey) return
    // The server may clamp a now-empty last page. Keep the URL in agreement.
    if (hook.query.status === query.status && hook.query.placeId === query.placeId && hook.query.page !== query.page) {
      updateContext(hook.query, null, true, selectedReservationId === null ? undefined : 'absent')
      return
    }
    if (appliedKey !== queryKey || selectedReservationId === null) return
    if (!selectionVerified) {
      updateContext(query, null, true, 'absent')
    } else if (hook.detailReservationId === selectedReservationId && hook.detailUnavailable) {
      updateContext(query, null, true, 'unavailable')
    } else if (hook.reservation?.id === selectedReservationId
      && ((query.status && hook.reservation.status !== query.status) || (query.placeId !== undefined && hook.reservation.placeId !== query.placeId))) {
      updateContext(query, null, true, 'changed')
    }
  }, [hook.listState.phase, hook.listState.hasResult, hook.listState.restricted, hook.resultRequestKey, hook.query, hook.reservation,
    hook.detailReservationId, hook.detailUnavailable, appliedKey, queryKey, query, selectedReservationId, selectionVerified, updateContext])

  const search = () => {
    const nextPlaceId = parsePlaceId(placeId)
    if (nextPlaceId === null) {
      setFilterError('장소 ID는 1 이상의 정수로 입력해주세요.')
      return
    }
    setFilterError('')
    hook.clearDetail()
    setDraft({ ...currentDraft, key: listQueryKey({ status, placeId: nextPlaceId, page: 1 }) })
    updateContext({ status, placeId: nextPlaceId, page: 1 }, null)
    if (queryKey === listQueryKey({ status, placeId: nextPlaceId, page: 1 })) void hook.fetchReservations(query)
  }

  const changePage = (page: number) => {
    hook.clearDetail()
    updateContext({ ...hook.query, page }, null)
  }

  const resetFilters = () => {
    setDraft({ key: listQueryKey(DEFAULT_RESERVATION_QUERY), status: 'PENDING', placeId: '', placeName: '' })
    setFilterError('')
    hook.clearDetail()
    updateContext(DEFAULT_RESERVATION_QUERY, null)
    if (queryKey === listQueryKey(DEFAULT_RESERVATION_QUERY)) void hook.fetchReservations(DEFAULT_RESERVATION_QUERY)
  }

  const selectReservation = (reservationId: number) => {
    if (reservationId === selectedReservationId && selectionVerified) {
      void hook.fetchDetail(reservationId)
      return
    }
    hook.clearDetail()
    updateContext(query, reservationId, true)
  }

  const selectedStatus = hook.reservation ? STATUS[hook.reservation.status] : null
  const statusHistory = hook.reservation?.statusHistory ?? []

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src={`${import.meta.env.BASE_URL}pingdom-logo.png`} alt="PingDom" />
          </Shell.BrandLockup>
        </Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정">
            <Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon>
            <Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}>
            <Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span>
          </Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>

      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>예약 관리 이력</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton
              type="button"
              aria-label="목록 새로고침"
              title="목록 새로고침"
              disabled={hook.isLoading}
              onClick={() => void hook.fetchReservations(hook.query)}
            >
              <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
            </Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <ListDetailPage>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>검토함 &gt; 예약 관리 이력</Shared.Eyebrow>
                <Shared.PageTitle>예약 관리 이력</Shared.PageTitle>
                <Shared.PageDescription>예약 상태와 처리 이력을 조회합니다. 승인·반려는 해당 장소의 상점주가 처리합니다.</Shared.PageDescription>
              </div>
            </Shared.PageHeader>

            {typeof notice === 'string' && noticeMessages[notice] ? <FeedbackMessage tone="warning" onDismiss={() => updateContext(query, selectedReservationId, true)}>{noticeMessages[notice]}</FeedbackMessage> : null}

            <S.SearchBar onSubmit={(event) => { event.preventDefault(); search() }}>
              <ReviewUI.FilterGrid>
                <S.Field>
                  예약 상태
                  <AdminSelect
                    aria-label="예약 상태"
                    value={status}
                    width="100%"
                    disabled={hook.isLoading}
                    onChange={(event) => setStatus(event.target.value as AdminReservationStatus | '')}
                  >
                    <option value="">전체</option>
                    {Object.entries(STATUS).map(([value, metadata]) => <option key={value} value={value}>{metadata.label}</option>)}
                  </AdminSelect>
                </S.Field>
                <S.Field>
                  {placeName ? `장소 ID · ${placeName}` : '장소 ID'}
                  <S.Input
                    value={placeId}
                    inputMode="numeric"
                    placeholder="예: 123"
                    disabled={hook.isLoading}
                    onChange={(event) => { setPlaceId(event.target.value); setFilterError('') }}
                  />
                </S.Field>
                <ReviewUI.PlaceSearchButton type="button" disabled={hook.isLoading} onClick={() => setPlaceSearchOpen(true)}>장소 검색</ReviewUI.PlaceSearchButton>
                <S.SearchFilterActions $inline>
                  <Shared.SecondaryButton type="button" disabled={hook.isLoading} onClick={resetFilters}>초기화</Shared.SecondaryButton>
                  <Shared.PrimaryButton type="submit" disabled={hook.isLoading}>조회</Shared.PrimaryButton>
                </S.SearchFilterActions>
              </ReviewUI.FilterGrid>
            </S.SearchBar>
            <Shared.QuerySummary aria-label="예약 조회 조건">
              조회 조건: {hook.query.status ? STATUS[hook.query.status].label : '전체 상태'} · {hook.query.placeId ? `장소 #${hook.query.placeId}` : '전체 장소'}
              {status !== hook.query.status || parsePlaceId(placeId) !== hook.query.placeId ? ' · 미적용 변경 있음' : ''}
            </Shared.QuerySummary>
            {placeSearchOpen ? <AdminTargetSearch title="장소명·주소 검색" load={searchAdminPlaces} onClose={() => setPlaceSearchOpen(false)} onSelect={place => { setPlaceId(String(place.id), place.name); setFilterError('') }} /> : null}
            {filterError ? <Shared.Notice $variant="error" role="alert">{filterError}</Shared.Notice> : null}


            <ListDetailWorkspace>
              <ListPane
                title="예약 목록"
                count={hook.listState.hasResult ? `${formatListRange({ page: hook.query.page, pageSize: ADMIN_RESERVATION_PAGE_SIZE, itemCount: hook.reservations.length, total: hook.totalCount })}${hook.listState.phase === 'error' || hook.isLoading ? ' (이전 결과)' : ''}` : undefined}
                page={hook.listState.hasResult ? hook.query.page : undefined}
                ariaLabel="예약 목록"
                footer={hook.listState.hasResult && hook.totalPages > 1 ? (
                  <AdminPagination
                    page={hook.query.page}
                    totalPages={hook.totalPages}
                    hasNext={hook.hasNext}
                    disabled={hook.isLoading}
                    onPageChange={changePage}
                    ariaLabel="예약 목록 페이지네이션"
                  />
                ) : null}
              >
                <ListQueryBoundary
                  state={hook.listState}
                  error={hook.errorMessage}
                  empty={hook.reservations.length === 0}
                  onRetry={() => void hook.fetchReservations()}
                  onReset={() => {
                    const nextQuery: ReservationReviewQuery = { status: '', placeId: undefined, page: 1 }
                    setDraft({ key: listQueryKey(nextQuery), status: '', placeId: '', placeName: '' })
                    setFilterError('')
                                    hook.clearDetail()
                    updateContext(nextQuery, null)
                    if (queryKey === listQueryKey(nextQuery)) void hook.fetchReservations(nextQuery)
                  }}
                >
                    <S.CardList>
                      {hook.reservations.map((item) => {
                        const itemStatus = STATUS[item.status]
                        return (
                          <S.RecordButton
                            key={item.id}
                            type="button"
                            $selected={selectedReservationId === item.id}
                            onClick={() => selectReservation(item.id)}
                          >
                            <S.RecordHeader>
                              <S.RecordTitle>{item.placeName || `장소 #${item.placeId}`}</S.RecordTitle>
                              <S.StatusBadge $tone={itemStatus.tone}>{itemStatus.label}</S.StatusBadge>
                            </S.RecordHeader>
                            <S.RecordMeta>예약 #{item.id} · {formatPerson(item.touristUsername, item.touristUserId)}</S.RecordMeta>
                            <S.RecordSummary>{item.quantity.toLocaleString()}명 · {formatSchedule(item)}</S.RecordSummary>
                          </S.RecordButton>
                        )
                      })}
                    </S.CardList>
                </ListQueryBoundary>
              </ListPane>

              <Shared.Panel>
                <Shared.PanelHeader>
                  <div>
                    <Shared.PanelTitle>예약 상세</Shared.PanelTitle>
                    <Shared.PanelDescription>현재 상점주와 당시 처리자는 다를 수 있습니다. 처리자 번호만으로 역할을 구분하지 않습니다.</Shared.PanelDescription>
                  </div>
                </Shared.PanelHeader>
                <Shared.CompareBody>
                  {!selectedReservationId ? (
                    <Shared.EmptyState><strong>확인할 예약을 선택해주세요.</strong></Shared.EmptyState>
                  ) : hook.listState.phase === 'error' ? (
                    <Shared.EmptyState><strong>예약 목록을 다시 확인하지 못했습니다.</strong><span>선택은 유지되며 목록 재시도 후 상세를 확인할 수 있습니다.</span><Shared.SecondaryButton type="button" onClick={() => void hook.fetchReservations(query)}>목록 다시 시도</Shared.SecondaryButton></Shared.EmptyState>
                  ) : !selectionVerified || hook.isDetailLoading || hook.detailReservationId !== selectedReservationId ? (
                    <Shared.EmptyState><strong>예약 상세를 불러오는 중입니다.</strong></Shared.EmptyState>
                  ) : hook.detailErrorMessage ? (
                    <Shared.EmptyState>
                      <strong>{hook.detailErrorMessage}</strong>
                      <Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedReservationId)}>다시 시도</Shared.SecondaryButton>
                    </Shared.EmptyState>
                  ) : hook.reservation?.id === selectedReservationId && selectedStatus ? (
                    <>
                      <S.RecordHeader>
                        <div>
                          <S.RecordTitle>{hook.reservation.placeName || `장소 #${hook.reservation.placeId}`}</S.RecordTitle>
                          <S.RecordMeta>예약 #{hook.reservation.id} · 신청 {formatDate(hook.reservation.createdAt)}</S.RecordMeta>
                        </div>
                        <S.StatusBadge $tone={selectedStatus.tone}>{selectedStatus.label}</S.StatusBadge>
                      </S.RecordHeader>
                      <S.DetailGrid>
                        <S.DetailItem><dt>예약자</dt><dd>{formatPerson(hook.reservation.touristUsername, hook.reservation.touristUserId)}</dd></S.DetailItem>
                        <S.DetailItem><dt>장소</dt><dd><PlaceDetailLink id={hook.reservation.placeId} name={hook.reservation.placeName} /></dd></S.DetailItem>
                        <S.DetailItem><dt>현재 상점주</dt><dd>{formatPerson(hook.reservation.merchantOwnerUsername, hook.reservation.merchantOwnerUserId)}</dd></S.DetailItem>
                        <S.DetailItem><dt>예약 시간</dt><dd>{formatSchedule(hook.reservation)}</dd></S.DetailItem>
                        <S.DetailItem><dt>예약 인원</dt><dd>{hook.reservation.quantity.toLocaleString()}명</dd></S.DetailItem>
                        <S.DetailItem><dt>처리자</dt><dd>{hook.reservation.reviewedBy === null ? '처리 기록 없음' : `사용자 #${hook.reservation.reviewedBy}`}</dd></S.DetailItem>
                        <S.DetailItem><dt>처리 일시</dt><dd>{formatDate(hook.reservation.reviewedAt)}</dd></S.DetailItem>
                      </S.DetailGrid>
                      {hook.reservation.reviewReason ? <S.RecordDescription>처리 사유: {hook.reservation.reviewReason}</S.RecordDescription> : null}
                      <S.Section>
                        <S.SectionHeader>
                          <S.SectionTitle>상태 변경 이력</S.SectionTitle>
                        </S.SectionHeader>
                        {statusHistory.length === 0 ? (
                          <Shared.EmptyState><strong>기록된 상태 변경 이력이 없습니다.</strong></Shared.EmptyState>
                        ) : (
                          <S.CardList>
                            {statusHistory.map((history) => {
                              const historyStatus = STATUS[history.status]

                              return (
                                <S.RecordCard key={history.id}>
                                  <S.RecordHeader>
                                    <S.RecordTitle>상태 변경</S.RecordTitle>
                                    <S.StatusBadge $tone={historyStatus.tone}>{historyStatus.label}</S.StatusBadge>
                                  </S.RecordHeader>
                                  <S.RecordMeta>
                                    {formatDate(history.changedAt)} · {history.changedBy === null ? '처리자 정보 없음' : `처리자 #${history.changedBy}`}
                                  </S.RecordMeta>
                                  {history.reason ? <S.RecordDescription>사유: {history.reason}</S.RecordDescription> : null}
                                </S.RecordCard>
                              )
                            })}
                          </S.CardList>
                        )}
                      </S.Section>
                    </>
                  ) : null}
                </Shared.CompareBody>
              </Shared.Panel>
            </ListDetailWorkspace>
        </ListDetailPage>
      </Shell.MainArea>

    </Shell.AppShell>
  )
}

export default function AdminReservationReviewPage() {
  const { user } = useAuth()
  return <ReservationHistoryWorkspace key={`${user?.id ?? ''}:${user?.role ?? ''}`} />
}
