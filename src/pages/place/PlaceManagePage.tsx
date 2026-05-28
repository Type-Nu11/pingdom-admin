import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as S from './PlaceManagePage.styles'

type PlaceStatus = 'normal' | 'reported'
type PlaceSort = 'latest' | 'oldest'

interface AdminPlace {
  id: string
  name: string
  coordinate: string
  author: string
  createdAt: string
  reportCount: number
  status: PlaceStatus
  memo: string
  photoCount: number
  markerPosition: {
    top: string
    left: string
  }
}

const adminPlaces: AdminPlace[] = []

function PlaceManagePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PlaceStatus>('all')
  const [selectedSort, setSelectedSort] = useState<PlaceSort>('latest')
  const [selectedPlace, setSelectedPlace] = useState<AdminPlace | null>(null)
  const [modalPlace, setModalPlace] = useState<AdminPlace | null>(null)
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)

  const filteredPlaces = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return adminPlaces.filter((place) => {
      const matchesKeyword =
        !normalizedKeyword ||
        place.name.toLowerCase().includes(normalizedKeyword) ||
        place.id.toLowerCase().includes(normalizedKeyword)
      const matchesStatus =
        selectedStatus === 'all' || place.status === selectedStatus

      return matchesKeyword && matchesStatus
    }).sort((a, b) => {
      if (selectedSort === 'latest') {
        return b.createdAt.localeCompare(a.createdAt)
      }

      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [keyword, selectedSort, selectedStatus])

  const closeModal = () => {
    setModalPlace(null)
    setIsDeleteConfirming(false)
  }

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
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 조회</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/main')}>
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
          <S.TopTitleGroup>
            <S.TopTitle>장소 관리</S.TopTitle>
          </S.TopTitleGroup>
          <S.TopActions>
            <S.IconButton type="button" aria-label="알림">
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
            <S.IconButton type="button" aria-label="도움말">
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
          </S.TopActions>
        </S.TopBar>

        <S.SplitContent>
          <S.PlacePanel>
            <S.PanelControls>
              <S.SearchField>
                <S.SearchIcon aria-hidden="true">search</S.SearchIcon>
                <S.SearchInput
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="장소명 또는 ID 검색"
                />
              </S.SearchField>

              <S.FilterRow>
                <S.Select
                  aria-label="장소 정렬"
                  value={selectedSort}
                  onChange={(event) => setSelectedSort(event.target.value as PlaceSort)}
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                </S.Select>
                <S.Select
                  aria-label="장소 상태 필터"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as 'all' | PlaceStatus)
                  }
                >
                  <option value="all">전체 상태</option>
                  <option value="normal">일반</option>
                </S.Select>
                <S.IconFilterButton
                  type="button"
                  aria-label="장소 목록 새로고침"
                  onClick={() => {
                    setKeyword('')
                    setSelectedStatus('all')
                    setSelectedSort('latest')
                  }}
                >
                  <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
                </S.IconFilterButton>
              </S.FilterRow>
            </S.PanelControls>

            <S.PlaceList aria-label="장소 목록">
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((place) => {
                  const isSelected = selectedPlace?.id === place.id

                  return (
                    <S.PlaceItem
                      key={place.id}
                      type="button"
                      $active={isSelected}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <S.PlaceThumb>
                        <S.MaterialIcon aria-hidden="true">location_city</S.MaterialIcon>
                      </S.PlaceThumb>
                      <S.PlaceInfo>
                        <S.PlaceTitleRow>
                          <S.PlaceName>{place.name}</S.PlaceName>
                          {place.reportCount > 0 ? (
                            <S.ReportBadge>{place.reportCount}건</S.ReportBadge>
                          ) : null}
                        </S.PlaceTitleRow>
                        <S.PlaceCaption>{place.id}</S.PlaceCaption>
                        <S.PlaceMeta>
                          <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
                          <span>{place.coordinate}</span>
                        </S.PlaceMeta>
                        <S.PlaceFooter>
                          <span>{place.author}</span>
                          <span>{place.createdAt}</span>
                        </S.PlaceFooter>
                      </S.PlaceInfo>
                    </S.PlaceItem>
                  )
                })
              ) : (
                <S.EmptyState>조건에 맞는 장소가 없습니다.</S.EmptyState>
              )}
            </S.PlaceList>

            {filteredPlaces.length > 0 ? (
              <S.PanelPagination>
                <S.PageButton type="button" disabled>
                  이전
                </S.PageButton>
                <S.PageIndicator>1</S.PageIndicator>
                <S.PageButton type="button" disabled>
                  다음
                </S.PageButton>
              </S.PanelPagination>
            ) : null}
          </S.PlacePanel>

          <S.MapPanel>
            <S.AdminMap />
            <S.MapMarkerLayer>
              {filteredPlaces.map((place) => {
                const isSelected = selectedPlace?.id === place.id

                return (
                  <S.MapMarker
                    key={place.id}
                    type="button"
                    $active={isSelected}
                    style={{
                      top: place.markerPosition.top,
                      left: place.markerPosition.left,
                    }}
                    onClick={() => {
                      setSelectedPlace(place)
                      setModalPlace(place)
                    }}
                  >
                    <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
                    <S.MarkerTooltip>{place.name}</S.MarkerTooltip>
                  </S.MapMarker>
                )
              })}
            </S.MapMarkerLayer>
            <S.MapControlGroup>
              <S.MapControlButton type="button" aria-label="지도 확대">
                <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
              </S.MapControlButton>
              <S.MapControlButton type="button" aria-label="지도 축소">
                <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
              </S.MapControlButton>
              <S.MapControlButton type="button" aria-label="선택 장소로 이동">
                <S.MaterialIcon aria-hidden="true">my_location</S.MaterialIcon>
              </S.MapControlButton>
            </S.MapControlGroup>
            <S.MapInfo>
              <S.MapInfoDot />
              <span>
                {selectedPlace
                  ? `선택된 장소: ${selectedPlace.name}`
                  : '선택된 장소가 없습니다.'}
              </span>
            </S.MapInfo>
          </S.MapPanel>
        </S.SplitContent>
      </S.MainArea>

      {modalPlace ? (
        <S.ModalOverlay
          role="presentation"
          onMouseDown={closeModal}
        >
          <S.PlaceModal
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.ModalHeader>
              <S.ModalTitle id="place-modal-title">{modalPlace.name}</S.ModalTitle>
              <S.ModalCloseButton
                type="button"
                aria-label="장소 상세 닫기"
                onClick={closeModal}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.ModalCloseButton>
            </S.ModalHeader>

            <S.ModalBody>
              <S.DetailGrid>
                <S.DetailItem>
                  <S.DetailLabel>장소 ID</S.DetailLabel>
                  <S.DetailValue>{modalPlace.id}</S.DetailValue>
                </S.DetailItem>
                <S.DetailItem>
                  <S.DetailLabel>좌표</S.DetailLabel>
                  <S.DetailValue>{modalPlace.coordinate}</S.DetailValue>
                </S.DetailItem>
                <S.DetailItem>
                  <S.DetailLabel>작성자</S.DetailLabel>
                  <S.DetailValue>{modalPlace.author}</S.DetailValue>
                </S.DetailItem>
                <S.DetailItem>
                  <S.DetailLabel>등록일</S.DetailLabel>
                  <S.DetailValue>{modalPlace.createdAt}</S.DetailValue>
                </S.DetailItem>
              </S.DetailGrid>

              {modalPlace.reportCount > 0 ? (
                <S.ReportNotice>
                  <S.MaterialIcon aria-hidden="true">report</S.MaterialIcon>
                  <div>
                    <S.ReportTitle>{modalPlace.reportCount}건의 신고가 있습니다.</S.ReportTitle>
                    <S.ReportDescription>{modalPlace.memo}</S.ReportDescription>
                  </div>
                </S.ReportNotice>
              ) : null}

              <S.PhotoLink type="button">
                <S.MaterialIcon aria-hidden="true">photo_library</S.MaterialIcon>
                <span>연결된 사진 {modalPlace.photoCount}개</span>
              </S.PhotoLink>

              <S.MemoBox>
                <S.DetailLabel>관리 메모</S.DetailLabel>
                <S.MemoTextarea
                  placeholder="관리자 확인 내용을 입력하세요."
                  defaultValue={modalPlace.memo}
                />
              </S.MemoBox>

              {isDeleteConfirming ? (
                <S.DeleteWarning>
                  <S.MaterialIcon aria-hidden="true">warning</S.MaterialIcon>
                  <span>
                    정말 이 장소를 삭제할까요? 이 작업은 되돌릴 수 없습니다.
                  </span>
                </S.DeleteWarning>
              ) : null}
            </S.ModalBody>

            <S.ModalFooter>
              {isDeleteConfirming ? (
                <>
                  <S.SecondaryButton
                    type="button"
                    onClick={() => setIsDeleteConfirming(false)}
                  >
                    취소
                  </S.SecondaryButton>
                  <S.DangerButton type="button" onClick={closeModal}>
                    삭제 확정
                  </S.DangerButton>
                </>
              ) : (
                <>
                  <S.SecondaryButton type="button" onClick={closeModal}>
                    닫기
                  </S.SecondaryButton>
                  <S.DangerOutlineButton
                    type="button"
                    onClick={() => setIsDeleteConfirming(true)}
                  >
                    장소 삭제
                  </S.DangerOutlineButton>
                </>
              )}
            </S.ModalFooter>
          </S.PlaceModal>
        </S.ModalOverlay>
      ) : null}
    </S.AppShell>
  )
}

export default PlaceManagePage
