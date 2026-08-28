import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/adminPlaceEventApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceEventActionRequest,
  AdminPlaceEventErrorResponse,
  AdminPlaceEventListItem,
  AdminPlaceEventListParams,
  AdminPlaceEventRequest,
  AdminPlaceEventResponse,
} from '../types/adminPlaceEvent.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const DEFAULT_QUERY: Required<Pick<AdminPlaceEventListParams, 'page' | 'limit'>> = {
  page: 1,
  limit: 10,
}

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '기간형 이벤트 또는 연결된 장소를 찾을 수 없습니다.',
  conflict: '현재 이벤트 상태에서는 요청한 작업을 처리할 수 없습니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

export type AdminPlaceEventAction = 'create' | 'update' | 'publish' | 'cancel' | null

export function useAdminPlaceEvents() {
  const { clearAuth } = useAuth()
  const [events, setEvents] = useState<AdminPlaceEventListItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState<AdminPlaceEventListItem | null>(null)
  const [query, setQuery] = useState<AdminPlaceEventListParams>(DEFAULT_QUERY)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<AdminPlaceEventAction>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const actionRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const listRequestIdRef = useRef(0)
  const detailRequestIdRef = useRef(0)

  const errorText = useCallback(
    (error: unknown, fallback: string) => {
      if (!isApiError<AdminPlaceEventErrorResponse>(error)) {
        return fallback
      }

      if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') {
        clearAuth()
      }

      return getAuthErrorMessage(error, {
        fallbackMessage: fallback,
        categoryMessages: CATEGORY_MESSAGES,
      })
    },
    [clearAuth]
  )

  const fetchEvents = useCallback(
    async (nextQuery: AdminPlaceEventListParams = query) => {
      const requestId = listRequestIdRef.current + 1
      listRequestIdRef.current = requestId
      const normalizedQuery = { ...DEFAULT_QUERY, ...nextQuery }
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await api.getAdminPlaceEvents(normalizedQuery)

        if (requestId === listRequestIdRef.current) {
          setEvents(data.events)
          setQuery(normalizedQuery)
          setPage(data.page)
          setTotalCount(data.totalCount)
          setTotalPages(data.totalPages)
          setHasNext(data.hasNext)
        }

        return true
      } catch (error) {
        if (requestId === listRequestIdRef.current) {
          setErrorMessage(errorText(error, '기간형 이벤트 목록을 불러오지 못했습니다.'))
        }

        logDebugError('관리자 기간형 이벤트 목록 조회 실패', error)
        return false
      } finally {
        if (requestId === listRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [errorText, query]
  )

  const fetchEvent = useCallback(
    async (eventId: number) => {
      const requestId = detailRequestIdRef.current + 1
      detailRequestIdRef.current = requestId
      setIsDetailLoading(true)
      setDetailErrorMessage('')

      try {
        const data = await api.getAdminPlaceEvent(eventId)

        if (requestId === detailRequestIdRef.current) {
          setSelectedEvent(data)
        }

        return data
      } catch (error) {
        if (requestId === detailRequestIdRef.current) {
          setDetailErrorMessage(errorText(error, '기간형 이벤트 상세를 불러오지 못했습니다.'))
          setSelectedEvent(null)
        }

        logDebugError('관리자 기간형 이벤트 상세 조회 실패', error)
        return null
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [errorText]
  )

  const runAction = useCallback(
    async (
      action: Exclude<AdminPlaceEventAction, null>,
      request: () => Promise<AdminPlaceEventResponse>,
      successText: string
    ) => {
      if (actionRef.current) {
        return null
      }

      actionRef.current = true
      setActiveAction(action)
      setActionErrorMessage('')
      setSuccessMessage('')

      try {
        const data = await request()
        setSuccessMessage(data.message || successText)
        await fetchEvents(query)
        await fetchEvent(data.eventId)
        return data
      } catch (error) {
        setActionErrorMessage(errorText(error, successText.replace('했습니다.', '하지 못했습니다.')))
        logDebugError(`관리자 기간형 이벤트 ${action} 실패`, error)
        return null
      } finally {
        actionRef.current = false
        setActiveAction(null)
      }
    },
    [errorText, fetchEvent, fetchEvents, query]
  )

  const createEvent = useCallback(
    (request: AdminPlaceEventRequest) =>
      runAction('create', () => api.createAdminPlaceEvent(request), '기간형 이벤트 초안을 등록했습니다.'),
    [runAction]
  )

  const updateEvent = useCallback(
    (eventId: number, request: AdminPlaceEventRequest) =>
      runAction('update', () => api.updateAdminPlaceEvent(eventId, request), '기간형 이벤트를 수정했습니다.'),
    [runAction]
  )

  const publishEvent = useCallback(
    (eventId: number, request: AdminPlaceEventActionRequest) =>
      runAction('publish', () => api.publishAdminPlaceEvent(eventId, request), '기간형 이벤트를 공개했습니다.'),
    [runAction]
  )

  const cancelEvent = useCallback(
    (eventId: number, request: AdminPlaceEventActionRequest) =>
      runAction('cancel', () => api.cancelAdminPlaceEvent(eventId, request), '기간형 이벤트를 취소했습니다.'),
    [runAction]
  )

  useEffect(() => {
    if (hasLoadedRef.current) {
      return
    }

    hasLoadedRef.current = true
    void fetchEvents(DEFAULT_QUERY)
  }, [fetchEvents])

  return {
    events,
    selectedEvent,
    query,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    successMessage,
    fetchEvents,
    fetchEvent,
    createEvent,
    updateEvent,
    publishEvent,
    cancelEvent,
  }
}
