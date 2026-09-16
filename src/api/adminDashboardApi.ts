import customAxios from './customAxios'
import type {
  AdminDashboardPendingItemsResponse,
  AdminDashboardRecentActivitiesResponse,
  AdminDashboardSummary,
} from '../types/adminDashboard.types'

const ADMIN_DASHBOARD_SUMMARY_API_PATH = '/admin/dashboard/summary'
const ADMIN_DASHBOARD_RECENT_ACTIVITIES_API_PATH = '/admin/dashboard/recent-activities'

export async function getAdminDashboardPendingItems(limit = 10) {
  const { data } = await customAxios.get<AdminDashboardPendingItemsResponse>(
    '/admin/dashboard/pending-items',
    { params: { limit } },
  )
  if (!Array.isArray(data?.items) || !Number.isSafeInteger(data.totalCount) || data.totalCount < 0 ||
    data.items.some(item => !item || typeof item.type !== 'string' || typeof item.status !== 'string' ||
      (item.title != null && typeof item.title !== 'string') || (item.createdAt != null && typeof item.createdAt !== 'string'))) {
    throw new Error('Invalid dashboard pending items response')
  }
  return data
}

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
