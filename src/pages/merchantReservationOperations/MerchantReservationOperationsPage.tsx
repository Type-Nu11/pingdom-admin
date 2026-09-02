import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
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
        {operations.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{operations.actionErrorMessage}</Store.Notice> : null}
        {operations.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{operations.successMessage}</Store.Notice> : null}
        {operations.status === 'loading' || operations.isLoading ? <Store.LoadingSummary aria-label="예약 신청을 불러오는 중"><Store.Skeleton $height={420} /></Store.LoadingSummary> : <S.Panel><S.PanelHeader><div><S.PanelTitle>예약 신청 목록</S.PanelTitle><S.PanelDescription>심사 대기 예약은 관리자 승인 또는 반려를 기다립니다. 상점주는 필요한 경우에만 취소할 수 있습니다.</S.PanelDescription></div></S.PanelHeader><S.ResultMeta>총 {operations.pageInfo.totalElements.toLocaleString()}건</S.ResultMeta>{operations.reservations.length === 0 ? <S.Empty>현재 조회할 예약 신청이 없습니다.</S.Empty> : <S.CampaignList>{operations.reservations.map((reservation) => {
          const product = reservation.productId === null ? null : productById.get(reservation.productId)
          const availability = availabilityById.get(reservation.availabilityId)
          const status = STATUS[reservation.status]
          const productLabel = product?.name ?? (reservation.productType === 'GENERAL' ? '일반 예약' : `상품 #${reservation.productId ?? '-'}`)
          const isCanceling = operations.activeReservationId === reservation.id

          return <S.CampaignItem as="div" key={reservation.id} $selected={false}><S.CampaignTop><S.CampaignTitle>{productLabel}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>예약 #{reservation.id} · {PRODUCT_TYPE_LABEL[reservation.productType]} · {reservation.quantity}명</S.CampaignMeta><S.CampaignMeta>{availability ? `${formatDateTime(availability.startsAt)} - ${formatDateTime(availability.endsAt)}` : `예약 가능 시간 #${reservation.availabilityId}`}</S.CampaignMeta><S.CampaignMeta>신청 {formatDateTime(reservation.createdAt)}{reservation.confirmedAt ? ` · 관리자 승인 ${formatDateTime(reservation.confirmedAt)}` : ''}{reservation.canceledAt ? ` · 취소 ${formatDateTime(reservation.canceledAt)}` : ''}</S.CampaignMeta>{reservation.status === 'PENDING' ? <S.FormActions><S.ActionButton type="button" disabled={isCanceling || operations.activeAction !== null} $variant="danger" onClick={() => setCancelTarget(reservation)}>신청 취소</S.ActionButton></S.FormActions> : null}</S.CampaignItem>
        })}</S.CampaignList>}{operations.pageInfo.totalPages > 1 ? <S.Pagination><S.PaginationButton type="button" disabled={operations.isLoading || operations.pageInfo.page <= 1} onClick={() => void operations.fetchReservations(operations.pageInfo.page - 1)}>이전</S.PaginationButton><S.PageText>{operations.pageInfo.page} / {operations.pageInfo.totalPages}</S.PageText><S.PaginationButton type="button" disabled={operations.isLoading || !operations.pageInfo.hasNext} onClick={() => void operations.fetchReservations(operations.pageInfo.page + 1)}>다음</S.PaginationButton></S.Pagination> : null}</S.Panel>}
      </Store.Content>
      {cancelTarget ? <S.ModalOverlay role="presentation" onMouseDown={() => setCancelTarget(null)}><S.Modal role="dialog" aria-modal="true" aria-labelledby="reservation-cancel-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="reservation-cancel-title">예약 신청 취소</S.ModalTitle></div><S.CloseButton type="button" aria-label="닫기" onClick={() => setCancelTarget(null)}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.ReadonlyNotice>예약 #{cancelTarget.id} 신청을 취소합니다. 취소하면 예약 가능 인원이 복구됩니다.</S.ReadonlyNotice><S.FormActions><S.ActionButton type="button" disabled={operations.activeAction !== null} onClick={() => setCancelTarget(null)}>닫기</S.ActionButton><S.ActionButton type="button" disabled={operations.activeAction !== null} $variant="danger" onClick={() => void cancelReservation()}>{operations.activeAction ? '처리 중' : '신청 취소'}</S.ActionButton></S.FormActions></S.ModalBody></S.Modal></S.ModalOverlay> : null}
    </Store.Page>
  )
}

export default MerchantReservationOperationsPage
