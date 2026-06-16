import { useCallback, useEffect, useRef, useState } from 'react'
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
const ADMIN_POST_REPORT_STATUS_LABELS: Record<AdminPostReportStatus, string> = {
  PENDING: '대기',
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

function getPendingReportCount(post: AdminPost) {
  return getPostReports(post).filter((report) => report.status === 'PENDING').length
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
      <S.MediaBadge>
        <S.MaterialIcon aria-hidden="true">image</S.MaterialIcon>
        <span>게시글</span>
      </S.MediaBadge>
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
  const showPagination = totalPages > 1
  const isDeleting = deletingPostId !== null
  const visiblePageNumbers = getVisiblePageNumbers(currentPageNumber, totalPages)
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
                  ? `업로드된 게시글 ${totalCount}개를 관리합니다.`
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

          {!isError && posts.length > 0 ? (
            <S.MediaGrid>
              {posts.map((post) => {
                const reportCount = getPostReports(post).length
                const pendingReportCount = getPendingReportCount(post)

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
                        <S.StatusBadge>
                          {pendingReportCount > 0 ? `신고 ${pendingReportCount}` : '정상'}
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

                      <S.CardActions>
                        <S.CardButton
                          type="button"
                          disabled={deletingPostId !== null}
                          onClick={(event) => {
                            event.stopPropagation()
                            const shouldDelete = window.confirm(
                              `게시글 #${post.id}을 삭제할까요?`
                            )

                            if (shouldDelete) {
                              void deletePost(post.id)
                            }
                          }}
                        >
                          {deletingPostId === post.id ? '삭제 중' : '삭제'}
                        </S.CardButton>
                        <S.IconCardButton
                          type="button"
                          aria-label={`게시글 ${post.id} 보기`}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleOpenPostDetail(post)
                          }}
                        >
                          <S.MaterialIcon aria-hidden="true">visibility</S.MaterialIcon>
                        </S.IconCardButton>
                      </S.CardActions>
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

              <S.ModalInfoGrid>
                <S.ModalInfoItem>
                  <span>작성자 ID</span>
                  <strong>{activePost.userId}</strong>
                </S.ModalInfoItem>
                <S.ModalInfoItem>
                  <span>좋아요</span>
                  <strong>{formatCount(activePost.likeCount)}</strong>
                </S.ModalInfoItem>
                <S.ModalInfoItem>
                  <span>작성일</span>
                  <strong>{formatPostDate(activePost.createdAt)}</strong>
                </S.ModalInfoItem>
                <S.ModalInfoItem>
                  <span>신고</span>
                  <strong>{formatCount(activeReports.length)}건</strong>
                </S.ModalInfoItem>
              </S.ModalInfoGrid>

              {activePost.description ? (
                <S.ModalPostDescription>{activePost.description}</S.ModalPostDescription>
              ) : null}

              <S.ModalSection>
                <S.ModalSectionTitle>신고 내역</S.ModalSectionTitle>
                {activeReports.length > 0 ? (
                  <S.ReportList>
                    {activeReports.map((report) => (
                      <S.ReportItem key={report.reportId}>
                        <S.ReportHeader>
                          <div>
                            <S.ReportReporter>{getReporterName(report)}</S.ReportReporter>
                            <S.ReportMeta>
                              신고자 ID: {report.reporterUserId} · 신고 ID:{' '}
                              {report.reportId}
                            </S.ReportMeta>
                          </div>
                          <S.ReportStatusBadge $status={report.status}>
                            {getReportStatusLabel(report.status)}
                          </S.ReportStatusBadge>
                        </S.ReportHeader>
                        <S.ReportReason>{report.reason || '신고 사유 없음'}</S.ReportReason>
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
            </S.ModalBody>
          </S.ModalContent>
        </S.ModalOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default MainPage
