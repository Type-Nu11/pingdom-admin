import type { MerchantReservationConfirmation } from '../../types/merchantStore.types'
import { reservationAmount, reservationCancellationDeadlineNotice, reservationCancellationRestriction, reservationConditionTime } from '../../utils/reservationConditions'
import * as S from './MerchantWorkspace.styles'
import styled from 'styled-components'

const ConditionText = styled(S.CampaignMeta)`
  white-space: normal;
  overflow: visible;
  overflow-wrap: anywhere;
`

export function ReservationConditions({ confirmation, now }: { confirmation: MerchantReservationConfirmation | null; now: number }) {
  if (!confirmation) return <ConditionText>수락 조건 정보 없음 · 기존 예약의 금액·취소 정책은 서버 확인이 필요합니다.</ConditionText>
  const amount = (value: number) => reservationAmount(value, confirmation.currency, confirmation.currencyFractionDigits)
  const restriction = reservationCancellationRestriction(confirmation)
  const deadlineNotice = reservationCancellationDeadlineNotice(confirmation, now)
  return <div aria-label="수락한 예약 조건">
    <ConditionText>매장 {confirmation.placeName} · {confirmation.quantity}명 · 수락 조건 v{confirmation.conditionsVersion}</ConditionText>
    <ConditionText>상품 {confirmation.productName ?? (confirmation.productType === 'GENERAL' ? '일반 예약' : '상품명 정보 없음')}</ConditionText>
    <ConditionText>{reservationConditionTime(confirmation.startsAt, confirmation.timezone)} - {reservationConditionTime(confirmation.endsAt, confirmation.timezone)}</ConditionText>
    <ConditionText>단가 {amount(confirmation.unitAmountMinor)} · 추가 비용 {amount(confirmation.additionalAmountMinor)} · 총액 {amount(confirmation.totalAmountMinor)}</ConditionText>
    <ConditionText>{confirmation.paymentRequired ? '결제 필요 조건' : '결제 불필요 조건'} · 수락 당시 조건이며 현재 결제 상태는 별도 확인이 필요합니다.</ConditionText>
    <ConditionText>{restriction ?? (confirmation.cancellationDeadline ? `취소 기한 ${reservationConditionTime(confirmation.cancellationDeadline, confirmation.timezone)}` : '취소 기한 정보 없음 · 서버 확인 필요')}</ConditionText>
    {deadlineNotice ? <ConditionText>{deadlineNotice}</ConditionText> : null}
    {confirmation.cancellable ? <ConditionText>기한 내 취소 수수료 {amount(confirmation.cancellationFeeMinor)} · 정책상 환불액 {amount(confirmation.refundableAmountMinor)} (실제 환불 완료 여부와 별개)</ConditionText> : null}
  </div>
}
