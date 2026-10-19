import type { MerchantReservationTerms } from '../types/merchantStore.types'

export interface ReservationTermsDraft {
  timezone: string
  cancellation: '' | 'allowed' | 'disallowed'
  cancellationCutoffMinutes: string
}

export function reservationTermsDraft(terms: MerchantReservationTerms | null): ReservationTermsDraft {
  return {
    timezone: terms?.timezone ?? 'Asia/Seoul',
    cancellation: terms?.cancellable === true ? 'allowed' : terms?.cancellable === false ? 'disallowed' : '',
    cancellationCutoffMinutes: terms?.cancellationCutoffMinutes == null ? '' : String(terms.cancellationCutoffMinutes),
  }
}

export function parseReservationTerms(draft: ReservationTermsDraft): MerchantReservationTerms | string {
  const wholeMinutes = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
  try {
    if (!draft.timezone || draft.timezone.length > 64 || /^[+-]/.test(draft.timezone)) throw new Error('Invalid timezone')
    new Intl.DateTimeFormat('ko', { timeZone: draft.timezone }).format()
  } catch {
    return 'Asia/Seoul과 같은 유효한 IANA 시간대를 입력해주세요.'
  }
  if (!['allowed', 'disallowed'].includes(draft.cancellation)) return '취소 가능 여부를 선택해주세요.'
  if (draft.cancellation === 'allowed' && (!wholeMinutes(draft.cancellationCutoffMinutes) || Number(draft.cancellationCutoffMinutes) > 2147483647)) return '취소 기한은 0 이상 2,147,483,647 이하의 정수(분)로 입력해주세요.'
  return {
    timezone: draft.timezone,
    cancellable: draft.cancellation === 'allowed',
    cancellationCutoffMinutes: draft.cancellation === 'allowed' ? Number(draft.cancellationCutoffMinutes) : null,
  }
}
