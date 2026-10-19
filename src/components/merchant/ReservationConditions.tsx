import type { MerchantReservationConfirmation } from '../../types/merchantStore.types'
import { reservationCancellationDeadlineNotice, reservationCancellationRestriction, reservationConditionTime } from '../../utils/reservationConditions'
import * as S from './MerchantWorkspace.styles'
import styled from 'styled-components'

const ConditionText = styled(S.CampaignMeta)`
  white-space: normal;
  overflow: visible;
  overflow-wrap: anywhere;
`

export function ReservationConditions({ confirmation, now }: { confirmation: MerchantReservationConfirmation | null; now: number }) {
  if (!confirmation) return <ConditionText>수락 조건 정보 없음 · 취소 가능 여부는 서버 확인이 필요합니다.</ConditionText>
  const restriction = reservationCancellationRestriction(confirmation)
  const deadlineNotice = reservationCancellationDeadlineNotice(confirmation, now)
  return <div aria-label="수락한 예약 조건">
    <ConditionText>매장 {confirmation.placeName} · {confirmation.quantity}명 · 수락 조건 v{confirmation.conditionsVersion}</ConditionText>
    <ConditionText>{reservationConditionTime(confirmation.startsAt, confirmation.timezone)} - {reservationConditionTime(confirmation.endsAt, confirmation.timezone)}</ConditionText>
    <ConditionText>{restriction ?? (confirmation.cancellationDeadline ? `취소 기한 ${reservationConditionTime(confirmation.cancellationDeadline, confirmation.timezone)}` : '취소 기한 정보 없음 · 서버 확인 필요')}</ConditionText>
    {deadlineNotice ? <ConditionText>{deadlineNotice}</ConditionText> : null}
  </div>
}
