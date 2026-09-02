import type { AuthErrorResponse } from './auth.types'

export type AdminReservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED'

export interface AdminReservation {
  id: number
  touristUserId: number
  touristUsername: string | null
  placeId: number
  placeName: string | null
  merchantOwnerUserId: number | null
  merchantOwnerUsername: string | null
  availabilityId: number
  productId: number | null
  productName: string | null
  quantity: number
  reservationStartsAt: string | null
  reservationEndsAt: string | null
  status: AdminReservationStatus
  createdAt: string
  confirmedAt: string | null
  rejectedAt: string | null
  canceledAt: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  reviewReason: string | null
  statusHistory: AdminReservationStatusHistory[]
}

export interface AdminReservationStatusHistory {
  id: number
  status: AdminReservationStatus
  changedBy: number | null
  reason: string | null
  changedAt: string | null
}

export interface AdminReservationPageResponse {
  reservations: AdminReservation[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface AdminReservationQuery {
  status?: AdminReservationStatus
  placeId?: number
  page?: number
  limit?: number
}

export interface AdminReservationReviewRequest {
  reason: string
}

export type AdminReservationErrorResponse = AuthErrorResponse<string>
