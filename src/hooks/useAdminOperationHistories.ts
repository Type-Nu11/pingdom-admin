import { useListQueryState, listQueryKey } from './useListQueryState'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminAuditLogs,
  getPrivacyProcessingHistories,
} from '../api/adminOperationHistoryApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminAuditLogRequest,
  AdminAuditLogResponse,
  PrivacyProcessingHistoryRequest,
  PrivacyProcessingHistoryResponse,
} from '../types/adminOperationHistory.types'
import type { AuthErrorResponse } from '../types/auth.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type HistoryTab = 'audit' | 'privacy'

function getHistoryErrorMessage(error: unknown) {
  if (!isApiError<AuthErrorResponse>(error)) {
    return '운영 이력을 불러오는 중 오류가 발생했습니다.'
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: '운영 이력을 불러오는 중 오류가 발생했습니다.',
    categoryMessages: {
      unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
      forbidden: '운영 이력 조회 권한이 없습니다.',
      network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
      timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    },
  })
}

export function useAdminOperationHistories() {
  const { clearAuth } = useAuth()
  const auditState = useListQueryState()
  const privacyState = useListQueryState()
  const { begin: beginAudit, succeed: succeedAudit, fail: failAudit } = auditState
  const { begin: beginPrivacy, succeed: succeedPrivacy, fail: failPrivacy } = privacyState
  const auditQuery = useRef<AdminAuditLogRequest>({})
  const privacyQuery = useRef<PrivacyProcessingHistoryRequest>({})
  const [audit, setAudit] = useState<AdminAuditLogResponse | null>(null)
  const [privacy, setPrivacy] = useState<PrivacyProcessingHistoryResponse | null>(null)
  const [loadingTabs, setLoadingTabs] = useState<Record<HistoryTab, boolean>>({
    audit: false,
    privacy: false,
  })
  const [errors, setErrors] = useState<Record<HistoryTab, string>>({
    audit: '',
    privacy: '',
  })
  const requestSequence = useRef<Record<HistoryTab, number>>({ audit: 0, privacy: 0 })

  const run = useCallback(async <T,>(
    tab: HistoryTab,
    request: () => Promise<T>,
    apply: (data: T) => void,
    debugLabel: string,
    query: AdminAuditLogRequest | PrivacyProcessingHistoryRequest,
  ) => {
    const normalized = { ...query, page: query.page ?? 1, limit: query.limit ?? 5 }
    const key = listQueryKey(normalized)
    const filtered = Object.entries(query).some(([name, value]) => name !== 'page' && name !== 'limit' && value !== undefined && value !== '')
    const retain = (tab === 'audit' ? beginAudit : beginPrivacy)(key, filtered)
    if (!retain) {
      if (tab === 'audit') setAudit(null)
      else setPrivacy(null)
    }
    const sequence = ++requestSequence.current[tab]
    setLoadingTabs((current) => ({ ...current, [tab]: true }))
    setErrors((current) => ({ ...current, [tab]: '' }))

    try {
      const data = await request()
      if (requestSequence.current[tab] === sequence) {
        apply(data)
        if (tab === 'audit') succeedAudit(key)
        else succeedPrivacy(key)
      }
      return data
    } catch (error) {
      if (requestSequence.current[tab] === sequence) {
        if (tab === 'audit') failAudit(error)
        else failPrivacy(error)
        setErrors((current) => ({ ...current, [tab]: getHistoryErrorMessage(error) }))
      }
      if (shouldClearAuth(error)) {
        clearAuth()
      }
      logDebugError(debugLabel, error)
      return null
    } finally {
      if (requestSequence.current[tab] === sequence) {
        setLoadingTabs((current) => ({ ...current, [tab]: false }))
      }
    }
  }, [clearAuth, beginAudit, beginPrivacy, succeedAudit, succeedPrivacy, failAudit, failPrivacy])

  const fetchAudit = useCallback((request: AdminAuditLogRequest = {}) => {
    auditQuery.current = request
    return run('audit', () => getAdminAuditLogs(request), setAudit, '관리자 감사 로그 조회 실패', request)
  }, [run])

  const fetchPrivacy = useCallback((request: PrivacyProcessingHistoryRequest = {}) => {
    privacyQuery.current = request
    return run('privacy', () => getPrivacyProcessingHistories(request), setPrivacy, '개인정보 처리 이력 조회 실패', request)
  }, [run])

  useEffect(() => {
    void fetchAudit()
  }, [fetchAudit])

  return { auditState, privacyState, retryAudit: () => fetchAudit(auditQuery.current), retryPrivacy: () => fetchPrivacy(privacyQuery.current), audit, privacy, loadingTabs, errors, fetchAudit, fetchPrivacy }
}
