import customAxios from './customAxios'
import type {
  PlaceInformationDisputeReviewRequest,
  PlaceInformationEvidenceCreateRequest,
  PlaceInformationEvidenceResponse,
  PlaceInformationEvidenceReviewRequest,
  PlaceInformationEvidenceUpdateResponse,
  PlaceInformationReport,
  PlaceInformationReportPageResponse,
  PlaceInformationReportReviewRequest,
  PlaceInformationReportStatus,
  PlaceInformationReverificationCreateRequest,
  PlaceInformationReverificationListResponse,
  PlaceInformationReverificationRequest,
} from '../types/adminPlaceVerification.types'

const ADMIN_PLACE_INFORMATION_REPORTS_PATH = '/admin/place-information-reports'

export async function getAdminPlaceInformationReports(params: {
  status?: PlaceInformationReportStatus
  page?: number
  limit?: number
}) {
  const { data } = await customAxios.get<PlaceInformationReportPageResponse>(
    ADMIN_PLACE_INFORMATION_REPORTS_PATH,
    { params }
  )
  return data
}

export async function getAdminPlaceInformationReport(reportId: number) {
  const { data } = await customAxios.get<PlaceInformationReport>(
    `${ADMIN_PLACE_INFORMATION_REPORTS_PATH}/${reportId}`
  )
  return data
}

export async function reviewAdminPlaceInformationReport(
  reportId: number,
  request: PlaceInformationReportReviewRequest
) {
  const { data } = await customAxios.post<PlaceInformationReport>(
    `${ADMIN_PLACE_INFORMATION_REPORTS_PATH}/${reportId}/review`,
    request
  )
  return data
}

export async function reviewAdminPlaceInformationDispute(
  reportId: number,
  disputeId: number,
  request: PlaceInformationDisputeReviewRequest
) {
  const { data } = await customAxios.post<PlaceInformationReport>(
    `${ADMIN_PLACE_INFORMATION_REPORTS_PATH}/${reportId}/disputes/${disputeId}/review`,
    request
  )
  return data
}

function evidencePath(placeId: number) {
  return `/admin/places/${placeId}/information-evidence`
}

export async function getAdminPlaceInformationEvidence(placeId: number) {
  const { data } = await customAxios.get<PlaceInformationEvidenceResponse>(
    evidencePath(placeId)
  )
  return data
}

export async function createAdminPlaceInformationEvidence(
  placeId: number,
  request: PlaceInformationEvidenceCreateRequest
) {
  const { data } = await customAxios.post<PlaceInformationEvidenceUpdateResponse>(
    evidencePath(placeId),
    request
  )
  return data
}

export async function reviewAdminPlaceInformationEvidence(
  placeId: number,
  evidenceId: number,
  request: PlaceInformationEvidenceReviewRequest
) {
  const { data } = await customAxios.patch<PlaceInformationEvidenceUpdateResponse>(
    `${evidencePath(placeId)}/${evidenceId}/review`,
    request
  )
  return data
}

function reverificationPath(placeId: number) {
  return `/admin/places/${placeId}/information-reverification-requests`
}

export async function getAdminPlaceInformationReverificationRequests(
  placeId: number,
  params: { page?: number; limit?: number } = {}
) {
  const { data } =
    await customAxios.get<PlaceInformationReverificationListResponse>(
      reverificationPath(placeId),
      { params }
    )
  return data
}

export async function createAdminPlaceInformationReverificationRequest(
  placeId: number,
  request: PlaceInformationReverificationCreateRequest
) {
  const { data } = await customAxios.post<PlaceInformationReverificationRequest>(
    reverificationPath(placeId),
    request
  )
  return data
}

async function runReverificationAction(
  placeId: number,
  requestId: number,
  action: 'cancel' | 'complete' | 'reminders'
) {
  const { data } = await customAxios.post<PlaceInformationReverificationRequest>(
    `${reverificationPath(placeId)}/${requestId}/${action}`
  )
  return data
}

export const cancelAdminPlaceInformationReverificationRequest = (
  placeId: number,
  requestId: number
) => runReverificationAction(placeId, requestId, 'cancel')

export const completeAdminPlaceInformationReverificationRequest = (
  placeId: number,
  requestId: number
) => runReverificationAction(placeId, requestId, 'complete')

export const remindAdminPlaceInformationReverificationRequest = (
  placeId: number,
  requestId: number
) => runReverificationAction(placeId, requestId, 'reminders')
