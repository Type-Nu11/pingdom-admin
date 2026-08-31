import customAxios from './customAxios'
import type {
  AdminPlaceReviewDeletionRequest,
  AdminPlaceReviewDeletionRequestPage,
  AdminPlaceReviewDeletionRequestReviewRequest,
  PlaceReviewDeletionRequestStatus,
} from '../types/adminPlaceReviewDeletion.types'

const PATH = '/admin/place-review-deletion-requests'

export async function getAdminPlaceReviewDeletionRequests(params: {
  status?: PlaceReviewDeletionRequestStatus
  page?: number
  limit?: number
}) {
  const { data } = await customAxios.get<AdminPlaceReviewDeletionRequestPage>(PATH, { params })
  return data
}

export async function getAdminPlaceReviewDeletionRequest(deletionRequestId: number) {
  const { data } = await customAxios.get<AdminPlaceReviewDeletionRequest>(
    `${PATH}/${deletionRequestId}`
  )
  return data
}

export async function reviewAdminPlaceReviewDeletionRequest(
  deletionRequestId: number,
  request: AdminPlaceReviewDeletionRequestReviewRequest
) {
  const { data } = await customAxios.post<AdminPlaceReviewDeletionRequest>(
    `${PATH}/${deletionRequestId}/review`,
    request
  )
  return data
}
