import customAxios from './customAxios'
import type {
  AdminReportAppealActionRequest,
  AdminReportAppealActionResponse,
  AdminReportAppealListResponse,
  AdminReportAppealStatus,
} from '../types/adminReportAppeal.types'

const ADMIN_REPORT_APPEALS_PATH = '/admin/report-appeals'

export async function getAdminReportAppeals(params: {
  status?: AdminReportAppealStatus
  page?: number
  limit?: number
}) {
  const { data } = await customAxios.get<AdminReportAppealListResponse>(
    ADMIN_REPORT_APPEALS_PATH,
    { params }
  )
  return data
}

async function processAdminReportAppeal(
  appealId: number,
  action: 'approve' | 'reject',
  request: AdminReportAppealActionRequest
) {
  const { data } = await customAxios.post<AdminReportAppealActionResponse>(
    `${ADMIN_REPORT_APPEALS_PATH}/${appealId}/${action}`,
    request
  )
  return data
}

export const approveAdminReportAppeal = (
  appealId: number,
  request: AdminReportAppealActionRequest
) => processAdminReportAppeal(appealId, 'approve', request)

export const rejectAdminReportAppeal = (
  appealId: number,
  request: AdminReportAppealActionRequest
) => processAdminReportAppeal(appealId, 'reject', request)
