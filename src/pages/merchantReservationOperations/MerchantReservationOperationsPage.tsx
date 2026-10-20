import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { MerchantPlaceContext } from '../../app/providers/MerchantPlaceContext'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AppDialog } from '../../components/common/AppDialog'
import { MerchantPageShell } from '../../components/merchant/MerchantPageShell'
import { ReservationConditions } from '../../components/merchant/ReservationConditions'
import { reservationCancellationRestriction } from '../../utils/reservationConditions'
import { formatReservationSchedule, formatReservationEventTime as formatDateTime } from '../../utils/reservationTime'
import { useMerchantReservationOperations } from '../../hooks/useMerchantReservationOperations'
import { useMerchantPlaceIdentity } from '../../hooks/useMerchantPlaceIdentity'
import type { MerchantReservation, MerchantReservationStatus } from '../../types/merchantStore.types'
import { MerchantReservationFilters } from './MerchantReservationFilters'
import * as Store from '../../components/merchant/MerchantSurface.styles'
import * as S from '../../components/merchant/MerchantWorkspace.styles'
import * as R from './MerchantReservationOperationsPage.styles'

const STATUS: Record<MerchantReservationStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  PENDING: { label: '승인 대기', tone: 'draft' },
  CONFIRMED: { label: '확정', tone: 'published' },
  REJECTED: { label: '반려', tone: 'closed' },
  CANCELED: { label: '취소', tone: 'closed' },
}

function ReservationWorkspace({ initialPlaceId }: { initialPlaceId?: number }) {
  const navigate = useNavigate()
  const operations = useMerchantReservationOperations(initialPlaceId)
  const identity = useMerchantPlaceIdentity(operations.placeIds)
  const [cancelTarget, setCancelTarget] = useState<MerchantReservation | null>(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const pending = operations.activeAction !== null
  const busy = pending || operations.isLoading || Boolean(cancelTarget)
  const closeCancelDialog = () => { if (!pending) setCancelTarget(null) }
  const availabilityById = useMemo(() => new Map(operations.availabilities.map(item => [item.id, item])), [operations.availabilities])
  const selected = operations.detail
  const listHeading = useRef<HTMLHeadingElement>(null)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (operations.selectedReservationId && (selected || operations.detailErrorMessage) && window.matchMedia?.('(max-width: 980px)').matches) {
      detailHeading.current?.focus({ preventScroll: true })
      detailHeading.current?.scrollIntoView({ block: 'start' })
    }
  }, [operations.selectedReservationId, selected, operations.detailErrorMessage])
  const detailReservation = selected?.reservation
  const appliedStatus = operations.query.status ? STATUS[operations.query.status].label : '전체 상태'
  const restriction = reservationCancellationRestriction(cancelTarget?.confirmation)
  const schedule = (reservation: MerchantReservation) => {
    const availability = availabilityById.get(reservation.availabilityId)
    return formatReservationSchedule(reservation.reservationStartsAt ?? availability?.startsAt) + ' – ' + formatReservationSchedule(reservation.reservationEndsAt ?? availability?.endsAt)
  }
  return <MerchantPageShell title="예약 신청 조회" description="고객 예약 신청의 장소·시간·인원과 처리 기록을 확인합니다."
    actions={<S.HeaderActions><S.HeaderButton type="button" onClick={() => navigate('/merchant/reservations/setup')}>예약 가능 시간</S.HeaderButton><S.HeaderButton type="button" disabled={busy} onClick={() => { void operations.fetchReservations(); void operations.fetchReferences() }}>새로고침</S.HeaderButton></S.HeaderActions>}>
    <MerchantReservationFilters initialPlaceId={initialPlaceId} placeIds={operations.placeIds} busy={busy} onApply={query => { void operations.fetchReservations(query) }} />
    <R.Applied aria-label="적용된 예약 조회 조건">적용 조건: {appliedStatus} · {operations.query.placeId ? '매장 #' + operations.query.placeId : '전체 소유 매장'}
      {operations.query.reservationFrom ? ' · ' + formatReservationSchedule(operations.query.reservationFrom) + ' 이상' : ''}
      {operations.query.reservationTo ? ' · ' + formatReservationSchedule(operations.query.reservationTo) + ' 미만' : ''}
    </R.Applied>
    {operations.referenceErrorMessage ? <S.ReadonlyNotice role="status">{operations.referenceErrorMessage}<S.HeaderButton type="button" disabled={busy} onClick={() => void operations.fetchReferences()}>참조 정보 다시 시도</S.HeaderButton></S.ReadonlyNotice> : null}
    {operations.sectionErrorMessage || operations.errorMessage ? <Store.Notice $tone="error" role="alert">{operations.sectionErrorMessage || operations.errorMessage}<S.HeaderButton type="button" disabled={busy} onClick={() => void operations.fetchReservations()}>목록 다시 시도</S.HeaderButton></Store.Notice> : null}
    {operations.actionErrorMessage && !cancelTarget ? <Store.Notice $tone="error" role="alert">{operations.actionErrorMessage}</Store.Notice> : null}
    {operations.successMessage ? <Store.Notice $tone="success" role="status">{operations.successMessage}</Store.Notice> : null}
    <R.Workspace>
      <S.Panel aria-label="예약 신청 목록">
        <S.PanelHeader><div><R.PanelTitle ref={listHeading} tabIndex={-1}>예약 신청 목록</R.PanelTitle><S.PanelDescription>상세 보기에서 예약자와 요청사항, 처리 이력을 확인하세요.</S.PanelDescription></div></S.PanelHeader>
        <S.ResultMeta>{operations.hasListResult ? '총 ' + operations.pageInfo.totalElements.toLocaleString() + '건 · ' + operations.pageInfo.page + '페이지' + (operations.sectionErrorMessage || operations.isLoading ? ' (이전 결과)' : '') : '조회 결과 미확인'}</S.ResultMeta>
        {operations.isLoading || operations.status === 'loading' ? <S.ListLoading role="status" aria-label="예약 신청을 불러오는 중"><Store.Skeleton $height={180} /></S.ListLoading>
          : !operations.hasListResult ? <S.Empty>예약 목록 조회를 완료하지 못했습니다. 다시 시도해주세요.</S.Empty>
          : operations.reservations.length === 0 ? <S.Empty>조건에 맞는 예약 신청이 없습니다.</S.Empty>
          : <R.List>{operations.reservations.map(reservation => {
            const availability = availabilityById.get(reservation.availabilityId)
            const state = STATUS[reservation.status]
            const place = reservation.confirmation?.placeName || (availability?.placeId ? identity.label(availability.placeId) : '예약 #' + reservation.id)
            const blocked = reservationCancellationRestriction(reservation.confirmation)
            return <R.ListItem key={reservation.id} $selected={operations.selectedReservationId === reservation.id}>
              <S.CampaignTop><R.Title>{place}</R.Title><S.StatusBadge $tone={state.tone}>{state.label}</S.StatusBadge></S.CampaignTop>
              <R.Meta>예약 #{reservation.id} · {reservation.quantity}명</R.Meta>
              {!reservation.confirmation ? <R.Meta>{schedule(reservation)}</R.Meta> : null}
              <ReservationConditions confirmation={reservation.confirmation} now={now} />
              <R.Meta>신청 {formatDateTime(reservation.createdAt)}{reservation.confirmedAt ? ' · 확정 ' + formatDateTime(reservation.confirmedAt) : ''}{reservation.status === 'REJECTED' ? ' · 반려 ' + formatDateTime(reservation.rejectedAt ?? reservation.reviewedAt) + (reservation.reviewReason ? ' · 반려 사유: ' + reservation.reviewReason : '') : ''}{reservation.canceledAt ? ' · 취소 ' + formatDateTime(reservation.canceledAt) : ''}</R.Meta>
              <S.FormActions>
                <S.ActionButton type="button" aria-label={'예약 #' + reservation.id + ' 상세 보기'} aria-pressed={operations.selectedReservationId === reservation.id} disabled={busy || Boolean(operations.sectionErrorMessage)} onClick={() => void operations.fetchDetail(reservation.id)}>상세 보기</S.ActionButton>
                {reservation.status === 'CONFIRMED' ? <S.ActionButton type="button" disabled={busy || Boolean(operations.sectionErrorMessage) || Boolean(blocked)} $variant="danger" onClick={() => { operations.clearActionError(); setNow(Date.now()); setCancelTarget(reservation) }}>예약 취소</S.ActionButton> : null}
              </S.FormActions>
            </R.ListItem>
          })}</R.List>}
        {operations.hasListResult && operations.pageInfo.totalPages > 1 ? <AdminPagination ariaLabel="상점주 예약 신청 목록 페이지네이션" page={operations.pageInfo.page} totalPages={operations.pageInfo.totalPages} hasNext={operations.pageInfo.hasNext} disabled={busy} onPageChange={page => void operations.fetchReservations(page)} /> : null}
      </S.Panel>
      <S.Panel aria-label="예약 상세와 처리 이력">
        <S.PanelHeader><div><R.PanelTitle ref={detailHeading} tabIndex={-1}>예약 상세</R.PanelTitle><S.PanelDescription>당시 처리자와 현재 상태를 구분해 확인합니다.</S.PanelDescription></div><R.BackToList type="button" onClick={() => { listHeading.current?.focus({ preventScroll: true }); listHeading.current?.scrollIntoView({ block: 'start' }) }}>목록으로</R.BackToList></S.PanelHeader>
        {!operations.selectedReservationId ? <S.Empty>목록에서 예약의 상세 보기를 선택해주세요.</S.Empty>
          : operations.isDetailLoading || operations.isLoading ? <S.Empty role="status">예약 상세를 확인하는 중입니다.</S.Empty>
          : operations.detailErrorMessage ? <R.Detail><Store.Notice $tone="error" role="alert">{operations.detailErrorMessage}</Store.Notice><S.HeaderButton type="button" disabled={busy} onClick={() => { if (operations.sectionErrorMessage) void operations.fetchReservations(); else void operations.fetchDetail(operations.selectedReservationId!) }}>다시 확인</S.HeaderButton></R.Detail>
          : selected && detailReservation ? <R.Detail>
            <S.CampaignTop><R.Title>{selected.placeName || '장소 #' + selected.placeId}</R.Title><S.StatusBadge $tone={STATUS[detailReservation.status].tone}>{STATUS[detailReservation.status].label}</S.StatusBadge></S.CampaignTop>
            <R.Meta>예약 #{detailReservation.id}</R.Meta>
            <R.Info>
              <div><dt>예약자명</dt><dd>{detailReservation.bookerName?.trim() || '등록 정보 없음'}</dd></div>
              <div><dt>예약자 연락처</dt><dd>{detailReservation.bookerPhone?.trim() || '등록 정보 없음'}</dd></div>
              <R.Wide><dt>예약 시간</dt><dd>{schedule(detailReservation)}</dd></R.Wide>
              <div><dt>예약 인원</dt><dd>{detailReservation.quantity}명</dd></div>
              <div><dt>신청 일시</dt><dd>{formatDateTime(detailReservation.createdAt)}</dd></div>
              <R.Wide><dt>요청사항</dt><dd>{detailReservation.requestNote?.trim() || '등록된 요청사항 없음'}</dd></R.Wide>
              <div><dt>처리자</dt><dd>{detailReservation.reviewedBy != null ? '사용자 #' + detailReservation.reviewedBy : '처리 기록 없음'}</dd></div>
              <div><dt>처리 일시</dt><dd>{formatDateTime(detailReservation.reviewedAt)}</dd></div>
              {detailReservation.reviewReason ? <R.Wide><dt>처리 사유</dt><dd>{detailReservation.reviewReason}</dd></R.Wide> : null}
            </R.Info>
            <ReservationConditions confirmation={detailReservation.confirmation} now={now} />
            <R.HistoryTitle>처리 이력</R.HistoryTitle>
            {selected.statusHistory.length === 0 ? <R.Meta>등록된 처리 이력이 없습니다.</R.Meta> : <R.History aria-label="예약 상태 변경 이력">{selected.statusHistory.map(history => <li key={history.id}>
              <strong>{STATUS[history.status].label}</strong><R.Meta as="div">{formatDateTime(history.changedAt)} · {history.changedBy != null ? '처리자 사용자 #' + history.changedBy : '처리자 정보 없음'}</R.Meta>
              {history.reason ? <p>{history.reason}</p> : null}
            </li>)}</R.History>}
          </R.Detail> : <S.Empty>목록을 다시 확인한 뒤 상세를 조회해주세요.</S.Empty>}
      </S.Panel>
    </R.Workspace>
    {cancelTarget ? <AppDialog title={'예약 #' + cancelTarget.id + ' 취소'} isDismissible={!pending} onClose={closeCancelDialog} description="취소 정책과 결제·환불 내역을 확인해주세요."
      footer={<><S.ActionButton type="button" disabled={pending} onClick={closeCancelDialog}>닫기</S.ActionButton><S.ActionButton type="button" disabled={pending || Boolean(restriction)} $variant="danger" onClick={async () => { const result = await operations.cancelReservation(cancelTarget); if (result) setCancelTarget(null) }}>{pending ? '처리 중' : '예약 취소'}</S.ActionButton></>}>
      <ReservationConditions confirmation={cancelTarget.confirmation} now={now} />
      <S.ReadonlyNotice>취소가 서버에서 완료되면 예약 가능 인원이 복구됩니다. 결제 처리 중이거나 환불되지 않은 결제가 있으면 먼저 결제·환불 확인이 필요합니다. 이 요청은 자동 환불하지 않습니다.</S.ReadonlyNotice>
      {operations.actionErrorMessage ? <Store.Notice $tone="error" role="alert">{operations.actionErrorMessage}</Store.Notice> : null}
      {operations.actionErrorKind === 'refund' ? <S.ActionButton type="button" onClick={() => navigate('/merchant/payments')}>결제·환불 내역 확인</S.ActionButton> : null}
    </AppDialog> : null}
  </MerchantPageShell>
}

export default function MerchantReservationOperationsPage() {
  const { user } = useAuth()
  const selection = useContext(MerchantPlaceContext)
  const initialPlaceId = selection?.selectedPlaceId ?? undefined
  // A new account/role/shared store must never reuse another scope's filters or private detail.
  return <ReservationWorkspace key={String(user?.id ?? '') + ':' + (user?.role ?? '') + ':' + (initialPlaceId ?? '')} initialPlaceId={initialPlaceId} />
}
