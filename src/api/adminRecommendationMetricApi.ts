import customAxios from './customAxios'
import type {
  AdminRecommendationExplanationResponse,
  AdminRecommendationMetricsCompareResponse,
  AdminRecommendationMetricsResponse,
  RecommendationMetricSortBy,
} from '../types/adminRecommendationMetric.types'

const METRICS_PATH = '/admin/places/recommendation-metrics'

export async function getAdminRecommendationMetrics(params: {
  page?: number
  limit?: number
  sortBy?: RecommendationMetricSortBy
  keyword?: string
  recommendationVersion?: string
  days?: number
}) {
  const { data } = await customAxios.get<AdminRecommendationMetricsResponse>(
    METRICS_PATH,
    { params }
  )
  return data
}

export async function compareAdminRecommendationMetrics(params: {
  baselineVersion: string
  targetVersion: string
  keyword?: string
  days?: number
}) {
  const { data } = await customAxios.get<AdminRecommendationMetricsCompareResponse>(
    `${METRICS_PATH}/compare`,
    { params }
  )
  return data
}

export async function getAdminRecommendationExplanation(requestId: string) {
  const { data } = await customAxios.get<AdminRecommendationExplanationResponse>(
    `/admin/places/recommendations/${encodeURIComponent(requestId)}/explanation`
  )
  return data
}
