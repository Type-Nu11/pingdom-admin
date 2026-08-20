import type { AuthErrorResponse } from './auth.types'

export type MerchantOwnerProfileStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED'
export type MerchantOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type MerchantCampaignStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type MerchantOfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type ReservableProductStatus = 'ACTIVE' | 'INACTIVE'

export interface MerchantOwnerProfile {
  userId: number
  businessName: string
  displayName: string
  description: string | null
  contactEmail: string
  contactPhone: string
  status: MerchantOwnerProfileStatus
  onboardingStatus: MerchantOnboardingStatus
  onboardingCompletionRate: number
  onboardingCompletedAt: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  placeIds: number[]
}

export interface MerchantPlaceInformation {
  placeId: number
  description: string | null
  contactPhone: string | null
  websiteUrl: string | null
  reservationUrl: string | null
  updatedByUserId: number | null
  createdAt: string
  updatedAt: string
}

export interface MerchantPlaceInformationUpdateRequest {
  description: string | null
  contactPhone: string | null
  websiteUrl: string | null
  reservationUrl: string | null
}

export interface MerchantCampaign {
  id: number
  brandId: number
  brandName: string
  brandLogoUrl: string
  placeId: number
  title: string
  description: string
  startsAt: string
  endsAt: string
  status: MerchantCampaignStatus
  createdAt: string
  updatedAt: string
}

export interface MerchantCampaignPageResponse {
  items: MerchantCampaign[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantCampaignRequest {
  brandId: number
  placeId: number
  title: string
  description: string
  startsAt: string
  endsAt: string
}

export interface MerchantBrand {
  id: number
  name: string
  description: string | null
  logoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface MerchantBrandRequest {
  name: string
  description?: string
  logoUrl?: string
}

export interface MerchantBrandPageResponse {
  items: MerchantBrand[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantOffer {
  id: number
  placeId: number
  title: string
  description: string
  benefitDescription: string
  status: MerchantOfferStatus
  startsAt: string
  endsAt: string
  totalQuantity: number | null
  issuedQuantity: number
  remainingQuantity: number | null
  couponValidityDays: number
  eligibilityPolicy: 'ACTIVE_TRAVEL_SCHEDULE' | 'PUBLIC'
  inventoryPolicy: 'LIMITED' | 'UNLIMITED'
  expiryPolicy: 'ISSUE_PLUS_DAYS_CAPPED_BY_OFFER_END' | 'ISSUE_PLUS_DAYS' | 'OFFER_END'
  createdAt: string
  updatedAt: string
}

export interface MerchantOfferPageResponse {
  offers: MerchantOffer[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantReservableProduct {
  id: number
  placeId: number
  productType: 'GENERAL' | 'TICKET' | 'CLASS'
  name: string
  status: ReservableProductStatus
}

export type MerchantStoreErrorResponse = AuthErrorResponse<string>
