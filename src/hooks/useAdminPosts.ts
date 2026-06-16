import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAdminPost, getAdminPost, getAdminPosts } from '../api/adminPostApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import { useAuth } from './useAuth'
import type {
  AdminPost,
  AdminPostDeleteErrorResponse,
  AdminPostDetailErrorResponse,
  AdminPostListErrorResponse,
  AdminPostListRequest,
  AdminPostSortParam,
} from '../types/adminPost.types'

const DEFAULT_ADMIN_POST_PAGE = 1
const DEFAULT_ADMIN_POST_LIMIT = 20
const DEFAULT_ADMIN_POST_SORT_PARAM: AdminPostSortParam = 'LATEST'
const ADMIN_POST_ERROR_MESSAGE = '게시글 목록을 불러오는 중 오류가 발생했습니다.'
const ADMIN_POST_CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked':
    '서버 응답을 읽지 못했습니다. CORS 설정 또는 서버 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
const ADMIN_POST_CODE_MESSAGES = {
  INVALID_TOKEN: '로그인이 필요합니다. 다시 로그인해주세요.',
  ACCESS_DENIED: '관리자 권한이 필요합니다.',
  POST_NOT_FOUND: '이미 삭제되었거나 존재하지 않는 게시글입니다.',
  IMAGE_NOT_FOUND: '이미 삭제되었거나 존재하지 않는 게시글입니다.',
  DELETE_ERROR: '게시글 삭제 중 오류가 발생했습니다.',
  POST_DELETE_FAILED: '게시글 삭제 중 오류가 발생했습니다.',
  S3_CONNECTION_ERROR: '이미지 서버 연결 중 오류가 발생했습니다.',
}

type AdminPostApiErrorResponse =
  | AdminPostListErrorResponse
  | AdminPostDetailErrorResponse
  | AdminPostDeleteErrorResponse

function getAdminPostErrorMessage(error: unknown) {
  if (!isApiError<AdminPostApiErrorResponse>(error)) {
    return ADMIN_POST_ERROR_MESSAGE
  }

  return getAuthErrorMessage(error, {
    fallbackMessage: ADMIN_POST_ERROR_MESSAGE,
    codeMessages: ADMIN_POST_CODE_MESSAGES,
    categoryMessages: ADMIN_POST_CATEGORY_MESSAGES,
  })
}

function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminPostApiErrorResponse>(error) &&
    (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized')
  )
}

interface UseAdminPostsOptions {
  initialPage?: number
  limit?: number
  sortParam?: AdminPostSortParam
}

export function useAdminPosts({
  initialPage = DEFAULT_ADMIN_POST_PAGE,
  limit = DEFAULT_ADMIN_POST_LIMIT,
  sortParam = DEFAULT_ADMIN_POST_SORT_PARAM,
}: UseAdminPostsOptions = {}) {
  const { clearAuth } = useAuth()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [postDetail, setPostDetail] = useState<AdminPost | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState('')
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null)
  const latestRequestIdRef = useRef(0)
  const latestDetailRequestIdRef = useRef(0)
  const isFetchingRef = useRef(false)
  const deletingPostIdRef = useRef<number | null>(null)
  const latestListRequestRef = useRef<Required<AdminPostListRequest>>({
    page: initialPage,
    limit,
    sortParam,
  })

  const fetchAdminPosts = useCallback(async (request: AdminPostListRequest = {}) => {
    if (isFetchingRef.current) {
      return false
    }

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    isFetchingRef.current = true

    setIsError(false)
    setErrorMessage('')
    setActionErrorMessage('')

    const nextRequest = {
      page: request.page ?? latestListRequestRef.current.page,
      limit: request.limit ?? latestListRequestRef.current.limit,
      sortParam: request.sortParam ?? latestListRequestRef.current.sortParam,
    }

    try {
      setIsLoading(true)

      const data = await getAdminPosts(nextRequest)

      if (requestId === latestRequestIdRef.current) {
        setPosts(data.posts)
        setPage(data.page)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setHasNext(data.hasNext)
        latestListRequestRef.current = {
          page: data.page,
          limit: data.limit,
          sortParam: nextRequest.sortParam,
        }
      }

      return true
    } catch (error) {
      if (requestId === latestRequestIdRef.current) {
        setPosts([])
        setIsError(true)
        setErrorMessage(getAdminPostErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }
      }

      console.error('관리자 게시글 목록 조회 실패', error)

      return false
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }

      isFetchingRef.current = false
    }
  }, [clearAuth])

  const clearPostDetail = useCallback(() => {
    latestDetailRequestIdRef.current += 1
    setPostDetail(null)
    setIsDetailLoading(false)
    setDetailErrorMessage('')
  }, [])

  const fetchAdminPostDetail = useCallback(
    async (postId: number) => {
      const requestId = latestDetailRequestIdRef.current + 1
      latestDetailRequestIdRef.current = requestId

      setIsDetailLoading(true)
      setPostDetail(null)
      setDetailErrorMessage('')

      try {
        const data = await getAdminPost(postId)

        if (requestId === latestDetailRequestIdRef.current) {
          setPostDetail(data)
        }

        return data
      } catch (error) {
        if (requestId === latestDetailRequestIdRef.current) {
          setPostDetail(null)
          setDetailErrorMessage(getAdminPostErrorMessage(error))

          if (shouldClearAuth(error)) {
            clearAuth()
          }
        }

        console.error('관리자 게시글 상세 조회 실패', error)

        return null
      } finally {
        if (requestId === latestDetailRequestIdRef.current) {
          setIsDetailLoading(false)
        }
      }
    },
    [clearAuth]
  )

  const deletePost = useCallback(
    async (postId: number) => {
      if (deletingPostIdRef.current !== null) {
        return false
      }

      deletingPostIdRef.current = postId
      setActionErrorMessage('')

      try {
        setDeletingPostId(postId)

        await deleteAdminPost(postId)
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))
        setPostDetail((prevPostDetail) =>
          prevPostDetail?.id === postId ? null : prevPostDetail
        )

        try {
          let refreshedPosts = await getAdminPosts(latestListRequestRef.current)

          if (refreshedPosts.posts.length === 0 && refreshedPosts.page > 1) {
            refreshedPosts = await getAdminPosts({
              ...latestListRequestRef.current,
              page: refreshedPosts.page - 1,
            })
          }

          setPosts(refreshedPosts.posts)
          setPage(refreshedPosts.page)
          setTotalCount(refreshedPosts.totalCount)
          setTotalPages(refreshedPosts.totalPages)
          setHasNext(refreshedPosts.hasNext)
          latestListRequestRef.current = {
            ...latestListRequestRef.current,
            page: refreshedPosts.page,
            limit: refreshedPosts.limit,
          }
        } catch (refreshError) {
          setActionErrorMessage('게시글은 삭제됐지만 목록을 다시 불러오지 못했습니다.')

          if (shouldClearAuth(refreshError)) {
            clearAuth()
          }

          console.error('관리자 게시글 삭제 후 목록 재조회 실패', refreshError)
        }

        return true
      } catch (error) {
        setActionErrorMessage(getAdminPostErrorMessage(error))

        if (shouldClearAuth(error)) {
          clearAuth()
        }

        console.error('관리자 게시글 삭제 실패', error)

        return false
      } finally {
        if (deletingPostIdRef.current === postId) {
          deletingPostIdRef.current = null
          setDeletingPostId(null)
        }
      }
    },
    [clearAuth]
  )

  useEffect(() => {
    void fetchAdminPosts()
  }, [fetchAdminPosts])

  return {
    posts,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    actionErrorMessage,
    postDetail,
    isDetailLoading,
    detailErrorMessage,
    deletingPostId,
    fetchAdminPosts,
    fetchAdminPostDetail,
    clearPostDetail,
    deletePost,
  }
}
