import { useCallback, useRef, useState } from 'react'
import {
  resyncAdminRecommendationSnapshots,
  updateAdminRecommendationTraffic,
} from '../api/adminRecommendationPolicyApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminRecommendationPolicyErrorResponse,
  AdminRecommendationSnapshotResyncResponse,
  AdminRecommendationTrafficUpdateRequest,
  AdminRecommendationTrafficUpdateResponse,
} from '../types/adminRecommendationPolicy.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type PolicyAction = 'traffic' | 'resync'
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  conflict: '추천 정책 상태가 변경되었습니다. 입력값을 다시 확인해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<AdminRecommendationPolicyErrorResponse>(error)) return fallbackMessage
  return getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
}

function shouldClearAuth(error: unknown) {
  return isApiError<AdminRecommendationPolicyErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
}

export function useAdminRecommendationPolicy() {
  const { clearAuth } = useAuth()
  const [trafficResult, setTrafficResult] = useState<AdminRecommendationTrafficUpdateResponse | null>(null)
  const [resyncResult, setResyncResult] = useState<AdminRecommendationSnapshotResyncResponse | null>(null)
  const [activeAction, setActiveAction] = useState<PolicyAction | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const activeActionRef = useRef<PolicyAction | null>(null)

  const runAction = useCallback(async <T,>(
    action: PolicyAction,
    request: () => Promise<T>,
    success: string,
    fallback: string,
    debugLabel: string
  ) => {
    if (activeActionRef.current) return null
    activeActionRef.current = action
    setActiveAction(action)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await request()
      setSuccessMessage(success)
      return data
    } catch (error) {
      setErrorMessage(getErrorMessage(error, fallback))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError(debugLabel, error)
      return null
    } finally {
      activeActionRef.current = null
      setActiveAction(null)
    }
  }, [clearAuth])

  const updateTraffic = useCallback(async (request: AdminRecommendationTrafficUpdateRequest) => {
    const data = await runAction(
      'traffic',
      () => updateAdminRecommendationTraffic(request),
      '추천 트래픽 정책을 변경했습니다.',
      '추천 트래픽 정책을 변경하지 못했습니다.',
      '관리자 추천 트래픽 정책 변경 실패'
    )
    if (data) setTrafficResult(data)
    return data
  }, [runAction])

  const resyncSnapshots = useCallback(async () => {
    const data = await runAction(
      'resync',
      resyncAdminRecommendationSnapshots,
      '추천 snapshot 재동기화를 완료했습니다.',
      '추천 snapshot을 재동기화하지 못했습니다.',
      '관리자 추천 snapshot 재동기화 실패'
    )
    if (data) setResyncResult(data)
    return data
  }, [runAction])

  return { trafficResult, resyncResult, activeAction, errorMessage, successMessage, updateTraffic, resyncSnapshots }
}
