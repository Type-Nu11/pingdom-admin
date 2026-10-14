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

export type MerchantOnboardingErrorResponse = AuthErrorResponse<string>
