import type { AuthErrorResponse } from './auth.types'
export type ScoutProfileStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
export type ScoutEligibilityStatus = 'PENDING' | 'ELIGIBLE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED'
export type ScoutFieldReportStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
export type ScoutFieldReportType = 'PLACE_INFORMATION' | 'OPERATING_HOURS' | 'LOCATION' | 'CLOSED_PLACE' | 'WAIT_TIME' | 'CROWD_LEVEL' | 'SAFETY' | 'OTHER'
export interface ScoutProfile { userId: number; displayName: string; introduction: string | null; profileStatus: ScoutProfileStatus; profileReviewedByAdminUserId: number | null; profileReviewedAt: string | null; profileStatusReason: string | null; activityEligibilityStatus: ScoutEligibilityStatus; eligibleFrom: string | null; eligibleUntil: string | null; eligibilityReviewedByAdminUserId: number | null; eligibilityReviewedAt: string | null; eligibilityStatusReason: string | null; createdAt: string; updatedAt: string }
export interface ScoutProfilePage { profiles: ScoutProfile[]; page: number; limit: number; totalCount: number; totalPages: number; hasNext: boolean }
export interface ScoutFieldReport { id: number; scoutUserId: number; placeId: number; reportType: ScoutFieldReportType; description: string; evidenceUrl: string | null; status: ScoutFieldReportStatus; reviewerAdminUserId: number | null; reviewNote: string | null; createdAt: string; reviewedAt: string | null; updatedAt: string }
export interface ScoutFieldReportPage { reports: ScoutFieldReport[]; page: number; limit: number; totalElements: number; totalPages: number; hasNext: boolean }
export type AdminScoutErrorResponse = AuthErrorResponse<string>
