import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantPayments } from '../../hooks/useMerchantPayments'
import type {
  MerchantPayment,
  MerchantPaymentStatus,
  MerchantSettlementEntryType,
  MerchantSettlementStatus,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

type Tab = 'payments' | 'settlements'

const PAYMENT_STATUS: Record<MerchantPaymentStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  PROCESSING: { label: '결제 처리 중', tone: 'draft' },
  PAID: { label: '결제 완료', tone: 'published' },
  REFUND_PROCESSING: { label: '환불 처리 중', tone: 'draft' },
  FAILED: { label: '결제 실패', tone: 'closed' },
  REFUNDED: { label: '환불 완료', tone: 'closed' },
}

const SETTLEMENT_STATUS: Record<MerchantSettlementStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  PENDING: { label: '정산 대기', tone: 'draft' },
  SETTLED: { label: '정산 완료', tone: 'published' },
  REVERSED: { label: '정산 취소', tone: 'closed' },
}

const SETTLEMENT_TYPE: Record<MerchantSettlementEntryType, string> = {
  PAYMENT: '결제',
  REFUND: '환불',
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatAmountMinor(amountMinor: number, currency: string) {
  return `${new Intl.NumberFormat('ko-KR').format(amountMinor)} ${currency}`
}

function MerchantPaymentsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const payments = useMerchantPayments()
  const [activeTab, setActiveTab] = useState<Tab>('payments')
  const [refundTarget, setRefundTarget] = useState<MerchantPayment | null>(null)

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  const handleRefund = async () => {
    if (!refundTarget) return
    const result = await payments.refundPayment(refundTarget)
    if (result) setRefundTarget(null)
  }

  const isPaymentInitialLoading = payments.isLoadingPayments && !payments.hasLoadedPayments
  const isSettlementInitialLoading = payments.isLoadingSettlements && !payments.hasLoadedSettlements

  return (
    <Store.Page>
      <Store.Header>
        <Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
        <Store.HeaderUser>
          <Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon>
          <strong>{user?.username || '상점주'}</strong>
          <Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton>
        </Store.HeaderUser>
      </Store.Header>

      <Store.Content>
        <Store.PageIntro>
          <div>
            <Store.Eyebrow>Merchant Portal</Store.Eyebrow>
            <Store.PageTitle>결제·정산</Store.PageTitle>
            <Store.PageDescription>소유 장소에서 발생한 결제와 정산 상태를 확인합니다.</Store.PageDescription>
          </div>
          <S.HeaderActions>
            <S.HeaderButton type="button" onClick={() => navigate('/merchant')}>내 가게 관리</S.HeaderButton>
            <S.HeaderButton
              type="button"
              disabled={activeTab === 'payments' ? payments.isLoadingPayments : payments.isLoadingSettlements}
              onClick={() => {
                if (activeTab === 'payments') {
                  void payments.fetchPayments(payments.paymentPageInfo.page)
                  return
                }
                void payments.fetchSettlements(payments.settlementPageInfo.page)
              }}
            >
              새로고침
            </S.HeaderButton>
          </S.HeaderActions>
        </Store.PageIntro>

        {payments.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{payments.actionErrorMessage}</Store.Notice> : null}
        {payments.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{payments.successMessage}</Store.Notice> : null}

        <S.Panel>
          <S.FilterBar role="tablist" aria-label="결제 정산 화면 전환">
            <S.FilterButton type="button" role="tab" aria-selected={activeTab === 'payments'} $selected={activeTab === 'payments'} onClick={() => setActiveTab('payments')}>결제 내역</S.FilterButton>
            <S.FilterButton type="button" role="tab" aria-selected={activeTab === 'settlements'} $selected={activeTab === 'settlements'} onClick={() => setActiveTab('settlements')}>정산 원장</S.FilterButton>
          </S.FilterBar>

          {activeTab === 'payments' ? (
            <>
              <S.PanelHeader>
                <div>
                  <S.PanelTitle>결제 내역</S.PanelTitle>
                  <S.PanelDescription>결제 완료 건만 전액 환불할 수 있습니다.</S.PanelDescription>
                </div>
              </S.PanelHeader>
              {payments.paymentErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ margin: '16px 24px 0' }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{payments.paymentErrorMessage}</Store.Notice> : null}
              {isPaymentInitialLoading ? <Store.LoadingSummary aria-label="결제 목록을 불러오는 중" style={{ padding: 24 }}><Store.Skeleton $height={360} /></Store.LoadingSummary> : !payments.hasLoadedPayments ? <S.Empty>결제 목록을 불러오지 못했습니다.</S.Empty> : <>
                <S.ResultMeta>총 {payments.paymentPageInfo.totalElements.toLocaleString()}건</S.ResultMeta>
                {payments.payments.length === 0 ? <S.Empty>조회할 결제 내역이 없습니다.</S.Empty> : <S.CampaignList>{payments.payments.map((payment) => {
                  const status = PAYMENT_STATUS[payment.status]
                  const isRefunding = payments.refundingPaymentId === payment.id
                  return <S.CampaignItem as="article" key={payment.id} $selected={false}><S.CampaignTop><S.CampaignTitle title={`결제 #${payment.id}`}>결제 #{payment.id}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>예약 #{payment.reservationId} · {formatAmountMinor(payment.amountMinor, payment.currency)}</S.CampaignMeta><S.CampaignMeta title={payment.providerPaymentId}>결제 수단 {payment.provider} · 승인 번호 {payment.providerPaymentId}</S.CampaignMeta><S.CampaignMeta>생성 {formatDateTime(payment.createdAt)} · 결제 {formatDateTime(payment.paidAt)}{payment.refundedAt ? ` · 환불 ${formatDateTime(payment.refundedAt)}` : ''}</S.CampaignMeta>{payment.failureCode ? <S.CampaignMeta>실패 코드 {payment.failureCode}</S.CampaignMeta> : null}{payment.status === 'PAID' ? <S.FormActions><S.ActionButton type="button" $variant="danger" disabled={isRefunding || payments.refundingPaymentId !== null} onClick={() => setRefundTarget(payment)}>전액 환불</S.ActionButton></S.FormActions> : null}</S.CampaignItem>
                })}</S.CampaignList>}
                {payments.paymentPageInfo.totalPages > 1 ? <S.Pagination><S.PaginationButton type="button" disabled={payments.isLoadingPayments || payments.paymentPageInfo.page <= 1} onClick={() => void payments.fetchPayments(payments.paymentPageInfo.page - 1)}>이전</S.PaginationButton><S.PageText>{payments.paymentPageInfo.page} / {payments.paymentPageInfo.totalPages}</S.PageText><S.PaginationButton type="button" disabled={payments.isLoadingPayments || !payments.paymentPageInfo.hasNext} onClick={() => void payments.fetchPayments(payments.paymentPageInfo.page + 1)}>다음</S.PaginationButton></S.Pagination> : null}
              </>}
            </>
          ) : (
            <>
              <S.PanelHeader>
                <div>
                  <S.PanelTitle>정산 원장</S.PanelTitle>
                  <S.PanelDescription>결제·환불별 수수료와 정산 금액을 확인합니다.</S.PanelDescription>
                </div>
              </S.PanelHeader>
              {payments.settlementErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ margin: '16px 24px 0' }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{payments.settlementErrorMessage}</Store.Notice> : null}
              {isSettlementInitialLoading ? <Store.LoadingSummary aria-label="정산 원장을 불러오는 중" style={{ padding: 24 }}><Store.Skeleton $height={360} /></Store.LoadingSummary> : !payments.hasLoadedSettlements ? <S.Empty>정산 원장을 불러오지 못했습니다.</S.Empty> : <>
                <S.ResultMeta>총 {payments.settlementPageInfo.totalElements.toLocaleString()}건</S.ResultMeta>
                {payments.settlements.length === 0 ? <S.Empty>조회할 정산 내역이 없습니다.</S.Empty> : <S.CampaignList>{payments.settlements.map((entry) => {
                  const status = SETTLEMENT_STATUS[entry.status]
                  return <S.CampaignItem as="article" key={entry.id} $selected={false}><S.CampaignTop><S.CampaignTitle>{SETTLEMENT_TYPE[entry.entryType]} 정산 #{entry.id}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>결제 #{entry.paymentTransactionId} · 총액 {formatAmountMinor(entry.grossAmountMinor, entry.currency)}</S.CampaignMeta><S.CampaignMeta>수수료 {formatAmountMinor(entry.feeAmountMinor, entry.currency)} · 정산액 {formatAmountMinor(entry.netAmountMinor, entry.currency)}</S.CampaignMeta><S.CampaignMeta>생성 {formatDateTime(entry.createdAt)} · 정산 {formatDateTime(entry.settledAt)}</S.CampaignMeta></S.CampaignItem>
                })}</S.CampaignList>}
                {payments.settlementPageInfo.totalPages > 1 ? <S.Pagination><S.PaginationButton type="button" disabled={payments.isLoadingSettlements || payments.settlementPageInfo.page <= 1} onClick={() => void payments.fetchSettlements(payments.settlementPageInfo.page - 1)}>이전</S.PaginationButton><S.PageText>{payments.settlementPageInfo.page} / {payments.settlementPageInfo.totalPages}</S.PageText><S.PaginationButton type="button" disabled={payments.isLoadingSettlements || !payments.settlementPageInfo.hasNext} onClick={() => void payments.fetchSettlements(payments.settlementPageInfo.page + 1)}>다음</S.PaginationButton></S.Pagination> : null}
              </>}
            </>
          )}
        </S.Panel>
      </Store.Content>

      {refundTarget ? <S.ModalOverlay role="presentation" onMouseDown={() => setRefundTarget(null)}><S.Modal role="dialog" aria-modal="true" aria-labelledby="refund-payment-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><S.ModalTitle id="refund-payment-title">결제 전액 환불</S.ModalTitle><S.CloseButton type="button" aria-label="닫기" onClick={() => setRefundTarget(null)}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.ReadonlyNotice>결제 #{refundTarget.id} · 예약 #{refundTarget.reservationId} · {formatAmountMinor(refundTarget.amountMinor, refundTarget.currency)}을(를) 전액 환불합니다. 이 작업은 되돌릴 수 없습니다.</S.ReadonlyNotice><S.FormActions><S.ActionButton type="button" disabled={payments.refundingPaymentId !== null} onClick={() => setRefundTarget(null)}>닫기</S.ActionButton><S.ActionButton type="button" $variant="danger" disabled={payments.refundingPaymentId !== null} onClick={() => void handleRefund()}>{payments.refundingPaymentId ? '환불 처리 중' : '전액 환불'}</S.ActionButton></S.FormActions></S.ModalBody></S.Modal></S.ModalOverlay> : null}
    </Store.Page>
  )
}

export default MerchantPaymentsPage
