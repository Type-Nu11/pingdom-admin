export type AdminNotificationType =
  | 'NEW_HOTPLACE'
  | 'NEW_LIKE'
  | 'PLACE_INFORMATION_REVERIFICATION_REQUESTED'
  | 'PLACE_INFORMATION_REVERIFICATION_REMINDER'
  | 'ADMIN_REPORT_RECEIVED'
  | 'ADMIN_REPORT_PROCESSED'
  | 'ADMIN_DUPLICATE_PLACE_DETECTED'
  | 'ADMIN_USER_SANCTION'

export interface AdminNotificationItem {
  notificationId: number
  userId: number
  type: AdminNotificationType
  title: string
  body: string
  token?: string | null
  read: boolean
  createdAt: string
}

export interface AdminNotificationListRequest {
  userId?: number
  type?: AdminNotificationType
  read?: boolean
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AdminNotificationResponse {
  notifications: AdminNotificationItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminNotificationUnreadCountResponse {
  unreadCount: number
}

export interface AdminNotificationReadResponse {
  notificationId: number
  read: boolean
  message: string
}

export interface AdminNotificationReadAllResponse {
  updatedCount: number
  message: string
}

export type AdminNotificationDeliveryChannel = 'FCM' | 'EMAIL'

export type AdminNotificationDeliveryStatus =
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRY_SCHEDULED'
  | 'FINAL_FAILED'

export interface AdminNotificationDeliveryItem {
  deliveryId: number
  channel: AdminNotificationDeliveryChannel
  userId: number
  notificationId?: number | null
  status: AdminNotificationDeliveryStatus
  notificationType?: AdminNotificationType | null
  outboxEventId?: string | null
  outboxEventType?: string | null
  providerMessageId?: string | null
  providerErrorCode?: string | null
  errorCode?: string | null
  failureReason?: string | null
  retryable: boolean
  attemptCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminNotificationDeliveryResponse {
  deliveries: AdminNotificationDeliveryItem[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminNotificationDeliveryListRequest {
  userId?: number
  channel?: AdminNotificationDeliveryChannel
  status?: AdminNotificationDeliveryStatus
  notificationType?: AdminNotificationType
  outboxEventType?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}
