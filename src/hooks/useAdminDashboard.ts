import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminDashboardSummary } from '../api/adminDashboardApi'
import type {
  AdminDashboardLoadStatus,
  AdminDashboardSummary,
} from '../types/adminDashboard.types'
import { logDebugError } from '../utils/debugLogger'

const DASHBOARD_REFRESH_INTERVAL_MS = 30_000

interface UseAdminDashboardOptions {
  enabled?: boolean
}

function hasSummaryData(summary: AdminDashboardSummary) {
  return Object.values(summary).some((value) => value !== 0)
}

export function useAdminDashboard({ enabled = true }: UseAdminDashboardOptions = {}) {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [status, setStatus] = useState<AdminDashboardLoadStatus>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const requestIdRef = useRef(0)
  const isRequestInFlightRef = useRef(false)

  const fetchSummary = useCallback(async () => {
    if (isRequestInFlightRef.current) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!enabled) {
      setSummary(null)
      setStatus('unavailable')
      setLastUpdatedAt(null)

      return
    }

    isRequestInFlightRef.current = true
    setStatus('loading')

    try {
      const nextSummary = await getAdminDashboardSummary()

      if (requestId !== requestIdRef.current) {
        return
      }

      setSummary(nextSummary)
      setStatus(hasSummaryData(nextSummary) ? 'success' : 'empty')
      setLastUpdatedAt(Date.now())
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }

      logDebugError('관리자 대시보드 요약 조회 실패', error)
      setStatus('error')
    } finally {
      isRequestInFlightRef.current = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      return
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
    status,
    isLoading: status === 'loading',
    lastUpdatedAt,
    fetchSummary,
  }
}
