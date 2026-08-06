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

export type AdminNotificationDeliveryStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'READ'

export interface AdminNotificationDeliveryItem {
  deliveryId: number
  notificationId: number
  userId: number
  status: AdminNotificationDeliveryStatus
  sentAt?: string | null
  readAt?: string | null
  createdAt: string
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
  notificationId?: number
  userId?: number
  status?: AdminNotificationDeliveryStatus
  page?: number
  limit?: number
}
