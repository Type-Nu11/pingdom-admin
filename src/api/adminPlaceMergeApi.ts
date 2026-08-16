import customAxios from './customAxios'
import type {
  AdminPlaceDuplicateDetailResponse,
  AdminPlaceDuplicateGroupResponse,
  AdminPlaceDuplicateCandidateMergeRequest,
  AdminPlaceDuplicateCandidateStatus,
  AdminPlaceDuplicateDecisionRequest,
  AdminPlaceDuplicateReviewCandidate,
  AdminPlaceDuplicateReviewCandidateListResponse,
  AdminPlaceMergeHistoryResponse,
  AdminPlaceMergeRequest,
  AdminPlaceMergeResponse,
  AdminPlaceRestoreResponse,
} from '../types/adminPlaceMerge.types'

const ADMIN_PLACE_DUPLICATES_API_PATH = '/admin/places/duplicates'
const ADMIN_PLACE_MERGE_API_PATH = '/admin/places/merge'
const ADMIN_PLACE_MERGE_HISTORIES_API_PATH = '/admin/places/merge-histories'
const ADMIN_PLACE_DUPLICATE_CANDIDATES_API_PATH =
  '/admin/places/duplicate-candidates'

export async function getAdminPlaceDuplicateReviewCandidates(
  status: AdminPlaceDuplicateCandidateStatus = 'PENDING'
) {
  const { data } =
    await customAxios.get<AdminPlaceDuplicateReviewCandidateListResponse>(
      ADMIN_PLACE_DUPLICATE_CANDIDATES_API_PATH,
      { params: { status } }
    )

  return data
}

export async function getAdminPlaceDuplicateReviewCandidate(candidateId: number) {
  const { data } = await customAxios.get<AdminPlaceDuplicateReviewCandidate>(
    `${ADMIN_PLACE_DUPLICATE_CANDIDATES_API_PATH}/${candidateId}`
  )

  return data
}

export async function confirmAdminPlaceDuplicateCandidate(
  candidateId: number,
  payload: AdminPlaceDuplicateDecisionRequest
) {
  const { data } = await customAxios.post<AdminPlaceDuplicateReviewCandidate>(
    `${ADMIN_PLACE_DUPLICATE_CANDIDATES_API_PATH}/${candidateId}/confirm`,
    payload
  )

  return data
}

export async function rejectAdminPlaceDuplicateCandidate(
  candidateId: number,
  payload: AdminPlaceDuplicateDecisionRequest
) {
  const { data } = await customAxios.post<AdminPlaceDuplicateReviewCandidate>(
    `${ADMIN_PLACE_DUPLICATE_CANDIDATES_API_PATH}/${candidateId}/reject`,
    payload
  )

  return data
}

export async function mergeAdminPlaceDuplicateCandidate(
  candidateId: number,
  payload: AdminPlaceDuplicateCandidateMergeRequest
) {
  const { data } = await customAxios.post<AdminPlaceMergeResponse>(
    `${ADMIN_PLACE_DUPLICATE_CANDIDATES_API_PATH}/${candidateId}/merge`,
    payload
  )

  return data
}

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
