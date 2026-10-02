import type { MerchantReservationTerms } from '../types/merchantStore.types'

export interface ReservationTermsDraft {
  unitAmountMinor: string
  additionalAmountMinor: string
  currency: string
  timezone: string
  cancellation: '' | 'allowed' | 'disallowed'
  cancellationCutoffMinutes: string
}

export function reservationTermsDraft(terms: MerchantReservationTerms | null): ReservationTermsDraft {
  return {
    unitAmountMinor: terms ? String(terms.unitAmountMinor) : '',
    additionalAmountMinor: terms ? String(terms.additionalAmountMinor) : '',
    currency: terms?.currency ?? 'KRW',
    timezone: terms?.timezone ?? 'Asia/Seoul',
    cancellation: terms ? terms.cancellable ? 'allowed' : 'disallowed' : '',
    cancellationCutoffMinutes: terms?.cancellationCutoffMinutes == null ? '' : String(terms.cancellationCutoffMinutes),
  }
}

export function parseReservationTerms(draft: ReservationTermsDraft): MerchantReservationTerms | string {
  const amount = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
  if (!amount(draft.unitAmountMinor) || !amount(draft.additionalAmountMinor)) return '가격과 추가 비용은 0 이상의 안전한 정수로 입력해주세요.'
  if (!/^[A-Z]{3}$/.test(draft.currency)) return '통화는 KRW, USD와 같은 영문 대문자 3자리로 입력해주세요.'
  try {
    if (!draft.timezone || draft.timezone.length > 64 || /^[+-]/.test(draft.timezone)) throw new Error('Invalid timezone')
    new Intl.DateTimeFormat('ko', { timeZone: draft.timezone }).format()
  } catch {
    return 'Asia/Seoul과 같은 유효한 IANA 시간대를 입력해주세요.'
  }
  if (!draft.cancellation) return '취소 가능 여부를 선택해주세요.'
  if (draft.cancellation === 'allowed' && (!amount(draft.cancellationCutoffMinutes) || Number(draft.cancellationCutoffMinutes) > 2147483647)) return '취소 기한은 0 이상 2,147,483,647 이하의 정수(분)로 입력해주세요.'
  return {
    unitAmountMinor: Number(draft.unitAmountMinor),
    additionalAmountMinor: Number(draft.additionalAmountMinor),
    currency: draft.currency,
    timezone: draft.timezone,
    cancellable: draft.cancellation === 'allowed',
    cancellationCutoffMinutes: draft.cancellation === 'allowed' ? Number(draft.cancellationCutoffMinutes) : null,
  }
}
