import type { AuthErrorResponse } from './auth.types'

export type AdminBanType = 'PERMANENT' | 'TEMPORARY'
export type AdminUserSanctionAction = 'APPLIED' | 'RELEASED' | 'EXPIRED'
export type AdminBannedUserListSortBy =
  | 'BANNED_AT'
  | 'EXPIRES_AT'
  | 'USER_ID'
export type AdminSortDirection = 'ASC' | 'DESC'

export interface AdminBannedUserItem {
  userId: number
  username: string
  banned: boolean
  banType: AdminBanType
  bannedAt?: string | null
  banExpiresAt?: string | null
}

export interface AdminBannedUserDetail {
  userId: number
  username: string
  email?: string | null
  birthYear?: number | null
  language?: string | null
  country?: string | null
  role?: string | null
  banned: boolean
  bannedAt?: string | null
  banType: AdminBanType
  banExpiresAt?: string | null
  banReason?: string | null
  createdAt?: string | null
}

export interface AdminBannedUserListRequest {
  page?: number
  limit?: number
  keyword?: string
  banType?: AdminBanType
  from?: string
  to?: string
  sortBy?: AdminBannedUserListSortBy
  sortDirection?: AdminSortDirection
}

export interface AdminBannedUserCounts {
  total: number
  permanent: number
  temporary: number
}

export interface AdminBannedUserListResponse {
  users: AdminBannedUserItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  counts?: AdminBannedUserCounts | null
}

export interface AdminUserBanReleaseRequest {
  reason?: string
}

export interface AdminUserBanReleaseResponse {
  userId: number
  banned: boolean
  releasedAt?: string | null
  reason?: string | null
}

export interface AdminUserBanRequest {
  reason?: string
  expiresAt?: string
  durationDays?: number
}

export interface AdminUserBanResponse {
  userId: number
  banned: boolean
  bannedAt?: string | null
  reason?: string | null
  banType: AdminBanType
  banExpiresAt?: string | null
}

export interface AdminUserSanctionStatus {
  userId: number
  username: string
  banned: boolean
  banType?: AdminBanType | null
  bannedAt?: string | null
  banExpiresAt?: string | null
  banReason?: string | null
}

export interface AdminUserSanctionHistoryItem {
  historyId: number
  targetUserId: number
  targetUsername?: string | null
  banType: AdminBanType
  action: AdminUserSanctionAction
  reason?: string | null
  startedAt?: string | null
  endedAt?: string | null
  adminUserId?: number | null
  adminUsername?: string | null
  processedAt?: string | null
}

export interface AdminUserSanctionHistoryRequest {
  page?: number
  limit?: number
  banType?: AdminBanType
  action?: AdminUserSanctionAction
  from?: string
  to?: string
}

export interface AdminUserSanctionHistoryResponse {
  histories: AdminUserSanctionHistoryItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export type AdminBannedUserListErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED'
>

export type AdminBannedUserDetailErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'USER_NOT_FOUND'
>

export type AdminUserBanReleaseErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'USER_NOT_FOUND' | 'USER_NOT_BANNED'
>

export type AdminUserBanErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'USER_NOT_FOUND' | 'USER_ALREADY_BANNED'
>
