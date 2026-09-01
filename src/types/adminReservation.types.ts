import type { AuthErrorResponse } from './auth.types'

export type AdminReservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED'

export interface AdminReservation {
  id: number
  touristUserId: number
  touristUsername: string | null
  placeId: number
  placeName: string | null
  merchantOwnerUserId: number | null
  merchantBusinessName: string | null
  availabilityId: number
  productId: number | null
  productName: string | null
  productType: string | null
  quantity: number
  startsAt: string | null
  endsAt: string | null
  status: AdminReservationStatus
  createdAt: string
  confirmedAt: string | null
  rejectedAt: string | null
  canceledAt: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  reviewReason: string | null
  updatedAt: string
}

export interface AdminReservationPageResponse {
  reservations: AdminReservation[]
  page: number
  limit: number
  totalCount?: number
  totalElements?: number
  totalPages: number
  hasNext: boolean
}

export interface AdminReservationQuery {
  status?: AdminReservationStatus
  keyword?: string
  placeId?: number
  page?: number
  limit?: number
}

export interface AdminReservationReviewRequest {
  reason?: string
}

export type AdminReservationErrorResponse = AuthErrorResponse<string>
