import type { AuthErrorResponse } from './auth.types'

export type AdminReportActionStatus = 'ACCEPTED' | 'DECLINED'

export interface AdminReportedUserItem {
  reportId: number
  reporterUserId: number
  reporterUsername: string
  reportedImageId: number
  reportedUserId: number
  reason: string
}

export interface AdminReportedUserListRequest {
  page?: number
  limit?: number
  keyword?: string
}

export interface AdminReportedUserListResponse {
  users: AdminReportedUserItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminReportActionResponse {
  reportId: number
  status: AdminReportActionStatus
  reportedUserId: number
  banned: boolean
  processedAt: string
}

export type AdminReportedUserListErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED'
>

export type AdminReportedUserDetailErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'REPORT_NOT_FOUND'
>

export type AdminReportActionErrorResponse = AuthErrorResponse<
  | 'INVALID_TOKEN'
  | 'ACCESS_DENIED'
  | 'REPORT_NOT_FOUND'
  | 'REPORT_ALREADY_PROCESSED'
>
