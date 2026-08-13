import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  getAdminNotifications,
  getAdminUnreadNotificationCount,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
} from '../../api/adminNotificationApi'
import { isApiError } from '../../api/customAxios'
import type { AuthErrorResponse } from '../../types/auth.types'
import type {
  AdminNotificationItem,
  AdminNotificationListRequest,
} from '../../types/adminNotification.types'
import { logDebugError } from '../../utils/debugLogger'
import { useAuth } from '../../hooks/useAuth'
import {
  AdminNotificationContext,
  type AdminNotificationContextValue,
  type NotificationLoadStatus,
} from './AdminNotificationContext'

const ADMIN_NOTIFICATION_POLL_INTERVAL_MS = 30_000

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AuthErrorResponse>(error) &&
    (error.response?.status === 401 ||
      error.response?.data?.code === 'INVALID_TOKEN' ||
      error.category === 'unauthorized')
  )
}

function getNotificationErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.category === 'timeout') {
      return '알림 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
    }

    if (error.category === 'request-blocked' || error.category === 'network') {
      return '알림 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
    }

    if (error.category === 'unauthorized') {
      return '로그인이 필요합니다. 다시 로그인해주세요.'
    }

    if (error.response?.data && typeof error.response.data === 'object') {
      const message = (error.response.data as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }
  }

  return '알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}

export function AdminNotificationProvider({ children }: PropsWithChildren) {
  const { clearAuth, isAuthenticated, isAuthReady } = useAuth()
  const [notifications, setNotifications] = useState<AdminNotificationItem[] | null>(null)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [status, setStatus] = useState<NotificationLoadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isUnreadCountLoading, setIsUnreadCountLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const notificationRequestIdRef = useRef(0)
  const unreadRequestIdRef = useRef(0)
  const isUnreadRequestInFlightRef = useRef(false)

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthReady || !isAuthenticated || isUnreadRequestInFlightRef.current) {
      return
    }

    const requestId = unreadRequestIdRef.current + 1
    unreadRequestIdRef.current = requestId
    isUnreadRequestInFlightRef.current = true
    setIsUnreadCountLoading(true)

    try {
      const response = await getAdminUnreadNotificationCount()

      if (requestId === unreadRequestIdRef.current) {
        setUnreadCount(response.unreadCount)
      }
    } catch (error) {
      logDebugError('관리자 알림 미확인 개수 조회 실패', error)

      if (shouldClearAuth(error)) {
        clearAuth()
      }
    } finally {
      isUnreadRequestInFlightRef.current = false
      setIsUnreadCountLoading(false)
    }
  }, [clearAuth, isAuthReady, isAuthenticated])

  const fetchNotifications = useCallback(
    async (request: AdminNotificationListRequest = {}) => {
      if (!isAuthReady || !isAuthenticated) {
        return
      }

      const requestId = notificationRequestIdRef.current + 1
      notificationRequestIdRef.current = requestId
      setStatus('loading')
      setErrorMessage('')

      try {
        const response = await getAdminNotifications(request)

        if (requestId !== notificationRequestIdRef.current) {
          return
        }

        setNotifications(response.notifications)
        setStatus('success')
      } catch (error) {
        logDebugError('관리자 알림 목록 조회 실패', error)

        if (requestId !== notificationRequestIdRef.current) {
          return
        }

        setStatus('error')
        setErrorMessage(getNotificationErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }
    },
    [clearAuth, isAuthReady, isAuthenticated]
  )

  const markAsRead = useCallback(
    async (notificationId: number) => {
      if (isActionLoading) {
        return false
      }

      setIsActionLoading(true)

      try {
        await markAdminNotificationAsRead(notificationId)
        setNotifications((current) =>
          current?.map((notification) =>
            notification.notificationId === notificationId
              ? { ...notification, read: true }
              : notification
          ) ?? null
        )
        setUnreadCount((current) =>
          current === null ? current : Math.max(0, current - 1)
        )
        return true
      } catch (error) {
        logDebugError('관리자 알림 읽음 처리 실패', error)

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        return false
      } finally {
        setIsActionLoading(false)
      }
    },
    [clearAuth, isActionLoading]
  )

  const markAllAsRead = useCallback(async () => {
    if (isActionLoading) {
      return false
    }

    setIsActionLoading(true)

    try {
      await markAllAdminNotificationsAsRead()
      setNotifications((current) =>
        current?.map((notification) => ({ ...notification, read: true })) ?? null
      )
      setUnreadCount(0)
      return true
    } catch (error) {
      logDebugError('관리자 알림 전체 읽음 처리 실패', error)

      if (shouldClearAuth(error)) {
        clearAuth()
      }

      return false
    } finally {
      setIsActionLoading(false)
    }
  }, [clearAuth, isActionLoading])

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      notificationRequestIdRef.current += 1
      unreadRequestIdRef.current += 1
      setNotifications(null)
      setUnreadCount(null)
      setStatus('idle')
      setErrorMessage('')
      return
    }

    void refreshUnreadCount()

    let intervalId: number | null = null

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    const startPolling = () => {
      stopPolling()

      if (document.visibilityState !== 'visible') {
        return
      }

      intervalId = window.setInterval(() => {
        void refreshUnreadCount()
      }, ADMIN_NOTIFICATION_POLL_INTERVAL_MS)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount()
        startPolling()
      } else {
        stopPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    startPolling()

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthReady, isAuthenticated, refreshUnreadCount])

  const value: AdminNotificationContextValue = {
    notifications,
    unreadCount,
    status,
    errorMessage,
    isUnreadCountLoading,
    isActionLoading,
    fetchNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
  }

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  )
}
