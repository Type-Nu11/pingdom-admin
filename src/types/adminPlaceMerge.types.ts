import type { AuthErrorResponse } from './auth.types'

export interface AdminPlaceDuplicateGroupItem {
  representativePlaceId: number
  duplicatePlaceIds: number[]
  reasons: string[]
}

export interface AdminPlaceDuplicateGroupResponse {
  groups: AdminPlaceDuplicateGroupItem[]
  totalCount: number
}

export interface AdminPlaceDuplicateCandidateItem {
  id: number
  name: string
  address: string
  kakaoPlaceId: string
  latitude: number
  longitude: number
  userId: number
  registrant: string
  photoCount: number
  reason: string
  distanceMeters: number
}

export interface AdminPlaceDuplicateDetailResponse {
  id: number
  name: string
  address: string
  kakaoPlaceId: string
  latitude: number
  longitude: number
  userId: number
  registrant: string
  photoCount: number
  candidates: AdminPlaceDuplicateCandidateItem[]
}

export interface AdminPlaceMergeRequest {
  sourcePlaceId: number
  targetPlaceId: number
}

export interface AdminPlaceMergeResponse {
  sourcePlaceId: number
  targetPlaceId: number
  message: string
}

export interface AdminPlaceMergeHistoryItem {
  historyId: number
  sourcePlaceId: number
  targetPlaceId: number
  adminUserId: number
  restored: boolean
  mergedAt: string
  restoredAt?: string | null
}

export interface AdminPlaceMergeHistoryResponse {
  histories: AdminPlaceMergeHistoryItem[]
}

export interface AdminPlaceRestoreResponse {
  historyId: number
  sourcePlaceId: number
  targetPlaceId: number
  message: string
}

export type AdminPlaceMergeErrorCode =
  | 'INVALID_TOKEN'
  | 'ACCESS_DENIED'
  | 'PLACE_NOT_FOUND'
  | 'DUPLICATE_NOT_FOUND'
  | 'MERGE_CONFLICT'
  | 'MERGE_HISTORY_NOT_FOUND'
  | 'ALREADY_RESTORED'

export type AdminPlaceMergeErrorResponse = AuthErrorResponse<AdminPlaceMergeErrorCode>
