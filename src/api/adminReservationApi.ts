import customAxios from './customAxios'
import type {
  AdminReservation,
  AdminReservationPageResponse,
  AdminReservationQuery,
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
