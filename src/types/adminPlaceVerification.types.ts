import type { AuthErrorResponse } from './auth.types'

export type PlaceInformationReportStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'CANCELED'

export type PlaceInformationDisputeStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'

export type PlaceInformationReportTargetType =
  | 'NAME'
  | 'ADDRESS'
  | 'GEOLOCATION'
  | 'OPERATING_STATUS'
  | 'TOURIST_INFORMATION'
  | 'SOURCE_EVIDENCE'
  | 'MEDIA'
  | 'OTHER'

export type PlaceInformationReportReasonType =
  | 'INCORRECT'
  | 'OUTDATED'
  | 'MISSING'
  | 'MISLEADING'
  | 'DUPLICATE'
  | 'CLOSED_OR_MOVED'
  | 'SPAM_OR_ABUSE'
  | 'OTHER'

export interface PlaceInformationDispute {
  disputeId: number
  reportId: number
  disputedByUserId: number
  description: string
  evidenceUrl: string | null
  status: PlaceInformationDisputeStatus
  reviewedByAdminUserId: number | null
  reviewReason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PlaceInformationReport {
  reportId: number
  placeId: number
  evidenceId: number | null
  reporterUserId: number
  targetType: PlaceInformationReportTargetType
  reasonType: PlaceInformationReportReasonType
  description: string
  evidenceUrl: string | null
  status: PlaceInformationReportStatus
  reviewedByAdminUserId: number | null
  reviewReason: string | null
  reviewedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  disputes: PlaceInformationDispute[]
}

export interface PlaceInformationReportPageResponse {
  reports: PlaceInformationReport[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface PlaceInformationReportReviewRequest {
  status: Extract<
    PlaceInformationReportStatus,
    'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED'
  >
  reviewReason?: string
}

export interface PlaceInformationDisputeReviewRequest {
  status: Extract<PlaceInformationDisputeStatus, 'ACCEPTED' | 'REJECTED'>
  reviewReason?: string
}

export type PlaceInformationSourceType =
  | 'LEGACY'
  | 'KAKAO'
  | 'MERCHANT_OWNER'
  | 'ADMIN'
  | 'USER_REPORT'
  | 'SYSTEM'

export type PlaceInformationEvidenceType =
  | 'EXTERNAL_PLACE_ID'
  | 'BUSINESS_CLAIM'
  | 'DOCUMENT'
  | 'PHOTO'
  | 'ADMIN_REVIEW'
  | 'USER_VISIT'
  | 'SYSTEM_SIGNAL'

export type PlaceInformationVerificationStatus =
  | 'UNVERIFIED'
  | 'SOURCE_CONFIRMED'
  | 'OWNER_SUBMITTED'
  | 'ADMIN_VERIFIED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'EXPIRED'

export interface PlaceInformationEvidence {
  evidenceId: number
  placeId: number
  sourceType: PlaceInformationSourceType
  evidenceType: PlaceInformationEvidenceType
  verificationStatus: PlaceInformationVerificationStatus
  externalReference: string | null
  referenceUrl: string | null
  description: string | null
  submittedByUserId: number | null
  reviewedByAdminUserId: number | null
  reviewReason: string | null
  submittedAt: string
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PlaceInformationEvidenceResponse {
  placeId: number
  evidences: PlaceInformationEvidence[]
}

export interface PlaceInformationEvidenceCreateRequest {
  sourceType: PlaceInformationSourceType
  evidenceType: PlaceInformationEvidenceType
  externalReference?: string
  referenceUrl?: string
  description?: string
  submittedByUserId?: number
}

export interface PlaceInformationEvidenceReviewRequest {
  verificationStatus: Extract<
    PlaceInformationVerificationStatus,
    'ADMIN_VERIFIED' | 'REJECTED'
  >
  reviewReason?: string
}

export interface PlaceInformationEvidenceUpdateResponse {
  evidence: PlaceInformationEvidence
  message: string
}

export type PlaceInformationReverificationStatus =
  | 'REQUESTED'
  | 'RESPONDED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'EXPIRED'

export interface PlaceInformationReverificationRequest {
  requestId: number
  placeId: number
  merchantOwnerUserId: number
  status: PlaceInformationReverificationStatus
  reason: string
  requestedAt: string
  dueAt: string
  lastRemindedAt: string | null
  reminderCount: number
  respondedAt: string | null
  responseNote: string | null
  completedAt: string | null
}

export interface PlaceInformationReverificationListResponse {
  requests: PlaceInformationReverificationRequest[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface PlaceInformationReverificationCreateRequest {
  reason: string
  dueAt: string
}

export type AdminPlaceVerificationErrorResponse = AuthErrorResponse<string>
