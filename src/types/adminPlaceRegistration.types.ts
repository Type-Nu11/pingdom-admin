import type { AuthErrorResponse } from './auth.types'

export type AdminPlaceRegistrationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REGISTERED'
  | 'COMPLETED'
  | 'CANCELED'
export type AdminPlaceRegistrationCategory =
  | 'MUSIC'
  | 'RESTAURANT'
  | 'POP_UP'
  | 'FASHION'
  | 'BEAUTY'
  | 'EXHIBITION'
  | 'CAFE'
  | 'CULTURAL_HERITAGE'
  | 'OTHER'
export type AdminPlaceRegistrationTag =
  | 'ENGLISH_SERVICE_AVAILABLE'
  | 'ENGLISH_MENU_AVAILABLE'
  | 'RESERVATION_AVAILABLE'
  | 'RESERVATION_COUPON_AVAILABLE'
  | 'GENERAL_COUPON_AVAILABLE'
  | 'GOOD_AMBIENCE'
export type AdminPlaceRegistrationDocumentType =
  | 'BUSINESS_REGISTRATION'
  | 'IDENTITY_DOCUMENT'
  | 'REPRESENTATIVE_IMAGE'

export interface AdminPlaceRegistrationAttachment {
  id: number
  fileId: string
  documentType: AdminPlaceRegistrationDocumentType
  storageKey: string
  originalFilename: string
  contentType: string
  fileSize: number
  fileHash: string
  uploadedByUserId: number
  uploadedAt: string | null
  retentionExpiresAt: string | null
  displayOrder: number
}

export interface AdminPlaceRegistrationApplication {
  id: number
  applicantUserId: number
  status: AdminPlaceRegistrationStatus
  placeName: string
  category: AdminPlaceRegistrationCategory
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
  createdAt: string | null
  updatedAt: string | null
  submissionVersion: number | null
  submissionContentHash: string | null
  canceledAt: string | null
  tags: AdminPlaceRegistrationTag[]
  attachments: AdminPlaceRegistrationAttachment[]
  timezone: string | null
  operatingScheduleJson: string | null
}

export interface AdminPlaceRegistrationPage {
  applications: AdminPlaceRegistrationApplication[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminPlaceRegistrationReviewRequest {
  reason: string
}

export type AdminPlaceRegistrationErrorResponse = AuthErrorResponse<string>
