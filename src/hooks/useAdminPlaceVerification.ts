import { useCallback, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  cancelAdminPlaceInformationReverificationRequest,
  completeAdminPlaceInformationReverificationRequest,
  createAdminPlaceInformationEvidence,
  createAdminPlaceInformationReverificationRequest,
  getAdminPlaceInformationEvidence,
  getAdminPlaceInformationReverificationRequests,
  remindAdminPlaceInformationReverificationRequest,
  reviewAdminPlaceInformationEvidence,
} from '../api/adminPlaceVerificationApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceVerificationErrorResponse,
  PlaceInformationEvidence,
  PlaceInformationEvidenceCreateRequest,
  PlaceInformationEvidenceReviewRequest,
  PlaceInformationReverificationCreateRequest,
  PlaceInformationReverificationRequest,
} from '../types/adminPlaceVerification.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

export type PlaceVerificationAction =
  | 'create-evidence'
  | 'review-evidence'
  | 'create-reverification'
  | 'cancel-reverification'
  | 'complete-reverification'
  | 'remind-reverification'

const REVERIFICATION_PAGE_LIMIT = 10

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '장소 또는 검증 정보를 찾을 수 없습니다.',
  conflict: '현재 상태에서는 요청을 처리할 수 없습니다. 새로고침 후 확인해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<AdminPlaceVerificationErrorResponse>(error)) return fallbackMessage
  return getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPlaceVerificationErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

export function useAdminPlaceVerification() {
  const { clearAuth } = useAuth()
  const [placeId, setPlaceId] = useState<number | null>(null)
  const [evidences, setEvidences] = useState<PlaceInformationEvidence[]>([])
  const [reverificationRequests, setReverificationRequests] =
    useState<PlaceInformationReverificationRequest[]>([])
  const [reverificationTotalCount, setReverificationTotalCount] = useState(0)
  const [reverificationPage, setReverificationPage] = useState(1)
  const [reverificationTotalPages, setReverificationTotalPages] = useState(0)
  const [reverificationHasNext, setReverificationHasNext] = useState(false)
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false)
  const [isReverificationLoading, setIsReverificationLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<PlaceVerificationAction | null>(null)
  const [evidenceErrorMessage, setEvidenceErrorMessage] = useState('')
  const [reverificationErrorMessage, setReverificationErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  useAutoDismissMessage(actionSuccessMessage, setActionSuccessMessage)
  const latestEvidenceRequestIdRef = useRef(0)
  const latestReverificationRequestIdRef = useRef(0)
  const activeActionRef = useRef<PlaceVerificationAction | null>(null)

  const fetchEvidence = useCallback(
    async (nextPlaceId: number) => {
      const requestId = latestEvidenceRequestIdRef.current + 1
      latestEvidenceRequestIdRef.current = requestId
      setPlaceId(nextPlaceId)
      setIsEvidenceLoading(true)
      setEvidenceErrorMessage('')
      try {
        const data = await getAdminPlaceInformationEvidence(nextPlaceId)
        if (requestId === latestEvidenceRequestIdRef.current) setEvidences(data.evidences)
        return true
      } catch (error) {
        if (requestId === latestEvidenceRequestIdRef.current) {
          setEvidences([])
          setEvidenceErrorMessage(getErrorMessage(error, '장소 정보 증빙을 불러오지 못했습니다.'))
          if (shouldClearAuth(error)) clearAuth()
        }
        logDebugError('관리자 장소 정보 증빙 조회 실패', error)
        return false
      } finally {
        if (requestId === latestEvidenceRequestIdRef.current) setIsEvidenceLoading(false)
      }
    },
    [clearAuth]
  )

  const fetchReverificationRequests = useCallback(
    async (nextPlaceId: number, nextPage = 1) => {
      const requestId = latestReverificationRequestIdRef.current + 1
      latestReverificationRequestIdRef.current = requestId
      setPlaceId(nextPlaceId)
      setIsReverificationLoading(true)
      setReverificationErrorMessage('')
      try {
        const data = await getAdminPlaceInformationReverificationRequests(nextPlaceId, {
          page: nextPage,
          limit: REVERIFICATION_PAGE_LIMIT,
        })
        if (requestId === latestReverificationRequestIdRef.current) {
          setReverificationRequests(data.requests)
          setReverificationTotalCount(data.totalCount)
          setReverificationPage(data.page)
          setReverificationTotalPages(data.totalPages)
          setReverificationHasNext(data.hasNext)
        }
        return true
      } catch (error) {
        if (requestId === latestReverificationRequestIdRef.current) {
          setReverificationRequests([])
          setReverificationTotalCount(0)
          setReverificationPage(1)
          setReverificationTotalPages(0)
          setReverificationHasNext(false)
          setReverificationErrorMessage(
            getErrorMessage(error, '장소 정보 재확인 요청을 불러오지 못했습니다.')
          )
          if (shouldClearAuth(error)) clearAuth()
        }
        logDebugError('관리자 장소 정보 재확인 목록 조회 실패', error)
        return false
      } finally {
        if (requestId === latestReverificationRequestIdRef.current) {
          setIsReverificationLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const runAction = useCallback(
    async <T,>(
      action: PlaceVerificationAction,
      request: () => Promise<T>,
      refresh: () => Promise<boolean>,
      successMessage: string,
      fallbackMessage: string,
      debugLabel: string
    ) => {
      if (activeActionRef.current) return null
      activeActionRef.current = action
      setActiveAction(action)
      setActionErrorMessage('')
      setActionSuccessMessage('')
      try {
        const data = await request()
        setActionSuccessMessage(successMessage)
        await refresh()
        return data
      } catch (error) {
        setActionErrorMessage(getErrorMessage(error, fallbackMessage))
        if (shouldClearAuth(error)) clearAuth()
        logDebugError(debugLabel, error)
        return null
      } finally {
        activeActionRef.current = null
        setActiveAction(null)
      }
    },
    [clearAuth]
  )

  const createEvidence = useCallback(
    (targetPlaceId: number, request: PlaceInformationEvidenceCreateRequest) =>
      runAction(
        'create-evidence',
        () => createAdminPlaceInformationEvidence(targetPlaceId, request),
        () => fetchEvidence(targetPlaceId),
        '장소 정보 증빙을 등록했습니다.',
        '장소 정보 증빙을 등록하지 못했습니다.',
        '관리자 장소 정보 증빙 등록 실패'
      ),
    [fetchEvidence, runAction]
  )

  const reviewEvidence = useCallback(
    (targetPlaceId: number, evidenceId: number, request: PlaceInformationEvidenceReviewRequest) =>
      runAction(
        'review-evidence',
        () => reviewAdminPlaceInformationEvidence(targetPlaceId, evidenceId, request),
        () => fetchEvidence(targetPlaceId),
        '증빙 검토 결과를 저장했습니다.',
        '증빙 검토 결과를 저장하지 못했습니다.',
        '관리자 장소 정보 증빙 검토 실패'
      ),
    [fetchEvidence, runAction]
  )

  const createReverification = useCallback(
    (targetPlaceId: number, request: PlaceInformationReverificationCreateRequest) =>
      runAction(
        'create-reverification',
        () => createAdminPlaceInformationReverificationRequest(targetPlaceId, request),
        () => fetchReverificationRequests(targetPlaceId),
        '장소 정보 재확인을 요청했습니다.',
        '장소 정보 재확인을 요청하지 못했습니다.',
        '관리자 장소 정보 재확인 생성 실패'
      ),
    [fetchReverificationRequests, runAction]
  )

  const runReverificationAction = useCallback(
    (
      action: Extract<
        PlaceVerificationAction,
        'cancel-reverification' | 'complete-reverification' | 'remind-reverification'
      >,
      targetPlaceId: number,
      requestId: number
    ) => {
      const requests = {
        'cancel-reverification': cancelAdminPlaceInformationReverificationRequest,
        'complete-reverification': completeAdminPlaceInformationReverificationRequest,
        'remind-reverification': remindAdminPlaceInformationReverificationRequest,
      }
      const messages = {
        'cancel-reverification': '재확인 요청을 취소했습니다.',
        'complete-reverification': '재확인 요청을 완료 처리했습니다.',
        'remind-reverification': '재확인 알림을 다시 보냈습니다.',
      }
      return runAction(
        action,
        () => requests[action](targetPlaceId, requestId),
        () => fetchReverificationRequests(targetPlaceId),
        messages[action],
        '재확인 요청을 처리하지 못했습니다.',
        `관리자 장소 정보 재확인 ${action} 실패`
      )
    },
    [fetchReverificationRequests, runAction]
  )

  const clearActionMessages = useCallback(() => {
    setActionErrorMessage('')
    setActionSuccessMessage('')
  }, [])

  return {
    placeId,
    evidences,
    reverificationRequests,
    reverificationTotalCount,
    reverificationPage,
    reverificationTotalPages,
    reverificationHasNext,
    isEvidenceLoading,
    isReverificationLoading,
    activeAction,
    evidenceErrorMessage,
    reverificationErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchEvidence,
    fetchReverificationRequests,
    createEvidence,
    reviewEvidence,
    createReverification,
    runReverificationAction,
    clearActionMessages,
  }
}
