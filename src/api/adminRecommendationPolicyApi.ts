import customAxios from './customAxios'
import type {
  AdminRecommendationSnapshotResyncResponse,
  AdminRecommendationTrafficUpdateRequest,
  AdminRecommendationTrafficUpdateResponse,
} from '../types/adminRecommendationPolicy.types'

export async function updateAdminRecommendationTraffic(
  request: AdminRecommendationTrafficUpdateRequest
) {
  const { data } = await customAxios.patch<AdminRecommendationTrafficUpdateResponse>(
    '/admin/places/recommendation-traffic',
    request
  )
  return data
}

export async function resyncAdminRecommendationSnapshots() {
  const { data } = await customAxios.post<AdminRecommendationSnapshotResyncResponse>(
    '/admin/places/recommendation-snapshots/resync'
  )
  return data
}
