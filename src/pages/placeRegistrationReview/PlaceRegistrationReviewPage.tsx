import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaceRegistrations } from '../../hooks/useAdminPlaceRegistrations'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPlaceRegistrationApplication,
  AdminPlaceRegistrationCategory,
  AdminPlaceRegistrationDocumentType,
  AdminPlaceRegistrationStatus,
  AdminPlaceRegistrationTag,
} from '../../types/adminPlaceRegistration.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './PlaceRegistrationReviewPage.styles'

const CATEGORY_LABELS: Record<AdminPlaceRegistrationCategory, string> = {
  MUSIC: '음악',
  RESTAURANT: '음식점',
  POP_UP: '팝업',
  FASHION: '패션',
  BEAUTY: '뷰티',
  EXHIBITION: '전시',
  CAFE: '카페',
  CULTURAL_HERITAGE: '문화재',
  OTHER: '기타',
}

const STATUS_LABELS: Record<AdminPlaceRegistrationStatus, string> = {
  DRAFT: '작성 중',
  PENDING: '심사 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  REGISTERED: '등록 완료',
  COMPLETED: '완료',
  CANCELED: '취소',
}

const TAG_LABELS: Record<AdminPlaceRegistrationTag, string> = {
  ENGLISH_SERVICE_AVAILABLE: '영어 서비스 가능',
  ENGLISH_MENU_AVAILABLE: '영문 메뉴 제공',
  RESERVATION_AVAILABLE: '예약 가능',
  RESERVATION_COUPON_AVAILABLE: '예약 쿠폰 제공',
  GENERAL_COUPON_AVAILABLE: '일반 쿠폰 제공',
  GOOD_AMBIENCE: '분위기 좋은 장소',
}

const DOCUMENT_LABELS: Record<AdminPlaceRegistrationDocumentType, string> = {
  BUSINESS_REGISTRATION: '사업자 등록증',
  IDENTITY_DOCUMENT: '신원 증빙',
  REPRESENTATIVE_IMAGE: '대표 이미지',
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
  SATURDAY: '토요일',
  SUNDAY: '일요일',
}

type ScheduleTime = { hour?: number; minute?: number } | string | null
type ScheduleItem = {
  dayOfWeek?: string
  status?: 'OPEN' | 'CLOSED' | 'OPEN_24_HOURS'
  opensAt?: ScheduleTime
  closesAt?: ScheduleTime
}

function statusTone(status: AdminPlaceRegistrationStatus) {
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
  if (!Number.isFinite(value) || value <= 0) return '크기 정보 없음'
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.ceil(value / 1024))} KB`
}

function formatTime(value?: ScheduleTime) {
  if (!value) return '시간 미입력'
  if (typeof value === 'string') return value
  if (typeof value.hour !== 'number' || typeof value.minute !== 'number') return '시간 미입력'
  return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`
}

function parseSchedule(value: string | null) {
  if (!value) return [] as ScheduleItem[]
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is ScheduleItem => Boolean(item && typeof item === 'object')) : []
  } catch {
    return [] as ScheduleItem[]
  }
}

function scheduleValue(item: ScheduleItem) {
  if (item.status === 'CLOSED') return '휴무'
  if (item.status === 'OPEN_24_HOURS') return '24시간 운영'
  return `${formatTime(item.opensAt)} - ${formatTime(item.closesAt)}`
}

function PlaceRegistrationReviewPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminPlaceRegistrations()
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

  const changePage = (nextPage: number) => {
    setSelectedId(null)
    setDecision(null)
    void hook.fetchApplications(nextPage)
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

  const detail = selectedId === hook.detail?.id ? hook.detail : null
  const schedule = detail ? parseSchedule(detail.operatingScheduleJson) : []

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{admin}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>장소 등록 심사</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.isReviewing} onClick={() => void hook.fetchApplications(hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>장소 · 검증 &gt; 신규 장소 등록</Shared.Eyebrow><Shared.PageTitle>장소 등록 신청 심사</Shared.PageTitle><Shared.PageDescription>사용자가 제안한 신규 장소 정보를 검토하고 등록 승인 또는 반려합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-place-applications')}>Merchant 신청 심사</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
          {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
          {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
          <Shared.Workspace>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>등록 신청 목록</Shared.PanelTitle><Shared.PanelDescription>최신 신청 20건을 확인하고 상세 정보를 검토합니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalCount.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader>
              <Shared.ScrollArea>{hook.isLoading && hook.applications.length === 0 ? <Shared.EmptyState><strong>등록 신청 목록을 불러오는 중입니다.</strong></Shared.EmptyState> : hook.applications.length === 0 ? <Shared.EmptyState><strong>등록된 장소 신청이 없습니다.</strong></Shared.EmptyState> : <Form.CardList>{hook.applications.map((application) => <Form.RecordButton key={application.id} type="button" $selected={selectedId === application.id} onClick={() => selectApplication(application.id)}><Form.RecordHeader><Form.RecordTitle>{application.placeName || `장소 신청 #${application.id}`}</Form.RecordTitle><Form.StatusBadge $tone={statusTone(application.status)}>{STATUS_LABELS[application.status]}</Form.StatusBadge></Form.RecordHeader><Form.RecordMeta>{CATEGORY_LABELS[application.category]} · 신청자 #{application.applicantUserId}</Form.RecordMeta><Form.RecordDescription>{application.roadAddress || application.jibunAddress || '주소 정보 없음'}</Form.RecordDescription><Form.RecordMeta>{formatDate(application.submittedAt)}</Form.RecordMeta></Form.RecordButton>)}</Form.CardList>}</Shared.ScrollArea>
              {hook.totalPages > 1 ? <Form.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => changePage(hook.page - 1)}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => changePage(hook.page + 1)}>다음</Shared.SecondaryButton></Form.Pagination> : null}
            </Shared.Panel>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>등록 신청 상세</Shared.PanelTitle><Shared.PanelDescription>장소 정보, 운영 시간, 제출한 첨부 메타데이터를 확인합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
              <Shared.CompareBody>{!selectedId ? <Shared.EmptyState><strong>목록에서 등록 신청을 선택하세요.</strong><p>선택한 신청의 장소 정보와 심사 이력을 확인할 수 있습니다.</p></Shared.EmptyState> : hook.isDetailLoading ? <Shared.EmptyState><strong>등록 신청 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : detail ? <PlaceRegistrationDetail application={detail} schedule={schedule} onOpenReview={openReview} isReviewing={hook.isReviewing} onOpenPlaces={() => navigate('/places')} /> : null}</Shared.CompareBody>
            </Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
      {decision && detail ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !hook.isReviewing && setDecision(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="place-registration-review-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="place-registration-review-title">장소 등록 신청 {decision === 'approve' ? '승인' : '반려'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.isReviewing} onClick={() => setDecision(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><Shared.ModalWarning>장소 등록 신청 #{detail.id}을 {decision === 'approve' ? '승인' : '반려'}합니다. 심사 결과가 신청자에게 반영됩니다.</Shared.ModalWarning><Form.Section><Form.Field>심사 사유 *<Form.TextArea value={reason} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></Form.Field></Form.Section>{formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setDecision(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => void submitReview()}>{hook.isReviewing ? '처리 중' : decision === 'approve' ? '승인 확정' : '반려 확정'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

function PlaceRegistrationDetail({ application, schedule, onOpenReview, isReviewing, onOpenPlaces }: { application: AdminPlaceRegistrationApplication; schedule: ScheduleItem[]; onOpenReview: (decision: 'approve' | 'reject') => void; isReviewing: boolean; onOpenPlaces: () => void }) {
  const attachments = application.attachments ?? []
  const tags = application.tags ?? []
  return <><Form.RecordHeader><div><Form.RecordTitle>{application.placeName || `장소 신청 #${application.id}`}</Form.RecordTitle><Form.RecordMeta>{CATEGORY_LABELS[application.category]} · 신청자 #{application.applicantUserId}</Form.RecordMeta></div><Form.StatusBadge $tone={statusTone(application.status)}>{STATUS_LABELS[application.status]}</Form.StatusBadge></Form.RecordHeader>
    <Form.DetailGrid>
      <Form.DetailItem><dt>도로명 주소</dt><dd>{application.roadAddress || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>지번 주소</dt><dd>{application.jibunAddress || '정보 없음'}</dd></Form.DetailItem>
      <Form.DetailItem><dt>우편번호</dt><dd>{application.postalCode || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>연락처</dt><dd>{application.businessContactPhone || '정보 없음'}</dd></Form.DetailItem>
      <Form.DetailItem><dt>좌표</dt><dd>{Number.isFinite(application.latitude) && Number.isFinite(application.longitude) ? `${application.latitude}, ${application.longitude}` : '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>접수 시각</dt><dd>{formatDate(application.submittedAt)}</dd></Form.DetailItem>
      <Form.DetailItem><dt>검토 시각</dt><dd>{formatDate(application.reviewedAt)}</dd></Form.DetailItem><Form.DetailItem><dt>등록 장소</dt><dd>{application.registeredPlaceId ? `장소 #${application.registeredPlaceId}` : '미등록'}</dd></Form.DetailItem>
    </Form.DetailGrid>
    {application.description ? <Form.Section><Form.SectionTitle>장소 소개</Form.SectionTitle><S.Reason>{application.description}</S.Reason></Form.Section> : null}
    <Form.Section><Form.SectionTitle>태그</Form.SectionTitle>{tags.length === 0 ? <Form.RecordDescription>등록된 태그가 없습니다.</Form.RecordDescription> : <S.TagList>{tags.map((tag) => <S.Tag key={tag}>{TAG_LABELS[tag]}</S.Tag>)}</S.TagList>}</Form.Section>
    <Form.Section><Form.SectionTitle>영업 시간</Form.SectionTitle>{schedule.length === 0 ? <Form.RecordDescription>제출된 영업 시간 정보가 없습니다.</Form.RecordDescription> : <S.ScheduleList>{schedule.map((item, index) => <S.ScheduleRow key={`${item.dayOfWeek ?? 'schedule'}-${index}`}><strong>{DAY_LABELS[item.dayOfWeek ?? ''] ?? item.dayOfWeek ?? '요일 정보 없음'}</strong><span>{scheduleValue(item)}</span></S.ScheduleRow>)}</S.ScheduleList>}</Form.Section>
    <Form.Section><Form.SectionTitle>제출 첨부파일</Form.SectionTitle>{attachments.length === 0 ? <Form.RecordDescription>등록된 첨부파일이 없습니다.</Form.RecordDescription> : <S.AttachmentList>{attachments.map((attachment) => <S.AttachmentRow key={attachment.id}><strong>{DOCUMENT_LABELS[attachment.documentType]} · {attachment.originalFilename || attachment.fileId}</strong><span>{attachment.contentType || '파일'} · {formatFileSize(attachment.fileSize)} · 업로드 {formatDate(attachment.uploadedAt)}</span></S.AttachmentRow>)}</S.AttachmentList>}<S.MetaNotice>현재 API는 첨부파일 메타데이터만 제공합니다. 증빙 원본 확인 API가 추가되기 전에는 승인할 수 없습니다.</S.MetaNotice></Form.Section>
    {application.reviewReason ? <Form.Section><Form.SectionTitle>심사 사유</Form.SectionTitle><S.Reason>{application.reviewReason}</S.Reason></Form.Section> : null}
    {application.status === 'PENDING' ? <Form.InlineActions><Shared.SecondaryButton type="button" disabled={isReviewing} onClick={() => onOpenReview('reject')}>반려</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled title="첨부 증빙 원본 확인 API가 제공되기 전에는 승인할 수 없습니다.">승인</Shared.PrimaryButton></Form.InlineActions> : application.registeredPlaceId ? <Form.InlineActions><Shared.SecondaryButton type="button" onClick={onOpenPlaces}>장소 관리 열기</Shared.SecondaryButton></Form.InlineActions> : null}
  </>
}

export default PlaceRegistrationReviewPage
