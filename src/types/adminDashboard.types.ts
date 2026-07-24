export interface AdminDashboardSummary {
  placeCount: number
  postCount: number
  pendingReportCount: number
  bannedUserCount: number
  operationalMetrics?: AdminDashboardOperationalMetrics
}

export type AdminDashboardMetricPeriod = 'TODAY' | 'LAST_7_DAYS'

export interface AdminDashboardMetricWindow {
  period: AdminDashboardMetricPeriod
  startedAt: string
  endedAt: string
  placeRegistrationCount: number
  postRegistrationCount: number
}

export interface AdminDashboardOperationalMetrics {
  today: AdminDashboardMetricWindow
  last7Days: AdminDashboardMetricWindow
  duplicatePlaceGroupCount: number
  expiringBannedUserCount: number
  missingLocationPlaceCount: number
  expiringBanUntil: string
  collectedAt: string
}

export interface AdminDashboardRecentPlaceItem {
  placeId: number
  name: string
  address: string
  userId: number
  registrant: string
  createdAt?: string | null
}

export interface AdminDashboardRecentPostItem {
  postId: number
  title: string
  userId: number
  username: string
  placeId: number
  placeName: string
  createdAt: string
}

export type AdminDashboardReportStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'RESTORED'

export interface AdminDashboardRecentReportItem {
  reportId: number
  reportedImageId: number
  title: string
  status: AdminDashboardReportStatus
  processedAt: string
  createdAt: string
}

export type AdminDashboardSanctionAction = 'APPLIED' | 'RELEASED' | 'EXPIRED'
export type AdminDashboardBanType = 'PERMANENT' | 'TEMPORARY'

export interface AdminDashboardRecentUserSanctionItem {
  sanctionId: number
  targetUserId: number
  targetUsername: string
  action: AdminDashboardSanctionAction
  banType: AdminDashboardBanType
  reason: string
  processedAt: string
}

export interface AdminDashboardRecentActivitiesResponse {
  places: AdminDashboardRecentPlaceItem[]
  posts: AdminDashboardRecentPostItem[]
  reports: AdminDashboardRecentReportItem[]
  userSanctions: AdminDashboardRecentUserSanctionItem[]
}

export interface AdminDashboardPendingItem {
  type: string
  targetId: number
  reportId?: number | null
  postId?: number | null
  title: string
  status: string
  createdAt: string
}

export interface AdminDashboardPendingItemsResponse {
  items: AdminDashboardPendingItem[]
}

export type AdminDashboardLoadStatus =
  | 'unavailable'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
