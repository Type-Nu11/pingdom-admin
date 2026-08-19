import type { AuthErrorResponse } from './auth.types'

export type AdminAdDisplayStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED'

export interface AdminAdListItem {
  adId: number
  title: string
  imageUrl: string
  redirectUrl: string
  startAt: string
  endAt: string
  displayStatus: AdminAdDisplayStatus
  createdAt: string
  updatedAt: string
}

export interface AdminAdListResponse {
  ads: AdminAdListItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminAdCreateRequest {
  title: string
  imageUrl: string
  redirectUrl: string
  startAt: string
  endAt: string
}

export interface AdminAdCreateResponse {
  adId: number
  title: string
  startAt: string
  endAt: string
  message?: string
}

export interface AdminAdListParams {
  page?: number
  limit?: number
  keyword?: string
  displayStatus?: AdminAdDisplayStatus
  startedFrom?: string
  startedTo?: string
}

export type AdminAdErrorResponse = AuthErrorResponse<string>
