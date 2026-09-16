import type { AuthErrorResponse } from './auth.types'
import type { ReviewPresentation } from './reviewPresentation.types'

export type PlaceReviewDeletionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AdminPlaceReviewDeletionRequest extends ReviewPresentation {
  deletionRequestId: number
  status: PlaceReviewDeletionRequestStatus
  requestReason: string
  requesterUserId: number
  requestedAt: string
  reviewerAdminUserId: number | null
  reviewNote: string | null
  reviewedAt: string | null
  reviewId: number
  placeId: number
  reviewAuthorUserId: number
  recommendReason: string
  content: string
  imageUrls: string[]
  reviewVisibilityStatus: string
  reviewCreatedAt: string
}

export interface AdminPlaceReviewDeletionRequestPage {
  deletionRequests: AdminPlaceReviewDeletionRequest[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface AdminPlaceReviewDeletionRequestReviewRequest {
  decision: Extract<PlaceReviewDeletionRequestStatus, 'APPROVED' | 'REJECTED'>
  reviewNote: string
}

export type AdminPlaceReviewDeletionErrorResponse = AuthErrorResponse<string>
