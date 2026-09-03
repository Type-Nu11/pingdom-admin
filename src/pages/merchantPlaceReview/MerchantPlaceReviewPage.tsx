import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminPagination } from '../../components/common/AdminPagination'
import { useMerchantPlaceReviews } from '../../hooks/useMerchantPlaceReviews'
import type { MerchantPlaceReview } from '../../types/merchantStore.types'
import * as Campaign from '../merchantCampaign/MerchantCampaignPage.styles'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantPlaceReviewPage.styles'

const MAX_REASON_LENGTH = 500

const DELETION_REQUEST_LABELS = {
  PENDING: '삭제 요청 심사 대기',
  APPROVED: '삭제 완료',
  REJECTED: '삭제 요청 반려',
} as const

const VISIBILITY_LABELS = {
  VISIBLE: '공개',
  HIDDEN: '숨김',
  DELETED: '삭제됨',
} as const

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function MerchantPlaceReviewPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const reviewStore = useMerchantPlaceReviews()
  const [pendingReview, setPendingReview] = useState<MerchantPlaceReview | null>(null)
  const [requestReason, setRequestReason] = useState('')

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  const openRequestDialog = (review: MerchantPlaceReview) => {
    setRequestReason('')
    setPendingReview(review)
  }

  const submitRequest = async () => {
    if (!pendingReview || requestReason.trim().length === 0) return
    const result = await reviewStore.requestDeletion(pendingReview, requestReason.trim())
    if (result) setPendingReview(null)
  }

  if (reviewStore.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>리뷰 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reviewStore.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void reviewStore.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>리뷰 관리</Store.PageTitle><Store.PageDescription>내 장소에 등록된 리뷰를 확인하고, 운영 정책 위반 리뷰의 삭제를 요청합니다.</Store.PageDescription></div><Campaign.HeaderActions><Campaign.HeaderButton type="button" disabled={reviewStore.isLoading || reviewStore.activeReviewId !== null || !reviewStore.selectedPlaceId} onClick={() => reviewStore.selectedPlaceId && void reviewStore.fetchReviews(reviewStore.selectedPlaceId, reviewStore.pageInfo.page)}>새로고침</Campaign.HeaderButton></Campaign.HeaderActions></Store.PageIntro>
    {reviewStore.profile && reviewStore.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="리뷰를 관리할 장소 선택" value={reviewStore.selectedPlaceId ?? ''} onChange={(event) => reviewStore.selectPlace(Number(event.target.value))}>{reviewStore.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
    {reviewStore.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginTop: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reviewStore.sectionErrorMessage}</Store.Notice> : null}
    {reviewStore.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginTop: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reviewStore.actionErrorMessage}</Store.Notice> : null}
    {reviewStore.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginTop: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{reviewStore.successMessage}</Store.Notice> : null}
    {reviewStore.status === 'loading' || reviewStore.isLoading ? <Store.LoadingSummary aria-label="리뷰 목록을 불러오는 중" style={{ marginTop: 20 }}><Store.Skeleton $height={420} /></Store.LoadingSummary> : !reviewStore.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">rate_review</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소가 아직 없습니다.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>장소 운영 권한을 신청하거나 새 장소를 등록한 뒤 승인되면 리뷰를 관리할 수 있습니다.</Store.EmptyStoreDescription></div><Store.EmptyStoreActions><Store.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>기존 장소 신청</Store.EmptyStoreAction><Store.EmptyStoreSecondaryAction type="button" onClick={() => navigate('/merchant/place-registration')}>새 장소 등록</Store.EmptyStoreSecondaryAction></Store.EmptyStoreActions></Store.EmptyStoreState> : <Campaign.Panel style={{ marginTop: 20 }}><Campaign.PanelHeader><div><Campaign.PanelTitle>{reviewStore.place?.name || `연결 장소 #${reviewStore.selectedPlaceId}`} 리뷰</Campaign.PanelTitle><Campaign.PanelDescription>총 {reviewStore.pageInfo.totalElements.toLocaleString()}개의 리뷰가 있습니다. 삭제 요청 시 리뷰는 즉시 숨김 처리되며 최종 삭제는 관리자 심사 후 결정됩니다.</Campaign.PanelDescription></div></Campaign.PanelHeader>{reviewStore.reviews.length === 0 ? <Campaign.Empty>현재 등록된 리뷰가 없습니다.</Campaign.Empty> : <S.ReviewList>{reviewStore.reviews.map((review) => {
      const deletionRequest = review.deletionRequest
      const isSubmitting = reviewStore.activeReviewId === review.reviewId
      const canRequestDeletion = deletionRequest === null || deletionRequest.status === 'REJECTED'
      return <S.ReviewItem key={review.reviewId}><S.ReviewTop><S.ReviewReason>{review.recommendReason || '방문 리뷰'}</S.ReviewReason><S.ReviewDate dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</S.ReviewDate></S.ReviewTop><S.ReviewContent>{review.content || '작성된 리뷰 내용이 없습니다.'}</S.ReviewContent>{review.imageUrls.length > 0 ? <S.ImageList>{review.imageUrls.map((imageUrl, index) => <S.ReviewImage key={`${review.reviewId}-${imageUrl}`} src={imageUrl} alt={`리뷰 이미지 ${index + 1}`} />)}</S.ImageList> : null}<S.ReviewFooter><S.ReviewMeta>리뷰 #{review.reviewId} · {VISIBILITY_LABELS[review.visibilityStatus]}</S.ReviewMeta><div>{deletionRequest ? <S.RequestedBadge $status={deletionRequest.status}>{DELETION_REQUEST_LABELS[deletionRequest.status]}</S.RequestedBadge> : null}{canRequestDeletion ? <S.RequestButton type="button" disabled={isSubmitting || reviewStore.activeReviewId !== null} onClick={() => openRequestDialog(review)}>{isSubmitting ? '요청 중' : deletionRequest ? '다시 요청' : '삭제 요청'}</S.RequestButton> : null}</div></S.ReviewFooter>{deletionRequest?.status === 'REJECTED' && deletionRequest.reviewNote ? <S.ReviewContent>반려 사유: {deletionRequest.reviewNote}</S.ReviewContent> : null}</S.ReviewItem>
    })}</S.ReviewList>}{reviewStore.pageInfo.totalPages > 1 ? <AdminPagination ariaLabel="상점주 리뷰 목록 페이지네이션" page={reviewStore.pageInfo.page} totalPages={reviewStore.pageInfo.totalPages} hasNext={reviewStore.pageInfo.hasNext} disabled={reviewStore.isLoading} onPageChange={(nextPage) => { if (reviewStore.selectedPlaceId) void reviewStore.fetchReviews(reviewStore.selectedPlaceId, nextPage) }} /> : null}</Campaign.Panel>}
  </Store.Content>{pendingReview ? <Campaign.ModalOverlay role="presentation" onMouseDown={() => setPendingReview(null)}><Campaign.Modal role="dialog" aria-modal="true" aria-labelledby="review-deletion-request-title" onMouseDown={(event) => event.stopPropagation()}><Campaign.ModalHeader><div><Campaign.ModalTitle id="review-deletion-request-title">리뷰 삭제 요청</Campaign.ModalTitle></div><Campaign.CloseButton type="button" aria-label="닫기" onClick={() => setPendingReview(null)}>close</Campaign.CloseButton></Campaign.ModalHeader><Campaign.ModalBody><S.ModalDescription>요청을 제출하면 리뷰가 즉시 숨김 처리되고, 관리자가 최종 삭제 여부를 검토합니다.</S.ModalDescription><S.Field>요청 사유<S.Textarea value={requestReason} maxLength={MAX_REASON_LENGTH} placeholder="운영 정책 위반 사유를 구체적으로 입력해주세요." onChange={(event) => setRequestReason(event.target.value)} autoFocus /><S.CharacterCount>{requestReason.length} / {MAX_REASON_LENGTH}</S.CharacterCount></S.Field><Campaign.FormActions><Campaign.ActionButton type="button" disabled={reviewStore.activeReviewId !== null} onClick={() => setPendingReview(null)}>취소</Campaign.ActionButton><Campaign.ActionButton type="button" $variant="danger" disabled={requestReason.trim().length === 0 || reviewStore.activeReviewId !== null} onClick={() => void submitRequest()}>{reviewStore.activeReviewId ? '제출 중' : '삭제 요청 제출'}</Campaign.ActionButton></Campaign.FormActions></Campaign.ModalBody></Campaign.Modal></Campaign.ModalOverlay> : null}</Store.Page>
}

export default MerchantPlaceReviewPage
