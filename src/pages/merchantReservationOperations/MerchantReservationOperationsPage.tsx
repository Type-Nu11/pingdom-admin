import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AppDialog } from '../../components/common/AppDialog'
import { ReservationConditions } from '../../components/merchant/ReservationConditions'
import { reservationCancellationRestriction } from '../../utils/reservationConditions'
import { useMerchantReservationOperations } from '../../hooks/useMerchantReservationOperations'
import type {
  MerchantReservation,
  MerchantReservationStatus,
  MerchantReservableProductType,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

const PRODUCT_TYPE_LABEL: Record<MerchantReservableProductType, string> = {
  GENERAL: '일반 예약',
  TICKET: '티켓',
  CLASS: '클래스',
}

const STATUS: Record<MerchantReservationStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  PENDING: { label: '관리자 심사 대기', tone: 'draft' },
  CONFIRMED: { label: '관리자 승인', tone: 'published' },
  REJECTED: { label: '관리자 반려', tone: 'closed' },
  CANCELED: { label: '취소', tone: 'closed' },
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function MerchantReservationOperationsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const operations = useMerchantReservationOperations()
  const [cancelTarget, setCancelTarget] = useState<MerchantReservation | null>(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const cancellationRestriction = reservationCancellationRestriction(cancelTarget?.confirmation, now)
  const isPending = operations.activeAction !== null
  const closeCancelDialog = () => { if (!isPending) setCancelTarget(null) }

  const productById = useMemo(
    () => new Map(operations.products.map((product) => [product.id, product])),
    [operations.products],
  )
  const availabilityById = useMemo(
    () => new Map(operations.availabilities.map((availability) => [availability.id, availability])),
    [operations.availabilities],
  )

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  const cancelReservation = async () => {
    if (!cancelTarget) return
    const result = await operations.cancelReservation(cancelTarget)
    if (result) setCancelTarget(null)
  }

  if (operations.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>예약 신청 조회</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{operations.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void operations.fetchReservations(1, true)}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return (
    <Store.Page>
      <Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header>
      <Store.Content>
        <Store.PageIntro><div><Store.PageTitle>예약 신청 조회</Store.PageTitle><Store.PageDescription>고객 예약 신청을 확인합니다. 승인과 반려는 관리자 예약 심사에서 처리됩니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" onClick={() => navigate('/merchant/reservations/setup')}>예약 가능 시간</S.HeaderButton><S.HeaderButton type="button" disabled={operations.isLoading || operations.activeAction !== null} onClick={() => void operations.fetchReservations(operations.pageInfo.page)}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
        {operations.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{operations.sectionErrorMessage}</Store.Notice> : null}
        {operations.actionErrorMessage && !cancelTarget ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}>{operations.actionErrorMessage}</Store.Notice> : null}
        {operations.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{operations.successMessage}</Store.Notice> : null}
        {operations.status === 'loading' || operations.isLoading ? <Store.LoadingSummary aria-label="예약 신청을 불러오는 중"><Store.Skeleton $height={420} /></Store.LoadingSummary> : <S.Panel><S.PanelHeader><div><S.PanelTitle>예약 신청 목록</S.PanelTitle><S.PanelDescription>심사 대기 예약은 관리자 승인 또는 반려를 기다립니다. 승인된 예약은 필요한 경우에만 취소할 수 있습니다.</S.PanelDescription></div></S.PanelHeader><S.ResultMeta>총 {operations.pageInfo.totalElements.toLocaleString()}건</S.ResultMeta>{operations.reservations.length === 0 ? <S.Empty>현재 조회할 예약 신청이 없습니다.</S.Empty> : <S.CampaignList>{operations.reservations.map((reservation) => {
          const product = reservation.productId === null ? null : productById.get(reservation.productId)
          const availability = availabilityById.get(reservation.availabilityId)
          const status = STATUS[reservation.status]
          const productLabel = reservation.confirmation?.productName ?? product?.name ?? (reservation.productType === 'GENERAL' ? '일반 예약' : `상품 #${reservation.productId ?? '-'}`)
          const isCanceling = operations.activeReservationId === reservation.id
          const restriction = reservationCancellationRestriction(reservation.confirmation, now)

          return <S.CampaignItem as="div" key={reservation.id} $selected={false}>
            <S.CampaignTop><S.CampaignTitle>{productLabel}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop>
            <S.CampaignMeta>예약 #{reservation.id} · {PRODUCT_TYPE_LABEL[reservation.productType]} · {reservation.quantity}명</S.CampaignMeta>
            {!reservation.confirmation ? <S.CampaignMeta>{availability ? `${formatDateTime(availability.startsAt)} - ${formatDateTime(availability.endsAt)}` : `예약 가능 시간 #${reservation.availabilityId}`}</S.CampaignMeta> : null}
            <ReservationConditions confirmation={reservation.confirmation} now={now} />
            <S.CampaignMeta>신청 {formatDateTime(reservation.createdAt)}{reservation.confirmedAt ? ` · 관리자 승인 ${formatDateTime(reservation.confirmedAt)}` : ''}{reservation.status === 'REJECTED' ? ` · 관리자 반려 ${formatDateTime(reservation.rejectedAt ?? reservation.reviewedAt)}${reservation.reviewReason ? ` · 반려 사유: ${reservation.reviewReason}` : ''}` : ''}{reservation.canceledAt ? ` · 취소 ${formatDateTime(reservation.canceledAt)}` : ''}</S.CampaignMeta>
            {reservation.status === 'CONFIRMED' ? <S.FormActions><S.ActionButton type="button" disabled={isCanceling || isPending || Boolean(restriction)} $variant="danger" onClick={() => { operations.clearActionError(); setNow(Date.now()); setCancelTarget(reservation) }}>예약 취소</S.ActionButton></S.FormActions> : null}
          </S.CampaignItem>
        })}</S.CampaignList>}{operations.pageInfo.totalPages > 1 ? <AdminPagination ariaLabel="상점주 예약 신청 목록 페이지네이션" page={operations.pageInfo.page} totalPages={operations.pageInfo.totalPages} hasNext={operations.pageInfo.hasNext} disabled={operations.isLoading} onPageChange={(nextPage) => void operations.fetchReservations(nextPage)} /> : null}</S.Panel>}
      </Store.Content>
      {cancelTarget ? <AppDialog title={`예약 #${cancelTarget.id} 취소`} isDismissible={!isPending} onClose={closeCancelDialog}
        description="취소 정책과 결제·환불 내역을 확인해주세요."
        footer={<><S.ActionButton type="button" disabled={isPending} onClick={closeCancelDialog}>닫기</S.ActionButton><S.ActionButton type="button" disabled={isPending || Boolean(cancellationRestriction)} $variant="danger" onClick={() => void cancelReservation()}>{isPending ? '처리 중' : '예약 취소'}</S.ActionButton></>}>
        <ReservationConditions confirmation={cancelTarget.confirmation} now={now} />
        <S.ReadonlyNotice>취소가 서버에서 완료되면 예약 가능 인원이 복구됩니다. 결제 처리 중이거나 환불되지 않은 결제가 있으면 먼저 결제·환불 확인이 필요합니다. 이 요청은 자동 환불하지 않습니다.</S.ReadonlyNotice>
        {operations.actionErrorMessage ? <Store.Notice $tone="error" role="alert">{operations.actionErrorMessage}</Store.Notice> : null}
        {operations.actionErrorKind === 'refund' ? <S.ActionButton type="button" onClick={() => navigate('/merchant/payments')}>결제·환불 내역 확인</S.ActionButton> : null}
      </AppDialog> : null}
    </Store.Page>
  )
}

export default MerchantReservationOperationsPage
