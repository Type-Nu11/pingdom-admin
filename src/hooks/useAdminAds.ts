import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/adminAdApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminAdCreateRequest,
  AdminAdErrorResponse,
  AdminAdListItem,
  AdminAdListParams,
} from '../types/adminAd.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const DEFAULT_QUERY: Required<Pick<AdminAdListParams, 'page' | 'limit'>> = {
  page: 1,
  limit: 10,
}

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '광고를 찾을 수 없습니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

export type AdminAdAction = 'create' | 'delete' | null

export function useAdminAds() {
  const { clearAuth } = useAuth()
  const [ads, setAds] = useState<AdminAdListItem[]>([])
  const [selectedAd, setSelectedAd] = useState<AdminAdListItem | null>(null)
  const [query, setQuery] = useState<AdminAdListParams>(DEFAULT_QUERY)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<AdminAdAction>(null)
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
      if (!isApiError<AdminAdErrorResponse>(error)) {
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

  const fetchAds = useCallback(
    async (nextQuery: AdminAdListParams = query) => {
      const requestId = listRequestIdRef.current + 1
      listRequestIdRef.current = requestId
      const normalizedQuery = { ...DEFAULT_QUERY, ...nextQuery }
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await api.getAdminAds(normalizedQuery)

        if (requestId === listRequestIdRef.current) {
          setAds(data.ads)
          setQuery(normalizedQuery)
          setPage(data.page)
          setTotalCount(data.totalCount)
          setTotalPages(data.totalPages)
          setHasNext(data.hasNext)
        }

        return true
      } catch (error) {
        if (requestId === listRequestIdRef.current) {
          setErrorMessage(errorText(error, '광고 목록을 불러오지 못했습니다.'))
        }

        logDebugError('관리자 광고 목록 조회 실패', error)
        return false
      } finally {
        if (requestId === listRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [errorText, query]
  )

  const fetchAd = useCallback(
    async (adId: number) => {
      const requestId = detailRequestIdRef.current + 1
      detailRequestIdRef.current = requestId
      setIsDetailLoading(true)
      setDetailErrorMessage('')

      try {
        const data = await api.getAdminAd(adId)

        if (requestId === detailRequestIdRef.current) {
          setSelectedAd(data)
        }

        return data
      } catch (error) {
        if (requestId === detailRequestIdRef.current) {
          setSelectedAd(null)
          setDetailErrorMessage(errorText(error, '광고 상세를 불러오지 못했습니다.'))
        }

        logDebugError('관리자 광고 상세 조회 실패', error)
        return null
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [errorText]
  )

  const createAd = useCallback(
    async (request: AdminAdCreateRequest) => {
      if (actionRef.current) {
        return null
      }

      actionRef.current = true
      setActiveAction('create')
      setActionErrorMessage('')
      setSuccessMessage('')

      try {
        const data = await api.createAdminAd(request)
        setSuccessMessage(data.message || '광고를 등록했습니다.')
        await fetchAds({ ...query, page: 1 })
        await fetchAd(data.adId)
        return data
      } catch (error) {
        setActionErrorMessage(errorText(error, '광고를 등록하지 못했습니다.'))
        logDebugError('관리자 광고 등록 실패', error)
        return null
      } finally {
        actionRef.current = false
        setActiveAction(null)
      }
    },
    [errorText, fetchAd, fetchAds, query]
  )

  const deleteAd = useCallback(
    async (adId: number) => {
      if (actionRef.current) {
        return false
      }

      actionRef.current = true
      setActiveAction('delete')
      setActionErrorMessage('')
      setSuccessMessage('')

      try {
        await api.deleteAdminAd(adId)
        const nextPage = ads.length === 1 && page > 1 ? page - 1 : page
        setSelectedAd(null)
        setSuccessMessage('광고를 삭제했습니다.')
        await fetchAds({ ...query, page: nextPage })
        return true
      } catch (error) {
        setActionErrorMessage(errorText(error, '광고를 삭제하지 못했습니다.'))
        logDebugError('관리자 광고 삭제 실패', error)
        return false
      } finally {
        actionRef.current = false
        setActiveAction(null)
      }
    },
    [ads.length, errorText, fetchAds, page, query]
  )

  useEffect(() => {
    if (hasLoadedRef.current) {
      return
    }

    hasLoadedRef.current = true
    void fetchAds(DEFAULT_QUERY)
  }, [fetchAds])

  return {
    ads,
    selectedAd,
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
    clearSelectedAd: () => {
      setSelectedAd(null)
      setDetailErrorMessage('')
    },
    fetchAds,
    fetchAd,
    createAd,
    deleteAd,
  }
}
