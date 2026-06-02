import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminPictures } from '../../hooks/useAdminPictures'
import { useAuth } from '../../hooks/useAuth'
import type { AdminPicture, AdminPictureSortParam } from '../../types/adminPicture.types'
import * as S from './MainPage.styles'

const ADMIN_PICTURE_PAGE_SIZE = 20
const MAX_VISIBLE_PAGE_NUMBER_COUNT = 5
const DEFAULT_ADMIN_PICTURE_SORT_PARAM: AdminPictureSortParam = 'LATEST'
const ADMIN_PICTURE_FEATURE_ENABLED = false

function getPictureThumbnailUrl(picture: AdminPicture) {
  return picture.thumbnailUrl
}

function getPictureImageUrl(picture: AdminPicture) {
  return picture.imageUrl
}

function getPictureOwner(picture: AdminPicture) {
  if (picture.username) {
    return picture.username
  }

  if (typeof picture.userId === 'number') {
    return `사용자 ID: ${picture.userId}`
  }

  return '작성자 정보 없음'
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getPictureName(picture: AdminPicture) {
  const pictureUrl = getPictureImageUrl(picture)

  if (!pictureUrl) {
    return `사진-${picture.id}`
  }

  const pictureUrlWithoutQuery = pictureUrl.split('?')[0]

  return safeDecodeURIComponent(
    pictureUrlWithoutQuery.split('/').pop() ?? `사진-${picture.id}`
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
  const [selectedPicture, setSelectedPicture] = useState<AdminPicture | null>(null)
  const [selectedSortParam, setSelectedSortParam] = useState<AdminPictureSortParam>(
    DEFAULT_ADMIN_PICTURE_SORT_PARAM
  )
  const {
    pictures,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isError,
    errorMessage,
    actionErrorMessage,
    deletingPictureId,
    fetchAdminPictures,
    deletePicture,
  } = useAdminPictures({
    limit: ADMIN_PICTURE_PAGE_SIZE,
    enabled: ADMIN_PICTURE_FEATURE_ENABLED,
  })
  const selectedPictureUrl = selectedPicture ? getPictureImageUrl(selectedPicture) : ''
  const currentPageNumber = page
  const showPagination = totalPages > 1
  const isDeleting = deletingPictureId !== null
  const isPictureFeatureDisabled = !ADMIN_PICTURE_FEATURE_ENABLED
  const visiblePageNumbers = getVisiblePageNumbers(currentPageNumber, totalPages)
  const handlePageChange = (nextPage: number) => {
    if (isPictureFeatureDisabled) {
      return
    }

    const nextPageNumber = Math.min(Math.max(nextPage, 1), totalPages)

    if (nextPageNumber === currentPageNumber || isLoading || isDeleting) {
      return
    }

    void fetchAdminPictures({ page: nextPageNumber }).then((isSuccess) => {
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
    if (isPictureFeatureDisabled) {
      return
    }

    void fetchAdminPictures({
      page: currentPageNumber,
      sortParam: selectedSortParam,
    })
  }

  const handleClearFilters = () => {
    if (isPictureFeatureDisabled) {
      return
    }

    if (selectedSortParam === DEFAULT_ADMIN_PICTURE_SORT_PARAM) {
      void fetchAdminPictures({
        page: 1,
        sortParam: DEFAULT_ADMIN_PICTURE_SORT_PARAM,
      })

      return
    }

    setSelectedSortParam(DEFAULT_ADMIN_PICTURE_SORT_PARAM)
  }

  useEffect(() => {
    if (!isSortEffectReadyRef.current) {
      isSortEffectReadyRef.current = true

      return
    }

    void fetchAdminPictures({
      page: 1,
      sortParam: selectedSortParam,
    })
  }, [fetchAdminPictures, selectedSortParam])

  useEffect(() => {
    if (!selectedPicture) {
      return
    }

    function closeModalOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedPicture(null)
      }
    }

    window.addEventListener('keydown', closeModalOnEscape)

    return () => {
      window.removeEventListener('keydown', closeModalOnEscape)
    }
  }, [selectedPicture])

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.ProfileAvatar>
            <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
          </S.ProfileAvatar>
          <div>
            <S.SideTitle>관리자 패널</S.SideTitle>
            <S.SideCaption>운영 MVP</S.SideCaption>
          </div>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/places')}>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 조회</span>
          </S.MenuButton>
          <S.MenuButton type="button" $active>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>콘텐츠 목록</span>
          </S.MenuButton>
          <S.MenuButton type="button">
            <S.MaterialIcon aria-hidden="true">gavel</S.MaterialIcon>
            <span>신고 관리</span>
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
              logout()
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
          <S.TopTitle>관리자 운영</S.TopTitle>
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
              <S.PageTitle>업로드 미디어</S.PageTitle>
              <S.PageDescription>
                {isPictureFeatureDisabled
                  ? '사진 목록 API 연동은 준비 중입니다.'
                  : totalCount > 0
                  ? `업로드된 사진 ${totalCount}개를 관리합니다.`
                  : '사용자가 업로드한 지도 사진을 관리합니다.'}
              </S.PageDescription>
            </div>

            <S.HeaderActions>
              <S.OutlineButton type="button">
                <S.MaterialIcon aria-hidden="true">download</S.MaterialIcon>
                <span>목록 내보내기</span>
              </S.OutlineButton>
              <S.PrimaryButton
                type="button"
                disabled={isPictureFeatureDisabled || isLoading || isDeleting}
                onClick={handleRefresh}
              >
                <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                <span>
                  {isPictureFeatureDisabled
                    ? '준비 중'
                    : isLoading
                      ? '불러오는 중'
                      : '새로고침'}
                </span>
              </S.PrimaryButton>
            </S.HeaderActions>
          </S.PageHeader>

          <S.FilterBar>
            <S.FilterLabel>
              <S.MaterialIcon aria-hidden="true">filter_list</S.MaterialIcon>
              <span>필터</span>
            </S.FilterLabel>
            <S.Select
              aria-label="사진 목록 정렬"
              value={selectedSortParam}
              disabled={isPictureFeatureDisabled}
              onChange={(event) =>
                setSelectedSortParam(event.target.value as AdminPictureSortParam)
              }
            >
              <option value="LATEST">최신순</option>
              <option value="OLDEST">오래된순</option>
            </S.Select>
            <S.ClearButton
              type="button"
              disabled={isPictureFeatureDisabled}
              onClick={handleClearFilters}
            >
              필터 초기화
            </S.ClearButton>
          </S.FilterBar>

          {isPictureFeatureDisabled ? (
            <S.FeedbackText>
              사진 목록 조회는 현재 비활성화되어 있습니다. 장소 조회 기능부터 확인해주세요.
            </S.FeedbackText>
          ) : null}

          {!isPictureFeatureDisabled && isLoading ? (
            <S.FeedbackText>사진 목록을 불러오는 중입니다.</S.FeedbackText>
          ) : null}

          {!isPictureFeatureDisabled && isError ? (
            <S.FeedbackText>{errorMessage}</S.FeedbackText>
          ) : null}

          {!isPictureFeatureDisabled && actionErrorMessage ? (
            <S.FeedbackText>{actionErrorMessage}</S.FeedbackText>
          ) : null}

          {!isPictureFeatureDisabled && !isLoading && !isError && pictures.length === 0 ? (
            <S.FeedbackText>등록된 사진이 없습니다.</S.FeedbackText>
          ) : null}

          {!isPictureFeatureDisabled && !isError && pictures.length > 0 ? (
            <S.MediaGrid>
              {pictures.map((picture) => {
                const pictureUrl = getPictureThumbnailUrl(picture)

                return (
                  <S.MediaCard
                    key={picture.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPicture(picture)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedPicture(picture)
                      }
                    }}
                  >
                    <S.MediaPreview>
                      {pictureUrl ? (
                        <S.MediaImage
                          src={pictureUrl}
                          alt={`업로드 사진 ${picture.id}`}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <S.MediaFallback>이미지 없음</S.MediaFallback>
                      )}
                      <S.MediaBadge>
                        <S.MaterialIcon aria-hidden="true">image</S.MaterialIcon>
                        <span>사진</span>
                      </S.MediaBadge>
                    </S.MediaPreview>

                    <S.MediaBody>
                      <S.MediaTitleRow>
                        <S.MediaTitle>{getPictureName(picture)}</S.MediaTitle>
                        <S.StatusBadge>업로드됨</S.StatusBadge>
                      </S.MediaTitleRow>

                      <S.MediaMetaList>
                        <S.MediaMeta>
                          <S.MaterialIcon aria-hidden="true">person</S.MaterialIcon>
                          <span>{getPictureOwner(picture)}</span>
                        </S.MediaMeta>
                        <S.MediaMeta>
                          <S.MaterialIcon aria-hidden="true">tag</S.MaterialIcon>
                          <span>사진 ID: {picture.id}</span>
                        </S.MediaMeta>
                      </S.MediaMetaList>

                      <S.CardActions>
                        <S.CardButton
                          type="button"
                          disabled={deletingPictureId !== null}
                          onClick={(event) => {
                            event.stopPropagation()
                            const shouldDelete = window.confirm(
                              `사진 #${picture.id}을 삭제할까요?`
                            )

                            if (shouldDelete) {
                              void deletePicture(picture.id)
                            }
                          }}
                        >
                          {deletingPictureId === picture.id ? '삭제 중' : '삭제'}
                        </S.CardButton>
                        <S.IconCardButton
                          type="button"
                          aria-label={`사진 ${picture.id} 보기`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedPicture(picture)
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

          {!isPictureFeatureDisabled && !isError && showPagination ? (
            <S.Pagination aria-label="사진 목록 페이지네이션">
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

      {selectedPicture ? (
        <S.ModalOverlay
          role="presentation"
          onMouseDown={() => setSelectedPicture(null)}
        >
          <S.ModalContent
            role="dialog"
            aria-modal="true"
            aria-labelledby="picture-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.ModalHeader>
              <div>
                <S.ModalTitle id="picture-modal-title">
                  {getPictureName(selectedPicture)}
                </S.ModalTitle>
                <S.ModalDescription>
                  사진 ID: {selectedPicture.id} · {getPictureOwner(selectedPicture)}
                </S.ModalDescription>
              </div>
              <S.ModalCloseButton
                type="button"
                aria-label="이미지 미리보기 닫기"
                onClick={() => setSelectedPicture(null)}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.ModalCloseButton>
            </S.ModalHeader>

            <S.ModalImageFrame>
              {selectedPictureUrl ? (
                <S.ModalImage
                  src={selectedPictureUrl}
                  alt={`업로드 사진 ${selectedPicture.id} 크게 보기`}
                />
              ) : (
                <S.ModalFallback>이미지 없음</S.ModalFallback>
              )}
            </S.ModalImageFrame>

            <S.ModalMeta>{selectedPicture.imageUrl}</S.ModalMeta>
          </S.ModalContent>
        </S.ModalOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default MainPage
