import type { AuthErrorResponse } from './auth.types'

export interface AdminPlaceItem {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  userId: number
}

export interface AdminPlaceListRequest {
  page?: number
  limit?: number
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
