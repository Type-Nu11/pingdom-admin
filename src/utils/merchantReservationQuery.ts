import type { MerchantReservationQuery, MerchantReservationStatus } from '../types/merchantStore.types'
import { reservationInputToUtc, reservationTimestamp } from './reservationTime'

export const MERCHANT_RESERVATION_LIMIT = 20
export const EMPTY_RESERVATION_FILTERS = { status: '', placeId: '', from: '', to: '' }
export type MerchantReservationFilters = typeof EMPTY_RESERVATION_FILTERS

// Filters follow the reservation-start UTC contract, not audit-event local times.
export function reservationFilterQuery(filters: MerchantReservationFilters): MerchantReservationQuery | string {
  const from = filters.from ? reservationInputToUtc(filters.from) : undefined
  const to = filters.to ? reservationInputToUtc(filters.to) : undefined
  if (from === null || to === null) return '예약 시작 기간을 올바르게 입력해주세요.'
  if (from && to && reservationTimestamp(from)! >= reservationTimestamp(to)!) {
    return '종료 경계는 시작 경계보다 뒤여야 합니다.'
  }
  if (filters.status && !['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELED'].includes(filters.status)) {
    return '예약 상태를 다시 선택해주세요.'
  }
  const placeId = filters.placeId ? Number(filters.placeId) : undefined
  if (placeId !== undefined && (!Number.isSafeInteger(placeId) || placeId < 1)) return '장소를 다시 선택해주세요.'
  return {
    status: (filters.status || undefined) as MerchantReservationStatus | undefined,
    placeId, reservationFrom: from, reservationTo: to, page: 1, limit: MERCHANT_RESERVATION_LIMIT,
  }
}

export function merchantReservationQueryKey(query: MerchantReservationQuery) {
  return JSON.stringify([query.status ?? '', query.placeId ?? '', query.reservationFrom ?? '', query.reservationTo ?? '', query.page ?? 1])
}
