import type { AuthErrorResponse } from './auth.types'

export type RecommendationMetricSortBy =
  | 'SMOOTHED_CTR'
  | 'RAW_CTR'
  | 'BOOKMARK_CONVERSION'
  | 'LIKE_CONVERSION'
  | 'TOTAL_CONVERSION'
  | 'EXPOSURE'
  | 'CLICK'
  | 'UPDATED_AT'

export interface AdminRecommendationMetricItem {
  id: number
  name: string
  address: string
  photoCount: number
  exposureCount: number
  clickCount: number
  rawCtr: number
  smoothedCtr: number
  bookmarkConversionCount: number
  likeConversionCount: number
  bookmarkConversionRate: number
  likeConversionRate: number
  totalConversionRate: number
  snapshotUpdatedAt: string
}

export interface AdminRecommendationMetricsResponse {
  metrics: AdminRecommendationMetricItem[]
  sortBy: RecommendationMetricSortBy
  recommendationVersion: string
  days: number | null
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminRecommendationMetricSummary {
  recommendationVersion: string
  exposureCount: number
  clickCount: number
  rawCtr: number
  smoothedCtr: number
  bookmarkConversionCount: number
  likeConversionCount: number
  bookmarkConversionRate: number
  likeConversionRate: number
  totalConversionRate: number
}

export interface AdminRecommendationMetricsCompareResponse {
  baselineVersion: string
  targetVersion: string
  days: number | null
  keyword: string
  baseline: AdminRecommendationMetricSummary
  target: AdminRecommendationMetricSummary
  delta: AdminRecommendationMetricSummary
}

export type RecommendationStage = 'STABLE' | 'EXPERIMENTAL'
export type RecommendationCandidateSource = 'PERSONAL' | 'POPULAR' | 'FRESH' | 'GEO' | 'FALLBACK'

export interface AdminRecommendationExplanationItem {
  placeId: number
  placeName: string
  userId: number
  recommendationVersion: string
  recommendationStage: RecommendationStage
  ranking: number
  source: RecommendationCandidateSource
  distanceMeters: number
  geoScore: number
  personalScore: number
  qualityScore: number
  engagementScore: number
  conversionScore: number
  explorationScore: number
  freshnessScore: number
  trustScore: number
  contextScore: number
  benefitScore: number
  availabilityScore: number
  boostScore: number
  finalScore: number
  createdAt: string
}

export interface AdminRecommendationExplanationResponse {
  requestId: string
  items: AdminRecommendationExplanationItem[]
}

export type AdminRecommendationMetricErrorResponse = AuthErrorResponse<string>
