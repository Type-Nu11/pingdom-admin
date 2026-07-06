import type { AuthErrorResponse } from './auth.types'

export type AdminPostSortParam = 'LATEST' | 'OLDEST' | 'MOST_LIKED'

export type AdminPostReportStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'RESTORED'

export type AdminPostReviewStatus = 'ALL' | 'PENDING' | 'PROCESSED' | 'NORMAL'

export type AdminPostVisibilityStatus = 'ACTIVE' | 'AUTO_HIDDEN'

export interface AdminPostReviewCounts {
  all: number
  pending: number
  processed: number
  normal: number
}

export interface AdminPostReportItem {
  reportId: number
  reporterUserId: number
  reporterUsername: string
  reason: string
  status: AdminPostReportStatus
  createdAt?: string | null
  processedAt?: string | null
}

export interface AdminPost {
  id: number
  name: string
  imageUrl: string
  thumbnailUrl?: string | null
  userId: number
  username: string
  createdAt: string
  description: string
  likeCount: number
  placeName: string
  visibilityStatus?: AdminPostVisibilityStatus
  hiddenAt?: string | null
  hiddenReason?: string | null
  reports?: AdminPostReportItem[]
}

export interface AdminPostListRequest {
  page?: number
  limit?: number
  sortParam?: AdminPostSortParam
  keyword?: string
  reviewStatus?: AdminPostReviewStatus
  reportStatus?: AdminPostReportStatus
}

export interface AdminPostListResponse {
  posts: AdminPost[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export type AdminPostListErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED'
>

export type AdminPostDetailErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'POST_NOT_FOUND'
>

export type AdminPostDeleteErrorResponse = AuthErrorResponse<
  | 'INVALID_TOKEN'
  | 'ACCESS_DENIED'
  | 'POST_NOT_FOUND'
  | 'IMAGE_NOT_FOUND'
  | 'DELETE_ERROR'
  | 'POST_DELETE_FAILED'
  | 'S3_CONNECTION_ERROR'
>
