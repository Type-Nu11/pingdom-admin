import type { MerchantReservationConfirmation } from '../types/merchantStore.types'
import { formatInstantDateTime } from './displayFormat'

function instant(value: string | null) {
  if (!value || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function reservationConditionTime(value: string | null, timezone: string) {
  return formatInstantDateTime(value, timezone)
}

// Only the accepted policy can block locally; the server owns deadline validation.
export function reservationCancellationRestriction(confirmation: MerchantReservationConfirmation | null | undefined) {
  return confirmation?.cancellable === false ? '이 예약에 적용된 취소 정책에 따라 취소할 수 없습니다.' : null
}

export function reservationCancellationDeadlineNotice(confirmation: MerchantReservationConfirmation | null | undefined, now: number) {
  if (!confirmation?.cancellable) return null
  const deadline = instant(confirmation.cancellationDeadline)
  return deadline !== null && now >= deadline ? '기기 시각 기준으로 취소 기한이 지난 것으로 보입니다. 취소 요청을 보내면 실제 취소 가능 여부를 다시 확인합니다.' : null
}
