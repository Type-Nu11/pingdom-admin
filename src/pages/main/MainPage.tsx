import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminPictures } from '../../hooks/useAdminPictures'
import { useAuth } from '../../hooks/useAuth'
import type { AdminPicture } from '../../types/adminPicture.types'
import * as S from './MainPage.styles'

const ADMIN_PICTURE_FETCH_LIMIT = 100
const ADMIN_PICTURE_PAGE_SIZE = 20

function getPictureUrl(picture: AdminPicture) {
  return picture.url ?? picture.imageUrl ?? picture.pictureUrl ?? ''
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

function getPictureName(picture: AdminPicture) {
  if (picture.s3Key) {
    return decodeURIComponent(picture.s3Key.split('/').pop() ?? picture.s3Key)
  }

  const pictureUrl = getPictureUrl(picture)

  if (!pictureUrl) {
    return `사진-${picture.id}`
  }

  return decodeURIComponent(pictureUrl.split('/').pop() ?? `사진-${picture.id}`)
}

function MainPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [selectedPicture, setSelectedPicture] = useState<AdminPicture | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const {
    pictures,
    isLoading,
    isError,
    errorMessage,
    actionErrorMessage,
    deletingPictureId,
    fetchAdminPictures,
    deletePicture,
  } = useAdminPictures(ADMIN_PICTURE_FETCH_LIMIT)
  const selectedPictureUrl = selectedPicture ? getPictureUrl(selectedPicture) : ''
  const totalPages = Math.max(1, Math.ceil(pictures.length / ADMIN_PICTURE_PAGE_SIZE))
  const currentPageNumber = Math.min(currentPage, totalPages)
  const pageStartIndex = (currentPageNumber - 1) * ADMIN_PICTURE_PAGE_SIZE
  const currentPagePictures = pictures.slice(
    pageStartIndex,
    pageStartIndex + ADMIN_PICTURE_PAGE_SIZE
  )
  const showPagination = pictures.length > ADMIN_PICTURE_PAGE_SIZE

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
            <S.SearchBox>
              <S.SearchIcon aria-hidden="true">search</S.SearchIcon>
              <S.SearchInput type="search" placeholder="운영 항목 검색" />
            </S.SearchBox>
            <S.IconButton type="button" aria-label="알림">
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
            <S.IconButton type="button" aria-label="도움말">
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
            <S.ProfileLink to="/profile" aria-label="프로필 페이지로 이동">
              <S.MaterialIcon aria-hidden="true">person</S.MaterialIcon>
            </S.ProfileLink>
          </S.TopActions>
        </S.TopBar>

        <S.PageContent>
          <S.PageHeader>
            <div>
              <S.PageTitle>업로드 미디어</S.PageTitle>
              <S.PageDescription>
                {pictures.length > 0
                  ? `업로드된 사진 ${pictures.length}개를 관리합니다.`
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
                disabled={isLoading}
                onClick={() => {
                  void fetchAdminPictures()
                }}
              >
                <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                <span>{isLoading ? '불러오는 중' : '새로고침'}</span>
              </S.PrimaryButton>
            </S.HeaderActions>
          </S.PageHeader>

          <S.FilterBar>
            <S.FilterLabel>
              <S.MaterialIcon aria-hidden="true">filter_list</S.MaterialIcon>
              <span>필터</span>
            </S.FilterLabel>
            <S.Select aria-label="상태 필터" defaultValue="all">
              <option value="all">전체 상태</option>
              <option value="uploaded">업로드됨</option>
            </S.Select>
            <S.Select aria-label="타입 필터" defaultValue="photo">
              <option value="photo">사진</option>
            </S.Select>
            <S.DateInput type="text" placeholder="기간" />
            <S.ClearButton type="button">필터 초기화</S.ClearButton>
          </S.FilterBar>

          {isLoading ? <S.FeedbackText>사진 목록을 불러오는 중입니다.</S.FeedbackText> : null}

          {isError ? <S.FeedbackText>{errorMessage}</S.FeedbackText> : null}

          {actionErrorMessage ? (
            <S.FeedbackText>{actionErrorMessage}</S.FeedbackText>
          ) : null}

          {!isLoading && !isError && pictures.length === 0 ? (
            <S.FeedbackText>등록된 사진이 없습니다.</S.FeedbackText>
          ) : null}

          {!isError && pictures.length > 0 ? (
            <S.MediaGrid>
              {currentPagePictures.map((picture) => {
                const pictureUrl = getPictureUrl(picture)

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
                        <S.MediaImage src={pictureUrl} alt={`업로드 사진 ${picture.id}`} />
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

          {!isError && showPagination ? (
            <S.Pagination aria-label="사진 목록 페이지네이션">
              <S.PaginationButton
                type="button"
                disabled={currentPageNumber === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPageNumber - 1))}
              >
                <S.MaterialIcon aria-hidden="true">chevron_left</S.MaterialIcon>
                <span>이전</span>
              </S.PaginationButton>

              <S.PageNumberList>
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1

                  return (
                    <S.PageNumberButton
                      key={pageNumber}
                      type="button"
                      $active={currentPageNumber === pageNumber}
                      aria-current={currentPageNumber === pageNumber ? 'page' : undefined}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </S.PageNumberButton>
                  )
                })}
              </S.PageNumberList>

              <S.PaginationButton
                type="button"
                disabled={currentPageNumber === totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPageNumber + 1))}
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

            {selectedPicture.s3Key ? (
              <S.ModalMeta>{selectedPicture.s3Key}</S.ModalMeta>
            ) : null}
          </S.ModalContent>
        </S.ModalOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default MainPage
