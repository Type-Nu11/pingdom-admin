import type { AuthErrorResponse } from './auth.types'

export type MerchantOwnerStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED'
export type MerchantOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type MerchantOperationalQualityStatus = 'UNMEASURED' | 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK'

export interface AdminMerchantOwnerProfile {
  userId: number
  businessName: string
  displayName: string
  description: string | null
  contactEmail: string
  contactPhone: string
  status: MerchantOwnerStatus
  onboardingStatus: MerchantOnboardingStatus
  onboardingCompletionRate: number
  onboardingCompletedAt: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  reviewReason: string | null
  createdAt: string
  updatedAt: string
  placeIds: number[]
}

export interface AdminMerchantOwnerPageResponse {
  profiles: AdminMerchantOwnerProfile[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminMerchantOwnerPlace {
  placeId: number
  merchantOwnerUserId: number
  operationalQualityStatus: MerchantOperationalQualityStatus
  reservationResponseRate: number
  reservationCancellationRate: number
  noShowRate: number
  qualityEvaluatedAt: string | null
  createdAt: string
}

export interface AdminMerchantOwnerReviewRequest {
  reason?: string
  placeIds?: number[]
}

export interface AdminMerchantOwnerPlaceUpdateRequest {
  placeIds: number[]
  reason?: string
}

export interface AdminMerchantOnboardingUpdateRequest {
  status: MerchantOnboardingStatus
  completionRate: number
  completedAt?: string
  reason?: string
}

export interface AdminMerchantOwnerPlaceQualityUpdateRequest {
  status: MerchantOperationalQualityStatus
  reservationResponseRate: number
  reservationCancellationRate: number
  noShowRate: number
  evaluatedAt?: string
  reason?: string
}

export type AdminMerchantOwnerErrorResponse = AuthErrorResponse<string>
