import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminPlace } from '../../api/adminPlaceApi'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaceMerge } from '../../hooks/useAdminPlaceMerge'
import { useAuth } from '../../hooks/useAuth'
import type { AdminPlaceDetail } from '../../types/adminPlace.types'
import type {
  AdminPlaceDuplicateCandidateItem,
  AdminPlaceDuplicateGroupItem,
  AdminPlaceMergeHistoryItem,
} from '../../types/adminPlaceMerge.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as S from './PlaceMergePage.styles'

type ConfirmationState =
  | { type: 'merge' }
  | { type: 'restore'; history: AdminPlaceMergeHistoryItem }
  | null

function formatDate(value?: string | null) {
  if (!value) {
    return '정보 없음'
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

function formatNumber(value: number | undefined | null) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString()
    : '확인 중'
}

function formatDistance(value: number) {
  if (!Number.isFinite(value)) {
    return '거리 정보 없음'
  }

  return value < 1000
    ? `${Math.round(value).toLocaleString()}m`
    : `${(value / 1000).toFixed(2)}km`
}

function getPlaceName(name: string, address: string) {
  const normalizedName = name.trim()

  return normalizedName && normalizedName !== address.trim()
    ? normalizedName
    : '이름 없는 장소'
}

function getGroupLabel(group: AdminPlaceDuplicateGroupItem) {
  return `중복 후보 #${group.representativePlaceId}`
}

function getRegistrantLabel(registrant: string, userId: number) {
  return registrant.trim() || `ID ${userId}`
}

function getPostCount(placeId: number, impacts: Record<number, AdminPlaceDetail>) {
  return impacts[placeId]?.postCount
}

function PlaceComparisonCard({
  place,
  variant,
  postCount,
  impactLoading,
}: {
  place: {
    id: number
    name: string
    address: string
    kakaoPlaceId: string
    latitude: number
    longitude: number
    userId: number
    registrant: string
    photoCount: number
  }
  variant: 'target' | 'source'
  postCount?: number
  impactLoading: boolean
}) {
  return (
    <S.PlaceCard $variant={variant}>
      <S.PlaceCardHeader>
        <div>
          <S.PlaceCardLabel>
            {variant === 'target' ? '유지할 장소' : '병합될 장소'}
          </S.PlaceCardLabel>
          <S.PlaceCardTitle title={place.name}>
            {getPlaceName(place.name, place.address)}
          </S.PlaceCardTitle>
        </div>
        <S.StatusTag $variant={variant}>
          {variant === 'target' ? '대표' : '후보'}
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
          <dd>{getRegistrantLabel(place.registrant, place.userId)}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>사진 수</dt>
          <dd>{formatNumber(place.photoCount)}장</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>연결 게시글</dt>
          <dd>{impactLoading ? '확인 중' : `${formatNumber(postCount)}개`}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>좌표</dt>
          <dd>{`${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`}</dd>
        </S.MetaRow>
        <S.MetaRow>
          <dt>Kakao ID</dt>
          <dd>{place.kakaoPlaceId || '정보 없음'}</dd>
        </S.MetaRow>
      </S.MetaList>
    </S.PlaceCard>
  )
}

function PlaceMergePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [selectedGroup, setSelectedGroup] =
    useState<AdminPlaceDuplicateGroupItem | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null)
  const [impacts, setImpacts] = useState<Record<number, AdminPlaceDetail>>({})
  const [isImpactLoading, setIsImpactLoading] = useState(false)
  const [impactErrorMessage, setImpactErrorMessage] = useState('')
  const latestImpactRequestIdRef = useRef(0)
  const {
    duplicateGroups,
    duplicateTotalCount,
    duplicateDetail,
    mergeHistories,
    isGroupsLoading,
    isDetailLoading,
    isHistoriesLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    historyErrorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchDuplicateGroups,
    fetchDuplicateDetail,
    clearDuplicateDetail,
    fetchMergeHistories,
    mergePlaces,
    restoreMerge,
  } = useAdminPlaceMerge()

  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const activeGroup = useMemo(
    () =>
      duplicateGroups.find(
        (group) =>
          group.representativePlaceId === selectedGroup?.representativePlaceId
      ) ?? null,
    [duplicateGroups, selectedGroup]
  )
  const targetPlace = useMemo(
    () =>
      duplicateDetail
        ? {
            id: duplicateDetail.id,
            name: duplicateDetail.name,
            address: duplicateDetail.address,
            kakaoPlaceId: duplicateDetail.kakaoPlaceId,
            latitude: duplicateDetail.latitude,
            longitude: duplicateDetail.longitude,
            userId: duplicateDetail.userId,
            registrant: duplicateDetail.registrant,
            photoCount: duplicateDetail.photoCount,
          }
        : null,
    [duplicateDetail]
  )
  const selectedSource = useMemo<AdminPlaceDuplicateCandidateItem | null>(
    () =>
      duplicateDetail?.candidates.find(
        (candidate) => candidate.id === selectedSourceId
      ) ?? null,
    [duplicateDetail, selectedSourceId]
  )
  const targetPostCount = targetPlace
    ? getPostCount(targetPlace.id, impacts)
    : undefined
  const sourcePostCount = selectedSource
    ? getPostCount(selectedSource.id, impacts)
    : undefined
  const hasImpactData = Boolean(
    targetPlace &&
      selectedSource &&
      impacts[targetPlace.id] &&
      impacts[selectedSource.id]
  )
  const canMerge = Boolean(
    targetPlace &&
      selectedSource &&
      selectedSource.id !== targetPlace.id &&
      hasImpactData &&
      !impactErrorMessage
  )

  const handleSelectGroup = useCallback(
    (group: AdminPlaceDuplicateGroupItem) => {
      setSelectedGroup(group)
      setSelectedSourceId(null)
      setImpacts({})
      setImpactErrorMessage('')
      clearDuplicateDetail()
    },
    [clearDuplicateDetail]
  )

  const loadPlaceImpacts = useCallback(async (placeIds: number[]) => {
    const requestId = latestImpactRequestIdRef.current + 1
    latestImpactRequestIdRef.current = requestId
    setIsImpactLoading(true)
    setImpactErrorMessage('')

    try {
      const entries = await Promise.all(
        placeIds.map(async (placeId) => {
          const detail = await getAdminPlace(placeId)

          return [placeId, detail] as const
        })
      )

      if (requestId === latestImpactRequestIdRef.current) {
        setImpacts(Object.fromEntries(entries))
      }
    } catch {
      if (requestId === latestImpactRequestIdRef.current) {
        setImpactErrorMessage(
          '연결 게시글 영향 범위를 확인하지 못했습니다. 병합 전 다시 시도해주세요.'
        )
      }
    } finally {
      if (requestId === latestImpactRequestIdRef.current) {
        setIsImpactLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!activeGroup || duplicateDetail?.id === activeGroup.representativePlaceId) {
      return
    }

    void fetchDuplicateDetail(activeGroup.representativePlaceId)
  }, [activeGroup, duplicateDetail?.id, fetchDuplicateDetail])

  useEffect(() => {
    if (!targetPlace) {
      return
    }

    const ids = [targetPlace.id, selectedSourceId].filter(
      (placeId): placeId is number => typeof placeId === 'number'
    )

    void loadPlaceImpacts(ids)
  }, [loadPlaceImpacts, selectedSourceId, targetPlace])

  useEffect(() => {
    function closeConfirmationOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && activeAction === null) {
        setConfirmation(null)
      }
    }

    if (!confirmation) {
      return
    }

    window.addEventListener('keydown', closeConfirmationOnEscape)

    return () => {
      window.removeEventListener('keydown', closeConfirmationOnEscape)
    }
  }, [activeAction, confirmation])

  const handleConfirmMerge = () => {
    if (!canMerge || !targetPlace || !selectedSource) {
      return
    }

    void mergePlaces({
      sourcePlaceId: selectedSource.id,
      targetPlaceId: targetPlace.id,
    }).then((data) => {
      if (!data) {
        return
      }

      setConfirmation(null)
      navigate('/places', { replace: true })
    })
  }

  const handleConfirmRestore = () => {
    if (confirmation?.type !== 'restore') {
      return
    }

    void restoreMerge(confirmation.history.historyId).then((data) => {
      if (data) {
        setConfirmation(null)
        navigate('/places', { replace: true })
      }
    })
  }

  const handleRefresh = () => {
    void Promise.all([fetchDuplicateGroups(), fetchMergeHistories()])
  }

  const handleSelectSource = (candidateId: number) => {
    setSelectedSourceId(candidateId)
  }

  const shouldShowHistoryPanel =
    isHistoriesLoading || Boolean(historyErrorMessage) || mergeHistories.length > 0
  const hasDuplicateGroups = duplicateGroups.length > 0

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </Shell.BrandLockup>
        </Shell.SideHeader>

        <Shell.SideMenu>
          <Shell.MenuButton type="button" onClick={() => navigate('/dashboard')}>
            <Shell.MaterialIcon aria-hidden="true">dashboard</Shell.MaterialIcon>
            <span>대시보드</span>
          </Shell.MenuButton>
          <Shell.MenuButton type="button" onClick={() => navigate('/places')}>
            <Shell.MaterialIcon aria-hidden="true">location_on</Shell.MaterialIcon>
            <span>장소 관리</span>
          </Shell.MenuButton>
          <Shell.MenuButton type="button" onClick={() => navigate('/main')}>
            <Shell.MaterialIcon aria-hidden="true">description</Shell.MaterialIcon>
            <span>게시글 관리</span>
          </Shell.MenuButton>
          <Shell.MenuButton type="button" onClick={() => navigate('/bans')}>
            <Shell.MaterialIcon aria-hidden="true">block</Shell.MaterialIcon>
            <span>사용자 밴</span>
          </Shell.MenuButton>
        </Shell.SideMenu>

        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정">
            <Shell.AdminProfileIcon>
              <Shell.MaterialIcon aria-hidden="true">
                admin_panel_settings
              </Shell.MaterialIcon>
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
            <Shell.TopTitle>중복 장소 관리</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton
              type="button"
              aria-label="탐지 결과 새로고침"
              title="탐지 결과 새로고침"
              disabled={isGroupsLoading || isHistoriesLoading || activeAction !== null}
              onClick={handleRefresh}
            >
              <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
            </Shell.IconButton>
            <Shell.IconButton type="button" aria-label="도움말">
              <Shell.MaterialIcon aria-hidden="true">help_outline</Shell.MaterialIcon>
            </Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <S.Content>
          <S.PageStack>
            <S.PageHeader>
              <div>
                <S.Eyebrow>장소 관리 &gt; 중복 장소 관리</S.Eyebrow>
                <S.PageTitle>중복 장소 관리</S.PageTitle>
                <S.PageDescription>
                  중복 가능성이 있는 장소를 비교하고 유지할 장소와 병합할 장소를 결정합니다.
                </S.PageDescription>
              </div>
              <S.HeaderActions>
                <S.HeaderButton type="button" onClick={() => navigate('/places')}>
                  <Shell.MaterialIcon aria-hidden="true">arrow_back</Shell.MaterialIcon>
                  장소 관리
                </S.HeaderButton>
              </S.HeaderActions>
            </S.PageHeader>

            {errorMessage ? <S.Notice $variant="error">{errorMessage}</S.Notice> : null}
            {actionErrorMessage ? (
              <S.Notice $variant="error">{actionErrorMessage}</S.Notice>
            ) : null}
            {actionSuccessMessage ? (
              <S.Notice $variant="success">{actionSuccessMessage}</S.Notice>
            ) : null}

            {isGroupsLoading && duplicateGroups.length === 0 ? (
              <S.EmptyStateCard>
                <Shell.MaterialIcon aria-hidden="true">progress_activity</Shell.MaterialIcon>
                <strong>중복 후보를 확인하는 중입니다.</strong>
              </S.EmptyStateCard>
            ) : errorMessage && !hasDuplicateGroups ? (
              <S.EmptyStateCard>
                <Shell.MaterialIcon aria-hidden="true">error_outline</Shell.MaterialIcon>
                <strong>중복 후보를 불러오지 못했습니다.</strong>
                <S.SecondaryButton
                  type="button"
                  onClick={() => void fetchDuplicateGroups()}
                >
                  다시 시도
                </S.SecondaryButton>
              </S.EmptyStateCard>
            ) : !hasDuplicateGroups ? (
              <S.EmptyStateCard>
                <Shell.MaterialIcon aria-hidden="true">task_alt</Shell.MaterialIcon>
                <strong>중복 장소 후보가 없습니다.</strong>
                <p>현재 탐지된 중복 장소가 없습니다. 새로 등록된 장소가 있다면 다시 확인해보세요.</p>
                <S.EmptyStateActions>
                  <S.PrimaryButton type="button" onClick={handleRefresh}>
                    <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
                    탐지 결과 새로고침
                  </S.PrimaryButton>
                </S.EmptyStateActions>
              </S.EmptyStateCard>
            ) : (
              <S.Workspace>
                <S.Panel>
                  <S.PanelHeader>
                    <div>
                      <S.PanelTitle>중복 후보</S.PanelTitle>
                      <S.PanelDescription>
                        중복 가능성이 높은 장소 묶음을 확인합니다.
                      </S.PanelDescription>
                    </div>
                    <S.PanelCount>{duplicateTotalCount.toLocaleString()}개</S.PanelCount>
                  </S.PanelHeader>
                  <S.ScrollArea>
                    <S.GroupList>
                      {duplicateGroups.map((group) => (
                        <S.GroupButton
                          key={group.representativePlaceId}
                          type="button"
                          $selected={
                            activeGroup?.representativePlaceId ===
                            group.representativePlaceId
                          }
                          aria-pressed={
                            activeGroup?.representativePlaceId ===
                            group.representativePlaceId
                          }
                          onClick={() => handleSelectGroup(group)}
                        >
                          <S.GroupTopLine>
                            <S.GroupLabel>{getGroupLabel(group)}</S.GroupLabel>
                            <S.GroupCount>
                              후보{' '}
                              {group.duplicatePlaceIds.filter(
                                (placeId) => placeId !== group.representativePlaceId
                              ).length}
                              개
                            </S.GroupCount>
                          </S.GroupTopLine>
                          <S.GroupReasons>
                            {group.reasons.length > 0
                              ? group.reasons.join(' · ')
                              : '중복 판단 사유 정보 없음'}
                          </S.GroupReasons>
                        </S.GroupButton>
                      ))}
                    </S.GroupList>
                  </S.ScrollArea>
                </S.Panel>

                {activeGroup ? (
                  <S.Panel>
                <S.PanelHeader>
                  <div>
                    <S.PanelTitle>장소 비교 및 병합</S.PanelTitle>
                    <S.PanelDescription>
                      유지할 장소와 병합할 장소를 비교합니다.
                    </S.PanelDescription>
                  </div>
                </S.PanelHeader>
                <S.CompareBody>
                  {!activeGroup ? (
                    <S.EmptyState>
                      <Shell.MaterialIcon aria-hidden="true">compare_arrows</Shell.MaterialIcon>
                      <strong>중복 장소를 선택해주세요.</strong>
                      <p>왼쪽 목록에서 비교할 중복 장소 그룹을 선택하면 상세 정보가 표시됩니다.</p>
                    </S.EmptyState>
                  ) : isDetailLoading ? (
                    <S.EmptyState>
                      <Shell.MaterialIcon aria-hidden="true">progress_activity</Shell.MaterialIcon>
                      <strong>후보 장소를 불러오는 중입니다.</strong>
                    </S.EmptyState>
                  ) : detailErrorMessage ? (
                    <S.EmptyState>
                      <strong>{detailErrorMessage}</strong>
                      <S.SecondaryButton
                        type="button"
                        onClick={() => void fetchDuplicateDetail(activeGroup.representativePlaceId)}
                      >
                        다시 시도
                      </S.SecondaryButton>
                    </S.EmptyState>
                  ) : duplicateDetail && targetPlace ? (
                    <>
                      <S.DetailNotice>
                        <Shell.MaterialIcon aria-hidden="true">info</Shell.MaterialIcon>
                        <div>
                          <strong>병합 대상 확인</strong>
                          병합 후 원본 장소의 연결 데이터가 대표 장소로 이동됩니다. 서버가 반환하는 병합 결과와 이력으로 처리 결과를 확인하세요.
                        </div>
                      </S.DetailNotice>

                      <S.ComparisonGrid>
                        <PlaceComparisonCard
                          place={targetPlace}
                          variant="target"
                          postCount={targetPostCount}
                          impactLoading={isImpactLoading}
                        />
                        {selectedSource ? (
                          <PlaceComparisonCard
                            place={selectedSource}
                            variant="source"
                            postCount={sourcePostCount}
                            impactLoading={isImpactLoading}
                          />
                        ) : (
                          <S.PlaceCard $variant="source">
                            <S.EmptyState>
                              <strong>병합할 후보를 선택해주세요.</strong>
                              <p>아래 후보 목록에서 원본 장소를 선택하세요.</p>
                            </S.EmptyState>
                          </S.PlaceCard>
                        )}
                      </S.ComparisonGrid>

                      {impactErrorMessage ? (
                        <S.Notice $variant="error">{impactErrorMessage}</S.Notice>
                      ) : null}

                      <S.CandidateSection>
                        <S.SectionTitle>
                          병합 후보 {duplicateDetail.candidates.length}개
                        </S.SectionTitle>
                        {duplicateDetail.candidates.length === 0 ? (
                          <S.EmptyState>
                            <strong>병합 가능한 후보가 없습니다.</strong>
                          </S.EmptyState>
                        ) : (
                          <S.CandidateList>
                            {duplicateDetail.candidates.map((candidate) => (
                              <S.CandidateButton
                                key={candidate.id}
                                type="button"
                                $selected={candidate.id === selectedSourceId}
                                aria-pressed={candidate.id === selectedSourceId}
                                onClick={() => handleSelectSource(candidate.id)}
                              >
                                <span>
                                  <S.CandidateName>
                                    #{candidate.id} · {getPlaceName(candidate.name, candidate.address)}
                                  </S.CandidateName>
                                  <S.CandidateMeta>
                                    {candidate.reason || '중복 판단 사유 정보 없음'} · 사진{' '}
                                    {formatNumber(candidate.photoCount)}장
                                  </S.CandidateMeta>
                                </span>
                                <S.CandidateDistance>
                                  {formatDistance(candidate.distanceMeters)}
                                </S.CandidateDistance>
                              </S.CandidateButton>
                            ))}
                          </S.CandidateList>
                        )}
                      </S.CandidateSection>

                      <S.ActionBar>
                        <S.ActionHint>
                          {selectedSource
                            ? `장소 #${selectedSource.id}을(를) 장소 #${targetPlace.id}에 병합합니다.`
                            : '병합할 후보 장소를 선택하면 병합 버튼이 활성화됩니다.'}
                        </S.ActionHint>
                        <S.PrimaryButton
                          type="button"
                          disabled={!canMerge || activeAction !== null || isImpactLoading}
                          onClick={() => setConfirmation({ type: 'merge' })}
                        >
                          <Shell.MaterialIcon aria-hidden="true">merge_type</Shell.MaterialIcon>
                          {activeAction === 'merge' ? '병합 중' : '병합 검토'}
                        </S.PrimaryButton>
                      </S.ActionBar>
                    </>
                  ) : null}
                </S.CompareBody>
                  </S.Panel>
                ) : (
                  <S.SelectionPrompt>
                    <Shell.MaterialIcon aria-hidden="true">compare_arrows</Shell.MaterialIcon>
                    <strong>비교할 중복 후보를 선택해주세요.</strong>
                    <p>왼쪽 목록에서 후보를 선택하면 장소 정보와 병합 대상을 확인할 수 있습니다.</p>
                  </S.SelectionPrompt>
                )}
              </S.Workspace>
            )}

            {shouldShowHistoryPanel ? <S.HistoryPanel>
              <S.PanelHeader>
                <div>
                  <S.PanelTitle>병합 이력</S.PanelTitle>
                  <S.PanelDescription>
                    병합된 장소와 복구 처리 여부를 확인합니다.
                  </S.PanelDescription>
                </div>
                <S.PanelCount>{mergeHistories.length.toLocaleString()}건</S.PanelCount>
              </S.PanelHeader>
              {isHistoriesLoading && mergeHistories.length === 0 ? (
                <S.EmptyState>
                  <Shell.MaterialIcon aria-hidden="true">progress_activity</Shell.MaterialIcon>
                  <strong>병합 이력을 불러오는 중입니다.</strong>
                </S.EmptyState>
              ) : historyErrorMessage ? (
                <S.EmptyState>
                  <strong>{historyErrorMessage}</strong>
                  <S.SecondaryButton type="button" onClick={() => void fetchMergeHistories()}>
                    다시 시도
                  </S.SecondaryButton>
                </S.EmptyState>
              ) : mergeHistories.length === 0 ? (
                <S.EmptyState>
                  <Shell.MaterialIcon aria-hidden="true">history</Shell.MaterialIcon>
                  <strong>병합 이력이 없습니다.</strong>
                </S.EmptyState>
              ) : (
                <S.HistoryList>
                  {mergeHistories.map((history) => (
                    <S.HistoryItem key={history.historyId}>
                      <div>
                        <S.HistoryTitle>
                          장소 #{history.sourcePlaceId} → 장소 #{history.targetPlaceId}
                        </S.HistoryTitle>
                        <S.HistoryMeta>
                          이력 #{history.historyId} · 관리자 ID {history.adminUserId} · 병합{' '}
                          {formatDate(history.mergedAt)}
                          {history.restoredAt
                            ? ` · 복구 ${formatDate(history.restoredAt)}`
                            : ''}
                        </S.HistoryMeta>
                      </div>
                      <S.HistoryActions>
                        <S.StatusTag $variant={history.restored ? 'target' : 'warning'}>
                          {history.restored ? '복구됨' : '병합됨'}
                        </S.StatusTag>
                        <S.SecondaryButton
                          type="button"
                          disabled={
                            history.restored || activeAction !== null
                          }
                          onClick={() => setConfirmation({ type: 'restore', history })}
                        >
                          <Shell.MaterialIcon aria-hidden="true">restore</Shell.MaterialIcon>
                          {activeAction === 'restore' ? '복구 중' : '복구'}
                        </S.SecondaryButton>
                      </S.HistoryActions>
                    </S.HistoryItem>
                  ))}
                </S.HistoryList>
              )}
            </S.HistoryPanel> : null}
          </S.PageStack>
        </S.Content>
      </Shell.MainArea>

      {confirmation ? (
        <S.ModalOverlay
          role="presentation"
          onMouseDown={() => {
            if (activeAction === null) {
              setConfirmation(null)
            }
          }}
        >
          <S.Modal
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-merge-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.ModalHeader>
              <S.ModalTitle id="place-merge-confirm-title">
                {confirmation.type === 'merge' ? '장소 병합 확인' : '병합 복구 확인'}
              </S.ModalTitle>
              <S.ModalCloseButton
                type="button"
                aria-label="닫기"
                disabled={activeAction !== null}
                onClick={() => setConfirmation(null)}
              >
                <Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon>
              </S.ModalCloseButton>
            </S.ModalHeader>
            <S.ModalBody>
              {confirmation.type === 'merge' && targetPlace && selectedSource ? (
                <>
                  <S.ModalWarning>
                    <Shell.MaterialIcon aria-hidden="true">warning</Shell.MaterialIcon>
                    <span>
                      병합 후 후보 장소는 대표 장소로 통합됩니다. 실제 영향 범위는 서버 병합 결과와 이력에서 최종 확인해주세요.
                    </span>
                  </S.ModalWarning>
                  <S.ModalSummary>
                    <S.ModalSummaryItem>
                      <dt>유지할 장소</dt>
                      <dd title={targetPlace.name}>
                        #{targetPlace.id} · {getPlaceName(targetPlace.name, targetPlace.address)}
                      </dd>
                    </S.ModalSummaryItem>
                    <S.ModalSummaryItem>
                      <dt>병합될 장소</dt>
                      <dd title={selectedSource.name}>
                        #{selectedSource.id} · {getPlaceName(selectedSource.name, selectedSource.address)}
                      </dd>
                    </S.ModalSummaryItem>
                    <S.ModalSummaryItem>
                      <dt>유지 장소 게시글</dt>
                      <dd>{formatNumber(targetPostCount)}개</dd>
                    </S.ModalSummaryItem>
                    <S.ModalSummaryItem>
                      <dt>후보 장소 게시글</dt>
                      <dd>{formatNumber(sourcePostCount)}개</dd>
                    </S.ModalSummaryItem>
                  </S.ModalSummary>
                </>
              ) : confirmation.type === 'restore' ? (
                <S.ModalWarning>
                  <Shell.MaterialIcon aria-hidden="true">restore</Shell.MaterialIcon>
                  <span>
                    병합 이력 #{confirmation.history.historyId}를 복구합니다. 복구 후에는 중복 장소 목록과 장소 관리 화면에서 결과를 확인해야 합니다.
                  </span>
                </S.ModalWarning>
              ) : null}
            </S.ModalBody>
            <S.ModalFooter>
              <S.SecondaryButton
                type="button"
                disabled={activeAction !== null}
                onClick={() => setConfirmation(null)}
              >
                취소
              </S.SecondaryButton>
              <S.PrimaryButton
                type="button"
                disabled={activeAction !== null}
                onClick={
                  confirmation.type === 'merge'
                    ? handleConfirmMerge
                    : handleConfirmRestore
                }
              >
                <Shell.MaterialIcon aria-hidden="true">
                  {confirmation.type === 'merge' ? 'merge_type' : 'restore'}
                </Shell.MaterialIcon>
                {activeAction !== null
                  ? '처리 중'
                  : confirmation.type === 'merge'
                    ? '병합 실행'
                    : '복구 실행'}
              </S.PrimaryButton>
            </S.ModalFooter>
          </S.Modal>
        </S.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  )
}

export default PlaceMergePage
