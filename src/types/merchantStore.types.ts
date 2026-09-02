import type { AuthErrorResponse } from './auth.types'

export type MerchantOwnerProfileStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED'
export type MerchantOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type MerchantCampaignStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type MerchantOfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type ReservableProductStatus = 'ACTIVE' | 'INACTIVE'
export type MerchantReservableProductType = 'GENERAL' | 'TICKET' | 'CLASS'
export type MerchantReservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED'
export type MerchantPaymentStatus =
  | 'PROCESSING'
  | 'PAID'
  | 'REFUND_PROCESSING'
  | 'FAILED'
  | 'REFUNDED'
export type MerchantSettlementEntryType = 'PAYMENT' | 'REFUND'
export type MerchantSettlementStatus = 'PENDING' | 'SETTLED' | 'REVERSED'
export type MerchantPlaceReverificationStatus =
  | 'REQUESTED'
  | 'RESPONDED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'EXPIRED'
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
export type MerchantPlaceClaimType = 'INITIAL' | 'OWNERSHIP_TRANSFER'
export type MerchantPlaceClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'
export type MerchantPlaceClaimDocumentType =
  | 'BUSINESS_LICENSE'
  | 'RESIDENT_REGISTRATION'
  | 'REPRESENTATIVE_IMAGE'
export type MerchantVerifiedBoostExecutionStatus = 'ACTIVE' | 'STOPPED' | 'EXPIRED'
export type MerchantVerifiedBoostProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

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

export interface MerchantPerformance {
  placeCount: number
  exposureCount: number
  clickCount: number
  bookmarkCount: number
  reservationCount: number
  confirmedReservationCount: number
  clickThroughRate: number
  reservationConversionRate: number
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
  productId: number | null
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

export interface MerchantReservation {
  id: number
  touristUserId: number
  availabilityId: number
  productId: number | null
  productType: MerchantReservableProductType
  quantity: number
  status: MerchantReservationStatus
  createdAt: string
  confirmedAt: string | null
  canceledAt: string | null
  updatedAt: string
}

export interface MerchantReservationPageResponse {
  reservations: MerchantReservation[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPayment {
  id: number
  reservationId: number
  provider: string
  providerPaymentId: string | null
  amountMinor: number | null
  currency: string | null
  status: MerchantPaymentStatus
  failureCode: string | null
  createdAt: string
  paidAt: string | null
  refundedAt: string | null
}

export interface MerchantPaymentPageResponse {
  payments: MerchantPayment[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantSettlementLedgerEntry {
  id: number
  paymentTransactionId: number
  entryType: MerchantSettlementEntryType
  grossAmountMinor: number
  feeAmountMinor: number
  netAmountMinor: number
  currency: string
  status: MerchantSettlementStatus
  createdAt: string
  settledAt: string | null
}

export interface MerchantSettlementLedgerPageResponse {
  entries: MerchantSettlementLedgerEntry[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPlaceReverificationRequest {
  requestId: number
  placeId: number
  merchantOwnerUserId: number
  status: MerchantPlaceReverificationStatus
  reason: string
  requestedAt: string
  dueAt: string
  lastRemindedAt: string | null
  reminderCount: number
  respondedAt: string | null
  responseNote: string | null
  completedAt: string | null
}

export interface MerchantPlaceReverificationPageResponse {
  requests: MerchantPlaceReverificationRequest[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPlaceReverificationResponseRequest {
  responseNote: string
}

export interface MerchantPlaceClaim {
  id: number
  placeId: number
  claimType: MerchantPlaceClaimType
  status: MerchantPlaceClaimStatus
  reason: string
  reviewReason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MerchantPlaceClaimPageResponse {
  claims: MerchantPlaceClaim[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPlaceClaimCreateRequest {
  placeId: number
  reason: string
}

export interface MerchantPlaceClaimAttachment {
  id: number
  documentType: MerchantPlaceClaimDocumentType
  contentType: string
  fileSize: number
  displayOrder: number
  createdAt: string
}

export interface MerchantVerifiedBoostSelection {
  id: number
  productId: number
  placeId: number
  selectedAt: string
}

export interface MerchantVerifiedBoostSelectionCreateRequest {
  productId: number
  placeId: number
  idempotencyKey: string
}

export interface MerchantVerifiedBoostSelectionPageResponse {
  selections: MerchantVerifiedBoostSelection[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantVerifiedBoostProduct {
  productId: number
  name: string
  description: string
  priceAmount: number
  currency: string
  durationDays: number
  status: MerchantVerifiedBoostProductStatus
}

export interface MerchantVerifiedBoostProductPageResponse {
  products: MerchantVerifiedBoostProduct[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantVerifiedBoostExecution {
  id: number
  selectionId: number
  productId: number
  placeId: number
  status: MerchantVerifiedBoostExecutionStatus
  startedAt: string
  endsAt: string
  stoppedAt: string | null
}

export interface MerchantVerifiedBoostExecutionPageResponse {
  executions: MerchantVerifiedBoostExecution[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
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

export interface MerchantPlaceMediaCreateRequest {
  s3Key: string
  displayOrder?: number | null
}

export interface MerchantPlaceMediaOrderUpdateRequest {
  displayOrder: number
}

export interface MerchantPlaceReview {
  reviewId: number
  placeId: number
  userId: number
  recommendReason: string | null
  content: string | null
  imageUrls: string[]
  createdAt: string
  visibilityStatus: MerchantPlaceReviewVisibilityStatus
  deletionRequest: MerchantPlaceReviewDeletionRequestStatusResponse | null
}

export type MerchantPlaceReviewVisibilityStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED'
export type MerchantPlaceReviewDeletionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface MerchantPlaceReviewPageResponse {
  reviews: MerchantPlaceReview[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPlaceReviewDeletionRequestCreateRequest {
  requestReason: string
}

export interface MerchantPlaceReviewDeletionRequestResponse {
  deletionRequestId: number
  reviewId: number
  placeId: number
  reviewVisibilityStatus: string
  status: string
  requestedAt: string
}

export interface MerchantPlaceReviewDeletionRequestStatusResponse {
  deletionRequestId: number
  status: MerchantPlaceReviewDeletionRequestStatus
  requestedAt: string
  reviewedAt: string | null
  reviewNote: string | null
}

export type MerchantStoreErrorResponse = AuthErrorResponse<string>
