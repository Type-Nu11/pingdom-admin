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
  | 'PLACE_DUPLICATE_NOT_FOUND'
  | 'PLACE_MERGE_INVALID_REQUEST'
  | 'PLACE_EVENT_CONNECTED'
  | 'PLACE_MERGE_NOT_ALLOWED'
  | 'PLACE_MERGE_HISTORY_NOT_FOUND'
  | 'PLACE_MERGE_ALREADY_RESTORED'
  | 'PLACE_MERGE_RESTORE_NOT_ALLOWED'

export type AdminPlaceMergeErrorResponse = AuthErrorResponse<AdminPlaceMergeErrorCode>
