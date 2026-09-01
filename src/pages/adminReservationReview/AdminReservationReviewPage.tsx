import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminReservations } from '../../hooks/useAdminReservations'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminReservation,
  AdminReservationStatus,
} from '../../types/adminReservation.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

const STATUS: Record<AdminReservationStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  PENDING: { label: '심사 대기', tone: 'warning' },
  CONFIRMED: { label: '승인', tone: 'success' },
  REJECTED: { label: '반려', tone: 'danger' },
  CANCELED: { label: '취소', tone: 'danger' },
}

type Dialog = { action: 'confirm' | 'reject' } | null

function formatDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatSchedule(reservation: AdminReservation) {
  if (!reservation.startsAt && !reservation.endsAt) return '예약 시간 정보 없음'
  return `${formatDate(reservation.startsAt)} - ${formatDate(reservation.endsAt)}`
}

function formatPerson(name: string | null, id: number | null) {
  if (name && id !== null) return `${name} · 사용자 #${id}`
  if (name) return name
  return id !== null ? `사용자 #${id}` : '정보 없음'
}

function parsePlaceId(value: string) {
  if (!value.trim()) return undefined
  const placeId = Number(value)
  return Number.isInteger(placeId) && placeId > 0 ? placeId : null
}

function AdminReservationReviewPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminReservations()
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null)
  const [status, setStatus] = useState<AdminReservationStatus | ''>('PENDING')
  const [keyword, setKeyword] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [filterError, setFilterError] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const search = (page = 1) => {
    const nextPlaceId = parsePlaceId(placeId)
    if (nextPlaceId === null) {
      setFilterError('장소 ID는 1 이상의 정수로 입력해주세요.')
      return
    }
    setFilterError('')
    setSelectedReservationId(null)
    hook.clearDetail()
    void hook.fetchReservations({ status, keyword, placeId: nextPlaceId, page })
  }

  const resetFilters = () => {
    setStatus('PENDING')
    setKeyword('')
    setPlaceId('')
    setFilterError('')
    setSelectedReservationId(null)
    hook.clearDetail()
    void hook.fetchReservations({ status: 'PENDING', keyword: '', placeId: undefined, page: 1 })
  }

  const selectReservation = (reservationId: number) => {
    setSelectedReservationId(reservationId)
    void hook.fetchDetail(reservationId)
  }

  const openDialog = (action: 'confirm' | 'reject') => {
    if (!hook.reservation || hook.reservation.status !== 'PENDING') return
    setReason('')
    setFormError('')
    setDialog({ action })
  }

  const submitReview = async () => {
    if (!hook.reservation || !dialog || hook.activeAction) return
    const trimmedReason = reason.trim()
    if (dialog.action === 'reject' && !trimmedReason) {
      setFormError('반려 사유를 입력해주세요.')
      return
    }
    const result = dialog.action === 'confirm'
      ? await hook.confirm(hook.reservation.id, trimmedReason ? { reason: trimmedReason } : undefined)
      : await hook.reject(hook.reservation.id, { reason: trimmedReason })
    if (result) setDialog(null)
  }

  const selectedStatus = hook.reservation ? STATUS[hook.reservation.status] : null

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
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
          <Shell.TopTitleGroup><Shell.TopTitle>예약 심사</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton
              type="button"
              aria-label="목록 새로고침"
              title="목록 새로고침"
              disabled={hook.isLoading || hook.activeAction !== null}
              onClick={() => void hook.fetchReservations(hook.query)}
            >
              <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
            </Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>검토함 &gt; 예약 심사</Shared.Eyebrow>
                <Shared.PageTitle>예약 신청 심사</Shared.PageTitle>
                <Shared.PageDescription>관광객 예약 신청을 검토하고 승인 또는 반려합니다.</Shared.PageDescription>
              </div>
            </Shared.PageHeader>

            {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
            {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}

            <S.SearchBar onSubmit={(event) => { event.preventDefault(); search(1) }}>
              <S.SearchFilterGrid>
                <S.Field>
                  예약 상태
                  <AdminSelect
                    aria-label="예약 상태"
                    value={status}
                    width="100%"
                    disabled={hook.isLoading || hook.activeAction !== null}
                    onChange={(event) => setStatus(event.target.value as AdminReservationStatus | '')}
                  >
                    <option value="">전체</option>
                    {Object.entries(STATUS).map(([value, metadata]) => <option key={value} value={value}>{metadata.label}</option>)}
                  </AdminSelect>
                </S.Field>
                <S.Field>
                  장소 ID
                  <S.Input
                    value={placeId}
                    inputMode="numeric"
                    placeholder="예: 70069"
                    disabled={hook.isLoading || hook.activeAction !== null}
                    onChange={(event) => { setPlaceId(event.target.value); setFilterError('') }}
                  />
                </S.Field>
                <S.Field>
                  통합 검색
                  <S.Input
                    value={keyword}
                    placeholder="예약 ID, 장소명, 예약자"
                    disabled={hook.isLoading || hook.activeAction !== null}
                    onChange={(event) => setKeyword(event.target.value)}
                  />
                </S.Field>
                <S.SearchFilterActions>
                  <Shared.SecondaryButton type="button" disabled={hook.isLoading || hook.activeAction !== null} onClick={resetFilters}>초기화</Shared.SecondaryButton>
                  <Shared.PrimaryButton type="submit" disabled={hook.isLoading || hook.activeAction !== null}>조회</Shared.PrimaryButton>
                </S.SearchFilterActions>
              </S.SearchFilterGrid>
            </S.SearchBar>
            {filterError ? <Shared.Notice $variant="error">{filterError}</Shared.Notice> : null}
            {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}

            <Shared.Workspace>
              <Shared.Panel>
                <Shared.PanelHeader>
                  <div>
                    <Shared.PanelTitle>예약 목록</Shared.PanelTitle>
                    <Shared.PanelDescription>예약을 선택해 신청 정보와 심사 이력을 확인합니다.</Shared.PanelDescription>
                  </div>
                  <Shared.PanelCount>{hook.totalCount.toLocaleString()}건</Shared.PanelCount>
                </Shared.PanelHeader>
                <Shared.ScrollArea>
                  {hook.isLoading && hook.reservations.length === 0 ? (
                    <Shared.EmptyState><strong>예약 목록을 불러오는 중입니다.</strong></Shared.EmptyState>
                  ) : hook.reservations.length === 0 ? (
                    <Shared.EmptyState><strong>조건에 맞는 예약이 없습니다.</strong></Shared.EmptyState>
                  ) : (
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
                            <S.RecordSummary>{item.productName || item.productType || '예약 상품 정보 없음'} · {formatSchedule(item)}</S.RecordSummary>
                          </S.RecordButton>
                        )
                      })}
                    </S.CardList>
                  )}
                </Shared.ScrollArea>
                {hook.totalPages > 1 ? (
                  <AdminPagination
                    page={hook.query.page}
                    totalPages={hook.totalPages}
                    hasNext={hook.hasNext}
                    disabled={hook.isLoading || hook.activeAction !== null}
                    onPageChange={search}
                    ariaLabel="예약 목록 페이지네이션"
                  />
                ) : null}
              </Shared.Panel>

              <Shared.Panel>
                <Shared.PanelHeader>
                  <div>
                    <Shared.PanelTitle>예약 상세</Shared.PanelTitle>
                    <Shared.PanelDescription>예약자, 장소, 상품과 처리 이력을 확인합니다.</Shared.PanelDescription>
                  </div>
                </Shared.PanelHeader>
                <Shared.CompareBody>
                  {!selectedReservationId ? (
                    <Shared.EmptyState><strong>확인할 예약을 선택해주세요.</strong></Shared.EmptyState>
                  ) : hook.isDetailLoading ? (
                    <Shared.EmptyState><strong>예약 상세를 불러오는 중입니다.</strong></Shared.EmptyState>
                  ) : hook.detailErrorMessage ? (
                    <Shared.EmptyState>
                      <strong>{hook.detailErrorMessage}</strong>
                      <Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedReservationId)}>다시 시도</Shared.SecondaryButton>
                    </Shared.EmptyState>
                  ) : hook.reservation && selectedStatus ? (
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
                        <S.DetailItem><dt>장소</dt><dd>{hook.reservation.placeName || '정보 없음'} · #{hook.reservation.placeId}</dd></S.DetailItem>
                        <S.DetailItem><dt>상점주</dt><dd>{formatPerson(hook.reservation.merchantBusinessName, hook.reservation.merchantOwnerUserId)}</dd></S.DetailItem>
                        <S.DetailItem><dt>예약 상품</dt><dd>{hook.reservation.productName || hook.reservation.productType || '정보 없음'}</dd></S.DetailItem>
                        <S.DetailItem><dt>예약 시간</dt><dd>{formatSchedule(hook.reservation)}</dd></S.DetailItem>
                        <S.DetailItem><dt>예약 수량</dt><dd>{hook.reservation.quantity.toLocaleString()}명</dd></S.DetailItem>
                        <S.DetailItem><dt>검토 관리자</dt><dd>{hook.reservation.reviewedBy === null ? '미처리' : `관리자 #${hook.reservation.reviewedBy}`}</dd></S.DetailItem>
                        <S.DetailItem><dt>검토 일시</dt><dd>{formatDate(hook.reservation.reviewedAt)}</dd></S.DetailItem>
                      </S.DetailGrid>
                      {hook.reservation.reviewReason ? <S.RecordDescription>처리 사유: {hook.reservation.reviewReason}</S.RecordDescription> : null}
                      {hook.reservation.status === 'PENDING' ? (
                        <S.InlineActions>
                          <Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => openDialog('reject')}>반려</Shared.SecondaryButton>
                          <Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => openDialog('confirm')}>승인</Shared.PrimaryButton>
                        </S.InlineActions>
                      ) : null}
                    </>
                  ) : null}
                </Shared.CompareBody>
              </Shared.Panel>
            </Shared.Workspace>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>

      {dialog && hook.reservation ? (
        <Shared.ModalOverlay role="presentation" onMouseDown={() => hook.activeAction === null && setDialog(null)}>
          <Shared.Modal role="dialog" aria-modal="true" aria-labelledby="reservation-review-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <Shared.ModalHeader>
              <Shared.ModalTitle id="reservation-review-dialog-title">예약 {dialog.action === 'confirm' ? '승인' : '반려'}</Shared.ModalTitle>
              <Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}>
                <Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon>
              </Shared.ModalCloseButton>
            </Shared.ModalHeader>
            <Shared.ModalBody>
              <S.FormGrid>
                <S.WideField>
                  {dialog.action === 'reject' ? '반려 사유 *' : '승인 메모'}
                  <S.TextArea
                    value={reason}
                    maxLength={500}
                    disabled={hook.activeAction !== null}
                    placeholder={dialog.action === 'reject' ? '예약을 반려하는 사유를 입력해주세요.' : '승인 메모가 있으면 입력해주세요.'}
                    onChange={(event) => { setReason(event.target.value); setFormError('') }}
                  />
                  <small>{reason.length}/500</small>
                </S.WideField>
              </S.FormGrid>
              {formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}
            </Shared.ModalBody>
            <Shared.ModalFooter>
              <Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton>
              <Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => void submitReview()}>
                {hook.activeAction ? '처리 중' : dialog.action === 'confirm' ? '승인 확정' : '반려 확정'}
              </Shared.PrimaryButton>
            </Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  )
}

export default AdminReservationReviewPage
