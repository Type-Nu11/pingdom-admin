import type { AuthErrorResponse } from './auth.types'

export type MerchantPlaceApplicationType = 'LEGACY' | 'NEW_PLACE' | 'EXISTING_PLACE_CLAIM'
export type MerchantPlaceApplicationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REGISTERED'
  | 'COMPLETED'
  | 'CANCELED'
export type MerchantPlaceApplicationDocumentType =
  | 'BUSINESS_REGISTRATION'
  | 'IDENTITY_DOCUMENT'
  | 'REPRESENTATIVE_IMAGE'

export interface AdminMerchantPlaceApplicationListItem {
  id: number
  applicantUserId: number
  applicationType: MerchantPlaceApplicationType
  status: MerchantPlaceApplicationStatus
  legalName: string
  businessName: string
  maskedBusinessRegistrationNumber: string | null
  merchantDisplayName: string
  placeName: string | null
  existingPlaceId: number | null
  submittedAt: string | null
  updatedAt: string | null
}

export interface AdminMerchantPlaceApplicationAttachment {
  id: number
  documentType: MerchantPlaceApplicationDocumentType
  originalFilename: string
  contentType: string
  fileSize: number
  uploadedAt: string | null
  retentionExpiresAt: string | null
  displayOrder: number
}

export interface AdminMerchantPlaceApplication extends Omit<AdminMerchantPlaceApplicationListItem, 'maskedBusinessRegistrationNumber'> {
  businessRegistrationNumber?: string | null
  merchantContactEmail: string | null
  merchantDescription: string | null
  merchantContactPhone: string | null
  claimReason: string | null
  reviewReason: string | null
  placeId: number | null
  reviewedAt: string | null
  completedAt: string | null
  canceledAt: string | null
  createdAt: string | null
  submissionVersion: number | null
  attachments: AdminMerchantPlaceApplicationAttachment[]
}

export interface AdminMerchantPlaceApplicationPage {
  items: AdminMerchantPlaceApplicationListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPlaceApplicationReviewRequest {
  reason: string
}

export type AdminMerchantPlaceApplicationErrorResponse = AuthErrorResponse<string>
