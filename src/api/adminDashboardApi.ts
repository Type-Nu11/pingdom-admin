import customAxios from './customAxios'
import type { AdminDashboardSummary } from '../types/adminDashboard.types'

const ADMIN_DASHBOARD_SUMMARY_API_PATH = '/admin/dashboard/summary'

export async function getAdminDashboardSummary() {
  const response = await customAxios.get<AdminDashboardSummary>(
    ADMIN_DASHBOARD_SUMMARY_API_PATH
  )

  return response.data
}
