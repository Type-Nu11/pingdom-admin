import type { AuthErrorResponse } from './auth.types'

export interface AdminRecommendationTrafficPolicyUpdateItem {
  recommendationVersion: string
  trafficPercentage: number
  enabled: boolean
  fallbackVersion?: string
}

export interface AdminRecommendationTrafficUpdateRequest {
  reason: string
  policies: AdminRecommendationTrafficPolicyUpdateItem[]
}

export interface AdminRecommendationTrafficPolicyItem {
  recommendationVersion: string
  stage: string
  trafficPercentage: number
  enabled: boolean
  fallbackVersion: string | null
}

export interface AdminRecommendationTrafficUpdateResponse {
  defaultVersion: string
  policies: AdminRecommendationTrafficPolicyItem[]
  message: string
}

export interface AdminRecommendationSnapshotResyncResponse {
  placeCount: number
  synchronizedSnapshotCount: number
  deletedSnapshotCount: number
  synchronizedSimilaritySnapshotCount: number
  deletedSimilaritySnapshotCount: number
  synchronizedVersionSnapshotCount: number
  deletedVersionSnapshotCount: number
  message: string
}

export type AdminRecommendationPolicyErrorResponse = AuthErrorResponse<string>
