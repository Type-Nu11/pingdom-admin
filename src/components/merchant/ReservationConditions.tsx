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
  if (!confirmation) return <ConditionText>이 예약의 취소 조건을 확인할 수 없습니다.</ConditionText>
  const restriction = reservationCancellationRestriction(confirmation)
  const deadlineNotice = reservationCancellationDeadlineNotice(confirmation, now)
  return <div aria-label="수락한 예약 조건">
    <ConditionText>매장 {confirmation.placeName} · {confirmation.quantity}명 · 예약 당시 적용된 조건 (버전 {confirmation.conditionsVersion})</ConditionText>
    <ConditionText>{reservationConditionTime(confirmation.startsAt, confirmation.timezone)} - {reservationConditionTime(confirmation.endsAt, confirmation.timezone)}</ConditionText>
    <ConditionText>{restriction ?? (confirmation.cancellationDeadline ? `취소 기한 ${reservationConditionTime(confirmation.cancellationDeadline, confirmation.timezone)}` : '이 예약의 취소 기한을 확인할 수 없습니다.')}</ConditionText>
    {deadlineNotice ? <ConditionText>{deadlineNotice}</ConditionText> : null}
  </div>
}
