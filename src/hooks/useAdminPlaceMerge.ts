import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminPlaceDuplicateDetail,
  getAdminPlaceDuplicateGroups,
  getAdminPlaceMergeHistories,
  mergeAdminPlaces,
  restoreAdminPlaceMerge,
} from '../api/adminPlaceMergeApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceMergeErrorResponse,
  AdminPlaceDuplicateDetailResponse,
  AdminPlaceDuplicateGroupItem,
  AdminPlaceMergeHistoryItem,
  AdminPlaceMergeRequest,
  AdminPlaceMergeResponse,
  AdminPlaceRestoreResponse,
} from '../types/adminPlaceMerge.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const ADMIN_PLACE_MERGE_ERROR_MESSAGE =
  '중복 장소 정보를 불러오는 중 오류가 발생했습니다.'
const ADMIN_PLACE_MERGE_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const ADMIN_PLACE_MERGE_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  ACCESS_DENIED: '관리자 권한이 필요합니다.',
  PLACE_NOT_FOUND: '장소를 찾을 수 없습니다.',
  PLACE_DUPLICATE_NOT_FOUND: '중복 장소 정보를 찾을 수 없습니다.',
  PLACE_MERGE_INVALID_REQUEST: '장소 병합 요청이 올바르지 않습니다.',
  PLACE_EVENT_CONNECTED:
    '연결된 기간형 이벤트가 있어 장소를 삭제하거나 병합할 수 없습니다.',
  PLACE_MERGE_NOT_ALLOWED:
    '중복 장소로 확인되지 않아 병합할 수 없습니다. 목록을 새로고침해주세요.',
  PLACE_MERGE_HISTORY_NOT_FOUND: '병합 이력을 찾을 수 없습니다.',
  PLACE_MERGE_ALREADY_RESTORED: '이미 복구된 병합 이력입니다.',
  PLACE_MERGE_RESTORE_NOT_ALLOWED:
    '현재 장소 상태로는 병합 복구를 진행할 수 없습니다.',
}

function getAdminPlaceMergeErrorMessage(error: unknown) {
  if (!isApiError<AdminPlaceMergeErrorResponse>(error)) {
    return ADMIN_PLACE_MERGE_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_PLACE_MERGE_ERROR_MESSAGE,
    codeMessages: ADMIN_PLACE_MERGE_CODE_MESSAGES,
    categoryMessages: ADMIN_PLACE_MERGE_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPlaceMergeErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

export type AdminPlaceMergeAction = 'merge' | 'restore' | null

export function useAdminPlaceMerge() {
  const { clearAuth } = useAuth()
  const [duplicateGroups, setDuplicateGroups] = useState<AdminPlaceDuplicateGroupItem[]>([])
  const [duplicateTotalCount, setDuplicateTotalCount] = useState(0)
  const [duplicateDetail, setDuplicateDetail] =
    useState<AdminPlaceDuplicateDetailResponse | null>(null)
  const [mergeHistories, setMergeHistories] = useState<AdminPlaceMergeHistoryItem[]>([])
  const [isGroupsLoading, setIsGroupsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isHistoriesLoading, setIsHistoriesLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<AdminPlaceMergeAction>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [historyErrorMessage, setHistoryErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  const latestGroupsRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const latestHistoriesRequestIdRef = useRef(0)
  const activeActionRef = useRef<AdminPlaceMergeAction>(null)

  const fetchDuplicateGroups = useCallback(async () => {
    const requestId = latestGroupsRequestIdRef.current + 1
    latestGroupsRequestIdRef.current = requestId
    setIsGroupsLoading(true)
    setErrorMessage('')

    try {
      const data = await getAdminPlaceDuplicateGroups()

      if (requestId === latestGroupsRequestIdRef.current) {
        setDuplicateGroups(data.groups)
        setDuplicateTotalCount(data.totalCount)
      }

      return true
    } catch (error) {
      if (requestId === latestGroupsRequestIdRef.current) {
        setDuplicateGroups([])
        setDuplicateTotalCount(0)
        setErrorMessage(getAdminPlaceMergeErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      logDebugError('관리자 중복 장소 목록 조회 실패', error)

      return false
    } finally {
      if (requestId === latestGroupsRequestIdRef.current) {
        setIsGroupsLoading(false)
      }
    }
  }, [clearAuth])

  const fetchDuplicateDetail = useCallback(
    async (placeId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId
      setIsDetailLoading(true)
      setDuplicateDetail(null)
      setDetailErrorMessage('')
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await getAdminPlaceDuplicateDetail(placeId)

        if (requestId === latestDetailRequestIdRef.current) {
          setDuplicateDetail(data)
        }

        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setDuplicateDetail(null)
          setDetailErrorMessage(getAdminPlaceMergeErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        logDebugError('관리자 중복 장소 상세 조회 실패', error)

        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const fetchMergeHistories = useCallback(async () => {
    const requestId = latestHistoriesRequestIdRef.current + 1
    latestHistoriesRequestIdRef.current = requestId
    setIsHistoriesLoading(true)
    setHistoryErrorMessage('')

    try {
      const data = await getAdminPlaceMergeHistories()

      if (requestId === latestHistoriesRequestIdRef.current) {
        setMergeHistories(data.histories)
      }

      return true
    } catch (error) {
      if (requestId === latestHistoriesRequestIdRef.current) {
        setMergeHistories([])
        setHistoryErrorMessage(getAdminPlaceMergeErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      logDebugError('관리자 장소 병합 이력 조회 실패', error)

      return false
    } finally {
      if (requestId === latestHistoriesRequestIdRef.current) {
        setIsHistoriesLoading(false)
      }
    }
  }, [clearAuth])

  const mergePlaces = useCallback(
    async (request: AdminPlaceMergeRequest) => {
      if (activeActionRef.current !== null) {
        return null
      }

      activeActionRef.current = 'merge'
      setActiveAction('merge')
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await mergeAdminPlaces(request)
        const [groupsRefreshed, historiesRefreshed] = await Promise.all([
          fetchDuplicateGroups(),
          fetchMergeHistories(),
        ])

        if (!groupsRefreshed || !historiesRefreshed) {
          setActionErrorMessage(
            '장소 병합은 완료됐지만 중복 목록 또는 병합 이력을 다시 불러오지 못했습니다.'
          )
        }

        setActionSuccessMessage(data.message || '장소를 병합했습니다.')

        return data
      } catch (error) {
        setActionErrorMessage(getAdminPlaceMergeErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 병합 실패', error)

        return null
      } finally {
        activeActionRef.current = null
        setActiveAction(null)
      }
    },
    [clearAuth, fetchDuplicateGroups, fetchMergeHistories]
  )

  const restoreMerge = useCallback(
    async (historyId: number) => {
      if (activeActionRef.current !== null) {
        return null
      }

      activeActionRef.current = 'restore'
      setActiveAction('restore')
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await restoreAdminPlaceMerge(historyId)
        const [groupsRefreshed, historiesRefreshed] = await Promise.all([
          fetchDuplicateGroups(),
          fetchMergeHistories(),
        ])

        if (!groupsRefreshed || !historiesRefreshed) {
          setActionErrorMessage(
            '병합 복구는 완료됐지만 중복 목록 또는 병합 이력을 다시 불러오지 못했습니다.'
          )
        }

        setActionSuccessMessage(data.message || '장소 병합을 복구했습니다.')

        return data
      } catch (error) {
        setActionErrorMessage(getAdminPlaceMergeErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 장소 병합 복구 실패', error)

        return null
      } finally {
        activeActionRef.current = null
        setActiveAction(null)
      }
    },
    [clearAuth, fetchDuplicateGroups, fetchMergeHistories]
  )

  const clearDuplicateDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setDuplicateDetail(null)
    setDetailErrorMessage('')
  }, [])

  useEffect(() => {
    void Promise.all([fetchDuplicateGroups(), fetchMergeHistories()])
  }, [fetchDuplicateGroups, fetchMergeHistories])

  return {
    duplicateGroups,
    duplicateTotalCount,
    duplicateDetail,
    mergeHistories,
    isGroupsLoading,
    isDetailLoading,
    isHistoriesLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    historyErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchDuplicateGroups,
    fetchDuplicateDetail,
    clearDuplicateDetail,
    fetchMergeHistories,
    mergePlaces,
    restoreMerge,
  }
}

export type {
  AdminPlaceMergeRequest,
  AdminPlaceMergeResponse,
  AdminPlaceRestoreResponse,
}
