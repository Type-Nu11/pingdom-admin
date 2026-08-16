import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminPlace } from '../../api/adminPlaceApi'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import {
  useAdminPlaceDuplicateCandidates,
  type AdminPlaceDuplicateReviewAction,
} from '../../hooks/useAdminPlaceDuplicateCandidates'
import { useAuth } from '../../hooks/useAuth'
import type { AdminPlaceDetail } from '../../types/adminPlace.types'
import type {
  AdminPlaceDuplicateCandidateStatus,
  AdminPlaceDuplicateReviewCandidate,
} from '../../types/adminPlaceMerge.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as S from '../placeMerge/PlaceMergePage.styles'

const STATUS_OPTIONS: Array<{
  value: AdminPlaceDuplicateCandidateStatus
  label: string
}> = [
  { value: 'PENDING', label: '검토 대기' },
  { value: 'CONFIRMED', label: '중복 확정' },
  { value: 'REJECTED', label: '중복 아님' },
  { value: 'MERGED', label: '병합 완료' },
]

type ReviewDialogState = AdminPlaceDuplicateReviewAction | null

function formatDate(value?: string | null) {
  if (!value) {
    return '정보 없음'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function getStatusLabel(status: AdminPlaceDuplicateCandidateStatus) {
  return STATUS_OPTIONS.find(({ value }) => value === status)?.label ?? status
}

function getConfidenceLabel(value: number) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '-'
}

function PlaceDetailCard({
  place,
  label,
  selected,
  onSelect,
}: {
  place: AdminPlaceDetail
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <S.PlaceCard $variant={selected ? 'target' : 'source'}>
      <S.PlaceCardHeader>
        <div>
          <S.PlaceCardLabel>{label}</S.PlaceCardLabel>
          <S.PlaceCardTitle title={place.name}>{place.name}</S.PlaceCardTitle>
        </div>
        <S.StatusTag $variant={selected ? 'target' : 'source'}>
          {selected ? '병합 후 유지' : `장소 #${place.id}`}
        </S.StatusTag>
      </S.PlaceCardHeader>
      <S.MetaList>
        <S.MetaRow>
          <dt>장소 ID</dt>
          <dd>{place.id}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>주소</dt>
          <dd title={place.address}>{place.address || '주소 정보 없음'}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>등록자</dt>
          <dd>{place.username || `사용자 ID ${place.userId}`}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>게시글</dt>
          <dd>{place.postCount.toLocaleString()}개</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>좌표</dt>
          <dd>{`${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>Kakao ID</dt>
          <dd>{place.kakaoPlaceId || '연결 정보 없음'}</dd>
        </S.MetaRow>
      </S.MetaList>
      <S.SecondaryButton type="button" disabled={selected} onClick={onSelect}>
        {selected ? '유지 장소로 선택됨' : '이 장소 유지'}
      </S.SecondaryButton>
    </S.PlaceCard>
  )
}

function PlaceDuplicateCandidatePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null)
  const [placeDetails, setPlaceDetails] = useState<Record<number, AdminPlaceDetail>>({})
  const [isPlacesLoading, setIsPlacesLoading] = useState(false)
  const [placesErrorMessage, setPlacesErrorMessage] = useState('')
  const [dialogState, setDialogState] = useState<ReviewDialogState>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [targetPlaceId, setTargetPlaceId] = useState<number | null>(null)
  const [hasConfirmedMerge, setHasConfirmedMerge] = useState(false)
  const [formError, setFormError] = useState('')
  const latestPlacesRequestIdRef = useRef(0)
  const dialogCloseButtonRef = useRef<HTMLButtonElement | null>(null)
  const {
    status,
    candidates,
    totalCount,
    candidateDetail,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchCandidates,
    fetchCandidateDetail,
    clearCandidateDetail,
    confirmCandidate,
    rejectCandidate,
    mergeCandidate,
  } = useAdminPlaceDuplicateCandidates()
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const loadComparedPlaces = useCallback(async (candidate: AdminPlaceDuplicateReviewCandidate) => {
    const requestId = latestPlacesRequestIdRef.current + 1
    latestPlacesRequestIdRef.current = requestId
    setIsPlacesLoading(true)
    setPlacesErrorMessage('')

    try {
      const details = await Promise.all([
        getAdminPlace(candidate.leftPlaceId),
        getAdminPlace(candidate.rightPlaceId),
      ])

      if (requestId === latestPlacesRequestIdRef.current) {
        setPlaceDetails(Object.fromEntries(details.map((place) => [place.id, place])))
        setTargetPlaceId(candidate.leftPlaceId)
      }
    } catch {
      if (requestId === latestPlacesRequestIdRef.current) {
        setPlaceDetails({})
        setPlacesErrorMessage('비교할 장소 상세 정보를 불러오지 못했습니다.')
      }
    } finally {
      if (requestId === latestPlacesRequestIdRef.current) {
        setIsPlacesLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (candidateDetail) {
      void loadComparedPlaces(candidateDetail)
    }
  }, [candidateDetail, loadComparedPlaces])

  useEffect(() => {
    if (!dialogState) {
      return
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    dialogCloseButtonRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeAction === null) {
        setDialogState(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      previouslyFocusedElement?.focus()
    }
  }, [activeAction, dialogState])

  const handleStatusChange = (nextStatus: AdminPlaceDuplicateCandidateStatus) => {
    setSelectedCandidateId(null)
    setPlaceDetails({})
    clearCandidateDetail()
    void fetchCandidates(nextStatus)
  }

  const handleSelectCandidate = (candidateId: number) => {
    setSelectedCandidateId(candidateId)
    setPlaceDetails({})
    setPlacesErrorMessage('')
    void fetchCandidateDetail(candidateId)
  }

  const openDialog = (action: AdminPlaceDuplicateReviewAction) => {
    setReviewNote('')
    setHasConfirmedMerge(false)
    setFormError('')
    setDialogState(action)
  }

  const closeDialog = () => {
    if (activeAction === null) {
      setDialogState(null)
    }
  }

  const completeAction = () => {
    setDialogState(null)
    setSelectedCandidateId(null)
    setPlaceDetails({})
    clearCandidateDetail()
  }

  const handleSubmitAction = async () => {
    if (!candidateDetail || !dialogState || activeAction !== null) {
      return
    }

    setFormError('')
    if (dialogState === 'merge') {
      if (
        !targetPlaceId ||
        ![candidateDetail.leftPlaceId, candidateDetail.rightPlaceId].includes(
          targetPlaceId
        )
      ) {
        setFormError('병합 후 유지할 장소를 선택해주세요.')
        return
      }
      if (!hasConfirmedMerge) {
        setFormError('병합 영향 범위를 확인해주세요.')
        return
      }

      if (await mergeCandidate(candidateDetail.candidateId, { targetPlaceId })) {
        completeAction()
      }
      return
    }

    if (!reviewNote.trim()) {
      setFormError('판정 사유를 입력해주세요.')
      return
    }

    const request = { reviewNote: reviewNote.trim() }
    const result =
      dialogState === 'confirm'
        ? await confirmCandidate(candidateDetail.candidateId, request)
        : await rejectCandidate(candidateDetail.candidateId, request)

    if (result) {
      completeAction()
    }
  }

  const leftPlace = candidateDetail
    ? placeDetails[candidateDetail.leftPlaceId]
    : undefined
  const rightPlace = candidateDetail
    ? placeDetails[candidateDetail.rightPlaceId]
    : undefined

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </Shell.BrandLockup>
        </Shell.SideHeader>
        <Shell.SideMenu>
          <AdminNavigationMenu />
        </Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정">
            <Shell.AdminProfileIcon>
              <Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon>
            </Shell.AdminProfileIcon>
            <Shell.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton
            type="button"
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
          >
            <Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon>
            <span>로그아웃</span>
          </Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>

      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup>
            <Shell.TopTitle>중복 후보 검토</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton
              type="button"
              aria-label="후보 새로고침"
              disabled={isLoading || activeAction !== null}
              onClick={() => void fetchCandidates(status)}
            >
              <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
            </Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <S.Content>
          <S.PageStack>
            <S.PageHeader>
              <div>
                <S.Eyebrow>장소 관리 &gt; 중복 후보 검토</S.Eyebrow>
                <S.PageTitle>중복 장소 후보 검토</S.PageTitle>
                <S.PageDescription>
                  서버가 탐지한 두 장소를 비교해 중복 여부를 판정하고, 확정된 후보만
                  병합합니다.
                </S.PageDescription>
              </div>
              <S.HeaderActions>
                <S.HeaderButton type="button" onClick={() => navigate('/places/duplicates')}>
                  기존 병합·복구 이력
                </S.HeaderButton>
                <S.HeaderButton type="button" onClick={() => navigate('/places')}>
                  장소 관리
                </S.HeaderButton>
              </S.HeaderActions>
            </S.PageHeader>

            {actionErrorMessage ? <S.Notice $variant="error">{actionErrorMessage}</S.Notice> : null}
            {actionSuccessMessage ? <S.Notice $variant="success">{actionSuccessMessage}</S.Notice> : null}

            <S.Panel>
              <S.PanelHeader>
                <div>
                  <S.PanelTitle>검토 상태</S.PanelTitle>
                  <S.PanelDescription>상태별 후보를 조회합니다.</S.PanelDescription>
                </div>
                <Shell.OperatingSelect
                  aria-label="중복 후보 상태"
                  value={status}
                  disabled={isLoading || activeAction !== null}
                  onChange={(event) =>
                    handleStatusChange(
                      event.target.value as AdminPlaceDuplicateCandidateStatus
                    )
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Shell.OperatingSelect>
              </S.PanelHeader>
            </S.Panel>

            {errorMessage ? <S.Notice $variant="error">{errorMessage}</S.Notice> : null}
            {isLoading && candidates.length === 0 ? (
              <S.EmptyStateCard><strong>중복 후보를 불러오는 중입니다.</strong></S.EmptyStateCard>
            ) : !errorMessage && candidates.length === 0 ? (
              <S.EmptyStateCard>
                <Shell.MaterialIcon aria-hidden="true">task_alt</Shell.MaterialIcon>
                <strong>{getStatusLabel(status)} 후보가 없습니다.</strong>
              </S.EmptyStateCard>
            ) : (
              <S.Workspace>
                <S.Panel>
                  <S.PanelHeader>
                    <div>
                      <S.PanelTitle>{getStatusLabel(status)} 후보</S.PanelTitle>
                      <S.PanelDescription>후보를 선택해 두 장소를 비교합니다.</S.PanelDescription>
                    </div>
                    <S.PanelCount>{totalCount.toLocaleString()}건</S.PanelCount>
                  </S.PanelHeader>
                  <S.ScrollArea>
                    <S.GroupList>
                      {candidates.map((candidate) => (
                        <S.GroupButton
                          key={candidate.candidateId}
                          type="button"
                          $selected={selectedCandidateId === candidate.candidateId}
                          aria-pressed={selectedCandidateId === candidate.candidateId}
                          onClick={() => handleSelectCandidate(candidate.candidateId)}
                        >
                          <S.GroupTopLine>
                            <S.GroupLabel>후보 #{candidate.candidateId}</S.GroupLabel>
                            <S.GroupCount>{getConfidenceLabel(candidate.confidenceScore)}</S.GroupCount>
                          </S.GroupTopLine>
                          <S.GroupReasons>
                            장소 #{candidate.leftPlaceId} ↔ #{candidate.rightPlaceId} · {candidate.matchReason}
                          </S.GroupReasons>
                        </S.GroupButton>
                      ))}
                    </S.GroupList>
                  </S.ScrollArea>
                </S.Panel>

                <S.Panel>
                  <S.PanelHeader>
                    <div>
                      <S.PanelTitle>후보 비교 및 판정</S.PanelTitle>
                      <S.PanelDescription>장소 상세와 탐지 근거를 확인합니다.</S.PanelDescription>
                    </div>
                  </S.PanelHeader>
                  <S.CompareBody>
                    {!selectedCandidateId ? (
                      <S.EmptyState><strong>검토할 후보를 선택해주세요.</strong></S.EmptyState>
                    ) : isDetailLoading || isPlacesLoading ? (
                      <S.EmptyState><strong>후보 장소를 불러오는 중입니다.</strong></S.EmptyState>
                    ) : detailErrorMessage || placesErrorMessage ? (
                      <S.EmptyState>
                        <strong>{detailErrorMessage || placesErrorMessage}</strong>
                        <S.SecondaryButton type="button" onClick={() => void fetchCandidateDetail(selectedCandidateId)}>
                          다시 시도
                        </S.SecondaryButton>
                      </S.EmptyState>
                    ) : candidateDetail && leftPlace && rightPlace ? (
                      <>
                        <S.DetailNotice>
                          <Shell.MaterialIcon aria-hidden="true">info</Shell.MaterialIcon>
                          <div>
                            <strong>{candidateDetail.matchReason}</strong>
                            신뢰도 {getConfidenceLabel(candidateDetail.confidenceScore)} · 거리 {candidateDetail.distanceMeters.toLocaleString()}m · 탐지 {formatDate(candidateDetail.detectedAt)}
                          </div>
                        </S.DetailNotice>
                        <S.ComparisonGrid>
                          <PlaceDetailCard place={leftPlace} label="왼쪽 장소" selected={targetPlaceId === leftPlace.id} onSelect={() => setTargetPlaceId(leftPlace.id)} />
                          <PlaceDetailCard place={rightPlace} label="오른쪽 장소" selected={targetPlaceId === rightPlace.id} onSelect={() => setTargetPlaceId(rightPlace.id)} />
                        </S.ComparisonGrid>
                        {candidateDetail.reviewNote ? (
                          <S.Notice $variant="success">판정 메모: {candidateDetail.reviewNote}</S.Notice>
                        ) : null}
                        <S.ActionBar>
                          <S.ActionHint>
                            현재 상태: {getStatusLabel(candidateDetail.status)}
                          </S.ActionHint>
                          <S.HeaderActions>
                            {candidateDetail.status === 'PENDING' ? (
                              <>
                                <S.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => openDialog('reject')}>중복 아님</S.SecondaryButton>
                                <S.PrimaryButton type="button" disabled={activeAction !== null} onClick={() => openDialog('confirm')}>중복 확정</S.PrimaryButton>
                              </>
                            ) : candidateDetail.status === 'CONFIRMED' ? (
                              <S.PrimaryButton type="button" disabled={activeAction !== null} onClick={() => openDialog('merge')}>
                                <Shell.MaterialIcon aria-hidden="true">merge_type</Shell.MaterialIcon>
                                병합 검토
                              </S.PrimaryButton>
                            ) : null}
                          </S.HeaderActions>
                        </S.ActionBar>
                      </>
                    ) : null}
                  </S.CompareBody>
                </S.Panel>
              </S.Workspace>
            )}
          </S.PageStack>
        </S.Content>
      </Shell.MainArea>

      {dialogState && candidateDetail ? (
        <S.ModalOverlay role="presentation" onMouseDown={closeDialog}>
          <S.Modal role="dialog" aria-modal="true" aria-labelledby="duplicate-review-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <S.ModalHeader>
              <S.ModalTitle id="duplicate-review-dialog-title">
                {dialogState === 'confirm' ? '중복 후보 확정' : dialogState === 'reject' ? '중복 후보 거절' : '확정 후보 병합'}
              </S.ModalTitle>
              <S.ModalCloseButton ref={dialogCloseButtonRef} type="button" aria-label="닫기" disabled={activeAction !== null} onClick={closeDialog}>
                <Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon>
              </S.ModalCloseButton>
            </S.ModalHeader>
            <S.ModalBody>
              {dialogState === 'merge' ? (
                <>
                  <S.ModalWarning>
                    병합 후 유지 장소 #{targetPlaceId}. 다른 장소의 연결 게시글과 참조 데이터가 이동하며 병합 이력이 생성됩니다.
                  </S.ModalWarning>
                  <Shell.OperatingCheckLabel>
                    <input type="checkbox" checked={hasConfirmedMerge} disabled={activeAction !== null} onChange={(event) => { setHasConfirmedMerge(event.target.checked); setFormError('') }} />
                    <span>두 장소의 게시글 수와 유지 대상을 확인했습니다.</span>
                  </Shell.OperatingCheckLabel>
                </>
              ) : (
                <Shell.OperatingFormField>
                  <span>판정 사유 *</span>
                  <Shell.OperatingTextArea value={reviewNote} maxLength={500} disabled={activeAction !== null} onChange={(event) => { setReviewNote(event.target.value); setFormError('') }} />
                  <small>{reviewNote.length}/500</small>
                </Shell.OperatingFormField>
              )}
              {formError || actionErrorMessage ? <S.Notice $variant="error">{formError || actionErrorMessage}</S.Notice> : null}
            </S.ModalBody>
            <S.ModalFooter>
              <S.SecondaryButton type="button" disabled={activeAction !== null} onClick={closeDialog}>취소</S.SecondaryButton>
              <S.PrimaryButton type="button" disabled={activeAction !== null} onClick={() => void handleSubmitAction()}>
                {activeAction ? '처리 중' : dialogState === 'confirm' ? '중복 확정' : dialogState === 'reject' ? '중복 아님으로 처리' : '병합 실행'}
              </S.PrimaryButton>
            </S.ModalFooter>
          </S.Modal>
        </S.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  )
}

export default PlaceDuplicateCandidatePage
