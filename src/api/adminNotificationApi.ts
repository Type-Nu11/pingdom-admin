import customAxios from './customAxios'
import type {
  AdminNotificationDeliveryListRequest,
  AdminNotificationDeliveryResponse,
  AdminNotificationListRequest,
  AdminNotificationReadAllResponse,
  AdminNotificationReadResponse,
  AdminNotificationResponse,
  AdminNotificationUnreadCountResponse,
  AdminOutboxEventItem,
  AdminOutboxEventListRequest,
  AdminOutboxEventResponse,
} from '../types/adminNotification.types'

const ADMIN_NOTIFICATIONS_API_PATH = '/admin/notifications'
const ADMIN_NOTIFICATION_DELIVERIES_API_PATH = '/admin/notification-deliveries'

export async function getAdminNotifications(
  request: AdminNotificationListRequest = {}
) {
  const response = await customAxios.get<AdminNotificationResponse>(
    ADMIN_NOTIFICATIONS_API_PATH,
    {
      params: {
        ...request,
        page: request.page ?? 1,
        limit: request.limit ?? 20,
      },
    }
  )

  return response.data
}

export async function getAdminOutboxEvents(request: AdminOutboxEventListRequest = {}) {
  const { data } = await customAxios.get<AdminOutboxEventResponse>('/admin/outbox-events', { params: { ...request, page: request.page ?? 1, limit: request.limit ?? 20 } })
  return data
}

export async function retryAdminOutboxEvent(eventId: string, reason: string) {
  const { data } = await customAxios.post<AdminOutboxEventItem>(`/admin/outbox-events/${eventId}/retry`, { reason })
  return data
}

export async function getAdminUnreadNotificationCount() {
  const response = await customAxios.get<AdminNotificationUnreadCountResponse>(
    `${ADMIN_NOTIFICATIONS_API_PATH}/unread-count`
  )

  return response.data
}

export async function markAdminNotificationAsRead(notificationId: number) {
  const response = await customAxios.patch<AdminNotificationReadResponse>(
    `${ADMIN_NOTIFICATIONS_API_PATH}/${notificationId}/read`
  )

  return response.data
}

export async function markAllAdminNotificationsAsRead() {
  const response = await customAxios.patch<AdminNotificationReadAllResponse>(
    `${ADMIN_NOTIFICATIONS_API_PATH}/read`
  )

  return response.data
}

export async function getAdminNotificationDeliveries(
  request: AdminNotificationDeliveryListRequest = {}
) {
  const response = await customAxios.get<AdminNotificationDeliveryResponse>(
    ADMIN_NOTIFICATION_DELIVERIES_API_PATH,
    {
      params: {
        ...request,
        page: request.page ?? 1,
        limit: request.limit ?? 20,
      },
    }
  )

  return response.data
}
