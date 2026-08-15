import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminAuditLogs,
  getPrivacyProcessingHistories,
} from '../api/adminOperationHistoryApi'
import { getAuthErrorMessage } from '../api/authError'
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
  ) => {
    const sequence = ++requestSequence.current[tab]
    setLoadingTabs((current) => ({ ...current, [tab]: true }))
    setErrors((current) => ({ ...current, [tab]: '' }))

    try {
      const data = await request()
      if (requestSequence.current[tab] === sequence) {
        apply(data)
      }
      return data
    } catch (error) {
      if (requestSequence.current[tab] === sequence) {
        setErrors((current) => ({ ...current, [tab]: getHistoryErrorMessage(error) }))
      }
      if (isApiError(error) && error.category === 'unauthorized') {
        clearAuth()
      }
      logDebugError(debugLabel, error)
      return null
    } finally {
      if (requestSequence.current[tab] === sequence) {
        setLoadingTabs((current) => ({ ...current, [tab]: false }))
      }
    }
  }, [clearAuth])

  const fetchAudit = useCallback(
    (request: AdminAuditLogRequest = {}) =>
      run('audit', () => getAdminAuditLogs(request), setAudit, '관리자 감사 로그 조회 실패'),
    [run],
  )

  const fetchPrivacy = useCallback(
    (request: PrivacyProcessingHistoryRequest = {}) =>
      run(
        'privacy',
        () => getPrivacyProcessingHistories(request),
        setPrivacy,
        '개인정보 처리 이력 조회 실패',
      ),
    [run],
  )

  useEffect(() => {
    void fetchAudit()
  }, [fetchAudit])

  return { audit, privacy, loadingTabs, errors, fetchAudit, fetchPrivacy }
}
