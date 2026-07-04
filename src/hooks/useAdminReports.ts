import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminReportedUser,
  getAdminReportedUsers,
} from '../api/adminReportApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { useAuth } from './useAuth'
import type {
  AdminReportedUserDetailErrorResponse,
  AdminReportedUserItem,
  AdminReportedUserListErrorResponse,
  AdminReportedUserListRequest,
} from '../types/adminReport.types'

const DEFAULT_ADMIN_REPORTED_USER_PAGE = 1
const DEFAULT_ADMIN_REPORTED_USER_LIMIT = 20
const ADMIN_REPORT_ERROR_MESSAGE = '신고 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_REPORT_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  conflict: '이미 처리되었거나 중복된 신고입니다.',
}
const ADMIN_REPORT_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  ACCESS_DENIED: '관리자 권한이 필요합니다.',
  REPORT_NOT_FOUND: '이미 처리되었거나 존재하지 않는 신고입니다.',
}

type AdminReportApiErrorResponse =
  | AdminReportedUserListErrorResponse
  | AdminReportedUserDetailErrorResponse

function getAdminReportErrorMessage(error: unknown) {
  if (!isApiError<AdminReportApiErrorResponse>(error)) {
    return ADMIN_REPORT_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_REPORT_ERROR_MESSAGE,
    codeMessages: ADMIN_REPORT_CODE_MESSAGES,
    categoryMessages: ADMIN_REPORT_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminReportApiErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

interface UseAdminReportsOptions {
  initialPage?: number
  limit?: number
}

export function useAdminReports({
  initialPage = DEFAULT_ADMIN_REPORTED_USER_PAGE,
  limit = DEFAULT_ADMIN_REPORTED_USER_LIMIT,
}: UseAdminReportsOptions = {}) {
  const { clearAuth } = useAuth()
  const [reportedUsers, setReportedUsers] = useState<AdminReportedUserItem[]>([])
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reportedUserDetail, setReportedUserDetail] =
    useState<AdminReportedUserItem | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const latestRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const latestListRequestRef = useRef<Required<AdminReportedUserListRequest>>({
    page: initialPage,
    limit,
    keyword: '',
  })

  const fetchAdminReportedUsers = useCallback(
    async (request: AdminReportedUserListRequest = {}) => {
      const requestId = latestRequestIdRef.current + 1
      latestRequestIdRef.current = requestId

      setIsError(false)
      setErrorMessage('')

      const nextRequest = {
        page: request.page ?? latestListRequestRef.current.page,
        limit: request.limit ?? latestListRequestRef.current.limit,
        keyword: request.keyword ?? latestListRequestRef.current.keyword,
      }

      try {
        setIsLoading(true)

        const data = await getAdminReportedUsers(nextRequest)

        if (requestId === latestRequestIdRef.current) {
          setReportedUsers(data.users)
          setPage(data.page)
          setTotalCount(data.totalCount)
          setTotalPages(data.totalPages)
          setHasNext(data.hasNext)
          latestListRequestRef.current = {
            page: data.page,
            limit: data.limit,
            keyword: nextRequest.keyword,
          }
        }

        return true
      } catch (error) {
        if (requestId === latestRequestIdRef.current) {
          setReportedUsers([])
          setIsError(true)
          setErrorMessage(getAdminReportErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        console.error('관리자 신고 목록 조회 실패', error)

        return false
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const clearReportedUserDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setReportedUserDetail(null)
    setIsDetailLoading(false)
    setDetailErrorMessage('')
  }, [])

  const fetchAdminReportedUserDetail = useCallback(
    async (reportId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId

      setIsDetailLoading(true)
      setReportedUserDetail(null)
      setDetailErrorMessage('')

      try {
        const data = await getAdminReportedUser(reportId)

        if (requestId === latestDetailRequestIdRef.current) {
          setReportedUserDetail(data)
        }

        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setReportedUserDetail(null)
          setDetailErrorMessage(getAdminReportErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        console.error('관리자 신고 상세 조회 실패', error)

        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  useEffect(() => {
    void fetchAdminReportedUsers()
  }, [fetchAdminReportedUsers])

  return {
    reportedUsers,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    reportedUserDetail,
    isDetailLoading,
    detailErrorMessage,
    fetchAdminReportedUsers,
    fetchAdminReportedUserDetail,
    clearReportedUserDetail,
  }
}
