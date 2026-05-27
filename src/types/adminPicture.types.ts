import type { AuthErrorResponse } from './auth.types'

export interface AdminPicture {
  id: number
  thumbnailUrl: string
  imageUrl: string
  userId: number
  username: string
  createdAt: string
}

export type AdminPictureSortParam = 'LATEST' | 'OLDEST'

export interface AdminPictureListRequest {
  page?: number
  limit?: number
  sortParam?: AdminPictureSortParam
}

export interface AdminPictureListResponse {
  pictures: AdminPicture[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export type AdminPictureListErrorResponse = AuthErrorResponse<'INVALID_TOKEN'>

export type AdminPictureDeleteErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'PICTURE_NOT_FOUND' | 'DELETE_ERROR' | 'S3_CONNECTION_ERROR'
>
