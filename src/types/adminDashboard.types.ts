export interface AdminDashboardSummary {
  placeCount: number
  postCount: number
  pendingReportCount: number
  bannedUserCount: number
}

export type AdminDashboardLoadStatus =
  | 'unavailable'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
