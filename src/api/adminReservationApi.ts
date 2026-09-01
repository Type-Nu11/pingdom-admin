import customAxios from './customAxios'
import type {
  AdminReservation,
  AdminReservationPageResponse,
  AdminReservationQuery,
  AdminReservationReviewRequest,
} from '../types/adminReservation.types'

const PATH = '/admin/reservations'

export async function getAdminReservations(params: AdminReservationQuery) {
  const { data } = await customAxios.get<AdminReservationPageResponse>(PATH, { params })
  return data
}

export async function getAdminReservation(reservationId: number) {
  const { data } = await customAxios.get<AdminReservation>(`${PATH}/${reservationId}`)
  return data
}

async function reviewAdminReservation(
  reservationId: number,
  action: 'confirm' | 'reject',
  request?: AdminReservationReviewRequest,
) {
  const { data } = await customAxios.post<AdminReservation>(
    `${PATH}/${reservationId}/${action}`,
    request,
  )
  return data
}

export const confirmAdminReservation = (
  reservationId: number,
  request?: AdminReservationReviewRequest,
) => reviewAdminReservation(reservationId, 'confirm', request)

export const rejectAdminReservation = (
  reservationId: number,
  request: AdminReservationReviewRequest,
) => reviewAdminReservation(reservationId, 'reject', request)
