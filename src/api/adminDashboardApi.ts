import customAxios from './customAxios'
import { getAdminMerchantPlaceApplications } from './adminMerchantPlaceApplicationApi'
import type {
  AdminDashboardPendingItemsResponse,
  AdminDashboardRecentActivitiesResponse,
  AdminDashboardSummary,
} from '../types/adminDashboard.types'

const ADMIN_DASHBOARD_SUMMARY_API_PATH = '/admin/dashboard/summary'
const ADMIN_DASHBOARD_RECENT_ACTIVITIES_API_PATH = '/admin/dashboard/recent-activities'

export async function getAdminDashboardPendingItems(limit = 10): Promise<AdminDashboardPendingItemsResponse> {
  // Fetch the filtered total from the server; filtering a mixed, limited queue
  // locally could hide pending applications and leave an incorrect total.
  const data = await getAdminMerchantPlaceApplications({ status: 'PENDING', page: 1, limit })
  if (!Array.isArray(data?.items) || !Number.isSafeInteger(data.total) || data.total < 0 ||
    data.items.some(item => !item || item.status !== 'PENDING' ||
      (item.placeName != null && typeof item.placeName !== 'string') ||
      (item.businessName != null && typeof item.businessName !== 'string') ||
      (item.submittedAt != null && typeof item.submittedAt !== 'string'))) {
    throw new Error('Invalid pending place applications response')
  }
  return {
    totalCount: data.total,
    items: data.items.map(item => ({
      type: 'MERCHANT_PLACE_APPLICATION',
      targetId: item.id,
      status: item.status,
      title: item.placeName || item.businessName || '장소 신청',
      createdAt: item.submittedAt,
    })),
  }
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
