import type { AuthErrorResponse } from './auth.types'

export type AdminPostSortParam = 'LATEST' | 'OLDEST' | 'MOST_LIKED'

export type AdminPostReportStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export interface AdminPostReportItem {
  reportId: number
  reporterUserId: number
  reporterUsername: string
  reason: string
  status: AdminPostReportStatus
  processedAt?: string | null
}

export interface AdminPost {
  id: number
  name: string
  imageUrl: string
  userId: number
  username: string
  createdAt: string
  description: string
  likeCount: number
  placeName: string
  reports?: AdminPostReportItem[]
}

export interface AdminPostListRequest {
  page?: number
  limit?: number
  sortParam?: AdminPostSortParam
  keyword?: string
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
