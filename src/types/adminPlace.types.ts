import type { AuthErrorResponse } from './auth.types'

export type AdminPlaceListSortParam = 'LATEST' | 'OLDEST'

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
  registrant?: string
  placeGrowth?: PlaceGrowthSnapshot
}

export interface AdminPlaceListRequest {
  page?: number
  limit?: number
  sortParam?: AdminPlaceListSortParam
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
  'INVALID_TOKEN' | 'PLACE_NOT_FOUND'
>
