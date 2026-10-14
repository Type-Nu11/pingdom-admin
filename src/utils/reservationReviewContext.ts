import type { AdminReservationStatus } from '../types/adminReservation.types'

export interface ReservationReviewQuery {
  status: AdminReservationStatus | ''
  placeId: number | undefined
  page: number
}

export interface ReservationReviewContext {
  query: ReservationReviewQuery
  selectedReservationId: number | null
}

export const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELED'] as const
export const DEFAULT_RESERVATION_QUERY: ReservationReviewQuery = { status: 'PENDING', placeId: undefined, page: 1 }

function positiveInteger(value: string | null, max = Number.MAX_SAFE_INTEGER) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number <= max ? number : null
}

export function readReservationReviewContext(search: string): ReservationReviewContext {
  const params = new URLSearchParams(search)
  // Repeated keys are ambiguous; do not pick one arbitrarily.
  const single = (key: string) => params.getAll(key).length === 1 ? params.get(key) : null
  const status = single('status')
  return {
    query: {
      status: status === 'ALL' ? '' : RESERVATION_STATUSES.find(value => value === status) ?? 'PENDING',
      placeId: positiveInteger(single('placeId')) ?? undefined,
      page: positiveInteger(single('page'), 999999) ?? 1,
    },
    selectedReservationId: positiveInteger(single('reservationId')),
  }
}

export function writeReservationReviewContext(context: ReservationReviewContext) {
  const params = new URLSearchParams()
  const { status, placeId, page } = context.query
  if (status !== 'PENDING') params.set('status', status || 'ALL')
  if (placeId !== undefined) params.set('placeId', String(placeId))
  if (page !== 1) params.set('page', String(page))
  if (context.selectedReservationId !== null) params.set('reservationId', String(context.selectedReservationId))
  return params.size ? `?${params}` : ''
}

export function reservationReviewOwnerMismatch(state: unknown, userId: number | null | undefined, role: string | undefined) {
  if (!state || typeof state !== 'object' || !('reservationReviewOwner' in state)) return false
  const owner = state.reservationReviewOwner
  return !owner || typeof owner !== 'object' || !('userId' in owner) || !('role' in owner)
    || owner.userId !== userId || owner.role !== role
}
