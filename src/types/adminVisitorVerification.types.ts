import type { AuthErrorResponse } from './auth.types'

export type VisitorVerificationStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
export type VisitorVerificationReportType = 'PLACE_INFORMATION' | 'OPERATING_HOURS' | 'LOCATION' | 'CLOSED_PLACE' | 'WAIT_TIME' | 'LANGUAGE_SUPPORT' | 'COUPON_USAGE' | 'CROWD_LEVEL' | 'OTHER'
export type CouponUsageStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'
export type CrowdLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'FULL'

export interface VisitorVerificationReport {
  id: number; reporterUserId: number; placeId: number; reportType: VisitorVerificationReportType
  description: string; evidenceUrl: string | null; waitTimeMinutes: number | null
  languageCode: string | null; couponUsageStatus: CouponUsageStatus | null
  crowdLevel: CrowdLevel | null; status: VisitorVerificationStatus
  reviewerAdminUserId: number | null; reviewNote: string | null
  createdAt: string; reviewedAt: string | null; updatedAt: string
}
export interface VisitorVerificationReportPage { reports: VisitorVerificationReport[]; page: number; limit: number; totalElements: number; totalPages: number; hasNext: boolean }
export interface VisitorVerificationCorrection {
  id: number; reportId: number; requesterUserId: number; placeId: number
  reportType: VisitorVerificationReportType; description: string; evidenceUrl: string | null
  waitTimeMinutes: number | null; languageCode: string | null
  couponUsageStatus: CouponUsageStatus | null; crowdLevel: CrowdLevel | null
  reportStatus: VisitorVerificationStatus; status: VisitorVerificationStatus
  reviewerAdminUserId: number | null; reviewNote: string | null
  createdAt: string; reviewedAt: string | null; updatedAt: string
}
export interface VisitorVerificationCorrectionPage { corrections: VisitorVerificationCorrection[]; page: number; limit: number; totalElements: number; totalPages: number; hasNext: boolean }
export type AdminVisitorVerificationErrorResponse = AuthErrorResponse<string>
