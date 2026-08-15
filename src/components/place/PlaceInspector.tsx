import { forwardRef } from 'react'
import type {
  AdminPlaceDetail,
  AdminPlaceDiscoveryStatus,
  AdminPlaceItem,
  AdminPlaceOperatingStatus,
  AdminPlaceTouristCategory,
} from '../../types/adminPlace.types'
import { getPlaceCategoryLabel } from '../../utils/placeCategory'
import type { PlaceOperation } from './PlaceOperationPanel'
import * as S from '../../pages/place/PlaceManagePage.styles'

const POST_PREVIEW_LIMIT = 3
const OPERATING_STATUS_LABELS: Record<AdminPlaceOperatingStatus, string> = {
  OPERATING: '운영 중',
  TEMPORARILY_CLOSED: '임시 휴업',
  PERMANENTLY_CLOSED: '영구 폐업',
}
const DISCOVERY_STATUS_LABELS: Record<AdminPlaceDiscoveryStatus, string> = {
  VISIBLE: '탐색 노출',
  HIDDEN: '탐색 숨김',
}
const TOURIST_CATEGORY_LABELS: Record<AdminPlaceTouristCategory, string> = {
  K_POP: 'K-POP',
  BEAUTY: '뷰티',
  FASHION: '패션',
  CAFE: '카페',
  FOOD: '음식',
  POP_UP: '팝업',
  EXHIBITION: '전시',
  NIGHTLIFE: '나이트라이프',
  OTHER: '기타',
}

interface PlaceInspectorProps {
  selectedPlace: AdminPlaceItem | null
  placeDetail: AdminPlaceDetail | null
  isLoading: boolean
  errorMessage: string
  updatingPlaceIds: Record<PlaceOperation | 'tourist-info', number | null>
  deletingPlaceId: number | null
  onClose: () => void
  onRetry: (placeId: number) => void
  onFocusMap: (place: AdminPlaceItem) => void
  onOpenOperation: (action: PlaceOperation) => void
  onOpenTouristInfo: () => void
  onOpenOperatingNotices: () => void
  onOpenPost: (postId: number) => void
  onOpenPlacePosts: (placeName: string) => void
  onOpenDelete: () => void
}

function hasValidCoordinate(place: AdminPlaceItem) {
  return (
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number' &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  )
}

function formatCoordinate(place: AdminPlaceItem) {
  return hasValidCoordinate(place)
    ? `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`
    : '좌표 정보 없음'
}

function formatOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '-'
}

function getGrowthProgress(place: AdminPlaceDetail) {
  const progress = place.placeGrowth?.progressPercent
  return typeof progress === 'number' && Number.isFinite(progress)
    ? Math.min(Math.max(Math.round(progress), 0), 100)
    : null
}

function formatDateTime(value: string) {
  if (!value) {
    return '작성일 정보 없음'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function formatCheckedAt(value?: string | null) {
  if (!value) {
    return '확인 시각 정보 없음'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function getOperatingTone(status?: AdminPlaceOperatingStatus) {
  return status === 'PERMANENTLY_CLOSED'
    ? 'danger'
    : status === 'TEMPORARILY_CLOSED'
      ? 'notice'
      : 'normal'
}

export const PlaceInspector = forwardRef<HTMLElement, PlaceInspectorProps>(
  function PlaceInspector(
    {
      selectedPlace,
      placeDetail,
      isLoading,
      errorMessage,
      updatingPlaceIds,
      deletingPlaceId,
      onClose,
      onRetry,
      onFocusMap,
      onOpenOperation,
      onOpenTouristInfo,
      onOpenOperatingNotices,
      onOpenPost,
      onOpenPlacePosts,
      onOpenDelete,
    },
    ref
  ) {
    const growthProgress = placeDetail ? getGrowthProgress(placeDetail) : null
    const growthProgressLabel = growthProgress === null ? '-' : `${growthProgress}%`
    const previewPosts = placeDetail?.posts.slice(0, POST_PREVIEW_LIMIT) ?? []
    const isDeletingSelected =
      selectedPlace !== null && deletingPlaceId === selectedPlace.id

    return (
      <S.PlaceDetailPanel ref={ref} $open={selectedPlace !== null}>
        {selectedPlace ? (
          <>
            <S.DetailHeader>
              <S.DetailTitleGroup>
                <S.DetailEyebrow>장소 상세</S.DetailEyebrow>
                <S.DetailTitle>{placeDetail?.name ?? selectedPlace.name}</S.DetailTitle>
              </S.DetailTitleGroup>
              <S.DetailCloseButton
                type="button"
                aria-label="장소 상세 닫기"
                onClick={onClose}
              >
                <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
              </S.DetailCloseButton>
            </S.DetailHeader>

            <S.DetailBody>
              {isLoading ? (
                <S.DetailStatus role="status" aria-live="polite">
                  장소 상세 정보를 불러오는 중입니다.
                </S.DetailStatus>
              ) : errorMessage ? (
                <S.DetailErrorState role="alert">
                  <p>{errorMessage}</p>
                  <S.RetryButton
                    type="button"
                    disabled={isLoading}
                    onClick={() => onRetry(selectedPlace.id)}
                  >
                    다시 시도
                  </S.RetryButton>
                </S.DetailErrorState>
              ) : placeDetail ? (
                <>
                  <S.DetailMetaList>
                    <S.DetailMetaGroup>
                      <S.DetailMetaGroupTitle>장소 정보</S.DetailMetaGroupTitle>
                      <S.DetailMetaRow>
                        <span>장소 ID</span>
                        <strong>{placeDetail.id}</strong>
                      </S.DetailMetaRow>
                      <S.DetailMetaRow>
                        <span>카테고리</span>
                        <strong>{getPlaceCategoryLabel(placeDetail)}</strong>
                      </S.DetailMetaRow>
                      <S.DetailMetaRow>
                        <span>등록자</span>
                        <strong>
                          {placeDetail.username || `사용자 ID: ${placeDetail.userId}`}
                        </strong>
                      </S.DetailMetaRow>
                      <S.DetailMetaRow>
                        <span>주소</span>
                        <strong>{placeDetail.address || '주소 정보 없음'}</strong>
                      </S.DetailMetaRow>
                      <S.DetailMetaRow>
                        <span>좌표</span>
                        <strong>{formatCoordinate(placeDetail)}</strong>
                      </S.DetailMetaRow>
                    </S.DetailMetaGroup>
                  </S.DetailMetaList>

                  <S.DetailSection>
                    <S.DetailSectionHeader>
                      <S.DetailSectionTitle>관광 정보</S.DetailSectionTitle>
                      <S.DetailInlineButton
                        type="button"
                        disabled={updatingPlaceIds['tourist-info'] !== null}
                        onClick={onOpenTouristInfo}
                      >
                        관광 정보 수정
                      </S.DetailInlineButton>
                    </S.DetailSectionHeader>
                    <S.DetailMetaList>
                      <S.DetailMetaGroup>
                        <S.DetailMetaRow>
                          <span>영문 이름</span>
                          <strong>{placeDetail.englishName || '등록 정보 없음'}</strong>
                        </S.DetailMetaRow>
                        <S.DetailMetaRow>
                          <span>관광 요약</span>
                          <strong>{placeDetail.touristSummary || '등록 정보 없음'}</strong>
                        </S.DetailMetaRow>
                        <S.DetailMetaRow>
                          <span>관광 카테고리</span>
                          <strong>
                            {(placeDetail.touristCategories?.length ?? 0) > 0
                              ? placeDetail.touristCategories
                                  ?.map((category) => TOURIST_CATEGORY_LABELS[category])
                                  .join(', ')
                              : '등록 정보 없음'}
                          </strong>
                        </S.DetailMetaRow>
                      </S.DetailMetaGroup>
                    </S.DetailMetaList>
                  </S.DetailSection>

                  <S.DetailSection>
                    <S.DetailSectionHeader>
                      <S.DetailSectionTitle>운영 및 탐색 관리</S.DetailSectionTitle>
                    </S.DetailSectionHeader>
                    <S.OperatingSummary>
                      <S.OperatingSummaryRow>
                        <S.OperatingSummaryLabel>
                          <span>운영 상태</span>
                          <small>{formatCheckedAt(placeDetail.operatingStatusCheckedAt)}</small>
                        </S.OperatingSummaryLabel>
                        <S.OperatingSummaryAction>
                          <S.OperatingStatusBadge
                            $tone={getOperatingTone(placeDetail.operatingStatus)}
                          >
                            {placeDetail.operatingStatus
                              ? OPERATING_STATUS_LABELS[placeDetail.operatingStatus]
                              : '확인 전'}
                          </S.OperatingStatusBadge>
                          <S.DetailInlineButton
                            type="button"
                            disabled={updatingPlaceIds['operating-status'] !== null}
                            onClick={() => onOpenOperation('operating-status')}
                          >
                            상태 변경
                          </S.DetailInlineButton>
                        </S.OperatingSummaryAction>
                      </S.OperatingSummaryRow>
                      <S.OperatingSummaryRow>
                        <S.OperatingSummaryLabel>
                          <span>탐색 상태</span>
                          <small>
                            {placeDetail.discoveryStatus === 'HIDDEN'
                              ? '공개 탐색·자동완성·북마크 목록·추천 후보에서 제외됩니다.'
                              : placeDetail.discoveryStatus === 'VISIBLE'
                                ? '공개 탐색과 자동완성, 추천 후보에 노출됩니다.'
                                : '서버 응답에서 탐색 상태를 확인하지 못했습니다.'}
                          </small>
                        </S.OperatingSummaryLabel>
                        <S.OperatingSummaryAction>
                          <S.OperatingStatusBadge
                            $tone={placeDetail.discoveryStatus === 'HIDDEN' ? 'muted' : 'normal'}
                          >
                            {placeDetail.discoveryStatus
                              ? DISCOVERY_STATUS_LABELS[placeDetail.discoveryStatus]
                              : '상태 확인 전'}
                          </S.OperatingStatusBadge>
                          <S.DetailInlineButton
                            type="button"
                            disabled={
                              updatingPlaceIds['discovery-status'] !== null ||
                              !placeDetail.discoveryStatus
                            }
                            onClick={() => onOpenOperation('discovery-status')}
                          >
                            상태 변경
                          </S.DetailInlineButton>
                        </S.OperatingSummaryAction>
                      </S.OperatingSummaryRow>
                      <S.OperatingSummaryRow>
                        <S.OperatingSummaryLabel>
                          <span>정규 영업시간</span>
                          <small>
                            {(placeDetail.regularHours?.length ?? 0) > 0
                              ? `${placeDetail.regularHours?.length ?? 0}개 요일 설정됨`
                              : '등록된 정규 영업시간 없음'}
                          </small>
                        </S.OperatingSummaryLabel>
                        <S.DetailInlineButton
                          type="button"
                          disabled={updatingPlaceIds['operating-schedule'] !== null}
                          onClick={() => onOpenOperation('operating-schedule')}
                        >
                          영업시간 수정
                        </S.DetailInlineButton>
                      </S.OperatingSummaryRow>
                      <S.OperatingSummaryRow>
                        <S.OperatingSummaryLabel>
                          <span>예외 일정</span>
                          <small>
                            {placeDetail.operatingExceptions?.length ?? 0}건 등록됨
                          </small>
                        </S.OperatingSummaryLabel>
                        <S.DetailInlineButton
                          type="button"
                          disabled={updatingPlaceIds['operating-schedule'] !== null}
                          onClick={() => onOpenOperation('operating-schedule')}
                        >
                          일정 관리
                        </S.DetailInlineButton>
                      </S.OperatingSummaryRow>
                      <S.OperatingSummaryRow>
                        <S.OperatingSummaryLabel>
                          <span>운영 공지</span>
                          <small>임시 휴업·영업시간 변경·혼잡 안내 공지를 관리합니다.</small>
                        </S.OperatingSummaryLabel>
                        <S.DetailInlineButton
                          type="button"
                          onClick={onOpenOperatingNotices}
                        >
                          공지 관리
                        </S.DetailInlineButton>
                      </S.OperatingSummaryRow>
                    </S.OperatingSummary>
                  </S.DetailSection>

                  <S.DetailSection>
                    <S.DetailSectionTitle>장소 성장</S.DetailSectionTitle>
                    <S.PlaceMetaLine>
                      <span>Lv.{formatOptionalNumber(placeDetail.placeGrowth?.level)}</span>
                      <span>
                        사진 {formatOptionalNumber(placeDetail.placeGrowth?.photoCount)}장
                      </span>
                    </S.PlaceMetaLine>
                    <S.DetailGrowthProgress>
                      <S.DetailGrowthProgressHeader>
                        <span>다음 레벨까지</span>
                        <strong>{growthProgressLabel}</strong>
                      </S.DetailGrowthProgressHeader>
                      <S.DetailGrowthTrack
                        role="progressbar"
                        aria-label="다음 레벨 진행률"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={growthProgress ?? undefined}
                        aria-valuetext={growthProgressLabel}
                      >
                        <S.DetailGrowthBar $progress={growthProgress ?? 0} />
                      </S.DetailGrowthTrack>
                    </S.DetailGrowthProgress>
                  </S.DetailSection>

                  <S.DetailSection>
                    <S.DetailSectionTitle>
                      연결 게시글 {placeDetail.postCount.toLocaleString()}개
                    </S.DetailSectionTitle>
                    {previewPosts.length > 0 ? (
                      <>
                        <S.DetailPostList>
                          {previewPosts.map((post) => (
                            <S.DetailPostItem
                              key={post.id}
                              type="button"
                              onClick={() => onOpenPost(post.id)}
                            >
                              <S.DetailPostImage>
                                {post.imageUrl ? (
                                  <img
                                    src={post.imageUrl}
                                    alt={`${post.title || `게시글 ${post.id}`} 이미지`}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <S.DetailPostFallback>
                                    <S.MaterialIcon aria-hidden="true">image</S.MaterialIcon>
                                  </S.DetailPostFallback>
                                )}
                              </S.DetailPostImage>
                              <S.DetailPostText>
                                <S.DetailPostTitleRow>
                                  <S.DetailPostTitle
                                    title={post.title || `게시글 #${post.id}`}
                                  >
                                    {post.title || `게시글 #${post.id}`}
                                  </S.DetailPostTitle>
                                </S.DetailPostTitleRow>
                                <p title={post.description || '설명 없음'}>
                                  {post.description || '설명 없음'}
                                </p>
                                {post.visibilityStatus === 'HIDDEN' ? (
                                  <S.DetailPostVisibilityReason>
                                    <S.DetailPostVisibilityBadge>숨김</S.DetailPostVisibilityBadge>
                                    <span>
                                      숨김 사유:{' '}
                                      {post.hiddenReason === 'ADMIN_HIDDEN'
                                        ? '관리자 숨김'
                                        : '숨김 처리됨'}
                                    </span>
                                  </S.DetailPostVisibilityReason>
                                ) : null}
                                <S.DetailPostMeta>
                                  {post.username || `사용자 ID: ${post.userId}`} · 좋아요{' '}
                                  {post.likeCount.toLocaleString()} ·{' '}
                                  {formatDateTime(post.createdAt)}
                                </S.DetailPostMeta>
                              </S.DetailPostText>
                            </S.DetailPostItem>
                          ))}
                        </S.DetailPostList>
                        {placeDetail.postCount > POST_PREVIEW_LIMIT ? (
                          <S.DetailPostListAction
                            type="button"
                            onClick={() => onOpenPlacePosts(placeDetail.name)}
                          >
                            <span>연결 게시글 전체 보기</span>
                            <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
                          </S.DetailPostListAction>
                        ) : null}
                      </>
                    ) : (
                      <S.DetailStatus>연결된 게시글이 없습니다.</S.DetailStatus>
                    )}
                  </S.DetailSection>
                </>
              ) : (
                <S.DetailStatus>장소를 선택하면 상세 정보가 표시됩니다.</S.DetailStatus>
              )}
            </S.DetailBody>

            <S.DetailFooter>
              <S.DetailActionButton
                type="button"
                disabled={!hasValidCoordinate(selectedPlace)}
                onClick={() => onFocusMap(selectedPlace)}
              >
                <S.MaterialIcon aria-hidden="true">my_location</S.MaterialIcon>
                <span>위치 보기</span>
              </S.DetailActionButton>
              <S.DetailDeleteButton
                type="button"
                disabled={!placeDetail || isLoading || isDeletingSelected}
                onClick={onOpenDelete}
              >
                <S.MaterialIcon aria-hidden="true">delete</S.MaterialIcon>
                <span>{isDeletingSelected ? '삭제 중' : '장소 삭제'}</span>
              </S.DetailDeleteButton>
            </S.DetailFooter>
          </>
        ) : null}
      </S.PlaceDetailPanel>
    )
  }
)
