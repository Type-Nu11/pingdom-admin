import { useCallback, useEffect, useState } from 'react'
import { getAdminDataQualityIssues } from '../api/adminDataQualityApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminDataQualityErrorResponse,
  AdminDataQualityIssue,
} from '../types/adminDataQuality.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다.',
  'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
} as const

export function useAdminDataQualityIssues() {
  const { clearAuth } = useAuth()
  const [issues, setIssues] = useState<AdminDataQualityIssue[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const message = useCallback((error: unknown, fallback: string) => {
    if (!isApiError<AdminDataQualityErrorResponse>(error)) return fallback
    if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') {
      clearAuth()
    }
    return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
  }, [clearAuth])

  const fetchIssues = useCallback(async (nextPage = 1) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAdminDataQualityIssues(nextPage)
      setIssues(data.items)
      setPage(data.page)
      setLimit(data.limit)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setHasNext(data.hasNext)
      return true
    } catch (error) {
      setErrorMessage(message(error, '데이터 품질 이슈를 불러오지 못했습니다.'))
      logDebugError('관리자 데이터 품질 이슈 조회 실패', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [message])

  useEffect(() => { void fetchIssues() }, [fetchIssues])

  return { issues, page, limit, total, totalPages, hasNext, isLoading, errorMessage, fetchIssues }
}
