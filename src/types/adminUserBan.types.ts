import type { AuthErrorResponse } from './auth.types'

export type AdminBanType = 'PERMANENT' | 'TEMPORARY'
export type AdminBannedUserSortBy = 'BANNED_AT' | 'EXPIRES_AT' | 'USER_ID'
export type AdminBannedUserSortDirection = 'DESC' | 'ASC'

export interface AdminBannedUserCounts {
  total: number
  permanent: number
  temporary: number
}

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
  sortBy?: AdminBannedUserSortBy
  sortDirection?: AdminBannedUserSortDirection
}

export interface AdminBannedUserListResponse {
  users: AdminBannedUserItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  counts?: AdminBannedUserCounts
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

export type AdminBannedUserListErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED'
>

export type AdminBannedUserDetailErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'USER_NOT_FOUND'
>

export type AdminUserBanReleaseErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'USER_NOT_FOUND' | 'USER_NOT_BANNED'
>
