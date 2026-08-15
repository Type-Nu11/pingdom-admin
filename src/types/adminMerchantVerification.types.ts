import type { AuthErrorResponse } from './auth.types'

export type MerchantVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AdminMerchantVerificationListItem {
  userId: number
  legalName: string
  businessName: string
  maskedBusinessRegistrationNumber: string
  identityStatus: MerchantVerificationStatus
  businessStatus: MerchantVerificationStatus
  updatedAt: string
}

export interface AdminMerchantVerificationPageResponse {
  verifications: AdminMerchantVerificationListItem[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface AdminMerchantVerificationDetail {
  userId: number
  legalName: string
  businessName: string
  businessRegistrationNumber: string
  identityStatus: MerchantVerificationStatus
  businessStatus: MerchantVerificationStatus
  reviewReason: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminMerchantVerificationReviewRequest {
  identityApproved: boolean
  businessApproved: boolean
  reason: string
}

export type AdminMerchantVerificationErrorResponse = AuthErrorResponse<string>
