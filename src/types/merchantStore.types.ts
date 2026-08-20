import type { AuthErrorResponse } from './auth.types'

export type MerchantOwnerProfileStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED'
export type MerchantOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type MerchantCampaignStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type MerchantOfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type ReservableProductStatus = 'ACTIVE' | 'INACTIVE'
export type MerchantReservableProductType = 'GENERAL' | 'TICKET' | 'CLASS'
export type MerchantOperatingNoticeType =
  | 'TEMPORARY_CLOSURE'
  | 'HOURS_CHANGE'
  | 'CROWDING'
  | 'REOPENING'
  | 'GENERAL'
export type MerchantOperatingNoticeSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type MerchantOperatingNoticeStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELED'
export type MerchantPlaceOperatingStatus =
  | 'OPERATING'
  | 'TEMPORARILY_CLOSED'
  | 'PERMANENTLY_CLOSED'
export type MerchantPlaceDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

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

export interface MerchantOfferCreateRequest {
  placeId: number
  title: string
  description: string
  benefitDescription: string
  startsAt: string
  endsAt: string
  totalQuantity?: number
  couponValidityDays: number
  eligibilityPolicy?: MerchantOffer['eligibilityPolicy']
  inventoryPolicy?: MerchantOffer['inventoryPolicy']
  expiryPolicy?: MerchantOffer['expiryPolicy']
}

export type MerchantCouponStatus = 'ISSUED' | 'REDEEMED' | 'EXPIRED'

export interface MerchantCouponRedeemRequest {
  code: string
}

export interface MerchantCoupon {
  id: number
  offerId: number
  code: string
  status: MerchantCouponStatus
  issuedAt: string
  expiresAt: string
  redeemedAt: string | null
}

export interface MerchantReservableProduct {
  id: number
  placeId: number
  productType: MerchantReservableProductType
  name: string
  status: ReservableProductStatus
}

export interface MerchantReservableProductCreateRequest {
  placeId: number
  productType: MerchantReservableProductType
  name: string
}

export interface MerchantAvailability {
  id: number
  placeId: number
  productId: number
  productType: MerchantReservableProductType
  startsAt: string
  endsAt: string
  totalCapacity: number
  remainingCapacity: number
  status: ReservableProductStatus
}

export interface MerchantAvailabilityUpsertRequest {
  placeId: number
  productId?: number
  productType?: MerchantReservableProductType
  startsAt: string
  endsAt: string
  totalCapacity?: number
}

export interface MerchantOperatingNotice {
  id: number
  placeId: number
  noticeType: MerchantOperatingNoticeType
  severity: MerchantOperatingNoticeSeverity
  status: MerchantOperatingNoticeStatus
  message: string
  startsAt: string
  expiresAt: string
  expiredAt: string | null
  canceledAt: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string
  visibleNow: boolean
}

export interface MerchantOperatingNoticeListResponse {
  placeId: number
  currentlyOperating: boolean
  checkedAt: string
  notices: MerchantOperatingNotice[]
}

export interface MerchantOperatingNoticeRequest {
  noticeType: MerchantOperatingNoticeType
  severity: MerchantOperatingNoticeSeverity
  message: string
  startsAt: string
  expiresAt: string
}

export interface MerchantOperatingNoticeUpdateRequest {
  severity: MerchantOperatingNoticeSeverity
  message: string
}

export interface MerchantOperatingNoticeCancelRequest {
  cancelReason: string
}

export interface MerchantPlaceOperatingTimeRange {
  opensAt: string
  closesAt: string
}

export interface MerchantPlaceRegularOperatingHour extends MerchantPlaceOperatingTimeRange {
  dayOfWeek: MerchantPlaceDayOfWeek
}

export interface MerchantPlaceOperatingException {
  date: string
  closed: boolean
  hours: MerchantPlaceOperatingTimeRange[]
}

export interface MerchantPlaceDetail {
  id: number
  name: string
  englishName: string | null
  category: string | null
  address: string | null
  roadAddress: string | null
  jibunAddress: string | null
  postalCode: string | null
  latitude: number
  longitude: number
  imageUrl: string | null
  operatingStatus: MerchantPlaceOperatingStatus
  operatingStatusCheckedAt: string | null
  regularHours: MerchantPlaceRegularOperatingHour[]
  operatingExceptions: MerchantPlaceOperatingException[]
}

export interface MerchantPlaceOperating {
  placeId: number
  operatingStatus: MerchantPlaceOperatingStatus
  operatingStatusCheckedAt: string | null
  currentlyOperating: boolean
  checkedAt: string
  regularHours: MerchantPlaceRegularOperatingHour[]
  operatingExceptions: MerchantPlaceOperatingException[]
}

export interface MerchantPlaceOperatingStatusUpdateRequest {
  operatingStatus: MerchantPlaceOperatingStatus
}

export interface MerchantPlaceOperatingScheduleUpdateRequest {
  regularHours?: MerchantPlaceRegularOperatingHour[]
  exceptions?: MerchantPlaceOperatingException[]
}

export interface MerchantPlaceOperatingScheduleResponse {
  placeId: number
  regularHours: MerchantPlaceRegularOperatingHour[]
  operatingExceptions: MerchantPlaceOperatingException[]
  message: string
}

export interface MerchantPlaceMediaItem {
  id: number
  placeId: number
  purpose: 'VERIFICATION' | 'EXPLORATION'
  imageUrl: string
  s3Key: string | null
  thumbnailUrl: string | null
  thumbnailS3Key: string | null
  sourceMapImageId: number | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface MerchantPlaceMediaResponse {
  placeId: number
  representativeMediaId: number | null
  media: MerchantPlaceMediaItem[]
}

export interface MerchantPlaceMediaUploadRequest {
  fileName: string
  contentType: string
  fileSize: number
}

export interface MerchantPlaceMediaUploadResponse {
  uploadUrl: string
  imageUrl: string
  s3Key: string
  expiresAt: string
}

export interface MerchantPlaceMediaOrderUpdateRequest {
  displayOrder: number
}

export type MerchantStoreErrorResponse = AuthErrorResponse<string>
