import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminDashboardPendingItems,
  getAdminDashboardRecentActivities,
  getAdminDashboardSummary,
} from '../api/adminDashboardApi'
import { isApiError } from '../api/customAxios'
import type { AuthErrorResponse } from '../types/auth.types'
import type {
  AdminDashboardLoadStatus,
  AdminDashboardPendingItem,
  AdminDashboardRecentActivitiesResponse,
  AdminDashboardSummary,
} from '../types/adminDashboard.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const DASHBOARD_REFRESH_INTERVAL_MS = 30_000

interface UseAdminDashboardOptions {
  enabled?: boolean
}

function hasSummaryData(summary: AdminDashboardSummary) {
  return Object.values(summary).some((value) => value !== 0)
}

function hasRecentActivityData(activities: AdminDashboardRecentActivitiesResponse) {
  return Object.values(activities).some((items) => items.length > 0)
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AuthErrorResponse>(error) &&
    (error.response?.status === 401 ||
      error.response?.data?.code === 'INVALID_TOKEN' ||
      error.category === 'unauthorized')
  )
}

export function useAdminDashboard({ enabled = true }: UseAdminDashboardOptions = {}) {
  const { clearAuth } = useAuth()
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [recentActivities, setRecentActivities] =
    useState<AdminDashboardRecentActivitiesResponse | null>(null)
  const [pendingItems, setPendingItems] = useState<AdminDashboardPendingItem[]>([])
  const [status, setStatus] = useState<AdminDashboardLoadStatus>('loading')
  const [recentActivitiesStatus, setRecentActivitiesStatus] =
    useState<AdminDashboardLoadStatus>('loading')
  const [pendingItemsStatus, setPendingItemsStatus] =
    useState<AdminDashboardLoadStatus>('loading')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const requestIdRef = useRef(0)
  const isRequestInFlightRef = useRef(false)

  const fetchSummary = useCallback(async () => {
    if (!enabled) {
      requestIdRef.current += 1
      setSummary(null)
      setRecentActivities(null)
      setPendingItems([])
      setStatus('unavailable')
      setRecentActivitiesStatus('unavailable')
      setPendingItemsStatus('unavailable')
      setIsRefreshing(false)
      setLastUpdatedAt(null)

      return
    }

    if (isRequestInFlightRef.current) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    isRequestInFlightRef.current = true
    setIsRefreshing(true)
    setStatus('loading')
    setRecentActivitiesStatus('loading')
    setPendingItemsStatus('loading')

    const results = await Promise.allSettled([
      getAdminDashboardSummary(),
      getAdminDashboardRecentActivities(),
      getAdminDashboardPendingItems(),
    ])

    if (requestId !== requestIdRef.current) {
      isRequestInFlightRef.current = false
      setIsRefreshing(false)

      return
    }

    let hasSuccessfulResponse = false

    const summaryResult = results[0]
    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value)
      setStatus(hasSummaryData(summaryResult.value) ? 'success' : 'empty')
      hasSuccessfulResponse = true
    } else {
      logDebugError('관리자 대시보드 요약 조회 실패', summaryResult.reason)
      setStatus('error')

      if (shouldClearAuth(summaryResult.reason)) {
        clearAuth()
      }
    }

    const recentActivitiesResult = results[1]
    if (recentActivitiesResult.status === 'fulfilled') {
      setRecentActivities(recentActivitiesResult.value)
      setRecentActivitiesStatus(
        hasRecentActivityData(recentActivitiesResult.value) ? 'success' : 'empty'
      )
      hasSuccessfulResponse = true
    } else {
      logDebugError('관리자 대시보드 최근 활동 조회 실패', recentActivitiesResult.reason)
      setRecentActivitiesStatus('error')

      if (shouldClearAuth(recentActivitiesResult.reason)) {
        clearAuth()
      }
    }

    const pendingItemsResult = results[2]
    if (pendingItemsResult.status === 'fulfilled') {
      setPendingItems(pendingItemsResult.value.items)
      setPendingItemsStatus(
        pendingItemsResult.value.items.length > 0 ? 'success' : 'empty'
      )
      hasSuccessfulResponse = true
    } else {
      logDebugError('관리자 대시보드 처리 필요 항목 조회 실패', pendingItemsResult.reason)
      setPendingItemsStatus('error')

      if (shouldClearAuth(pendingItemsResult.reason)) {
        clearAuth()
      }
    }

    if (hasSuccessfulResponse) {
      setLastUpdatedAt(Date.now())
    }

    isRequestInFlightRef.current = false
    setIsRefreshing(false)
  }, [clearAuth, enabled])

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1
      const resetTimer = window.setTimeout(() => {
        setSummary(null)
        setRecentActivities(null)
        setPendingItems([])
        setStatus('unavailable')
        setRecentActivitiesStatus('unavailable')
        setPendingItemsStatus('unavailable')
        setIsRefreshing(false)
        setLastUpdatedAt(null)
      }, 0)

      return () => window.clearTimeout(resetTimer)
    }

    let refreshTimer: number | null = null

    const stopPolling = () => {
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer)
        refreshTimer = null
      }
    }

    const startPolling = () => {
      stopPolling()

      if (document.visibilityState !== 'visible') {
        return
      }

      refreshTimer = window.setInterval(() => {
        void fetchSummary()
      }, DASHBOARD_REFRESH_INTERVAL_MS)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchSummary()
        startPolling()
        return
      }

      stopPolling()
    }

    const requestTimer = window.setTimeout(() => {
      void fetchSummary()
      startPolling()
    }, 0)

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(requestTimer)
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, fetchSummary])

  return {
    summary,
    recentActivities,
    pendingItems,
    status,
    recentActivitiesStatus,
    pendingItemsStatus,
    isLoading: isRefreshing,
    lastUpdatedAt,
    fetchSummary,
  }
}
