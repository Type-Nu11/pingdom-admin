import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getAdminDataQualityIssues } from '../api/adminDataQualityApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { AdminDataQualityErrorResponse, AdminDataQualityIssuePageResponse } from '../types/adminDataQuality.types'
import { getAuthSessionId } from '../utils/authStorage'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

export const DATA_QUALITY_PAGE_SIZE = 20
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다.',
  'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
} as const

interface QueryState {
  owner: string
  result: AdminDataQualityIssuePageResponse | null
  phase: 'idle' | 'loading' | 'success' | 'error'
  errorMessage: string
  requestedPage: number
  revision: number
}
const emptyState = (owner: string): QueryState => ({
  owner, result: null, phase: 'idle', errorMessage: '', requestedPage: 1, revision: 0,
})
const isRestricted = (error: unknown) => isApiError(error)
  && ['unauthorized', 'forbidden'].includes(error.category ?? '')

export function useAdminDataQualityIssues() {
  const { user, clearAuth } = useAuth()
  const session = getAuthSessionId()
  const owner = `${session}:${user?.id ?? ''}:${user?.role ?? ''}`
  const [state, setState] = useState(() => emptyState(owner))
  const activeOwner = useRef<string | null>(null)
  const requestId = useRef(0)
  const revision = useRef(0)
  const requestedPage = useRef(1)

  useLayoutEffect(() => {
    const requests = requestId
    activeOwner.current = owner
    requestedPage.current = 1
    return () => { activeOwner.current = null; requests.current++ }
  }, [owner])

  const fetchIssues = useCallback(async (nextPage = requestedPage.current) => {
    if (activeOwner.current !== owner || getAuthSessionId() !== session
      || !Number.isSafeInteger(nextPage) || nextPage < 1) return false
    const request = ++requestId.current
    const current = () => activeOwner.current === owner && requestId.current === request
      && getAuthSessionId() === session
    requestedPage.current = nextPage
    setState(prev => ({ ...(prev.owner === owner ? prev : emptyState(owner)),
      phase: 'loading', errorMessage: '', requestedPage: nextPage }))
    try {
      let result = await getAdminDataQualityIssues(nextPage, DATA_QUALITY_PAGE_SIZE)
      if (!current()) return false
      // OPEN issues can disappear between page requests. Read the real last page once.
      if (result.page > Math.max(1, result.totalPages)) {
        const lastPage = Math.max(1, result.totalPages)
        requestedPage.current = lastPage
        setState(prev => ({ ...prev, requestedPage: lastPage }))
        result = await getAdminDataQualityIssues(lastPage, DATA_QUALITY_PAGE_SIZE)
        if (!current()) return false
        if (result.page > Math.max(1, result.totalPages)) throw new Error('데이터 품질 페이지 정보가 일치하지 않습니다.')
      }
      const resultRevision = ++revision.current
      setState(prev => ({ ...prev, result, phase: 'success', revision: resultRevision }))
      return true
    } catch (error) {
      if (!current()) return false
      const fallbackMessage = '데이터 품질 이슈를 불러오지 못했습니다.'
      const errorMessage = isApiError<AdminDataQualityErrorResponse>(error)
        ? getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES }) : fallbackMessage
      setState(prev => ({ ...prev, phase: 'error', errorMessage,
        ...(isRestricted(error) ? { result: null } : {}) }))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError('관리자 데이터 품질 이슈 조회 실패', error)
      return false
    }
  }, [clearAuth, owner, session])

  useEffect(() => { void fetchIssues(1) }, [fetchIssues])
  const visible = state.owner === owner ? state : emptyState(owner)
  return {
    ...visible, owner, issues: visible.result?.items ?? [], page: visible.result?.page ?? 1,
    limit: visible.result?.limit ?? DATA_QUALITY_PAGE_SIZE, total: visible.result?.total ?? null,
    totalPages: visible.result?.totalPages ?? 0, hasNext: visible.result?.hasNext ?? false,
    isLoading: visible.phase === 'loading',
    isPreviousResult: visible.result !== null && visible.phase !== 'success',
    fetchIssues,
  }
}
