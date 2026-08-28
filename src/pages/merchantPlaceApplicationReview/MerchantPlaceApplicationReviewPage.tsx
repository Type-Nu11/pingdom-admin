import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminMerchantPlaceApplications } from '../../hooks/useAdminMerchantPlaceApplications'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminMerchantPlaceApplication,
  AdminMerchantPlaceApplicationAttachment,
  MerchantPlaceApplicationDocumentType,
  MerchantPlaceApplicationStatus,
  MerchantPlaceApplicationType,
} from '../../types/adminMerchantPlaceApplication.types'
import type { MerchantPlaceApplicationNewPlace } from '../../types/merchantPlaceApplication.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './MerchantPlaceApplicationReviewPage.styles'

const TYPE_LABELS: Record<MerchantPlaceApplicationType, string> = {
  NEW_PLACE: '신규 장소 등록 신청',
  EXISTING_PLACE_CLAIM: '기존 장소 운영 신청',
}

const STATUS_LABELS: Record<MerchantPlaceApplicationStatus, string> = {
  DRAFT: '작성 중',
  PENDING: '심사 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  COMPLETED: '승인 완료',
  CANCELED: '취소',
}

const DOCUMENT_LABELS: Record<MerchantPlaceApplicationDocumentType, string> = {
  BUSINESS_REGISTRATION: '사업자 등록증',
  IDENTITY_DOCUMENT: '신원 증빙',
  REPRESENTATIVE_IMAGE: '대표 이미지',
}

const CATEGORY_LABELS: Record<string, string> = {
  RESTAURANT: '음식점', MUSIC: '음악', POP_UP: '팝업', FASHION: '패션', BEAUTY: '뷰티',
  EXHIBITION: '전시', CAFE: '카페', CULTURAL_HERITAGE: '문화재', OTHER: '기타',
}

const TAG_LABELS: Record<string, string> = {
  ENGLISH_SERVICE_AVAILABLE: '영어 서비스', ENGLISH_MENU_AVAILABLE: '영어 메뉴',
  RESERVATION_AVAILABLE: '예약 가능', RESERVATION_COUPON_AVAILABLE: '예약 쿠폰',
  GENERAL_COUPON_AVAILABLE: '일반 쿠폰', GOOD_AMBIENCE: '분위기 좋음',
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목', FRIDAY: '금', SATURDAY: '토', SUNDAY: '일',
}

function statusTone(status: MerchantPlaceApplicationStatus) {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'success' as const
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

function formatCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '정보 없음'
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

function formatLocalTime(value?: { hour: number; minute: number }) {
  if (!value) return '시간 미입력'
  return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`
}

function formatOperatingDays(days: MerchantPlaceApplicationNewPlace['operatingDays']) {
  if (!days?.length) return '등록된 영업 시간 정보가 없습니다.'
  return days.map((day) => {
    const label = DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek
    if (day.status === 'CLOSED') return `${label} 휴무`
    if (day.status === 'OPEN_24_HOURS') return `${label} 24시간 운영`
    return `${label} ${formatLocalTime(day.opensAt)}-${formatLocalTime(day.closesAt)}`
  }).join('\n')
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
  const isHistoryView = hook.view === 'history'
  const listTitle = isHistoryView ? '처리 이력' : '심사 대기 신청'
  const listDescription = isHistoryView ? '승인·완료·반려·취소된 장소 신청을 확인합니다.' : '심사 대기 중인 신청을 선택해 사업자 정보와 증빙을 검토합니다.'
  const emptyMessage = isHistoryView ? '처리된 장소 신청 이력이 없습니다.' : '심사 대기 중인 장소 신청이 없습니다.'
  const loadingMessage = isHistoryView ? '처리 이력을 불러오는 중입니다.' : '심사 대기 신청을 불러오는 중입니다.'

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
    if (await hook.review(decision === 'approve', trimmedReason)) {
      setDecision(null)
      setSelectedId(null)
    }
  }

  const emptyDetailTitle = hook.items.length === 0 && !hook.isLoading
    ? (isHistoryView ? '처리 이력이 없습니다.' : '현재 검토할 신청이 없습니다.')
    : '목록에서 장소 신청을 선택하세요.'
  const emptyDetailDescription = hook.items.length === 0 && !hook.isLoading
    ? (isHistoryView ? '새로운 신청이 처리되면 이곳에서 심사 근거를 확인할 수 있습니다.' : '새로운 신청이 접수되면 사업자 정보와 증빙을 이곳에서 검토할 수 있습니다.')
    : '선택한 신청의 사업자 정보, 장소 정보, 증빙 파일을 확인할 수 있습니다.'

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{admin}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>검토함</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.isReviewing} onClick={() => void hook.fetchApplications(hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>검토함 &gt; 상점주 장소 신청 심사</Shared.Eyebrow><Shared.PageTitle>상점주 장소 신청 심사</Shared.PageTitle><Shared.PageDescription>신규 장소 등록과 기존 장소 운영 신청을 한 곳에서 검토하고 승인 또는 반려합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-owners')}>상점주 관리</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
          {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
          {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
          <S.FilterBar>
            <S.FilterTabs role="tablist" aria-label="장소 신청 상태">
              <S.FilterTab type="button" role="tab" aria-selected={hook.view === 'pending'} $active={hook.view === 'pending'} disabled={hook.isLoading || hook.isReviewing} onClick={() => { setSelectedId(null); setDecision(null); hook.changeView('pending') }}>심사 대기</S.FilterTab>
              <S.FilterTab type="button" role="tab" aria-selected={hook.view === 'history'} $active={hook.view === 'history'} disabled={hook.isLoading || hook.isReviewing} onClick={() => { setSelectedId(null); setDecision(null); hook.changeView('history') }}>처리 이력</S.FilterTab>
            </S.FilterTabs>
            <S.FilterField>신청 유형
              <AdminSelect aria-label="신청 유형 필터" value={hook.applicationType} width="208px" disabled={hook.isLoading || hook.isReviewing} onChange={(event) => { setSelectedId(null); setDecision(null); hook.changeApplicationType(event.target.value as typeof hook.applicationType) }}>
                <option value="ALL">전체</option><option value="NEW_PLACE">신규 장소 등록</option><option value="EXISTING_PLACE_CLAIM">기존 장소 운영 신청</option>
              </AdminSelect>
            </S.FilterField>
          </S.FilterBar>
          <Shared.Workspace>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>{listTitle}</Shared.PanelTitle><Shared.PanelDescription>{listDescription}</Shared.PanelDescription></div><Shared.PanelCount>{hook.total.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader><Shared.ScrollArea>
              {hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>{loadingMessage}</strong></Shared.EmptyState> : null}
              {!hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>{emptyMessage}</strong></Shared.EmptyState> : null}
              {hook.items.length > 0 ? <Form.CardList>{hook.items.map((item) => <Form.RecordButton key={item.id} type="button" $selected={selectedId === item.id} onClick={() => selectApplication(item.id)}><Form.RecordHeader><Form.RecordTitle>{item.placeName || item.businessName || `장소 신청 #${item.id}`}</Form.RecordTitle><Form.StatusBadge $tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Form.StatusBadge></Form.RecordHeader><Form.RecordMeta>{TYPE_LABELS[item.applicationType]} · 신청자 #{item.applicantUserId}</Form.RecordMeta><Form.RecordDescription>{item.businessName} · {item.merchantDisplayName || item.legalName}</Form.RecordDescription><Form.RecordMeta>{formatDate(item.submittedAt ?? item.updatedAt)}</Form.RecordMeta></Form.RecordButton>)}</Form.CardList> : null}
            </Shared.ScrollArea>{hook.totalPages > 1 ? <Form.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => { setSelectedId(null); void hook.fetchApplications(hook.page - 1) }}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => { setSelectedId(null); void hook.fetchApplications(hook.page + 1) }}>다음</Shared.SecondaryButton></Form.Pagination> : null}</Shared.Panel>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>장소 신청 상세</Shared.PanelTitle><Shared.PanelDescription>신청자·장소·증빙을 확인한 뒤 심사 결과를 기록합니다.</Shared.PanelDescription></div></Shared.PanelHeader><Shared.CompareBody>
              {!selectedId ? <Shared.EmptyState><strong>{emptyDetailTitle}</strong><p>{emptyDetailDescription}</p></Shared.EmptyState> : null}
              {selectedId && hook.isDetailLoading ? <Shared.EmptyState><strong>장소 신청 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : null}
              {selectedId && hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : null}
              {selectedId && hook.detail ? <ApplicationDetail application={hook.detail} attachments={hook.attachments} attachmentErrorMessage={hook.attachmentErrorMessage} downloadingAttachmentId={hook.downloadingAttachmentId} isReviewing={hook.isReviewing} onOpenReview={openReview} onDownload={(attachment) => void hook.downloadAttachment(hook.detail!.id, attachment)} /> : null}
            </Shared.CompareBody></Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
      {decision && hook.detail ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !hook.isReviewing && setDecision(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="merchant-place-application-review-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="merchant-place-application-review-title">장소 신청 {decision === 'approve' ? '승인' : '반려'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.isReviewing} onClick={() => setDecision(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><Shared.ModalWarning>장소 신청 #{hook.detail.id}을 {decision === 'approve' ? '승인' : '반려'}합니다. 처리 후 상태가 즉시 변경되며 되돌릴 수 없습니다.</Shared.ModalWarning><Form.Section><Form.Field>심사 사유 *<Form.TextArea value={reason} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></Form.Field></Form.Section>{formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setDecision(null)}>취소</Shared.SecondaryButton>{decision === 'reject' ? <S.DangerButton type="button" disabled={hook.isReviewing} onClick={() => void submitReview()}>{hook.isReviewing ? '처리 중' : '반려 확정'}</S.DangerButton> : <Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => void submitReview()}>{hook.isReviewing ? '처리 중' : '승인 확정'}</Shared.PrimaryButton>}</Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

function ApplicationDetail({ application, attachments, attachmentErrorMessage, downloadingAttachmentId, isReviewing, onOpenReview, onDownload }: {
  application: AdminMerchantPlaceApplication
  attachments: AdminMerchantPlaceApplicationAttachment[]
  attachmentErrorMessage: string
  downloadingAttachmentId: number | null
  isReviewing: boolean
  onOpenReview: (decision: 'approve' | 'reject') => void
  onDownload: (attachment: AdminMerchantPlaceApplicationAttachment) => void
}) {
  const newPlace = application.newPlace

  return <>
    <Form.RecordHeader><div><Form.RecordTitle>{application.placeName || newPlace?.placeName || application.businessName || `장소 신청 #${application.id}`}</Form.RecordTitle><Form.RecordMeta>{TYPE_LABELS[application.applicationType]} · 신청자 #{application.applicantUserId}</Form.RecordMeta></div><Form.StatusBadge $tone={statusTone(application.status)}>{STATUS_LABELS[application.status]}</Form.StatusBadge></Form.RecordHeader>
    <Form.Section><Form.SectionTitle>신청자 정보</Form.SectionTitle><Form.DetailGrid><Form.DetailItem><dt>사업자명</dt><dd>{application.businessName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>법적 이름</dt><dd>{application.legalName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>상점 표시명</dt><dd>{application.merchantDisplayName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>상점 연락처</dt><dd>{application.merchantContactPhone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>이메일</dt><dd>{application.merchantContactEmail || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>접수 시각</dt><dd>{formatDate(application.submittedAt ?? application.createdAt)}</dd></Form.DetailItem><Form.DetailItem><dt>검토 시각</dt><dd>{formatDate(application.reviewedAt)}</dd></Form.DetailItem><Form.DetailItem><dt>승인 장소</dt><dd>{application.placeId ? `장소 #${application.placeId}` : '미연결'}</dd></Form.DetailItem></Form.DetailGrid></Form.Section>
    {application.merchantDescription ? <Form.Section><Form.SectionTitle>상점 소개</Form.SectionTitle><S.Reason>{application.merchantDescription}</S.Reason></Form.Section> : null}
    {application.applicationType === 'NEW_PLACE' ? <Form.Section><Form.SectionTitle>신규 장소 정보</Form.SectionTitle>{newPlace ? <><Form.DetailGrid><Form.DetailItem><dt>장소명</dt><dd>{newPlace.placeName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>카테고리</dt><dd>{CATEGORY_LABELS[newPlace.category] ?? newPlace.category}</dd></Form.DetailItem><Form.DetailItem><dt>도로명 주소</dt><dd>{newPlace.roadAddress || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>지번 주소</dt><dd>{newPlace.jibunAddress || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>우편번호</dt><dd>{newPlace.postalCode || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>좌표</dt><dd>{formatCoordinates(newPlace.latitude, newPlace.longitude)}</dd></Form.DetailItem><Form.DetailItem><dt>사업장 연락처</dt><dd>{newPlace.businessContactPhone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>신청자 연락처</dt><dd>{newPlace.applicantContactPhone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>시간대</dt><dd>{newPlace.timezone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>태그</dt><dd>{newPlace.tags.length ? newPlace.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(' · ') : '등록 정보 없음'}</dd></Form.DetailItem></Form.DetailGrid>{newPlace.description ? <Form.Section><Form.SectionTitle>장소 소개</Form.SectionTitle><S.Reason>{newPlace.description}</S.Reason></Form.Section> : null}<Form.Section><Form.SectionTitle>영업 시간</Form.SectionTitle><S.Reason>{formatOperatingDays(newPlace.operatingDays)}</S.Reason></Form.Section></> : <Form.RecordDescription>이 신청의 신규 장소 정보는 서버 응답에 없습니다.</Form.RecordDescription>}</Form.Section> : null}
    {application.applicationType === 'EXISTING_PLACE_CLAIM' ? <Form.Section><Form.SectionTitle>기존 장소 운영 신청</Form.SectionTitle><Form.DetailGrid><Form.DetailItem><dt>대상 장소</dt><dd>{application.existingPlaceId ? `장소 #${application.existingPlaceId}` : '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>심사 완료 장소</dt><dd>{application.placeId ? `장소 #${application.placeId}` : '미연결'}</dd></Form.DetailItem></Form.DetailGrid>{application.claimReason ? <S.Reason>{application.claimReason}</S.Reason> : <Form.RecordDescription>등록된 신청 사유가 없습니다.</Form.RecordDescription>}</Form.Section> : null}
    <Form.Section><Form.SectionTitle>제출 증빙</Form.SectionTitle>{attachmentErrorMessage ? <Shared.Notice $variant="error">{attachmentErrorMessage}</Shared.Notice> : null}{attachments.length === 0 ? <Form.RecordDescription>등록된 증빙 파일이 없습니다.</Form.RecordDescription> : <S.AttachmentList>{attachments.map((attachment) => <S.AttachmentRow key={attachment.id}><div><strong>{DOCUMENT_LABELS[attachment.documentType]} · {attachment.originalFilename}</strong><span>{attachment.contentType || '파일'} · {formatFileSize(attachment.fileSize)} · 업로드 {formatDate(attachment.uploadedAt)}</span></div><S.AttachmentButton type="button" disabled={downloadingAttachmentId !== null} onClick={() => onDownload(attachment)}><Shell.MaterialIcon aria-hidden="true">download</Shell.MaterialIcon>{downloadingAttachmentId === attachment.id ? '다운로드 중' : '다운로드'}</S.AttachmentButton></S.AttachmentRow>)}</S.AttachmentList>}</Form.Section>
    {application.reviewReason ? <Form.Section><Form.SectionTitle>심사 사유</Form.SectionTitle><S.Reason>{application.reviewReason}</S.Reason></Form.Section> : null}
    {application.status === 'PENDING' ? <Form.InlineActions><Shared.SecondaryButton type="button" disabled={isReviewing} onClick={() => onOpenReview('reject')}>반려</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={isReviewing} onClick={() => onOpenReview('approve')}>승인</Shared.PrimaryButton></Form.InlineActions> : null}
  </>
}

export default MerchantPlaceApplicationReviewPage
