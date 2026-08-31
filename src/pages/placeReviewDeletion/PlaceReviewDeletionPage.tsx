import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminStatusFilter } from '../../components/common/AdminStatusFilter'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaceReviewDeletionRequests } from '../../hooks/useAdminPlaceReviewDeletionRequests'
import { useAuth } from '../../hooks/useAuth'
import type {
  PlaceReviewDeletionRequestStatus,
} from '../../types/adminPlaceReviewDeletion.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './PlaceReviewDeletionPage.styles'

const STATUS_LABELS: Record<PlaceReviewDeletionRequestStatus, string> = {
  PENDING: '심사 대기',
  APPROVED: '승인',
  REJECTED: '반려',
}

function statusTone(status: PlaceReviewDeletionRequestStatus) {
  if (status === 'APPROVED') return 'success' as const
  if (status === 'REJECTED') return 'danger' as const
  return 'warning' as const
}

function formatDate(value: string | null | undefined) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function visibilityLabel(status: string) {
  return ({
    VISIBLE: '공개',
    HIDDEN: '숨김',
    DELETED: '삭제',
  } as Record<string, string>)[status] ?? status
}

function PlaceReviewDeletionPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminPlaceReviewDeletionRequests()
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const changeStatus = (status: PlaceReviewDeletionRequestStatus | '') => {
    setSelectedRequestId(null)
    hook.clearDetail()
    void hook.fetchItems(status, 1)
  }

  const selectRequest = (deletionRequestId: number) => {
    setSelectedRequestId(deletionRequestId)
    void hook.fetchDetail(deletionRequestId)
  }

  const openReview = (nextDecision: 'APPROVED' | 'REJECTED') => {
    setDecision(nextDecision)
    setReviewNote('')
    setFormError('')
  }

  const submitReview = async () => {
    if (!hook.detail || !decision || hook.isReviewing) return
    const note = reviewNote.trim()
    if (!note) {
      setFormError('검토 메모를 입력해주세요.')
      return
    }

    if (await hook.review(hook.detail.deletionRequestId, { decision, reviewNote: note })) {
      setDecision(null)
    }
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정"><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>리뷰 삭제 요청</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.isReviewing} onClick={() => void hook.fetchItems(hook.status, hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div><Shared.Eyebrow>검토함 &gt; 리뷰 삭제 요청</Shared.Eyebrow><Shared.PageTitle>리뷰 삭제 요청 심사</Shared.PageTitle><Shared.PageDescription>상점주가 요청한 리뷰 숨김·삭제 사유와 원문을 확인하고 처리합니다.</Shared.PageDescription></div>
              <Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton></Shared.HeaderActions>
            </Shared.PageHeader>

            {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
            {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}

            <AdminStatusFilter label="처리 상태" description="심사 대기 요청을 우선 확인하고 처리 이력을 함께 조회할 수 있습니다." value={hook.status} disabled={hook.isLoading || hook.isReviewing} onChange={(event) => changeStatus(event.target.value as PlaceReviewDeletionRequestStatus | '')}>
              <option value="PENDING">심사 대기</option>
              <option value="APPROVED">승인</option>
              <option value="REJECTED">반려</option>
              <option value="">전체</option>
            </AdminStatusFilter>
            {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}

            <Shared.Workspace>
              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>{hook.status ? STATUS_LABELS[hook.status] : '전체'} 요청</Shared.PanelTitle><Shared.PanelDescription>항목을 선택해 리뷰 원문과 요청 사유를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalElements.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader>
                <Shared.ScrollArea>
                  {hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>리뷰 삭제 요청을 불러오는 중입니다.</strong></Shared.EmptyState> : null}
                  {!hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>조건에 맞는 요청이 없습니다.</strong></Shared.EmptyState> : null}
                  {hook.items.length > 0 ? <Form.CardList>{hook.items.map((item) => <Form.RecordButton key={item.deletionRequestId} type="button" $selected={selectedRequestId === item.deletionRequestId} onClick={() => selectRequest(item.deletionRequestId)}>
                    <Form.RecordHeader><Form.RecordTitle>장소 #{item.placeId} · 리뷰 #{item.reviewId}</Form.RecordTitle><Form.StatusBadge $tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Form.StatusBadge></Form.RecordHeader>
                    <Form.RecordMeta>상점주 요청자 #{item.requesterUserId} · {formatDate(item.requestedAt)}</Form.RecordMeta>
                    <Form.RecordSummary>{item.requestReason || '요청 사유가 입력되지 않았습니다.'}</Form.RecordSummary>
                  </Form.RecordButton>)}</Form.CardList> : null}
                </Shared.ScrollArea>
                {hook.totalPages > 1 ? <Form.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => { setSelectedRequestId(null); hook.clearDetail(); void hook.fetchItems(hook.status, hook.page - 1) }}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => { setSelectedRequestId(null); hook.clearDetail(); void hook.fetchItems(hook.status, hook.page + 1) }}>다음</Shared.SecondaryButton></Form.Pagination> : null}
              </Shared.Panel>

              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>요청 상세</Shared.PanelTitle><Shared.PanelDescription>리뷰 내용과 사유를 확인한 뒤 승인 또는 반려합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
                <Shared.CompareBody>
                  {!selectedRequestId ? <Shared.EmptyState><strong>목록에서 리뷰 삭제 요청을 선택하세요.</strong></Shared.EmptyState> : null}
                  {selectedRequestId && hook.isDetailLoading ? <Shared.EmptyState><strong>요청 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : null}
                  {selectedRequestId && !hook.isDetailLoading && hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedRequestId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : null}
                  {hook.detail ? <>
                    <Form.RecordHeader><div><Form.RecordTitle>장소 #{hook.detail.placeId}의 리뷰 삭제 요청</Form.RecordTitle><Form.RecordMeta>리뷰 작성자 #{hook.detail.reviewAuthorUserId} · 요청자 #{hook.detail.requesterUserId}</Form.RecordMeta></div><Form.StatusBadge $tone={statusTone(hook.detail.status)}>{STATUS_LABELS[hook.detail.status]}</Form.StatusBadge></Form.RecordHeader>
                    <Form.DetailGrid>
                      <Form.DetailItem><dt>요청 시각</dt><dd>{formatDate(hook.detail.requestedAt)}</dd></Form.DetailItem>
                      <Form.DetailItem><dt>현재 리뷰 상태</dt><dd>{visibilityLabel(hook.detail.reviewVisibilityStatus)}</dd></Form.DetailItem>
                      <Form.DetailItem><dt>리뷰 작성 시각</dt><dd>{formatDate(hook.detail.reviewCreatedAt)}</dd></Form.DetailItem>
                      <Form.DetailItem><dt>처리 관리자</dt><dd>{hook.detail.reviewerAdminUserId ? `관리자 #${hook.detail.reviewerAdminUserId}` : '미처리'}</dd></Form.DetailItem>
                    </Form.DetailGrid>
                    <Form.Section><Form.SectionTitle>리뷰 원문</Form.SectionTitle><Form.RecordMeta>추천 이유: {hook.detail.recommendReason || '입력 없음'}</Form.RecordMeta><S.RequestSummary>{hook.detail.content || '리뷰 내용이 없습니다.'}</S.RequestSummary>{hook.detail.imageUrls.length > 0 ? <S.ImageGrid>{hook.detail.imageUrls.map((imageUrl, index) => <S.ImageLink key={`${imageUrl}-${index}`} href={imageUrl} target="_blank" rel="noreferrer" aria-label={`리뷰 이미지 ${index + 1} 원본 열기`}><img src={imageUrl} alt={`리뷰 첨부 이미지 ${index + 1}`} loading="lazy" /></S.ImageLink>)}</S.ImageGrid> : null}</Form.Section>
                    <Form.Section><Form.SectionTitle>상점주 요청 사유</Form.SectionTitle><S.RequestSummary>{hook.detail.requestReason || '요청 사유가 입력되지 않았습니다.'}</S.RequestSummary></Form.Section>
                    {hook.detail.reviewedAt || hook.detail.reviewNote ? <Form.Section><Form.SectionTitle>심사 결과</Form.SectionTitle><Form.RecordMeta>{hook.detail.reviewedAt ? `${formatDate(hook.detail.reviewedAt)} 처리` : '처리 시각 정보 없음'}</Form.RecordMeta><S.ReviewNote>{hook.detail.reviewNote || '검토 메모가 입력되지 않았습니다.'}</S.ReviewNote></Form.Section> : null}
                    {hook.detail.status === 'PENDING' ? <Form.InlineActions><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => openReview('REJECTED')}>반려</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => openReview('APPROVED')}>승인</Shared.PrimaryButton></Form.InlineActions> : null}
                  </> : null}
                </Shared.CompareBody>
              </Shared.Panel>
            </Shared.Workspace>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>

      {decision && hook.detail ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !hook.isReviewing && setDecision(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="review-deletion-decision-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="review-deletion-decision-title">리뷰 삭제 요청 {decision === 'APPROVED' ? '승인' : '반려'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.isReviewing} onClick={() => setDecision(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><Shared.ModalWarning>{decision === 'APPROVED' ? '승인하면 서버 정책에 따라 해당 리뷰의 노출 상태가 변경됩니다.' : '반려하면 상점주의 삭제 요청은 처리되지 않습니다.'}</Shared.ModalWarning><Form.FormGrid><Form.WideField>검토 메모 *<Form.TextArea value={reviewNote} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReviewNote(event.target.value); setFormError('') }} /><small>{reviewNote.length}/500</small></Form.WideField></Form.FormGrid>{formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setDecision(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => void submitReview()}>{hook.isReviewing ? '처리 중' : decision === 'APPROVED' ? '승인 확정' : '반려 확정'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

export default PlaceReviewDeletionPage
