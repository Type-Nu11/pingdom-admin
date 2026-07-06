import type { AuthErrorResponse } from './auth.types'

export type AdminPlaceListSortParam = 'LATEST' | 'OLDEST' | 'LEVEL_DESC'
export type AdminPlacePostSortParam = 'LATEST' | 'OLDEST' | 'MOST_LIKED'

export interface PlaceGrowthSnapshot {
  photoCount?: number
  level?: number
  currentLevelMinPhotoCount?: number
  nextLevelMinPhotoCount?: number
  progressPercent?: number
}

export interface AdminPlaceItem {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  userId: number
  category?: string
  categoryName?: string
  registrant?: string
  placeGrowth?: PlaceGrowthSnapshot
}

export interface AdminPlacePostItem {
  id: number
  imageUrl: string
  title: string
  description: string
  userId: number
  username: string
  createdAt: string
  likeCount: number
}

export interface AdminPlaceDetail {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  userId: number
  username: string
  category?: string
  categoryName?: string
  sortParam: AdminPlacePostSortParam
  postCount: number
  placeGrowth?: PlaceGrowthSnapshot
  posts: AdminPlacePostItem[]
}

export interface AdminPlaceListRequest {
  page?: number
  limit?: number
  sortParam?: AdminPlaceListSortParam
  keyword?: string
}

export interface AdminPlaceListResponse {
  places: AdminPlaceItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export type AdminPlaceListErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'PLACE_NOT_FOUND'
>

export interface AdminPlaceDetailRequest {
  sortParam?: AdminPlacePostSortParam
  keyword?: string
}

export type AdminPlaceDetailErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'PLACE_NOT_FOUND'
>

export type AdminPlaceDeleteErrorResponse = AuthErrorResponse<
  'INVALID_TOKEN' | 'ACCESS_DENIED' | 'PLACE_NOT_FOUND'
>
