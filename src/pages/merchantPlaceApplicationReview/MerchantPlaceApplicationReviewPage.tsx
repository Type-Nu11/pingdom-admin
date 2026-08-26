import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminMerchantPlaceApplications } from '../../hooks/useAdminMerchantPlaceApplications'
import { useAuth } from '../../hooks/useAuth'
import type {
  MerchantPlaceApplicationDocumentType,
  MerchantPlaceApplicationStatus,
  MerchantPlaceApplicationType,
} from '../../types/adminMerchantPlaceApplication.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './MerchantPlaceApplicationReviewPage.styles'

const TYPE_LABELS: Record<MerchantPlaceApplicationType, string> = {
  LEGACY: '기존 장소 운영 권한 신청',
  NEW_PLACE: '신규 장소 등록 신청',
  EXISTING_PLACE_CLAIM: '기존 장소 권한·소유권 신청',
}

const STATUS_LABELS: Record<MerchantPlaceApplicationStatus, string> = {
  DRAFT: '작성 중',
  PENDING: '심사 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  REGISTERED: '등록 완료',
  COMPLETED: '승인 완료',
  CANCELED: '취소',
}

const DOCUMENT_LABELS: Record<MerchantPlaceApplicationDocumentType, string> = {
  BUSINESS_REGISTRATION: '사업자 등록증',
  IDENTITY_DOCUMENT: '신원 증빙',
  REPRESENTATIVE_IMAGE: '대표 이미지',
}

function statusTone(status: MerchantPlaceApplicationStatus) {
  if (status === 'APPROVED' || status === 'REGISTERED' || status === 'COMPLETED') return 'success' as const
  if (status === 'REJECTED' || status === 'CANCELED') return 'danger' as const
  return 'warning' as const
}

function formatDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.ceil(value / 1024))} KB`
}

function MerchantPlaceApplicationReviewPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminMerchantPlaceApplications()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const admin = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const selectApplication = (applicationId: number) => {
    setSelectedId(applicationId)
    setDecision(null)
    setReason('')
    setFormError('')
    void hook.fetchDetail(applicationId)
  }

  const openReview = (nextDecision: 'approve' | 'reject') => {
    setDecision(nextDecision)
    setReason('')
    setFormError('')
  }

  const submitReview = async () => {
    if (!decision || hook.isReviewing) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setFormError('심사 사유를 입력해주세요.')
      return
    }
    if (await hook.review(decision === 'approve', trimmedReason)) setDecision(null)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{admin}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>장소 신청 심사</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.isReviewing} onClick={() => void hook.fetchApplications(hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>검토함 &gt; 상점주 장소 신청 심사</Shared.Eyebrow><Shared.PageTitle>상점주 장소 신청 심사</Shared.PageTitle><Shared.PageDescription>신규 장소 등록과 기존 장소 권한·소유권 신청을 한 곳에서 검토하고 승인 또는 반려합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-owners')}>상점주 관리</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
          {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
          {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
          <Shared.Workspace>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>장소 신청 목록</Shared.PanelTitle><Shared.PanelDescription>신청을 선택해 사업자 정보와 증빙을 검토합니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.total.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader>
              <Shared.ScrollArea>{hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>장소 신청 목록을 불러오는 중입니다.</strong></Shared.EmptyState> : hook.items.length === 0 ? <Shared.EmptyState><strong>등록된 장소 신청이 없습니다.</strong></Shared.EmptyState> : <Form.CardList>{hook.items.map((item) => <Form.RecordButton key={item.id} type="button" $selected={selectedId === item.id} onClick={() => selectApplication(item.id)}><Form.RecordHeader><Form.RecordTitle>{item.placeName || item.businessName || `장소 신청 #${item.id}`}</Form.RecordTitle><Form.StatusBadge $tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Form.StatusBadge></Form.RecordHeader><Form.RecordMeta>{TYPE_LABELS[item.applicationType]} · 신청자 #{item.applicantUserId}</Form.RecordMeta><Form.RecordDescription>{item.businessName} · {item.merchantDisplayName || item.legalName}</Form.RecordDescription><Form.RecordMeta>{formatDate(item.submittedAt)}</Form.RecordMeta></Form.RecordButton>)}</Form.CardList>}</Shared.ScrollArea>
              {hook.totalPages > 1 ? <Form.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => { setSelectedId(null); void hook.fetchApplications(hook.page - 1) }}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => { setSelectedId(null); void hook.fetchApplications(hook.page + 1) }}>다음</Shared.SecondaryButton></Form.Pagination> : null}
            </Shared.Panel>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>장소 신청 상세</Shared.PanelTitle><Shared.PanelDescription>신청자·장소·증빙을 확인한 뒤 심사 결과를 기록합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
              <Shared.CompareBody>{!selectedId ? <Shared.EmptyState><strong>목록에서 장소 신청을 선택하세요.</strong><p>선택한 신청의 사업자 정보, 장소 정보, 증빙 파일을 확인할 수 있습니다.</p></Shared.EmptyState> : hook.isDetailLoading ? <Shared.EmptyState><strong>장소 신청 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : hook.detail ? <><Form.RecordHeader><div><Form.RecordTitle>{hook.detail.placeName || hook.detail.businessName || `장소 신청 #${hook.detail.id}`}</Form.RecordTitle><Form.RecordMeta>{TYPE_LABELS[hook.detail.applicationType]} · 신청자 #{hook.detail.applicantUserId}</Form.RecordMeta></div><Form.StatusBadge $tone={statusTone(hook.detail.status)}>{STATUS_LABELS[hook.detail.status]}</Form.StatusBadge></Form.RecordHeader>
                <Form.DetailGrid>
                  <Form.DetailItem><dt>사업자명</dt><dd>{hook.detail.businessName || '정보 없음'}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>법적 이름</dt><dd>{hook.detail.legalName || '정보 없음'}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>상점 표시명</dt><dd>{hook.detail.merchantDisplayName || '정보 없음'}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>기존 장소</dt><dd>{hook.detail.existingPlaceId ? `장소 #${hook.detail.existingPlaceId}` : '신규 장소'}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>연락처</dt><dd>{hook.detail.merchantContactPhone || '정보 없음'}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>이메일</dt><dd>{hook.detail.merchantContactEmail || '정보 없음'}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>접수 시각</dt><dd>{formatDate(hook.detail.submittedAt)}</dd></Form.DetailItem>
                  <Form.DetailItem><dt>검토 시각</dt><dd>{formatDate(hook.detail.reviewedAt)}</dd></Form.DetailItem>
                </Form.DetailGrid>
                {hook.detail.merchantDescription ? <Form.Section><Form.SectionTitle>상점 소개</Form.SectionTitle><S.Reason>{hook.detail.merchantDescription}</S.Reason></Form.Section> : null}
                {hook.detail.claimReason ? <Form.Section><Form.SectionTitle>신청 사유</Form.SectionTitle><S.Reason>{hook.detail.claimReason}</S.Reason></Form.Section> : null}
                <Form.Section><Form.SectionTitle>제출 증빙</Form.SectionTitle>{hook.attachmentErrorMessage ? <Shared.Notice $variant="error">{hook.attachmentErrorMessage}</Shared.Notice> : null}{hook.attachments.length === 0 ? <Form.RecordDescription>등록된 증빙 파일이 없습니다.</Form.RecordDescription> : <S.AttachmentList>{hook.attachments.map((attachment) => <S.AttachmentRow key={attachment.id}><div><strong>{DOCUMENT_LABELS[attachment.documentType]} · {attachment.originalFilename}</strong><span>{attachment.contentType || '파일'} · {formatFileSize(attachment.fileSize)} · 업로드 {formatDate(attachment.uploadedAt)}</span></div><S.AttachmentButton type="button" disabled={hook.downloadingAttachmentId !== null} onClick={() => void hook.downloadAttachment(hook.detail!.id, attachment)}><Shell.MaterialIcon aria-hidden="true">download</Shell.MaterialIcon>{hook.downloadingAttachmentId === attachment.id ? '다운로드 중' : '다운로드'}</S.AttachmentButton></S.AttachmentRow>)}</S.AttachmentList>}</Form.Section>
                {hook.detail.reviewReason ? <Form.Section><Form.SectionTitle>심사 사유</Form.SectionTitle><S.Reason>{hook.detail.reviewReason}</S.Reason></Form.Section> : null}
                {hook.detail.status === 'PENDING' ? <Form.InlineActions><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => openReview('reject')}>반려</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => openReview('approve')}>승인</Shared.PrimaryButton></Form.InlineActions> : null}
              </> : null}</Shared.CompareBody>
            </Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
      {decision && hook.detail ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !hook.isReviewing && setDecision(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="merchant-place-application-review-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="merchant-place-application-review-title">장소 신청 {decision === 'approve' ? '승인' : '반려'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.isReviewing} onClick={() => setDecision(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><Shared.ModalWarning>장소 신청 #{hook.detail.id}을 {decision === 'approve' ? '승인' : '반려'}합니다. 처리 후 상태가 즉시 변경되며 되돌릴 수 없습니다.</Shared.ModalWarning><Form.Section><Form.Field>심사 사유 *<Form.TextArea value={reason} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></Form.Field></Form.Section>{formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setDecision(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => void submitReview()}>{hook.isReviewing ? '처리 중' : decision === 'approve' ? '승인 확정' : '반려 확정'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

export default MerchantPlaceApplicationReviewPage
