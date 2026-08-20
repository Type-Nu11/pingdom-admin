import type { AuthErrorResponse } from './auth.types'

export type MerchantPlaceRegistrationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REGISTERED'
  | 'COMPLETED'
  | 'CANCELED'

export type MerchantPlaceCategory =
  | 'MUSIC'
  | 'RESTAURANT'
  | 'POP_UP'
  | 'FASHION'
  | 'BEAUTY'
  | 'EXHIBITION'
  | 'CAFE'
  | 'CULTURAL_HERITAGE'
  | 'OTHER'

export type MerchantPlaceTag =
  | 'ENGLISH_SERVICE_AVAILABLE'
  | 'ENGLISH_MENU_AVAILABLE'
  | 'RESERVATION_AVAILABLE'
  | 'RESERVATION_COUPON_AVAILABLE'
  | 'GENERAL_COUPON_AVAILABLE'
  | 'GOOD_AMBIENCE'

export type MerchantOperatingDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export type MerchantOperatingDayStatus = 'OPEN' | 'CLOSED' | 'OPEN_24_HOURS'

export interface MerchantLocalTime {
  hour: number
  minute: number
  second: number
  nano: number
}

export interface MerchantOperatingBreakTime {
  opensAt: MerchantLocalTime
  closesAt: MerchantLocalTime
}

export interface MerchantPlaceRegistrationOperatingDay {
  dayOfWeek: MerchantOperatingDayOfWeek
  status: MerchantOperatingDayStatus
  opensAt?: MerchantLocalTime
  closesAt?: MerchantLocalTime
  breakTimes?: MerchantOperatingBreakTime[]
}

export interface MerchantPlaceRegistrationAttachment {
  id: number
  fileId: string
  documentType: 'BUSINESS_REGISTRATION' | 'IDENTITY_DOCUMENT' | 'REPRESENTATIVE_IMAGE'
  storageKey: string
  originalFilename: string
  contentType: string
  fileSize: number
  fileHash: string
  uploadedByUserId: number
  uploadedAt: string
  retentionExpiresAt: string | null
  displayOrder: number
}

export interface MerchantPlaceRegistration {
  id: number
  applicantUserId: number
  status: MerchantPlaceRegistrationStatus
  placeName: string
  category: MerchantPlaceCategory
  latitude: number
  longitude: number
  roadAddress: string
  jibunAddress: string
  postalCode: string
  description: string
  businessContactPhone: string
  reviewReason: string | null
  registeredPlaceId: number | null
  submittedAt: string | null
  reviewedAt: string | null
  registeredAt: string | null
  createdAt: string
  updatedAt: string
  submissionVersion: number
  submissionContentHash: string | null
  canceledAt: string | null
  tags: MerchantPlaceTag[]
  attachments: MerchantPlaceRegistrationAttachment[]
  timezone: string | null
  operatingScheduleJson: string | null
}

export interface MerchantPlaceRegistrationRequest {
  placeName: string
  category: MerchantPlaceCategory
  latitude: number
  longitude: number
  roadAddress: string
  jibunAddress: string
  postalCode: string
  description: string
  businessContactPhone: string
  applicantContactPhone: string
  tags?: MerchantPlaceTag[]
  timezone?: string
  operatingDays?: MerchantPlaceRegistrationOperatingDay[]
}

export interface MerchantPlaceRegistrationPageResponse {
  applications: MerchantPlaceRegistration[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export type MerchantPlaceRegistrationErrorResponse = AuthErrorResponse<string>
