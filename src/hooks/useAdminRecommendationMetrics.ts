import { useCallback, useEffect, useRef, useState } from 'react'
import {
  compareAdminRecommendationMetrics,
  getAdminRecommendationExplanation,
  getAdminRecommendationMetrics,
} from '../api/adminRecommendationMetricApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminRecommendationExplanationResponse,
  AdminRecommendationMetricErrorResponse,
  AdminRecommendationMetricItem,
  AdminRecommendationMetricsCompareResponse,
  RecommendationMetricSortBy,
} from '../types/adminRecommendationMetric.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const LIMIT = 20
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '추천 성과 또는 설명 로그를 찾을 수 없습니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isApiError<AdminRecommendationMetricErrorResponse>(error)) return fallbackMessage
  return getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
}

function shouldClearAuth(error: unknown) {
  return isApiError<AdminRecommendationMetricErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
}

export interface RecommendationMetricQuery {
  page: number
  sortBy: RecommendationMetricSortBy
  keyword: string
  recommendationVersion: string
  days?: number
}

const INITIAL_QUERY: RecommendationMetricQuery = {
  page: 1,
  sortBy: 'SMOOTHED_CTR',
  keyword: '',
  recommendationVersion: '',
}

export function useAdminRecommendationMetrics() {
  const { clearAuth } = useAuth()
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [metrics, setMetrics] = useState<AdminRecommendationMetricItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [comparison, setComparison] = useState<AdminRecommendationMetricsCompareResponse | null>(null)
  const [explanation, setExplanation] = useState<AdminRecommendationExplanationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isComparisonLoading, setIsComparisonLoading] = useState(false)
  const [isExplanationLoading, setIsExplanationLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [comparisonErrorMessage, setComparisonErrorMessage] = useState('')
  const [explanationErrorMessage, setExplanationErrorMessage] = useState('')
  const latestListRef = useRef(0)
  const latestCompareRef = useRef(0)
  const latestExplanationRef = useRef(0)
  const queryRef = useRef(INITIAL_QUERY)

  const fetchMetrics = useCallback(async (nextQuery: RecommendationMetricQuery = queryRef.current) => {
    const requestId = latestListRef.current + 1
    latestListRef.current = requestId
    queryRef.current = nextQuery
    setQuery(nextQuery)
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAdminRecommendationMetrics({
        ...nextQuery,
        limit: LIMIT,
        keyword: nextQuery.keyword || undefined,
        recommendationVersion: nextQuery.recommendationVersion || undefined,
      })
      if (requestId === latestListRef.current) {
        setMetrics(data.metrics)
        setQuery((current) => ({ ...current, page: data.page, sortBy: data.sortBy }))
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
      }
      return true
    } catch (error) {
      if (requestId === latestListRef.current) {
        setMetrics([])
        setTotalCount(0)
        setTotalPages(0)
        setHasNext(false)
        setErrorMessage(getErrorMessage(error, '추천 성과를 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 추천 성과 조회 실패', error)
      return false
    } finally {
      if (requestId === latestListRef.current) setIsLoading(false)
    }
  }, [clearAuth])

  const compareMetrics = useCallback(async (params: {
    baselineVersion: string
    targetVersion: string
    keyword?: string
    days?: number
  }) => {
    const requestId = latestCompareRef.current + 1
    latestCompareRef.current = requestId
    setIsComparisonLoading(true)
    setComparisonErrorMessage('')
    try {
      const data = await compareAdminRecommendationMetrics(params)
      if (requestId === latestCompareRef.current) setComparison(data)
      return data
    } catch (error) {
      if (requestId === latestCompareRef.current) {
        setComparison(null)
        setComparisonErrorMessage(getErrorMessage(error, '추천 버전 성과를 비교하지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 추천 성과 버전 비교 실패', error)
      return null
    } finally {
      if (requestId === latestCompareRef.current) setIsComparisonLoading(false)
    }
  }, [clearAuth])

  const fetchExplanation = useCallback(async (requestIdValue: string) => {
    const requestId = latestExplanationRef.current + 1
    latestExplanationRef.current = requestId
    setIsExplanationLoading(true)
    setExplanationErrorMessage('')
    try {
      const data = await getAdminRecommendationExplanation(requestIdValue)
      if (requestId === latestExplanationRef.current) setExplanation(data)
      return data
    } catch (error) {
      if (requestId === latestExplanationRef.current) {
        setExplanation(null)
        setExplanationErrorMessage(getErrorMessage(error, '추천 설명 로그를 불러오지 못했습니다.'))
        if (shouldClearAuth(error)) clearAuth()
      }
      logDebugError('관리자 추천 설명 조회 실패', error)
      return null
    } finally {
      if (requestId === latestExplanationRef.current) setIsExplanationLoading(false)
    }
  }, [clearAuth])

  useEffect(() => { void fetchMetrics(INITIAL_QUERY) }, [fetchMetrics])

  return {
    query, metrics, totalCount, totalPages, hasNext,
    comparison, explanation,
    isLoading, isComparisonLoading, isExplanationLoading,
    errorMessage, comparisonErrorMessage, explanationErrorMessage,
    fetchMetrics, compareMetrics, fetchExplanation,
  }
}
