import { createContext, useContext } from 'react'
import type {
  AdminNotificationItem,
  AdminNotificationListRequest,
} from '../../types/adminNotification.types'

export type NotificationLoadStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AdminNotificationContextValue {
  notifications: AdminNotificationItem[] | null
  unreadCount: number | null
  status: NotificationLoadStatus
  errorMessage: string
  isUnreadCountLoading: boolean
  isActionLoading: boolean
  fetchNotifications: (request?: AdminNotificationListRequest) => Promise<void>
  refreshUnreadCount: () => Promise<void>
  markAsRead: (notificationId: number) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
}

export const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(
  null
)

export function useAdminNotificationContext() {
  const context = useContext(AdminNotificationContext)

  if (!context) {
    throw new Error(
      'useAdminNotificationContext는 AdminNotificationProvider 내부에서만 사용할 수 있습니다.'
    )
  }

  return context
}
