import type { AuthErrorResponse } from './auth.types'
import type {
  MerchantPlaceCategory,
  MerchantPlaceRegistrationOperatingDay,
  MerchantPlaceTag,
} from './merchantPlaceRegistration.types'

export type MerchantPlaceApplicationType = 'NEW_PLACE' | 'EXISTING_PLACE_CLAIM'
export type MerchantPlaceApplicationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REGISTERED'
  | 'COMPLETED'
  | 'CANCELED'

export interface MerchantPlaceApplicationAttachment {
  id: number
  fileId: string
  documentType: 'BUSINESS_REGISTRATION' | 'IDENTITY_DOCUMENT' | 'REPRESENTATIVE_IMAGE'
  originalFilename: string
  contentType: string
  fileSize: number
  uploadedAt: string
  retentionExpiresAt: string | null
  displayOrder: number
}

export interface MerchantPlaceApplicationNewPlace {
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
  tags: MerchantPlaceTag[]
  timezone: string | null
  operatingDays: MerchantPlaceRegistrationOperatingDay[] | null
}

export interface MerchantPlaceApplicationNewPlaceRequest {
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

export interface MerchantPlaceApplication {
  id: number
  applicantUserId: number
  applicationType: MerchantPlaceApplicationType
  status: MerchantPlaceApplicationStatus
  legalName: string
  businessName: string
  merchantDisplayName: string
  merchantContactEmail: string
  merchantDescription: string | null
  merchantContactPhone: string
  newPlace: MerchantPlaceApplicationNewPlace | null
  placeName: string | null
  existingPlaceId: number | null
  claimReason: string | null
  reviewReason: string | null
  placeId: number | null
  submittedAt: string | null
  reviewedAt: string | null
  completedAt: string | null
  canceledAt: string | null
  createdAt: string
  updatedAt: string
  submissionVersion: number
  attachments: MerchantPlaceApplicationAttachment[]
}

interface MerchantPlaceApplicationBaseRequest {
  legalName: string
  businessName: string
  businessRegistrationNumber: string
  merchantDisplayName: string
  merchantDescription?: string | null
  merchantContactEmail: string
  merchantContactPhone: string
}

export interface MerchantExistingPlaceApplicationRequest extends MerchantPlaceApplicationBaseRequest {
  applicationType: 'EXISTING_PLACE_CLAIM'
  existingPlaceId: number
  claimReason: string
  newPlace?: never
}

export interface MerchantNewPlaceApplicationRequest extends MerchantPlaceApplicationBaseRequest {
  applicationType: 'NEW_PLACE'
  newPlace: MerchantPlaceApplicationNewPlaceRequest
  existingPlaceId?: never
  claimReason?: never
}

export type MerchantPlaceApplicationRequest =
  | MerchantExistingPlaceApplicationRequest
  | MerchantNewPlaceApplicationRequest

export interface MerchantPlaceApplicationPageResponse {
  items: MerchantPlaceApplication[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
}

export interface MerchantPlaceSearchItem {
  id: number
  name: string
  englishName: string | null
  address: string
  roadAddress: string | null
  category: string
  operatingStatus: 'OPERATING' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED'
}

export interface MerchantPlaceAutocompleteResponse {
  keyword: string
  limit: number
  totalCount: number
  places: MerchantPlaceSearchItem[]
}

export type MerchantPlaceApplicationErrorResponse = AuthErrorResponse<string>
