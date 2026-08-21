import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMerchantPlaceReverificationRequests,
  respondMerchantPlaceReverificationRequest,
} from '../api/merchantStoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  MerchantPlaceReverificationRequest,
  MerchantPlaceReverificationPageResponse,
  MerchantStoreErrorResponse,
} from '../types/merchantStore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type LoadStatus = 'loading' | 'ready' | 'error'

const PAGE_LIMIT = 20

function replaceRequest(
  requests: MerchantPlaceReverificationRequest[],
  next: MerchantPlaceReverificationRequest,
) {
  return requests.map((request) => (request.requestId === next.requestId ? next : request))
}

export function useMerchantPlaceReverification() {
  const { clearAuth } = useAuth()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [requests, setRequests] = useState<MerchantPlaceReverificationRequest[]>([])
  const [pageInfo, setPageInfo] = useState<Omit<MerchantPlaceReverificationPageResponse, 'requests'>>({
    page: 1,
    limit: PAGE_LIMIT,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sectionErrorMessage, setSectionErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null)
  const mountedRef = useRef(true)
  const requestRef = useRef(0)
  const actionRef = useRef<number | null>(null)

  const getErrorMessage = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<MerchantStoreErrorResponse>(error)) return fallbackMessage
    if (error.category === 'unauthorized') clearAuth()

    return getAuthErrorMessage(error, {
      fallbackMessage,
      codeMessages: {
        ACCESS_DENIED: '상점주 권한이 필요합니다.',
        PLACE_INFORMATION_REVERIFICATION_REQUEST_NOT_FOUND: '재확인 요청을 찾을 수 없습니다.',
        INVALID_PLACE_INFORMATION_REVERIFICATION_STATUS: '현재 상태에서는 응답을 제출할 수 없습니다.',
      },
    })
  }, [clearAuth])

  const fetchRequests = useCallback(async (page = 1, initial = false) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    if (initial) setStatus('loading')
    setIsLoading(true)
    setErrorMessage('')
    setSectionErrorMessage('')

    try {
      const data = await getMerchantPlaceReverificationRequests(page, PAGE_LIMIT)
      if (!mountedRef.current || requestId !== requestRef.current) return
      setRequests(data.requests)
      setPageInfo({
        page: data.page,
        limit: data.limit,
        totalCount: data.totalCount,
        totalPages: data.totalPages,
        hasNext: data.hasNext,
      })
      setStatus('ready')
    } catch (error) {
      if (!mountedRef.current || requestId !== requestRef.current) return
      const nextMessage = getErrorMessage(error, '장소 정보 재확인 요청을 불러오지 못했습니다.')
      if (initial) {
        setStatus('error')
        setErrorMessage(nextMessage)
      } else {
        setSectionErrorMessage(nextMessage)
      }
      logDebugError('상점주 장소 정보 재확인 요청 조회 실패', error)
    } finally {
      if (mountedRef.current && requestId === requestRef.current) setIsLoading(false)
    }
  }, [getErrorMessage])

  useEffect(() => {
    mountedRef.current = true
    void fetchRequests(1, true)
    return () => { mountedRef.current = false }
  }, [fetchRequests])

  const submitResponse = useCallback(async (request: MerchantPlaceReverificationRequest, responseNote: string) => {
    if (request.status !== 'REQUESTED' || !responseNote.trim() || actionRef.current !== null) return null
    actionRef.current = request.requestId
    setRespondingRequestId(request.requestId)
    setActionErrorMessage('')
    setSuccessMessage('')

    try {
      const next = await respondMerchantPlaceReverificationRequest(request.requestId, { responseNote: responseNote.trim() })
      if (!mountedRef.current) return null
      setRequests((items) => replaceRequest(items, next))
      if (next.status !== 'RESPONDED') {
        setActionErrorMessage(
          next.status === 'EXPIRED'
            ? '응답 기한이 지나 재확인 요청이 만료되었습니다.'
            : '현재 상태에서는 응답을 제출할 수 없습니다.',
        )
        return null
      }
      setSuccessMessage('재확인 응답을 제출했습니다.')
      return next
    } catch (error) {
      if (mountedRef.current) {
        setActionErrorMessage(getErrorMessage(error, '재확인 응답을 제출하지 못했습니다.'))
        logDebugError('상점주 장소 정보 재확인 응답 제출 실패', error)
      }
      return null
    } finally {
      actionRef.current = null
      if (mountedRef.current) setRespondingRequestId(null)
    }
  }, [getErrorMessage])

  return {
    status,
    requests,
    pageInfo,
    isLoading,
    errorMessage,
    sectionErrorMessage,
    actionErrorMessage,
    successMessage,
    respondingRequestId,
    fetchRequests,
    submitResponse,
  }
}
