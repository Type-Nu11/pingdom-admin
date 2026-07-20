import customAxios from './customAxios'
import type {
  AdminPlaceDuplicateDetailResponse,
  AdminPlaceDuplicateGroupResponse,
  AdminPlaceMergeHistoryResponse,
  AdminPlaceMergeRequest,
  AdminPlaceMergeResponse,
  AdminPlaceRestoreResponse,
} from '../types/adminPlaceMerge.types'

const ADMIN_PLACE_DUPLICATES_API_PATH = '/admin/places/duplicates'
const ADMIN_PLACE_MERGE_API_PATH = '/admin/places/merge'
const ADMIN_PLACE_MERGE_HISTORIES_API_PATH = '/admin/places/merge-histories'

export async function getAdminPlaceDuplicateGroups() {
  const { data } = await customAxios.get<AdminPlaceDuplicateGroupResponse>(
    ADMIN_PLACE_DUPLICATES_API_PATH
  )

  return data
}

export async function getAdminPlaceDuplicateDetail(placeId: number) {
  const { data } = await customAxios.get<AdminPlaceDuplicateDetailResponse>(
    `${ADMIN_PLACE_DUPLICATES_API_PATH}/${placeId}`
  )

  return data
}

export async function mergeAdminPlaces(request: AdminPlaceMergeRequest) {
  const { data } = await customAxios.post<AdminPlaceMergeResponse>(
    ADMIN_PLACE_MERGE_API_PATH,
    request
  )

  return data
}

export async function getAdminPlaceMergeHistories() {
  const { data } = await customAxios.get<AdminPlaceMergeHistoryResponse>(
    ADMIN_PLACE_MERGE_HISTORIES_API_PATH
  )

  return data
}

export async function restoreAdminPlaceMerge(historyId: number) {
  const { data } = await customAxios.post<AdminPlaceRestoreResponse>(
    `${ADMIN_PLACE_MERGE_HISTORIES_API_PATH}/${historyId}/restore`
  )

  return data
}
