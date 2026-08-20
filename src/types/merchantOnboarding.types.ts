import type { AuthErrorResponse } from './auth.types'

export type MerchantOwnerApplicationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'REVOKED'

export type MerchantOnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export type MerchantVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface MerchantOwnerApplicationProfile {
  userId: number
  businessName: string
  displayName: string
  description: string | null
  contactEmail: string
  contactPhone: string
  status: MerchantOwnerApplicationStatus
  onboardingStatus: MerchantOnboardingStatus
  onboardingCompletionRate: number
  onboardingCompletedAt: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  placeIds: number[]
}

export interface MerchantOwnerApplicationRequest {
  businessName: string
  displayName: string
  description?: string | null
  contactEmail: string
  contactPhone: string
}

export interface MerchantVerification {
  userId: number
  legalName: string
  businessName: string | null
  maskedBusinessRegistrationNumber: string | null
  identityStatus: MerchantVerificationStatus
  businessStatus: MerchantVerificationStatus
  reviewReason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MerchantVerificationRequest {
  legalName: string
  businessRegistrationNumber: string
}

export type MerchantOnboardingErrorResponse = AuthErrorResponse<string>
