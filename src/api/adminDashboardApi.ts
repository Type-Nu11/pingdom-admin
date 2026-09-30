import customAxios from './customAxios'
import type {
  AdminDashboardRecentActivitiesResponse,
  AdminDashboardSummary,
} from '../types/adminDashboard.types'

const ADMIN_DASHBOARD_SUMMARY_API_PATH = '/admin/dashboard/summary'
const ADMIN_DASHBOARD_RECENT_ACTIVITIES_API_PATH = '/admin/dashboard/recent-activities'

export async function getAdminDashboardSummary() {
  const response = await customAxios.get<AdminDashboardSummary>(
    ADMIN_DASHBOARD_SUMMARY_API_PATH
  )

  return response.data
}

export async function getAdminDashboardRecentActivities(limit = 10) {
  const response = await customAxios.get<AdminDashboardRecentActivitiesResponse>(
    ADMIN_DASHBOARD_RECENT_ACTIVITIES_API_PATH,
    { params: { limit } }
  )

  return response.data
}
