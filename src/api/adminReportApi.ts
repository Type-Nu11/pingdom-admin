import customAxios from './customAxios'
import type {
  AdminReportedUserItem,
  AdminReportedUserListRequest,
  AdminReportedUserListResponse,
  AdminReportActionResponse,
} from '../types/adminReport.types'

const ADMIN_REPORTS_API_PATH = '/admin/reports'
const ADMIN_REPORTED_USERS_API_PATH = `${ADMIN_REPORTS_API_PATH}/reported-users`
const DEFAULT_ADMIN_REPORTED_USER_PAGE = 1
const DEFAULT_ADMIN_REPORTED_USER_LIMIT = 20
const DEFAULT_ADMIN_REPORTED_USER_KEYWORD = ''

export async function getAdminReportedUsers({
  page = DEFAULT_ADMIN_REPORTED_USER_PAGE,
  limit = DEFAULT_ADMIN_REPORTED_USER_LIMIT,
  keyword = DEFAULT_ADMIN_REPORTED_USER_KEYWORD,
}: AdminReportedUserListRequest = {}) {
  const { data } = await customAxios.get<AdminReportedUserListResponse>(
    ADMIN_REPORTED_USERS_API_PATH,
    {
      params: {
        page,
        limit,
        keyword,
      },
    }
  )

  return data
}

export async function getAdminReportedUser(reportId: number) {
  const { data } = await customAxios.get<AdminReportedUserItem>(
    `${ADMIN_REPORTED_USERS_API_PATH}/${reportId}`
  )

  return data
}

export async function acceptAdminReport(reportId: number) {
  const { data } = await customAxios.post<AdminReportActionResponse>(
    `${ADMIN_REPORTS_API_PATH}/${reportId}/accept`
  )

  return data
}

export async function declineAdminReport(reportId: number) {
  const { data } = await customAxios.post<AdminReportActionResponse>(
    `${ADMIN_REPORTS_API_PATH}/${reportId}/decline`
  )

  return data
}

export type { AdminReportedUserItem, AdminReportActionResponse }
