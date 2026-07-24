import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SortDropdown from '../../components/common/SortDropdown'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPosts } from '../../hooks/useAdminPosts'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPost,
  AdminPostListRequest,
  AdminPostReportItem,
  AdminPostReviewCounts,
  AdminPostReportStatus,
  AdminPostReviewStatus,
  AdminPostSortParam,
} from '../../types/adminPost.types'
import * as S from './MainPage.styles'

const ADMIN_POST_PAGE_SIZE = 20
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 5
const POST_SEARCH_DEBOUNCE_MS = 300
const DEFAULT_ADMIN_POST_SORT_PARAM: AdminPostSortParam = 'LATEST'
const ADMIN_POST_SORT_OPTIONS = [
  { value: 'LATEST', label: '최신순' },
  { value: 'OLDEST', label: '오래된순' },
  { value: 'MOST_LIKED', label: '좋아요순' },
]
type AdminPostStatusTone = 'normal' | 'reported' | 'processed' | 'hidden'
type AdminPostReportActionStatus = 'ACCEPTED' | 'DECLINED'

const ADMIN_POST_REVIEW_FILTERS: Array<{
  value: AdminPostReviewStatus
  label: string
}> = [
  { value: 'ALL', label: '모든 상태' },
  { value: 'PENDING', label: '신고 받음' },
  { value: 'PROCESSED', label: '신고 이력' },
  { value: 'NORMAL', label: '신고 없음' },
]
const ADMIN_POST_REVIEW_COUNT_KEYS: Record<
  AdminPostReviewStatus,
  keyof AdminPostReviewCounts
> = {
  ALL: 'all',
  PENDING: 'pending',
  PROCESSED: 'processed',
  NORMAL: 'normal',
}
const ADMIN_POST_REPORT_STATUS_LABELS: Record<AdminPostReportStatus, string> = {
  PENDING: '미처리',
  ACCEPTED: '수락',
  DECLINED: '거절',
  RESTORED: '복구',
}

interface MainPageLocationState {
  openPostId?: number
  reportId?: number
  postSearchKeyword?: string
  reviewStatus?: AdminPostReviewStatus
}

interface ReportActionConfirmState {
  actionStatus: AdminPostReportActionStatus
}

function getPostImageUrl(post: AdminPost) {
  return post.imageUrl
}

function getPostOwner(post: AdminPost) {
  if (post.username) {
    return post.username
  }

  if (typeof post.userId === 'number') {
    return `사용자 ID: ${post.userId}`
  }

  return '작성자 정보 없음'
}

function getPostTitle(post: AdminPost) {
  return post.name || `게시글-${post.id}`
}

function getPostReports(post: AdminPost) {
  return Array.isArray(post.reports) ? post.reports : []
}

function getPendingPostReports(post: AdminPost) {
  return getPostReports(post).filter((report) => report.status === 'PENDING')
}

function getReporterName(report: AdminPostReportItem) {
  if (report.reporterUsername) {
    return report.reporterUsername
  }

  if (typeof report.reporterUserId === 'number') {
    return `사용자 ID: ${report.reporterUserId}`
  }

  return '신고자 정보 없음'
}

function getReportStatusLabel(status: AdminPostReportStatus) {
  return ADMIN_POST_REPORT_STATUS_LABELS[status]
}

function getPostVisibilityLabel(post: AdminPost) {
  if (post.visibilityStatus === 'AUTO_HIDDEN') {
    return '숨김 처리'
  }

  return '공개'
}

function getPostStatusTone(post: AdminPost): AdminPostStatusTone {
  const reports = getPostReports(post)
  const pendingReportCount = getPendingPostReports(post).length

  if (pendingReportCount > 0) {
    return 'reported'
  }

  if (post.visibilityStatus === 'AUTO_HIDDEN') {
    return 'hidden'
  }

  if (reports.length > 0) {
    return 'processed'
  }

  return 'normal'
}

function getPostStatusLabel(post: AdminPost) {
  const reports = getPostReports(post)
  const pendingReportCount = getPendingPostReports(post).length

  if (pendingReportCount > 0) {
    return '신고 받음'
  }

  if (post.visibilityStatus === 'AUTO_HIDDEN') {
    return '숨김 처리'
  }

  if (reports.length > 0) {
    return `처리 완료 ${reports.length}`
  }

  return '신고 없음'
}

function getPostReportSummaryLabel(post: AdminPost) {
  const reports = getPostReports(post)
  const pendingReportCount = getPendingPostReports(post).length

  if (pendingReportCount > 0) {
    return `미처리 신고 ${pendingReportCount}건`
  }

  if (reports.length > 0) {
    return `처리 완료 ${reports.length}건`
  }

  return '신고 없음'
}

function formatCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '0'
}

function formatPostDate(value: string) {
  if (!value) {
    return '작성일 정보 없음'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatOptionalPostDate(value?: string | null) {
  if (!value) {
    return '처리 전'
  }

  return formatPostDate(value)
}

function formatOptionalReportCreatedDate(value?: string | null) {
  if (!value) {
    return '접수일 정보 없음'
  }

  return formatPostDate(value)
}

function createPendingPost(postId: number): AdminPost {
  return {
    id: postId,
    name: `게시글 #${postId}`,
    imageUrl: '',
    userId: 0,
    username: '불러오는 중',
    createdAt: '',
    description: '',
    likeCount: 0,
    placeName: '',
    reports: [],
  }
}

interface AdminPostImageProps {
  post: AdminPost
}

function AdminPostImage({ post }: AdminPostImageProps) {
  const postUrl = getPostImageUrl(post)
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>(
    postUrl ? 'loading' : 'error'
  )

  const isLoadingImage = imageStatus === 'loading'
  const isImageUnavailable = imageStatus === 'error'

  return (
    <S.MediaPreview>
      {postUrl && !isImageUnavailable ? (
        <S.MediaImage
          src={postUrl}
          alt={`게시글 ${post.id} 이미지`}
          loading="lazy"
          decoding="async"
          $isLoaded={imageStatus === 'loaded'}
          onLoad={() => setImageStatus('loaded')}
          onError={() => setImageStatus('error')}
        />
      ) : null}
      {isLoadingImage ? (
        <S.MediaLoading role="status" aria-live="polite">
          이미지 불러오는 중
        </S.MediaLoading>
      ) : null}
      {isImageUnavailable ? <S.MediaFallback>이미지 없음</S.MediaFallback> : null}
    </S.MediaPreview>
  )
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages < 1) {
    return []
  }

  const visiblePageCount = Math.min(MAX_VISIBLE_PAGE_NUMBER_COUNT, totalPages)
  const sidePageCount = Math.floor(visiblePageCount / 2)
  let startPage = Math.max(1, currentPage - sidePageCount)
  let endPage = Math.min(totalPages, startPage + visiblePageCount - 1)

  startPage = Math.max(1, endPage - visiblePageCount + 1)
  endPage = Math.min(totalPages, startPage + visiblePageCount - 1)

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  )
}

function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const pageContentRef = useRef<HTMLElement | null>(null)
  const isSortEffectReadyRef = useRef(false)
  const isSearchEffectReadyRef = useRef(false)
  const latestSortParamRef = useRef(DEFAULT_ADMIN_POST_SORT_PARAM)
  const latestPostKeywordRef = useRef('')
  const latestReviewFilterRef = useRef<AdminPostReviewStatus>('ALL')
  const shouldSkipNextSearchEffectRef = useRef(false)
  const searchTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null)
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<AdminPost | null>(
    null
  )
  const [reportActionConfirm, setReportActionConfirm] =
    useState<ReportActionConfirmState | null>(null)
  const [highlightedReportId, setHighlightedReportId] = useState<number | null>(null)
  const [hasDeleteConfirmAttempted, setHasDeleteConfirmAttempted] =
    useState(false)
  const [hasReportActionConfirmAttempted, setHasReportActionConfirmAttempted] =
    useState(false)
  const [selectedSortParam, setSelectedSortParam] = useState<AdminPostSortParam>(
    DEFAULT_ADMIN_POST_SORT_PARAM
  )
  const [selectedReviewFilter, setSelectedReviewFilter] =
    useState<AdminPostReviewStatus>('ALL')
  const [postSearchQuery, setPostSearchQuery] = useState('')
  const {
    posts,
    page,
    totalCount,
    totalPages,
    hasNext,
    reviewCounts,
    isLoading,
    isError,
    errorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    postDetail,
    isDetailLoading,
    detailErrorMessage,
    deletingPostId,
    processingPostReportId,
    fetchAdminPosts,
    fetchAdminPostDetail,
    clearPostDetail,
    deletePost,
    acceptPostReports,
    declinePostReports,
  } = useAdminPosts({
    limit: ADMIN_POST_PAGE_SIZE,
    autoFetch: false,
  })
  const fetchReviewPosts = useCallback(
    (request: AdminPostListRequest = {}) => fetchAdminPosts(request),
    [fetchAdminPosts]
  )
  const activePost = postDetail ?? selectedPost
  const activePostId = activePost?.id ?? null
  const selectedPostUrl = activePost ? getPostImageUrl(activePost) : ''
  const activeReports = activePost ? getPostReports(activePost) : []
  const activePendingReportCount = activePost
    ? getPendingPostReports(activePost).length
    : 0
  const currentPageNumber = page
  const isDeleting = deletingPostId !== null
  const isProcessingReport = processingPostReportId !== null
  const postKeyword = postSearchQuery.trim()
  const visibleActionSuccessMessage = actionSuccessMessage
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const hasActivePostKeyword = postKeyword.length > 0
  const showPagination = totalPages > 1
  const visiblePageNumbers = getVisiblePageNumbers(currentPageNumber, totalPages)
  const activePostIndex = activePost
    ? posts.findIndex((post) => post.id === activePost.id)
    : -1
  const nextReviewPost =
    activePostIndex >= 0 ? posts[activePostIndex + 1] ?? null : null

  const clearPendingPostSearch = useCallback(() => {
    if (!searchTimeoutRef.current) {
      return
    }

    window.clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = null
  }, [])

  const scrollPageContentToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      pageContentRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  const handleOpenPostDetail = useCallback(
    (post: AdminPost) => {
      setHighlightedReportId(null)
      setSelectedPost(post)
      void fetchAdminPostDetail(post.id)
    },
    [fetchAdminPostDetail]
  )
  const handleOpenPostDetailById = useCallback(
    (postId: number, reportId?: number) => {
      setHighlightedReportId(reportId ?? null)
      setSelectedPost(createPendingPost(postId))
      void fetchAdminPostDetail(postId)
    },
    [fetchAdminPostDetail]
  )
  const handleClosePostDetail = useCallback(() => {
    setSelectedPost(null)
    setDeleteConfirmPost(null)
    setReportActionConfirm(null)
    setHasDeleteConfirmAttempted(false)
    setHasReportActionConfirmAttempted(false)
    clearPostDetail()
  }, [clearPostDetail])

  const handleCloseDeleteConfirm = useCallback(() => {
    if (isDeleting) {
      return
    }

    setDeleteConfirmPost(null)
    setHasDeleteConfirmAttempted(false)
  }, [isDeleting])

  const handleOpenReportActionConfirm = useCallback(
    (actionStatus: AdminPostReportActionStatus) => {
      if (
        activePendingReportCount === 0 ||
        isDetailLoading ||
        isProcessingReport
      ) {
        return
      }

      setReportActionConfirm({
        actionStatus,
      })
      setHasReportActionConfirmAttempted(false)
    },
    [activePendingReportCount, isDetailLoading, isProcessingReport]
  )

  const handleCloseReportActionConfirm = useCallback(() => {
    if (isProcessingReport) {
      return
    }

    setReportActionConfirm(null)
    setHasReportActionConfirmAttempted(false)
  }, [isProcessingReport])

  const handlePostSortChange = (value: string) => {
    clearPendingPostSearch()
    setSelectedSortParam(value as AdminPostSortParam)
  }

  const handleReviewFilterChange = (nextFilter: AdminPostReviewStatus) => {
    if (selectedReviewFilter === nextFilter || isLoading || isDeleting) {
      return
    }

    clearPendingPostSearch()
    setSelectedReviewFilter(nextFilter)

    void fetchReviewPosts(
      {
        page: 1,
        sortParam: selectedSortParam,
        keyword: postKeyword,
        reviewStatus: nextFilter,
      }
    ).then((data) => {
      if (data) {
        scrollPageContentToTop()
      }
    })
  }

  const handleSearchQueryChange = (nextQuery: string) => {
    setPostSearchQuery(nextQuery)
  }

  const handleClearPostKeyword = () => {
    clearPendingPostSearch()
    shouldSkipNextSearchEffectRef.current = true
    setPostSearchQuery('')

    void fetchReviewPosts(
      {
        page: 1,
        sortParam: selectedSortParam,
        keyword: '',
        reviewStatus: selectedReviewFilter,
      }
    ).then((data) => {
      if (data) {
        scrollPageContentToTop()
      }
    })
  }

  const handlePageChange = (nextPage: number) => {
    const nextPageNumber = Math.min(Math.max(nextPage, 1), totalPages)

    if (nextPageNumber === currentPageNumber || isLoading || isDeleting) {
      return
    }

    clearPendingPostSearch()

    void fetchReviewPosts(
      {
        page: nextPageNumber,
        sortParam: selectedSortParam,
        keyword: postKeyword,
        reviewStatus: selectedReviewFilter,
      }
    ).then((data) => {
      if (data) {
        scrollPageContentToTop()
      }
    })
  }

  const handleRefresh = () => {
    clearPendingPostSearch()

    void fetchReviewPosts(
      {
        page: currentPageNumber,
        sortParam: selectedSortParam,
        keyword: postKeyword,
        reviewStatus: selectedReviewFilter,
      }
    )
  }

  const handleDeleteActivePost = () => {
    if (!activePost || isLoading || isDeleting) {
      return
    }

    setDeleteConfirmPost(activePost)
    setHasDeleteConfirmAttempted(false)
  }

  const handleConfirmDeletePost = () => {
    if (!deleteConfirmPost || isLoading || isDeleting) {
      return
    }

    setHasDeleteConfirmAttempted(true)

    const deleteConfirmPostIndex = posts.findIndex(
      (post) => post.id === deleteConfirmPost.id
    )
    const postToOpenAfterDelete =
      deleteConfirmPostIndex >= 0
        ? posts[deleteConfirmPostIndex + 1] ?? null
        : null

    void deletePost(deleteConfirmPost.id).then((isSuccess) => {
      if (!isSuccess) {
        return
      }

      setDeleteConfirmPost(null)
      setHasDeleteConfirmAttempted(false)

      if (postToOpenAfterDelete) {
        handleOpenPostDetail(postToOpenAfterDelete)

        return
      }

      handleClosePostDetail()
    })
  }

  const handleConfirmReportAction = () => {
    if (
      !reportActionConfirm ||
      activePostId === null ||
      activePendingReportCount === 0 ||
      isProcessingReport
    ) {
      return
    }

    setHasReportActionConfirmAttempted(true)

    const { actionStatus } = reportActionConfirm
    const requestReportAction =
      actionStatus === 'ACCEPTED' ? acceptPostReports : declinePostReports
    const postId = activePostId

    void requestReportAction(postId).then((result) => {
      if (!result) {
        return
      }

      setReportActionConfirm(null)
      setHasReportActionConfirmAttempted(false)

      void fetchAdminPostDetail(postId)
      void fetchReviewPosts(
        {
          page: currentPageNumber,
          sortParam: selectedSortParam,
          keyword: postKeyword,
          reviewStatus: selectedReviewFilter,
        }
      )
    })
  }

  useEffect(() => {
    latestSortParamRef.current = selectedSortParam
  }, [selectedSortParam])

  useEffect(() => {
    latestPostKeywordRef.current = postKeyword
  }, [postKeyword])

  useEffect(() => {
    latestReviewFilterRef.current = selectedReviewFilter
  }, [selectedReviewFilter])

  useEffect(() => {
    void fetchReviewPosts({
      reviewStatus: 'ALL',
    })
  }, [fetchReviewPosts])

  useEffect(() => {
    const locationState = location.state as MainPageLocationState | null
    const openPostId = locationState?.openPostId
    const reportId = locationState?.reportId
    const postSearchKeyword = locationState?.postSearchKeyword?.trim()
    const reviewStatus = locationState?.reviewStatus

    if (postSearchKeyword || reviewStatus) {
      const applySearchTimer = window.setTimeout(() => {
        clearPendingPostSearch()
        clearPostDetail()
        shouldSkipNextSearchEffectRef.current = Boolean(postSearchKeyword)
        latestPostKeywordRef.current = postSearchKeyword ?? ''
        latestReviewFilterRef.current = reviewStatus ?? 'ALL'
        setSelectedPost(null)
        setHighlightedReportId(
          typeof reportId === 'number' && Number.isFinite(reportId) ? reportId : null
        )
        setSelectedReviewFilter(reviewStatus ?? 'ALL')
        setPostSearchQuery(postSearchKeyword ?? '')

        void fetchReviewPosts(
          {
            page: 1,
            sortParam: latestSortParamRef.current,
            keyword: postSearchKeyword,
            reviewStatus: reviewStatus ?? 'ALL',
          }
        )
        if (typeof openPostId === 'number' && Number.isFinite(openPostId)) {
          handleOpenPostDetailById(openPostId, reportId)
        }
        navigate(location.pathname, { replace: true, state: null })
      }, 0)

      return () => {
        window.clearTimeout(applySearchTimer)
      }
    }

    if (typeof openPostId !== 'number' || !Number.isFinite(openPostId)) {
      return
    }

    const openDetailTimer = window.setTimeout(() => {
      handleOpenPostDetailById(openPostId, reportId)
      navigate(location.pathname, { replace: true, state: null })
    }, 0)

    return () => {
      window.clearTimeout(openDetailTimer)
    }
  }, [
    clearPendingPostSearch,
    clearPostDetail,
    fetchReviewPosts,
    handleOpenPostDetailById,
    location.pathname,
    location.state,
    navigate,
  ])

  useEffect(() => {
    if (!isSortEffectReadyRef.current) {
      isSortEffectReadyRef.current = true

      return
    }

    void fetchReviewPosts(
      {
        page: 1,
        sortParam: selectedSortParam,
        keyword: latestPostKeywordRef.current,
        reviewStatus: latestReviewFilterRef.current,
      }
    )
  }, [fetchReviewPosts, selectedSortParam])

  useEffect(() => {
    if (!isSearchEffectReadyRef.current) {
      isSearchEffectReadyRef.current = true

      return
    }

    if (shouldSkipNextSearchEffectRef.current) {
      shouldSkipNextSearchEffectRef.current = false

      return
    }

    clearPendingPostSearch()

    const nextKeyword = postSearchQuery.trim()
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTimeoutRef.current = null
      void fetchReviewPosts(
        {
          page: 1,
          sortParam: latestSortParamRef.current,
          keyword: nextKeyword,
          reviewStatus: latestReviewFilterRef.current,
        }
      ).then((data) => {
        if (data) {
          scrollPageContentToTop()
        }
      })
    }, POST_SEARCH_DEBOUNCE_MS)

    return clearPendingPostSearch
  }, [
    clearPendingPostSearch,
    fetchReviewPosts,
    postSearchQuery,
    scrollPageContentToTop,
  ])

  useEffect(() => {
    if (!selectedPost) {
      return
    }

    function closeModalOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (reportActionConfirm) {
          handleCloseReportActionConfirm()

          return
        }

        handleClosePostDetail()
      }
    }

    window.addEventListener('keydown', closeModalOnEscape)

    return () => {
      window.removeEventListener('keydown', closeModalOnEscape)
    }
  }, [
    handleClosePostDetail,
    handleCloseReportActionConfirm,
    reportActionConfirm,
    selectedPost,
  ])

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.BrandLockup>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </S.BrandLockup>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button" onClick={() => navigate('/dashboard')}>
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/places')}>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" $active>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>게시글 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/bans')}>
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
        </S.SideMenu>

        <S.SideFooter>
          <S.AdminProfile aria-label="관리자 계정">
            <S.AdminProfileIcon>
              <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
            </S.AdminProfileIcon>
            <S.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </S.AdminProfileText>
          </S.AdminProfile>
          <S.LogoutButton
            type="button"
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
          >
            <S.MaterialIcon aria-hidden="true">logout</S.MaterialIcon>
            <span>로그아웃</span>
          </S.LogoutButton>
        </S.SideFooter>
      </S.SideNav>

      <S.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <S.TopBar>
          <S.TopTitle>게시글 관리</S.TopTitle>
          <S.TopActions>
            <S.IconButton type="button" aria-label="알림">
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
            <S.IconButton type="button" aria-label="도움말">
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
          </S.TopActions>
        </S.TopBar>

        <S.PageContent ref={pageContentRef}>
          <S.PageHeader>
            <div>
              <S.PageTitle>업로드 게시글</S.PageTitle>
              <S.PageDescription>
                {hasActivePostKeyword
                  ? `검색 결과 게시글 ${totalCount.toLocaleString()}개를 관리합니다.`
                  : totalCount > 0
                    ? `업로드된 게시글 ${totalCount.toLocaleString()}개를 관리합니다.`
                    : '사용자가 업로드한 지도 게시글을 관리합니다.'}
              </S.PageDescription>
            </div>

            <S.HeaderActions>
              <SortDropdown
                ariaLabel="게시글 목록 정렬"
                value={selectedSortParam}
                options={ADMIN_POST_SORT_OPTIONS}
                disabled={isLoading || isDeleting}
                width="112px"
                onChange={handlePostSortChange}
              />
              <S.PrimaryButton
                type="button"
                disabled={isLoading || isDeleting}
                onClick={handleRefresh}
              >
                <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                <span>{isLoading ? '불러오는 중' : '새로고침'}</span>
              </S.PrimaryButton>
            </S.HeaderActions>
          </S.PageHeader>

          <S.ReviewToolbar>
            <S.ReviewTabList aria-label="게시글 검수 상태 필터">
              {ADMIN_POST_REVIEW_FILTERS.map((filter) => (
                <S.ReviewTabButton
                  key={filter.value}
                  type="button"
                  $active={selectedReviewFilter === filter.value}
                  aria-pressed={selectedReviewFilter === filter.value}
                  onClick={() => handleReviewFilterChange(filter.value)}
                >
                  <span>{filter.label}</span>
                  <strong>
                    {formatCount(
                      reviewCounts[ADMIN_POST_REVIEW_COUNT_KEYS[filter.value]]
                    )}
                  </strong>
                </S.ReviewTabButton>
              ))}
            </S.ReviewTabList>
            <S.ReviewSearchField>
              <S.SearchIcon aria-hidden="true">search</S.SearchIcon>
              <S.ReviewSearchInput
                type="search"
                value={postSearchQuery}
                placeholder="게시글 ID, 제목, 작성자, 장소, 설명 검색"
                aria-label="게시글 ID, 제목, 작성자, 장소, 설명 검색"
                onChange={(event) => handleSearchQueryChange(event.target.value)}
              />
              {postSearchQuery ? (
                <S.SearchClearButton
                  type="button"
                  aria-label="검색어 지우기"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleClearPostKeyword}
                >
                  <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
                </S.SearchClearButton>
              ) : null}
            </S.ReviewSearchField>
          </S.ReviewToolbar>

          <S.ReviewResultSummary>
            <span>
              {hasActivePostKeyword
                ? `검색 결과 중 현재 페이지 게시글 ${posts.length.toLocaleString()}개 표시`
                : `현재 페이지 게시글 ${posts.length.toLocaleString()}개 표시`}
            </span>
            {hasActivePostKeyword ? (
              <S.ClearFilterButton type="button" onClick={handleClearPostKeyword}>
                검색 초기화
              </S.ClearFilterButton>
            ) : null}
          </S.ReviewResultSummary>

          {isLoading ? (
            <S.FeedbackText>게시글 목록을 불러오는 중입니다.</S.FeedbackText>
          ) : null}

          {isError ? (
            <S.FeedbackText $variant="error">{errorMessage}</S.FeedbackText>
          ) : null}

          {actionErrorMessage ? (
            <S.FeedbackText $variant="error">{actionErrorMessage}</S.FeedbackText>
          ) : null}

          {actionSuccessMessage ? (
            <S.FeedbackText $variant="success" role="status">
              {actionSuccessMessage}
            </S.FeedbackText>
          ) : null}

          {!isLoading && !isError && posts.length === 0 ? (
            <S.FeedbackText>
              {hasActivePostKeyword
                ? '검색 결과에 맞는 게시글이 없습니다.'
                : '등록된 게시글이 없습니다.'}
            </S.FeedbackText>
          ) : null}

          {!isError && posts.length > 0 ? (
            <S.MediaGrid>
              {posts.map((post) => (
                <S.MediaCard
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenPostDetail(post)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenPostDetail(post)
                    }
                  }}
                >
                  <AdminPostImage
                    key={getPostImageUrl(post) || `post-image-${post.id}`}
                    post={post}
                  />

                  <S.MediaBody>
                    <S.MediaTitleRow>
                      <S.MediaTitle>{getPostTitle(post)}</S.MediaTitle>
                      <S.StatusBadge $tone={getPostStatusTone(post)}>
                        {getPostStatusLabel(post)}
                      </S.StatusBadge>
                    </S.MediaTitleRow>

                    <S.MediaMetaList>
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">person</S.MaterialIcon>
                        <span>{getPostOwner(post)}</span>
                      </S.MediaMeta>
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">tag</S.MaterialIcon>
                        <span>게시글 ID: {post.id}</span>
                      </S.MediaMeta>
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">place</S.MaterialIcon>
                        <span>{post.placeName || '장소 정보 없음'}</span>
                      </S.MediaMeta>
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">favorite</S.MaterialIcon>
                        <span>좋아요 {formatCount(post.likeCount)}</span>
                      </S.MediaMeta>
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">report</S.MaterialIcon>
                        <span>{getPostReportSummaryLabel(post)}</span>
                      </S.MediaMeta>
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">schedule</S.MaterialIcon>
                        <span>{formatPostDate(post.createdAt)}</span>
                      </S.MediaMeta>
                      {post.description ? (
                        <S.MediaMeta>
                          <S.MaterialIcon aria-hidden="true">notes</S.MaterialIcon>
                          <span>{post.description}</span>
                        </S.MediaMeta>
                      ) : null}
                      <S.MediaMeta>
                        <S.MaterialIcon aria-hidden="true">badge</S.MaterialIcon>
                        <span>사용자 ID: {post.userId}</span>
                      </S.MediaMeta>
                    </S.MediaMetaList>

                    <S.CardHint>
                      <span>클릭해서 상세 보기</span>
                      <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
                    </S.CardHint>
                  </S.MediaBody>
                </S.MediaCard>
              ))}
            </S.MediaGrid>
          ) : null}

          {!isError && showPagination ? (
            <S.Pagination aria-label="게시글 목록 페이지네이션">
              <S.PaginationButton
                type="button"
                disabled={isLoading || isDeleting || currentPageNumber === 1}
                onClick={() => handlePageChange(currentPageNumber - 1)}
              >
                <S.MaterialIcon aria-hidden="true">chevron_left</S.MaterialIcon>
                <span>이전</span>
              </S.PaginationButton>

              <S.PageNumberList>
                {visiblePageNumbers.map((pageNumber) => {
                  return (
                    <S.PageNumberButton
                      key={pageNumber}
                      type="button"
                      $active={currentPageNumber === pageNumber}
                      aria-current={currentPageNumber === pageNumber ? 'page' : undefined}
                      disabled={isLoading || isDeleting}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </S.PageNumberButton>
                  )
                })}
              </S.PageNumberList>

              <S.PaginationButton
                type="button"
                disabled={isLoading || isDeleting || !hasNext || currentPageNumber === totalPages}
                onClick={() => handlePageChange(currentPageNumber + 1)}
              >
                <span>다음</span>
                <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
              </S.PaginationButton>
            </S.Pagination>
          ) : null}
        </S.PageContent>
      </S.MainArea>

      {activePost ? (
        <S.ModalOverlay
          role="presentation"
          onMouseDown={handleClosePostDetail}
        >
          <S.ModalContent
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.ModalHeader>
              <div>
                <S.ModalTitle id="post-modal-title">
                  {getPostTitle(activePost)}
                </S.ModalTitle>
                <S.ModalMetaList aria-label="게시글 기본 정보">
                  <S.ModalMetaChip>게시글 #{activePost.id}</S.ModalMetaChip>
                  <S.ModalMetaChip>
                    작성자 {getPostOwner(activePost)}
                    {activePost.username && typeof activePost.userId === 'number'
                      ? ` (ID ${activePost.userId})`
                      : ''}
                  </S.ModalMetaChip>
                  <S.ModalMetaChip>
                    {activePost.placeName || '장소 정보 없음'}
                  </S.ModalMetaChip>
                </S.ModalMetaList>
              </div>
              <S.ModalCloseButton
                type="button"
                aria-label="게시글 이미지 미리보기 닫기"
                onClick={handleClosePostDetail}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.ModalCloseButton>
            </S.ModalHeader>

            <S.ModalBody>
              {isDetailLoading ? (
                <S.ModalNotice role="status" aria-live="polite">
                  상세 정보를 불러오는 중입니다.
                </S.ModalNotice>
              ) : null}

              {detailErrorMessage ? (
                <S.ModalNotice role="alert">{detailErrorMessage}</S.ModalNotice>
              ) : null}

              <S.ModalReviewLayout>
                <S.ModalMediaPanel>
                  <S.ModalImageFrame>
                    {selectedPostUrl ? (
                      <S.ModalImage
                        src={selectedPostUrl}
                        alt={`게시글 ${activePost.id} 이미지 크게 보기`}
                      />
                    ) : (
                      <S.ModalFallback>이미지 없음</S.ModalFallback>
                    )}
                  </S.ModalImageFrame>

                  {selectedPostUrl ? (
                    <S.ModalMediaActions>
                      <S.ModalExternalLink
                        href={selectedPostUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <S.MaterialIcon aria-hidden="true">open_in_new</S.MaterialIcon>
                        <span>원본 열기</span>
                      </S.ModalExternalLink>
                    </S.ModalMediaActions>
                  ) : null}
                </S.ModalMediaPanel>

                <S.ModalModerationPanel>
                  <S.ModalStatusRow aria-label="게시글 상태 요약">
                    <S.ModalStatusLine>
                      <S.StatusBadge $tone={getPostStatusTone(activePost)}>
                        {getPostStatusLabel(activePost)}
                      </S.StatusBadge>
                      <S.ModalMetricBadge
                        $tone={
                          activePost.visibilityStatus === 'AUTO_HIDDEN'
                            ? 'reported'
                            : 'normal'
                        }
                      >
                        {getPostVisibilityLabel(activePost)}
                      </S.ModalMetricBadge>
                    </S.ModalStatusLine>
                    <S.ModalStatusLine>
                      <S.ModalMetricBadge
                        $tone={activePendingReportCount > 0 ? 'reported' : 'neutral'}
                      >
                        미처리 신고 {formatCount(activePendingReportCount)}
                      </S.ModalMetricBadge>
                      <S.ModalMetricBadge
                        $tone={activeReports.length > 0 ? 'processed' : 'neutral'}
                      >
                        전체 신고 {formatCount(activeReports.length)}
                      </S.ModalMetricBadge>
                      <S.ModalMetricBadge>
                        좋아요 {formatCount(activePost.likeCount)}
                      </S.ModalMetricBadge>
                    </S.ModalStatusLine>
                  </S.ModalStatusRow>

                  <S.ModalInfoGrid>
                    <S.ModalInfoItem $wide>
                      <span>작성일</span>
                      <strong>{formatPostDate(activePost.createdAt)}</strong>
                    </S.ModalInfoItem>
                    {activePost.hiddenAt ? (
                      <S.ModalInfoItem $wide>
                        <span>숨김 처리일</span>
                        <strong>{formatPostDate(activePost.hiddenAt)}</strong>
                      </S.ModalInfoItem>
                    ) : null}
                  </S.ModalInfoGrid>

                  <S.ModalPostDescriptionCard>
                    <S.ModalSectionTitle>게시글 내용</S.ModalSectionTitle>
                    <S.ModalPostContentCard>
                      <S.ModalPostContentIcon aria-hidden="true">
                        <S.MaterialIcon>notes</S.MaterialIcon>
                      </S.ModalPostContentIcon>
                      <S.ModalPostContentBody>
                        <strong>작성자가 입력한 내용</strong>
                        <S.ModalPostDescription $empty={!activePost.description}>
                          {activePost.description || '작성된 게시글 내용이 없습니다.'}
                        </S.ModalPostDescription>
                      </S.ModalPostContentBody>
                    </S.ModalPostContentCard>
                  </S.ModalPostDescriptionCard>

                  <S.ModalSection>
                    <S.ModalSectionTitle>신고 내역</S.ModalSectionTitle>
                    {actionErrorMessage ? (
                      <S.ReportActionNotice $variant="error" role="alert">
                        {actionErrorMessage}
                      </S.ReportActionNotice>
                    ) : null}
                    {actionSuccessMessage ? (
                      <S.ReportActionNotice $variant="success" role="status">
                        {actionSuccessMessage}
                      </S.ReportActionNotice>
                    ) : null}
                    {isDetailLoading ? (
                      <S.ModalEmptyText>
                        신고 내역을 불러오는 중입니다...
                      </S.ModalEmptyText>
                    ) : activeReports.length > 0 ? (
                      <S.ReportList>
                        {activeReports.map((report) => (
                          <S.ReportItem
                            key={report.reportId}
                            $status={report.status}
                            $highlighted={report.reportId === highlightedReportId}
                          >
                            <S.ReportHeader>
                              <div>
                                <S.ReportReporter>
                                  {getReporterName(report)}
                                </S.ReportReporter>
                                <S.ReportMeta>
                                  신고자 ID: {report.reporterUserId} · 신고 ID:{' '}
                                  {report.reportId}
                                </S.ReportMeta>
                              </div>
                              <S.ReportStatusBadge $status={report.status}>
                                {getReportStatusLabel(report.status)}
                              </S.ReportStatusBadge>
                            </S.ReportHeader>
                            <S.ReportReason>
                              {report.reason || '신고 사유 없음'}
                            </S.ReportReason>
                            <S.ReportMeta>
                              접수일: {formatOptionalReportCreatedDate(report.createdAt)}
                            </S.ReportMeta>
                            <S.ReportMeta>
                              처리일: {formatOptionalPostDate(report.processedAt)}
                            </S.ReportMeta>
                          </S.ReportItem>
                        ))}
                      </S.ReportList>
                    ) : (
                      <S.ModalEmptyState>
                        <S.ModalEmptyIcon aria-hidden="true">
                          <S.MaterialIcon>report_off</S.MaterialIcon>
                        </S.ModalEmptyIcon>
                        <S.ModalEmptyContent>
                          <strong>신고 내역이 없습니다.</strong>
                          <span>이 게시글은 접수된 신고 없이 확인되었습니다.</span>
                        </S.ModalEmptyContent>
                      </S.ModalEmptyState>
                    )}
                    {activePendingReportCount > 0 ? (
                      <S.ReportActions>
                        <S.SecondaryButton
                          type="button"
                          disabled={isDetailLoading || isDeleting || isProcessingReport}
                          onClick={() => handleOpenReportActionConfirm('DECLINED')}
                        >
                          <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
                          <span>{isProcessingReport ? '처리 중' : '전체 거절'}</span>
                        </S.SecondaryButton>
                        <S.DangerButton
                          type="button"
                          disabled={isDetailLoading || isDeleting || isProcessingReport}
                          onClick={() => handleOpenReportActionConfirm('ACCEPTED')}
                        >
                          <S.MaterialIcon aria-hidden="true">gavel</S.MaterialIcon>
                          <span>{isProcessingReport ? '처리 중' : '전체 수락'}</span>
                        </S.DangerButton>
                      </S.ReportActions>
                    ) : null}
                  </S.ModalSection>
                </S.ModalModerationPanel>
              </S.ModalReviewLayout>
            </S.ModalBody>

            <S.ModalFooter>
              <S.ModalFooterControls>
                <S.ModalFooterMeta>
                  {nextReviewPost
                    ? `다음 검토: 게시글 #${nextReviewPost.id}`
                    : '현재 필터의 마지막 게시글입니다.'}
                </S.ModalFooterMeta>
                <S.ModalFooterActions>
                  <S.SecondaryButton
                    type="button"
                    disabled={!nextReviewPost || isDetailLoading || isDeleting}
                    onClick={() => {
                      if (nextReviewPost) {
                        handleOpenPostDetail(nextReviewPost)
                      }
                    }}
                  >
                    <S.MaterialIcon aria-hidden="true">skip_next</S.MaterialIcon>
                    <span>다음 게시글</span>
                  </S.SecondaryButton>
                  <S.DangerButton
                    type="button"
                    disabled={isLoading || isDeleting}
                    onClick={handleDeleteActivePost}
                  >
                    <S.MaterialIcon aria-hidden="true">delete</S.MaterialIcon>
                    <span>{deletingPostId === activePost.id ? '삭제 중' : '삭제'}</span>
                  </S.DangerButton>
                </S.ModalFooterActions>
              </S.ModalFooterControls>
            </S.ModalFooter>
          </S.ModalContent>
        </S.ModalOverlay>
      ) : null}

      {visibleActionSuccessMessage ? (
        <S.ActionToast role="status">
          <S.MaterialIcon aria-hidden="true">check_circle</S.MaterialIcon>
          <span>{visibleActionSuccessMessage}</span>
        </S.ActionToast>
      ) : null}

      {reportActionConfirm ? (
        <S.DeleteConfirmOverlay
          role="presentation"
          onMouseDown={handleCloseReportActionConfirm}
        >
          <S.DeleteConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-action-confirm-title"
            aria-describedby="report-action-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.DeleteConfirmIcon aria-hidden="true">
              <S.MaterialIcon>
                {reportActionConfirm.actionStatus === 'ACCEPTED' ? 'gavel' : 'block'}
              </S.MaterialIcon>
            </S.DeleteConfirmIcon>
            <S.DeleteConfirmTitle id="report-action-confirm-title">
              {reportActionConfirm.actionStatus === 'ACCEPTED'
                ? '미처리 신고를 모두 수락할까요?'
                : '미처리 신고를 모두 거절할까요?'}
            </S.DeleteConfirmTitle>
            <S.DeleteConfirmDescription id="report-action-confirm-description">
              {reportActionConfirm.actionStatus === 'ACCEPTED'
                ? '수락하면 이 게시글에 연결된 미처리 신고가 모두 수락되고 게시글은 숨김 처리됩니다.'
                : '거절하면 이 게시글에 연결된 미처리 신고가 모두 거절되고 게시글과 사용자는 변경하지 않습니다.'}
            </S.DeleteConfirmDescription>
            <S.DeleteConfirmMeta>
              게시글 ID: {activePostId} · 미처리 신고{' '}
              {formatCount(activePendingReportCount)}건
            </S.DeleteConfirmMeta>

            {hasReportActionConfirmAttempted && actionErrorMessage ? (
              <S.DeleteConfirmNotice role="alert">
                {actionErrorMessage}
              </S.DeleteConfirmNotice>
            ) : null}

            <S.DeleteConfirmActions>
              <S.SecondaryButton
                type="button"
                disabled={isProcessingReport}
                onClick={handleCloseReportActionConfirm}
              >
                취소
              </S.SecondaryButton>
              {reportActionConfirm.actionStatus === 'ACCEPTED' ? (
                <S.DangerButton
                  type="button"
                  disabled={isProcessingReport}
                  onClick={handleConfirmReportAction}
                >
                  <S.MaterialIcon aria-hidden="true">gavel</S.MaterialIcon>
                  <span>{isProcessingReport ? '처리 중' : '수락하기'}</span>
                </S.DangerButton>
              ) : (
                <S.PrimaryButton
                  type="button"
                  disabled={isProcessingReport}
                  onClick={handleConfirmReportAction}
                >
                  <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
                  <span>{isProcessingReport ? '처리 중' : '거절하기'}</span>
                </S.PrimaryButton>
              )}
            </S.DeleteConfirmActions>
          </S.DeleteConfirmDialog>
        </S.DeleteConfirmOverlay>
      ) : null}

      {deleteConfirmPost ? (
        <S.DeleteConfirmOverlay
          role="presentation"
          onMouseDown={handleCloseDeleteConfirm}
        >
          <S.DeleteConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.DeleteConfirmIcon aria-hidden="true">
              <S.MaterialIcon>delete</S.MaterialIcon>
            </S.DeleteConfirmIcon>
            <S.DeleteConfirmTitle id="delete-confirm-title">
              게시글을 삭제할까요?
            </S.DeleteConfirmTitle>
            <S.DeleteConfirmDescription id="delete-confirm-description">
              게시글 #{deleteConfirmPost.id}은 삭제 후 현재 관리자 화면에서
              되돌릴 수 없습니다.
            </S.DeleteConfirmDescription>
            {getPostReports(deleteConfirmPost).length > 0 ? (
              <S.DeleteConfirmWarning>
                이 게시글에는 신고 내역이 있습니다. 삭제하면 신고 검토 흐름에도
                영향을 줄 수 있습니다.
              </S.DeleteConfirmWarning>
            ) : null}
            <S.DeleteConfirmMeta>
              {getPostTitle(deleteConfirmPost)} · {getPostOwner(deleteConfirmPost)}
            </S.DeleteConfirmMeta>

            {hasDeleteConfirmAttempted && actionErrorMessage ? (
              <S.DeleteConfirmNotice role="alert">
                {actionErrorMessage}
              </S.DeleteConfirmNotice>
            ) : null}

            <S.DeleteConfirmActions>
              <S.SecondaryButton
                type="button"
                disabled={isDeleting}
                onClick={handleCloseDeleteConfirm}
              >
                취소
              </S.SecondaryButton>
              <S.DangerButton
                type="button"
                disabled={isLoading || isDeleting}
                onClick={handleConfirmDeletePost}
              >
                <S.MaterialIcon aria-hidden="true">delete</S.MaterialIcon>
                <span>
                  {deletingPostId === deleteConfirmPost.id ? '삭제 중' : '삭제하기'}
                </span>
              </S.DangerButton>
            </S.DeleteConfirmActions>
          </S.DeleteConfirmDialog>
        </S.DeleteConfirmOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default MainPage
