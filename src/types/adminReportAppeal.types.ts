import type { AuthErrorResponse } from './auth.types'

export type AdminReportAppealStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface AdminReportAppealItem {
  appealId: number
  reportId: number
  postId: number
  appellantUserId: number
  appellantUsername: string
  targetUserId: number
  reason: string
  status: AdminReportAppealStatus
  adminUserId: number | null
  adminReason: string | null
  processedAt: string | null
  createdAt: string
}

export interface AdminReportAppealListResponse {
  appeals: AdminReportAppealItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminReportAppealActionRequest {
  reason?: string
}

export interface AdminReportAppealActionResponse {
  appealId: number
  reportId: number
  postId: number
  status: AdminReportAppealStatus
  processedAt: string
}

export type AdminReportAppealErrorResponse = AuthErrorResponse<string>
