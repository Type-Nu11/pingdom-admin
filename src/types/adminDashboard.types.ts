export interface AdminDashboardSummary {
  placeCount: number
  bannedUserCount: number
  operationalMetrics?: AdminDashboardOperationalMetrics
}

export interface AdminDashboardPendingItem {
  type: string
  targetId: number
  reportId?: number | null
  postId?: number | null
  title?: string | null
  status: string
  createdAt?: string | null
  navigationPath?: string | null
}

export interface AdminDashboardPendingItemsResponse {
  items: AdminDashboardPendingItem[]
  totalCount: number
}

export type AdminDashboardMetricPeriod = 'TODAY' | 'LAST_7_DAYS'

export interface AdminDashboardMetricWindow {
  period: AdminDashboardMetricPeriod
  startedAt: string
  endedAt: string
  placeRegistrationCount: number
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
  userSanctions: AdminDashboardRecentUserSanctionItem[]
}

export type AdminDashboardLoadStatus =
  | 'unavailable'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
