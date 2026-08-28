import { useCallback, useEffect, useRef, useState } from 'react'
import {
  acceptAdminReport,
  declineAdminReport,
  getAdminReportedUser,
  getAdminReportedUsers,
} from '../api/adminReportApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'
import type {
  AdminReportActionErrorResponse,
  AdminReportActionResponse,
  AdminReportActionStatus,
  AdminReportedUserDetailErrorResponse,
  AdminReportedUserItem,
  AdminReportedUserListErrorResponse,
  AdminReportedUserListRequest,
} from '../types/adminReport.types'

const DEFAULT_ADMIN_REPORTED_USER_PAGE = 1
const DEFAULT_ADMIN_REPORTED_USER_LIMIT = 10
const ADMIN_REPORT_ERROR_MESSAGE = '신고 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_REPORT_ACTION_ERROR_MESSAGE = '신고 처리 중 오류가 발생했습니다.'
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
  REPORT_ALREADY_PROCESSED: '이미 처리된 신고입니다.',
}

type AdminReportApiErrorResponse =
  | AdminReportedUserListErrorResponse
  | AdminReportedUserDetailErrorResponse
  | AdminReportActionErrorResponse

function getAdminReportErrorMessage(
  error: unknown,
  fallbackMessage = ADMIN_REPORT_ERROR_MESSAGE
) {
  if (!isApiError<AdminReportApiErrorResponse>(error)) {
    return fallbackMessage
  }

  return getAuthErrorMessage(error, {
    fallbackMessage,
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
  autoFetch?: boolean
  refreshListOnAction?: boolean
}

interface FetchAdminReportedUsersOptions {
  preserveActionMessage?: boolean
}

export function useAdminReports({
  initialPage = DEFAULT_ADMIN_REPORTED_USER_PAGE,
  limit = DEFAULT_ADMIN_REPORTED_USER_LIMIT,
  autoFetch = true,
  refreshListOnAction = true,
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
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  const [actionResult, setActionResult] =
    useState<AdminReportActionResponse | null>(null)
  const [processingReportId, setProcessingReportId] = useState<number | null>(null)
  const latestRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const processingReportIdRef = useRef<number | null>(null)
  const actionSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const latestListRequestRef = useRef<Required<AdminReportedUserListRequest>>({
    page: initialPage,
    limit,
    keyword: '',
  })

  const clearActionSuccessTimeout = useCallback(() => {
    if (!actionSuccessTimeoutRef.current) {
      return
    }

    clearTimeout(actionSuccessTimeoutRef.current)
    actionSuccessTimeoutRef.current = null
  }, [])

  const clearActionSuccessMessage = useCallback(() => {
    clearActionSuccessTimeout()
    setActionSuccessMessage('')
  }, [clearActionSuccessTimeout])

  const showActionSuccessMessage = useCallback(
    (message: string) => {
      clearActionSuccessTimeout()
      setActionSuccessMessage(message)

      actionSuccessTimeoutRef.current = setTimeout(() => {
        actionSuccessTimeoutRef.current = null
        setActionSuccessMessage('')
      }, 5000)
    },
    [clearActionSuccessTimeout]
  )

  const fetchAdminReportedUsers = useCallback(
    async (
      request: AdminReportedUserListRequest = {},
      options: FetchAdminReportedUsersOptions = {}
    ) => {
      const requestId = latestRequestIdRef.current + 1
      latestRequestIdRef.current = requestId

      setIsError(false)
      setErrorMessage('')
      setActionErrorMessage('')

      if (!options.preserveActionMessage) {
        clearActionSuccessMessage()
      }

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

        logDebugError('관리자 신고 목록 조회 실패', error)

        return false
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [clearActionSuccessMessage, clearAuth]
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

        logDebugError('관리자 신고 상세 조회 실패', error)

        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const processAdminReport = useCallback(
    async (reportId: number, status: AdminReportActionStatus) => {
      if (processingReportIdRef.current !== null) {
        return null
      }

      processingReportIdRef.current = reportId
      setProcessingReportId(reportId)
      setActionErrorMessage('')
      setActionResult(null)
      clearActionSuccessMessage()

      const requestReportAction =
        status === 'ACCEPTED' ? acceptAdminReport : declineAdminReport
      const successMessage =
        status === 'ACCEPTED'
          ? `신고 #${reportId}을 수락했습니다.`
          : `신고 #${reportId}을 거절했습니다.`

      try {
        const data = await requestReportAction(reportId)
        setActionResult(data)

        setReportedUserDetail((prevReportedUserDetail) =>
          prevReportedUserDetail?.reportId === reportId ? null : prevReportedUserDetail
        )

        const isRefreshSuccess = refreshListOnAction
          ? await fetchAdminReportedUsers({}, { preserveActionMessage: true })
          : true

        if (!isRefreshSuccess) {
          setActionErrorMessage('신고는 처리됐지만 목록을 다시 불러오지 못했습니다.')
        }

        showActionSuccessMessage(successMessage)

        return data
      } catch (error) {
        setActionResult(null)
        setActionErrorMessage(
          getAdminReportErrorMessage(error, ADMIN_REPORT_ACTION_ERROR_MESSAGE)
        )

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        logDebugError('관리자 신고 처리 실패', error)

        return null
      } finally {
        if (processingReportIdRef.current === reportId) {
          processingReportIdRef.current = null
          setProcessingReportId(null)
        }
      }
    },
    [
      clearActionSuccessMessage,
      clearAuth,
      fetchAdminReportedUsers,
      refreshListOnAction,
      showActionSuccessMessage,
    ]
  )

  const acceptReport = useCallback(
    (reportId: number) => processAdminReport(reportId, 'ACCEPTED'),
    [processAdminReport]
  )

  const declineReport = useCallback(
    (reportId: number) => processAdminReport(reportId, 'DECLINED'),
    [processAdminReport]
  )

  useEffect(() => {
    if (!autoFetch) {
      return
    }

    void fetchAdminReportedUsers()
  }, [autoFetch, fetchAdminReportedUsers])

  useEffect(() => {
    return () => {
      clearActionSuccessTimeout()
    }
  }, [clearActionSuccessTimeout])

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
    actionErrorMessage,
    actionSuccessMessage,
    actionResult,
    processingReportId,
    fetchAdminReportedUsers,
    fetchAdminReportedUserDetail,
    clearReportedUserDetail,
    acceptReport,
    declineReport,
  }
}
