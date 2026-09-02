import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  confirmAdminPlaceDuplicateCandidate,
  getAdminPlaceDuplicateReviewCandidate,
  getAdminPlaceDuplicateReviewCandidates,
  mergeAdminPlaceDuplicateCandidate,
  rejectAdminPlaceDuplicateCandidate,
} from '../api/adminPlaceMergeApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceDuplicateCandidateMergeRequest,
  AdminPlaceDuplicateCandidateStatus,
  AdminPlaceDuplicateDecisionRequest,
  AdminPlaceDuplicateReviewCandidate,
  AdminPlaceMergeErrorResponse,
} from '../types/adminPlaceMerge.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

export type AdminPlaceDuplicateReviewAction = 'confirm' | 'reject' | 'merge'

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '중복 후보를 찾을 수 없습니다.',
  conflict: '후보 상태가 이미 변경되었습니다. 목록을 새로고침해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<AdminPlaceMergeErrorResponse>(error)) {
    return fallbackMessage
  }

  return getAuthErrorMessage(error, {
    fallbackMessage,
    categoryMessages: CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPlaceMergeErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' ||
      error.category === 'unauthorized')
  )
}

export function useAdminPlaceDuplicateCandidates() {
  const { clearAuth } = useAuth()
  const [status, setStatusState] =
    useState<AdminPlaceDuplicateCandidateStatus>('PENDING')
  const [candidates, setCandidates] =
    useState<AdminPlaceDuplicateReviewCandidate[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [candidateDetail, setCandidateDetail] =
    useState<AdminPlaceDuplicateReviewCandidate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] =
    useState<AdminPlaceDuplicateReviewAction | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  useAutoDismissMessage(actionSuccessMessage, setActionSuccessMessage)
  const latestListRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const activeActionRef = useRef<AdminPlaceDuplicateReviewAction | null>(null)
  const statusRef = useRef(status)

  const fetchCandidates = useCallback(
    async (nextStatus: AdminPlaceDuplicateCandidateStatus = statusRef.current) => {
      const requestId = latestListRequestIdRef.current + 1
      latestListRequestIdRef.current = requestId
      statusRef.current = nextStatus
      setStatusState(nextStatus)
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getAdminPlaceDuplicateReviewCandidates(nextStatus)

        if (requestId === latestListRequestIdRef.current) {
          setCandidates(data.candidates)
          setTotalCount(data.totalCount)
        }

        return true
      } catch (error) {
        if (requestId === latestListRequestIdRef.current) {
          setCandidates([])
          setTotalCount(0)
          setErrorMessage(
            getErrorMessage(error, '중복 후보 목록을 불러오지 못했습니다.')
          )

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        logDebugError('관리자 중복 후보 목록 조회 실패', error)
        return false
      } finally {
        if (requestId === latestListRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const fetchCandidateDetail = useCallback(
    async (candidateId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId
      setIsDetailLoading(true)
      setCandidateDetail(null)
      setDetailErrorMessage('')
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await getAdminPlaceDuplicateReviewCandidate(candidateId)

        if (requestId === latestDetailRequestIdRef.current) {
          setCandidateDetail(data)
        }

        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setDetailErrorMessage(
            getErrorMessage(error, '중복 후보 상세를 불러오지 못했습니다.')
          )

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        logDebugError('관리자 중복 후보 상세 조회 실패', error)
        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const runAction = useCallback(
    async <T,>(
      action: AdminPlaceDuplicateReviewAction,
      request: () => Promise<T>,
      successMessage: string,
      debugLabel: string
    ) => {
      if (activeActionRef.current !== null) {
        return null
      }

      activeActionRef.current = action
      setActiveAction(action)
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await request()
        setActionSuccessMessage(successMessage)
        await fetchCandidates(statusRef.current)
        return data
      } catch (error) {
        setActionErrorMessage(
          getErrorMessage(error, '중복 후보를 처리하지 못했습니다.')
        )

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError(debugLabel, error)
        return null
      } finally {
        activeActionRef.current = null
        setActiveAction(null)
      }
    },
    [clearAuth, fetchCandidates]
  )

  const confirmCandidate = useCallback(
    (candidateId: number, payload: AdminPlaceDuplicateDecisionRequest) =>
      runAction(
        'confirm',
        () => confirmAdminPlaceDuplicateCandidate(candidateId, payload),
        '중복 후보를 확정했습니다.',
        '관리자 중복 후보 확정 실패'
      ),
    [runAction]
  )

  const rejectCandidate = useCallback(
    (candidateId: number, payload: AdminPlaceDuplicateDecisionRequest) =>
      runAction(
        'reject',
        () => rejectAdminPlaceDuplicateCandidate(candidateId, payload),
        '중복 후보를 거절했습니다.',
        '관리자 중복 후보 거절 실패'
      ),
    [runAction]
  )

  const mergeCandidate = useCallback(
    (candidateId: number, payload: AdminPlaceDuplicateCandidateMergeRequest) =>
      runAction(
        'merge',
        () => mergeAdminPlaceDuplicateCandidate(candidateId, payload),
        '확정된 중복 후보를 병합했습니다.',
        '관리자 확정 중복 후보 병합 실패'
      ),
    [runAction]
  )

  const clearCandidateDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setCandidateDetail(null)
    setDetailErrorMessage('')
    setActionErrorMessage('')
  }, [])

  useEffect(() => {
    void fetchCandidates('PENDING')
  }, [fetchCandidates])

  return {
    status,
    candidates,
    totalCount,
    candidateDetail,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchCandidates,
    fetchCandidateDetail,
    clearCandidateDetail,
    confirmCandidate,
    rejectCandidate,
    mergeCandidate,
  }
}
