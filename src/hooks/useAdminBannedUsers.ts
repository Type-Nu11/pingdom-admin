import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminBannedUser,
  getAdminBannedUsers,
  releaseAdminUserBan,
} from '../api/adminUserBanApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { useAuth } from './useAuth'
import type {
  AdminBanType,
  AdminBannedUserCounts,
  AdminBannedUserDetail,
  AdminBannedUserDetailErrorResponse,
  AdminBannedUserItem,
  AdminBannedUserListErrorResponse,
  AdminBannedUserListRequest,
  AdminBannedUserSortBy,
  AdminBannedUserSortDirection,
  AdminUserBanReleaseErrorResponse,
  AdminUserBanReleaseRequest,
} from '../types/adminUserBan.types'

const DEFAULT_ADMIN_BANNED_USER_PAGE = 1
const DEFAULT_ADMIN_BANNED_USER_LIMIT = 20
const ADMIN_BANNED_USER_ERROR_MESSAGE =
  '밴 유저 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_BANNED_USER_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const ADMIN_BANNED_USER_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  ACCESS_DENIED: '관리자 권한이 필요합니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  USER_NOT_BANNED: '제재 중인 사용자가 아닙니다.',
}

type AdminBannedUserApiErrorResponse =
  | AdminBannedUserListErrorResponse
  | AdminBannedUserDetailErrorResponse
  | AdminUserBanReleaseErrorResponse

interface LatestAdminBannedUserListRequest {
  page: number
  limit: number
  keyword: string
  banType?: AdminBanType
  from?: string
  to?: string
  sortBy?: AdminBannedUserSortBy
  sortDirection?: AdminBannedUserSortDirection
}

function getAdminBannedUserErrorMessage(error: unknown) {
  if (!isApiError<AdminBannedUserApiErrorResponse>(error)) {
    return ADMIN_BANNED_USER_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_BANNED_USER_ERROR_MESSAGE,
    codeMessages: ADMIN_BANNED_USER_CODE_MESSAGES,
    categoryMessages: ADMIN_BANNED_USER_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminBannedUserApiErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

function hasOwnRequestField<Key extends keyof AdminBannedUserListRequest>(
  request: AdminBannedUserListRequest,
  key: Key
) {
  return Object.prototype.hasOwnProperty.call(request, key)
}

interface UseAdminBannedUsersOptions {
  initialPage?: number
  limit?: number
}

export function useAdminBannedUsers({
  initialPage = DEFAULT_ADMIN_BANNED_USER_PAGE,
  limit = DEFAULT_ADMIN_BANNED_USER_LIMIT,
}: UseAdminBannedUsersOptions = {}) {
  const { clearAuth } = useAuth()
  const [users, setUsers] = useState<AdminBannedUserItem[]>([])
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [counts, setCounts] = useState<AdminBannedUserCounts | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedUserDetail, setSelectedUserDetail] =
    useState<AdminBannedUserDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [actionSuccessMessage, setActionSuccessMessage] = useState('')
  const [releasingUserId, setReleasingUserId] = useState<number | null>(null)
  const latestRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const releasingUserIdRef = useRef<number | null>(null)
  const latestListRequestRef = useRef<LatestAdminBannedUserListRequest>({
    page: initialPage,
    limit,
    keyword: '',
  })

  const fetchAdminBannedUsers = useCallback(
    async (request: AdminBannedUserListRequest = {}) => {
      const requestId = latestRequestIdRef.current + 1
      latestRequestIdRef.current = requestId

      setIsError(false)
      setErrorMessage('')
      setActionErrorMessage('')

      const nextRequest = {
        page: request.page ?? latestListRequestRef.current.page,
        limit: request.limit ?? latestListRequestRef.current.limit,
        keyword: hasOwnRequestField(request, 'keyword')
          ? request.keyword ?? ''
          : latestListRequestRef.current.keyword,
        banType: hasOwnRequestField(request, 'banType')
          ? request.banType
          : latestListRequestRef.current.banType,
        from: hasOwnRequestField(request, 'from')
          ? request.from
          : latestListRequestRef.current.from,
        to: hasOwnRequestField(request, 'to')
          ? request.to
          : latestListRequestRef.current.to,
        sortBy: hasOwnRequestField(request, 'sortBy')
          ? request.sortBy
          : latestListRequestRef.current.sortBy,
        sortDirection: hasOwnRequestField(request, 'sortDirection')
          ? request.sortDirection
          : latestListRequestRef.current.sortDirection,
      }

      try {
        setIsLoading(true)

        const data = await getAdminBannedUsers(nextRequest)

        if (requestId === latestRequestIdRef.current) {
          setUsers(data.users)
          setPage(data.page)
          setTotalCount(data.totalCount)
          setTotalPages(data.totalPages)
          setHasNext(data.hasNext)
          setCounts(data.counts ?? null)
          latestListRequestRef.current = {
            page: data.page,
            limit: data.limit,
            keyword: nextRequest.keyword,
            banType: nextRequest.banType,
            from: nextRequest.from,
            to: nextRequest.to,
            sortBy: nextRequest.sortBy,
            sortDirection: nextRequest.sortDirection,
          }
        }

        return true
      } catch (error) {
        if (requestId === latestRequestIdRef.current) {
          setUsers([])
          setCounts(null)
          setIsError(true)
          setErrorMessage(getAdminBannedUserErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        console.error('관리자 밴 유저 목록 조회 실패', error)

        return false
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const clearBannedUserDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setSelectedUserDetail(null)
    setIsDetailLoading(false)
    setDetailErrorMessage('')
    setActionErrorMessage('')
    setActionSuccessMessage('')
  }, [])

  const fetchAdminBannedUserDetail = useCallback(
    async (userId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId

      setIsDetailLoading(true)
      setSelectedUserDetail(null)
      setDetailErrorMessage('')
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await getAdminBannedUser(userId)

        if (requestId === latestDetailRequestIdRef.current) {
          setSelectedUserDetail(data)
        }

        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setSelectedUserDetail(null)
          setDetailErrorMessage(getAdminBannedUserErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        console.error('관리자 밴 유저 상세 조회 실패', error)

        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const releaseUserBan = useCallback(
    async (userId: number, payload: AdminUserBanReleaseRequest = {}) => {
      if (releasingUserIdRef.current !== null) {
        return null
      }

      releasingUserIdRef.current = userId
      setReleasingUserId(userId)
      setActionErrorMessage('')
      setActionSuccessMessage('')

      try {
        const data = await releaseAdminUserBan(userId, payload)

        setUsers((prevUsers) => prevUsers.filter((item) => item.userId !== userId))
        setSelectedUserDetail((prevDetail) =>
          prevDetail?.userId === userId ? null : prevDetail
        )

        const isRefreshSuccess = await fetchAdminBannedUsers()

        if (!isRefreshSuccess) {
          setActionErrorMessage('밴은 해제됐지만 목록을 다시 불러오지 못했습니다.')
        }

        setActionSuccessMessage(`사용자 ID ${userId}의 밴을 해제했습니다.`)

        return data
      } catch (error) {
        setActionErrorMessage(getAdminBannedUserErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        console.error('관리자 사용자 밴 해제 실패', error)

        return null
      } finally {
        if (releasingUserIdRef.current === userId) {
          releasingUserIdRef.current = null
          setReleasingUserId(null)
        }
      }
    },
    [clearAuth, fetchAdminBannedUsers]
  )

  useEffect(() => {
    void fetchAdminBannedUsers()
  }, [fetchAdminBannedUsers])

  return {
    users,
    page,
    totalCount,
    totalPages,
    hasNext,
    counts,
    isLoading,
    isError,
    errorMessage,
    selectedUserDetail,
    isDetailLoading,
    detailErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    releasingUserId,
    fetchAdminBannedUsers,
    fetchAdminBannedUserDetail,
    clearBannedUserDetail,
    releaseUserBan,
  }
}
