import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SortDropdown from '../../components/common/SortDropdown'
import { useAdminPosts } from '../../hooks/useAdminPosts'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPost,
  AdminPostReportItem,
  AdminPostReportStatus,
  AdminPostSortParam,
} from '../../types/adminPost.types'
import * as S from './MainPage.styles'

const ADMIN_POST_PAGE_SIZE = 20
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 5
const DEFAULT_ADMIN_POST_SORT_PARAM: AdminPostSortParam = 'LATEST'
const ADMIN_POST_SORT_OPTIONS = [
  { value: 'LATEST', label: '최신순' },
  { value: 'OLDEST', label: '오래된순' },
  { value: 'MOST_LIKED', label: '좋아요순' },
]
type AdminPostReviewFilter = 'ALL' | 'REPORTED' | 'NORMAL'
type AdminPostStatusTone = 'normal' | 'reported'

const ADMIN_POST_REVIEW_FILTERS: Array<{
  value: AdminPostReviewFilter
  label: string
}> = [
  { value: 'ALL', label: '전체' },
  { value: 'REPORTED', label: '신고 이력' },
  { value: 'NORMAL', label: '신고 없음' },
]
const ADMIN_POST_REPORT_STATUS_LABELS: Record<AdminPostReportStatus, string> = {
  PENDING: '처리 대기',
  ACCEPTED: '수락',
  DECLINED: '거절',
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

function getPostStatusTone(post: AdminPost): AdminPostStatusTone {
  const reports = getPostReports(post)

  return reports.length > 0 ? 'reported' : 'normal'
}

function getPostStatusLabel(post: AdminPost) {
  const reportCount = getPostReports(post).length

  if (reportCount > 0) {
    return `신고 이력 ${reportCount}`
  }

  return '신고 없음'
}

function getPostFilterCount(posts: AdminPost[], filter: AdminPostReviewFilter) {
  return posts.filter((post) => isPostMatchingReviewFilter(post, filter)).length
}

function isPostMatchingReviewFilter(
  post: AdminPost,
  filter: AdminPostReviewFilter
) {
  const reports = getPostReports(post)

  if (filter === 'REPORTED') {
    return reports.length > 0
  }

  if (filter === 'NORMAL') {
    return reports.length === 0
  }

  return true
}

function isPostMatchingSearch(post: AdminPost, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  const searchableText = [
    getPostTitle(post),
    getPostOwner(post),
    post.id,
    post.userId,
    post.placeName,
    post.description,
    post.createdAt,
    ...getPostReports(post).flatMap((report) => [
      report.reportId,
      report.reporterUserId,
      report.reporterUsername,
      report.reason,
      report.status,
    ]),
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedQuery)
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
  const { logout } = useAuth()
  const pageContentRef = useRef<HTMLElement | null>(null)
  const isSortEffectReadyRef = useRef(false)
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null)
  const [selectedSortParam, setSelectedSortParam] = useState<AdminPostSortParam>(
    DEFAULT_ADMIN_POST_SORT_PARAM
  )
  const [selectedReviewFilter, setSelectedReviewFilter] =
    useState<AdminPostReviewFilter>('ALL')
  const [postSearchQuery, setPostSearchQuery] = useState('')
  const {
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
  } = useAdminPosts({
    limit: ADMIN_POST_PAGE_SIZE,
  })
  const activePost = postDetail ?? selectedPost
  const selectedPostUrl = activePost ? getPostImageUrl(activePost) : ''
  const activeReports = activePost ? getPostReports(activePost) : []
  const currentPageNumber = page
  const isDeleting = deletingPostId !== null
  const hasClientOnlyPostFilter =
    selectedReviewFilter !== 'ALL' || postSearchQuery.trim().length > 0
  const showPagination = totalPages > 1 && !hasClientOnlyPostFilter
  const visiblePageNumbers = getVisiblePageNumbers(currentPageNumber, totalPages)
  const reviewFilterCounts = useMemo(
    () =>
      ADMIN_POST_REVIEW_FILTERS.reduce<Record<AdminPostReviewFilter, number>>(
        (counts, filter) => {
          counts[filter.value] = getPostFilterCount(posts, filter.value)

          return counts
        },
        {
          ALL: 0,
          REPORTED: 0,
          NORMAL: 0,
        }
      ),
    [posts]
  )
  const filteredPosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          isPostMatchingReviewFilter(post, selectedReviewFilter) &&
          isPostMatchingSearch(post, postSearchQuery)
      ),
    [postSearchQuery, posts, selectedReviewFilter]
  )
  const activePostIndex = activePost
    ? filteredPosts.findIndex((post) => post.id === activePost.id)
    : -1
  const nextReviewPost =
    activePostIndex >= 0 ? filteredPosts[activePostIndex + 1] ?? null : null
  const handleOpenPostDetail = useCallback(
    (post: AdminPost) => {
      setSelectedPost(post)
      void fetchAdminPostDetail(post.id)
    },
    [fetchAdminPostDetail]
  )
  const handleClosePostDetail = useCallback(() => {
    setSelectedPost(null)
    clearPostDetail()
  }, [clearPostDetail])
  const handlePageChange = (nextPage: number) => {
    const nextPageNumber = Math.min(Math.max(nextPage, 1), totalPages)

    if (nextPageNumber === currentPageNumber || isLoading || isDeleting) {
      return
    }

    void fetchAdminPosts({ page: nextPageNumber }).then((isSuccess) => {
      if (isSuccess) {
        window.requestAnimationFrame(() => {
          pageContentRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        })
      }
    })
  }

  const handleRefresh = () => {
    void fetchAdminPosts({
      page: currentPageNumber,
      sortParam: selectedSortParam,
    })
  }

  const handleDeleteActivePost = () => {
    if (!activePost || isLoading || isDeleting) {
      return
    }

    const shouldDelete = window.confirm(`게시글 #${activePost.id}을 삭제할까요?`)

    if (!shouldDelete) {
      return
    }

    const postToOpenAfterDelete = nextReviewPost

    void deletePost(activePost.id).then((isSuccess) => {
      if (!isSuccess) {
        return
      }

      if (postToOpenAfterDelete) {
        handleOpenPostDetail(postToOpenAfterDelete)

        return
      }

      handleClosePostDetail()
    })
  }

  useEffect(() => {
    if (!isSortEffectReadyRef.current) {
      isSortEffectReadyRef.current = true

      return
    }

    void fetchAdminPosts({
      page: 1,
      sortParam: selectedSortParam,
    })
  }, [fetchAdminPosts, selectedSortParam])

  useEffect(() => {
    if (!selectedPost) {
      return
    }

    function closeModalOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClosePostDetail()
      }
    }

    window.addEventListener('keydown', closeModalOnEscape)

    return () => {
      window.removeEventListener('keydown', closeModalOnEscape)
    }
  }, [handleClosePostDetail, selectedPost])

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.ProfileAvatar>
            <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
          </S.ProfileAvatar>
          <div>
            <S.SideTitle>관리자 패널</S.SideTitle>
            <S.SideCaption>핑덤</S.SideCaption>
          </div>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button">
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
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">settings</S.MaterialIcon>
            <span>설정</span>
          </S.MenuButton>
        </S.SideMenu>

        <S.SideFooter>
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

      <S.MainArea>
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
                {totalCount > 0
                  ? `업로드된 게시글 ${totalCount.toLocaleString()}개를 관리합니다.`
                  : '사용자가 업로드한 지도 게시글을 관리합니다.'}
              </S.PageDescription>
            </div>

            <S.HeaderActions>
              <S.OutlineButton type="button">
                <S.MaterialIcon aria-hidden="true">download</S.MaterialIcon>
                <span>목록 내보내기</span>
              </S.OutlineButton>
              <SortDropdown
                ariaLabel="게시글 목록 정렬"
                value={selectedSortParam}
                options={ADMIN_POST_SORT_OPTIONS}
                disabled={isLoading || isDeleting}
                width="112px"
                onChange={(value) => setSelectedSortParam(value as AdminPostSortParam)}
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
                  onClick={() => setSelectedReviewFilter(filter.value)}
                >
                  <span>{filter.label}</span>
                  <strong>{formatCount(reviewFilterCounts[filter.value])}</strong>
                </S.ReviewTabButton>
              ))}
            </S.ReviewTabList>
            <S.ReviewSearchField>
              <S.SearchIcon aria-hidden="true">search</S.SearchIcon>
              <S.ReviewSearchInput
                type="search"
                value={postSearchQuery}
                placeholder="게시글 ID, 작성자, 장소 검색"
                aria-label="게시글 검색"
                onChange={(event) => setPostSearchQuery(event.target.value)}
              />
            </S.ReviewSearchField>
          </S.ReviewToolbar>

          <S.ReviewResultSummary>
            {hasClientOnlyPostFilter
              ? `현재 페이지 필터 결과 ${filteredPosts.length.toLocaleString()}개 표시`
              : `현재 페이지 게시글 ${posts.length.toLocaleString()}개 표시`}
          </S.ReviewResultSummary>

          {isLoading ? (
            <S.FeedbackText>게시글 목록을 불러오는 중입니다.</S.FeedbackText>
          ) : null}

          {isError ? (
            <S.FeedbackText>{errorMessage}</S.FeedbackText>
          ) : null}

          {actionErrorMessage ? (
            <S.FeedbackText>{actionErrorMessage}</S.FeedbackText>
          ) : null}

          {!isLoading && !isError && posts.length === 0 ? (
            <S.FeedbackText>등록된 게시글이 없습니다.</S.FeedbackText>
          ) : null}

          {!isLoading && !isError && posts.length > 0 && filteredPosts.length === 0 ? (
            <S.FeedbackText>조건에 맞는 게시글이 없습니다.</S.FeedbackText>
          ) : null}

          {!isError && filteredPosts.length > 0 ? (
            <S.MediaGrid>
              {filteredPosts.map((post) => {
                const reportCount = getPostReports(post).length

                return (
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
                          <span>신고 {formatCount(reportCount)}건</span>
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
                )
              })}
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
                <S.ModalDescription>
                  게시글 ID: {activePost.id} · {getPostOwner(activePost)} ·{' '}
                  {activePost.placeName || '장소 정보 없음'}
                </S.ModalDescription>
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
                  <S.ModalStatusRow>
                    <S.StatusBadge $tone={getPostStatusTone(activePost)}>
                      {getPostStatusLabel(activePost)}
                    </S.StatusBadge>
                    <span>
                      신고 {formatCount(activeReports.length)}건 · 좋아요{' '}
                      {formatCount(activePost.likeCount)}
                    </span>
                  </S.ModalStatusRow>

                  <S.ModalInfoGrid>
                    <S.ModalInfoItem>
                      <span>게시글 ID</span>
                      <strong>{activePost.id}</strong>
                    </S.ModalInfoItem>
                    <S.ModalInfoItem>
                      <span>작성자 ID</span>
                      <strong>{activePost.userId}</strong>
                    </S.ModalInfoItem>
                    <S.ModalInfoItem>
                      <span>장소</span>
                      <strong>{activePost.placeName || '장소 정보 없음'}</strong>
                    </S.ModalInfoItem>
                    <S.ModalInfoItem>
                      <span>작성일</span>
                      <strong>{formatPostDate(activePost.createdAt)}</strong>
                    </S.ModalInfoItem>
                  </S.ModalInfoGrid>

                  {activePost.description ? (
                    <S.ModalPostDescription>
                      {activePost.description}
                    </S.ModalPostDescription>
                  ) : null}

                  <S.ModalSection>
                    <S.ModalSectionTitle>신고 내역</S.ModalSectionTitle>
                    {isDetailLoading ? (
                      <S.ModalEmptyText>
                        신고 내역을 불러오는 중입니다...
                      </S.ModalEmptyText>
                    ) : activeReports.length > 0 ? (
                      <S.ReportList>
                        {activeReports.map((report) => (
                          <S.ReportItem key={report.reportId}>
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
                              처리일: {formatOptionalPostDate(report.processedAt)}
                            </S.ReportMeta>
                          </S.ReportItem>
                        ))}
                      </S.ReportList>
                    ) : (
                      <S.ModalEmptyText>연결된 신고가 없습니다.</S.ModalEmptyText>
                    )}
                  </S.ModalSection>
                </S.ModalModerationPanel>
              </S.ModalReviewLayout>
            </S.ModalBody>

            <S.ModalFooter>
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
            </S.ModalFooter>
          </S.ModalContent>
        </S.ModalOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default MainPage
