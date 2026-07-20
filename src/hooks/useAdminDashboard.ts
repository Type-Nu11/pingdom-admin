import { useCallback, useEffect, useState } from 'react'
import { getAdminDashboardSummary } from '../api/adminDashboardApi'
import type {
  AdminDashboardLoadStatus,
  AdminDashboardSummary,
} from '../types/adminDashboard.types'
import { logDebugError } from '../utils/debugLogger'

interface UseAdminDashboardOptions {
  enabled?: boolean
}

function hasSummaryData(summary: AdminDashboardSummary) {
  return Object.values(summary).some((value) => value > 0)
}

export function useAdminDashboard({ enabled = false }: UseAdminDashboardOptions = {}) {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [status, setStatus] = useState<AdminDashboardLoadStatus>('unavailable')

  const fetchSummary = useCallback(async () => {
    if (!enabled) {
      setSummary(null)
      setStatus('unavailable')

      return
    }

    setStatus('loading')

    try {
      const nextSummary = await getAdminDashboardSummary()

      setSummary(nextSummary)
      setStatus(hasSummaryData(nextSummary) ? 'success' : 'empty')
    } catch (error) {
      logDebugError('관리자 대시보드 요약 조회 실패', error)
      setSummary(null)
      setStatus('error')
    }
  }, [enabled])

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void fetchSummary()
    }, 0)

    return () => window.clearTimeout(requestId)
  }, [fetchSummary])

  return {
    summary,
    status,
    isLoading: status === 'loading',
    fetchSummary,
  }
}
