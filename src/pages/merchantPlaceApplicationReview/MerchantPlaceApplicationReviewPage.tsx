import { PlaceDetailLink } from '../../components/place/PlaceDetailLink'
import { AttachmentPreview } from '../../components/common/AttachmentPreview'
import { AppDialog } from '../../components/common/AppDialog'
import { FeedbackMessage } from '../../components/common/FeedbackMessage'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { ListPane } from '../../components/common/ListPane'
import { ListDetailWorkspace } from '../../components/common/ListDetailWorkspace'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { APPLICATION_REVIEW_PAGE_SIZE, useAdminMerchantPlaceApplications } from '../../hooks/useAdminMerchantPlaceApplications'
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

function formatLocalTime(value: unknown) {
  if (value == null) return '시간 미입력'

  const pad = (number: number) => String(number).padStart(2, '0')

  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})/)
    return match ? `${pad(Number(match[1]))}:${match[2]}` : '시간 미입력'
  }

  if (Array.isArray(value)) {
    const [hour, minute] = value
    if (typeof hour !== 'number' || typeof minute !== 'number') return '시간 미입력'
    return `${pad(hour)}:${pad(minute)}`
  }

  if (typeof value === 'object') {
    const { hour, minute } = value as { hour?: unknown; minute?: unknown }
    if (typeof hour !== 'number' || typeof minute !== 'number') return '시간 미입력'
    return `${pad(hour)}:${pad(minute)}`
  }

  return '시간 미입력'
}

function formatOperatingDay(day: NonNullable<MerchantPlaceApplicationNewPlace['operatingDays']>[number]) {
  if (day.status === 'CLOSED') return '휴무'
  if (day.status === 'OPEN_24_HOURS') return '24시간 운영'
  return `${formatLocalTime(day.opensAt)} - ${formatLocalTime(day.closesAt)}`
}

function OperatingHours({ days }: { days: MerchantPlaceApplicationNewPlace['operatingDays'] }) {
  if (!days?.length) return <Form.RecordDescription>등록된 영업 시간 정보가 없습니다.</Form.RecordDescription>

  return <S.OperatingHoursList>
    {days.map((day) => <S.OperatingHoursItem key={day.dayOfWeek}>
      <span>{DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek}</span>
      <strong>{formatOperatingDay(day)}</strong>
    </S.OperatingHoursItem>)}
  </S.OperatingHoursList>
}

function getApplicationIdFromNavigationState(state: unknown) {
  if (!state || typeof state !== 'object' || !('applicationId' in state)) {
    return null
  }

  const applicationId = state.applicationId

  return typeof applicationId === 'number' && Number.isSafeInteger(applicationId) && applicationId > 0
    ? applicationId
    : null
}

function MerchantPlaceApplicationReviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const hook = useAdminMerchantPlaceApplications()
  const applicationIdFromNavigation = getApplicationIdFromNavigationState(location.state)
  const [preview, setPreview] = useState<{ applicationId: number; attachment: AdminMerchantPlaceApplicationAttachment } | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(applicationIdFromNavigation)
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [reviewTarget, setReviewTarget] = useState<AdminMerchantPlaceApplication | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const openedApplicationIdRef = useRef<number | null>(null)
  const fetchApplicationDetail = hook.fetchDetail
  const admin = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const isHistoryView = hook.view === 'history'
  const listTitle = isHistoryView ? '처리 이력' : '심사 대기 신청'
  const emptyMessage = isHistoryView ? '처리된 장소 신청 이력이 없습니다.' : '심사 대기 중인 장소 신청이 없습니다.'
  const loadingMessage = isHistoryView ? '처리 이력을 불러오는 중입니다.' : '심사 대기 신청을 불러오는 중입니다.'
  const safeTotalPages = Math.max(hook.totalPages, 1)
  const activeApplicantBusinessName = hook.applicantMerchantProfile?.status === 'ACTIVE'
    ? hook.applicantMerchantProfile.businessName.trim()
    : null
  const hasBusinessNameMismatch = Boolean(
    hook.detail
    && activeApplicantBusinessName
    && hook.detail.businessName.trim() !== activeApplicantBusinessName,
  )
  const approvalBlockMessage = hook.isApplicantMerchantProfileLoading
    ? '현재 상점주 정보를 확인하고 있습니다. 잠시 후 승인할 수 있습니다.'
    : hasBusinessNameMismatch
      ? '신청서의 사업자명이 현재 활성 상점주 정보와 달라 승인할 수 없습니다. 상점주에게 신청 취소 후 다시 작성하도록 안내해주세요.'
      : ''

  const changePage = (nextPage: number) => {
    const page = Math.min(Math.max(nextPage, 1), safeTotalPages)
    if (page === hook.page || hook.isLoading || hook.isReviewing) return

    setPreview(null)
    setSelectedId(null)
    setDecision(null)
    void hook.fetchApplications(page)
  }

  const selectApplication = (applicationId: number) => {
    setPreview(null)
    setSelectedId(applicationId)
    setDecision(null)
    setReason('')
    setFormError(''); hook.dismissActionError()
    void fetchApplicationDetail(applicationId)
  }

  useEffect(() => {
    if (
      !applicationIdFromNavigation ||
      openedApplicationIdRef.current === applicationIdFromNavigation
    ) {
      return
    }

    openedApplicationIdRef.current = applicationIdFromNavigation
    void fetchApplicationDetail(applicationIdFromNavigation)
  }, [applicationIdFromNavigation, fetchApplicationDetail])

  const openReview = (nextDecision: 'approve' | 'reject') => {
    if (!hook.detail || hook.detail.id !== selectedId || hook.detail.status !== 'PENDING' || hook.isReviewing) return
    setReviewTarget({ ...hook.detail })
    if (nextDecision === 'approve' && approvalBlockMessage) return
    setDecision(nextDecision)
    setReason('')
    setFormError(''); hook.dismissActionError()
  }

  const ReviewButton = decision === 'reject' ? S.DangerButton : Shared.PrimaryButton

  const submitReview = async () => {
    if (!decision || !reviewTarget || hook.isReviewing) return
    if (decision === 'approve' && approvalBlockMessage) {
      setFormError(approvalBlockMessage)
      return
    }
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setFormError('심사 사유를 입력해주세요.')
      return
    }
    if (await hook.review(reviewTarget, decision === 'approve', trimmedReason)) {
      setDecision(null)
      setPreview(null)
      setSelectedId(null)
    }
  }

  const visibleDetail = selectedId && !hook.isDetailLoading && !hook.detailErrorMessage && hook.detail?.id === selectedId
    ? hook.detail
    : null

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
        <S.ReviewContent><S.ReviewPageStack>
          <Shared.PageHeader><Shared.PageTitle>상점주 장소 신청 심사</Shared.PageTitle><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-owners')}>상점주 관리</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {hook.errorMessage ? <Shared.Notice $variant="error" role="alert">{hook.errorMessage}</Shared.Notice> : null}
          {hook.actionErrorMessage ? <FeedbackMessage tone="error" onDismiss={hook.dismissActionError}>{hook.actionErrorMessage}</FeedbackMessage> : null}
          {hook.successMessage ? <Shared.Notice $variant="success" role="status">{hook.successMessage}</Shared.Notice> : null}
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
          <ListDetailWorkspace>
            <ListPane title={listTitle} range={!hook.isLoading && !hook.errorMessage ? { page: hook.page, pageSize: APPLICATION_REVIEW_PAGE_SIZE, itemCount: hook.items.length, total: hook.total } : undefined} page={hook.page} ariaLabel="장소 신청 목록" footer={safeTotalPages > 1 ? <AdminPagination ariaLabel="장소 신청 목록 페이지네이션" page={hook.page} totalPages={safeTotalPages} hasNext={hook.hasNext} disabled={hook.isLoading || hook.isReviewing} onPageChange={changePage} /> : null}>
              {hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>{loadingMessage}</strong></Shared.EmptyState> : null}
              {!hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>{emptyMessage}</strong></Shared.EmptyState> : null}
              {hook.items.length > 0 ? (
                <S.ApplicationList>
                  {hook.items.map((item) => {
                    const title = item.placeName || item.businessName || `장소 신청 #${item.id}`
                    const applicant = item.merchantDisplayName || item.legalName
                    return (
                      <S.ApplicationButton key={item.id} type="button" $selected={selectedId === item.id} onClick={() => selectApplication(item.id)}>
                        <Form.RecordHeader>
                          <S.ApplicationTitle>{title}</S.ApplicationTitle>
                          <Form.StatusBadge $tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Form.StatusBadge>
                        </Form.RecordHeader>
                        <Form.RecordMeta>{TYPE_LABELS[item.applicationType]}</Form.RecordMeta>
                        {item.businessName && item.businessName !== title ? <Form.RecordMeta>{item.businessName}</Form.RecordMeta> : null}
                        <S.ApplicationMeta>
                          <span>{applicant ? `${applicant} · ` : ''}신청자 #{item.applicantUserId}</span>
                          <time>{formatDate(item.submittedAt ?? item.updatedAt)}</time>
                        </S.ApplicationMeta>
                      </S.ApplicationButton>
                    )
                  })}
                </S.ApplicationList>
              ) : null}
            </ListPane>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>장소 신청 상세</Shared.PanelTitle><Shared.PanelDescription>신청자·장소·증빙을 확인한 뒤 심사 결과를 기록합니다.</Shared.PanelDescription></div></Shared.PanelHeader><Shared.CompareBody>
              {!selectedId ? <Shared.EmptyState><strong>{emptyDetailTitle}</strong><p>{emptyDetailDescription}</p></Shared.EmptyState> : null}
              {selectedId && hook.isDetailLoading ? <Shared.EmptyState><strong>장소 신청 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : null}
              {selectedId && !hook.isDetailLoading && hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : null}
              {selectedId && !hook.isDetailLoading && !hook.detailErrorMessage && hook.detail?.id === selectedId ? <ApplicationDetail application={hook.detail} attachments={hook.attachments} attachmentErrorMessage={hook.attachmentErrorMessage} downloadingAttachmentId={hook.downloadingAttachmentId} onPreview={(attachment) => setPreview({ applicationId: selectedId, attachment })} onDownload={(attachment) => void hook.downloadAttachment(hook.detail!.id, attachment)} /> : null}
            </Shared.CompareBody>
            {visibleDetail ? (
              <S.ReviewActions aria-label="장소 신청 심사 작업">
                <S.ActionTarget>
                  <strong title={visibleDetail.placeName || visibleDetail.newPlace?.placeName || visibleDetail.businessName || '장소명 정보 없음'}>{visibleDetail.placeName || visibleDetail.newPlace?.placeName || visibleDetail.businessName || '장소명 정보 없음'}</strong>
                  <span>신청 #{visibleDetail.id} · {STATUS_LABELS[visibleDetail.status]}</span>
                </S.ActionTarget>
                {visibleDetail.status === 'PENDING' ? <>
                  {approvalBlockMessage ? <S.ActionReason id="application-approval-block" role="status">{approvalBlockMessage}</S.ActionReason> : null}
                  <S.ActionButtons>
                    <Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => openReview('reject')}>반려</Shared.SecondaryButton>
                    <Shared.PrimaryButton type="button" aria-describedby={approvalBlockMessage ? 'application-approval-block' : undefined} disabled={hook.isReviewing || Boolean(approvalBlockMessage)} onClick={() => openReview('approve')}>{hook.isReviewing ? '처리 중' : '승인'}</Shared.PrimaryButton>
                  </S.ActionButtons>
                </> : <S.ActionReason>읽기 전용 · 현재 상태에서는 심사할 수 없습니다.</S.ActionReason>}
              </S.ReviewActions>
            ) : null}
            </Shared.Panel>
          </ListDetailWorkspace>
        </S.ReviewPageStack></S.ReviewContent>
      </Shell.MainArea>
      {preview && visibleDetail?.id === preview.applicationId ? <AttachmentPreview
        key={`${preview.applicationId}:${preview.attachment.id}`}
        applicationId={preview.applicationId}
        attachment={preview.attachment}
        onClose={() => setPreview(null)}
        onDownload={() => hook.downloadAttachment(preview.applicationId, preview.attachment)}
      /> : null}
      {decision && reviewTarget ? (
        <AppDialog
          title={`장소 신청 ${decision === 'approve' ? '승인' : '반려'}`}
          isDismissible={!hook.isReviewing}
          onClose={() => setDecision(null)}
          footer={<>
            <Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setDecision(null)}>취소</Shared.SecondaryButton>
            <ReviewButton type="button" disabled={hook.isReviewing || (decision === 'approve' && Boolean(approvalBlockMessage))} onClick={() => void submitReview()}>
              {hook.isReviewing ? '처리 중' : decision === 'approve' ? '승인 확정' : '반려 확정'}
            </ReviewButton>
          </>}
        >
          <Form.DetailGrid>
            <Form.DetailItem><dt>신청 번호</dt><dd>#{reviewTarget.id}</dd></Form.DetailItem>
            <Form.DetailItem><dt>신청 유형</dt><dd>{TYPE_LABELS[reviewTarget.applicationType]}</dd></Form.DetailItem>
            <Form.DetailItem><dt>장소</dt><dd>{reviewTarget.placeName || reviewTarget.newPlace?.placeName || '장소명 정보 없음'}</dd></Form.DetailItem>
            <Form.DetailItem><dt>신청자</dt><dd>{reviewTarget.legalName || '이름 정보 없음'} · #{reviewTarget.applicantUserId}</dd></Form.DetailItem>
            <Form.DetailItem><dt>상호</dt><dd>{reviewTarget.businessName || '정보 없음'}</dd></Form.DetailItem>
          </Form.DetailGrid>
          <p>이 신청을 {decision === 'approve' ? '승인' : '반려'}합니다. 대상과 심사 사유를 확인해주세요.</p>
          <Form.Field>심사 사유 *
            <Form.TextArea value={reason} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReason(event.target.value); setFormError(''); hook.dismissActionError() }} />
            <small>{reason.length}/500</small>
          </Form.Field>
          {formError || hook.actionErrorMessage ? <FeedbackMessage tone="error" onDismiss={() => { setFormError(''); hook.dismissActionError() }}>{formError || hook.actionErrorMessage}</FeedbackMessage> : null}
        </AppDialog>
      ) : null}
    </Shell.AppShell>
  )
}

function ApplicationDetail({ application, attachments, attachmentErrorMessage, downloadingAttachmentId, onPreview, onDownload }: {
  application: AdminMerchantPlaceApplication
  attachments: AdminMerchantPlaceApplicationAttachment[]
  attachmentErrorMessage: string
  downloadingAttachmentId: number | null
  onPreview: (attachment: AdminMerchantPlaceApplicationAttachment) => void
  onDownload: (attachment: AdminMerchantPlaceApplicationAttachment) => void
}) {
  const newPlace = application.newPlace
  const tags = newPlace?.tags ?? []

  return <>
    <Form.RecordHeader><div><Form.RecordTitle>{application.placeName || newPlace?.placeName || application.businessName || `장소 신청 #${application.id}`}</Form.RecordTitle><Form.RecordMeta>{TYPE_LABELS[application.applicationType]} · 신청자 #{application.applicantUserId}</Form.RecordMeta></div><Form.StatusBadge $tone={statusTone(application.status)}>{STATUS_LABELS[application.status]}</Form.StatusBadge></Form.RecordHeader>
    <Form.Section><Form.SectionTitle>신청자 정보</Form.SectionTitle><Form.DetailGrid><Form.DetailItem><dt>사업자명</dt><dd>{application.businessName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>법적 이름</dt><dd>{application.legalName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>상점 표시명</dt><dd>{application.merchantDisplayName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>상점 연락처</dt><dd>{application.merchantContactPhone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>이메일</dt><dd>{application.merchantContactEmail || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>접수 시각</dt><dd>{formatDate(application.submittedAt ?? application.createdAt)}</dd></Form.DetailItem><Form.DetailItem><dt>검토 시각</dt><dd>{formatDate(application.reviewedAt)}</dd></Form.DetailItem><Form.DetailItem><dt>승인 장소</dt><dd><PlaceDetailLink id={application.placeId} /></dd></Form.DetailItem></Form.DetailGrid></Form.Section>
    {application.merchantDescription ? <Form.Section><Form.SectionTitle>상점 소개</Form.SectionTitle><S.Reason>{application.merchantDescription}</S.Reason></Form.Section> : null}
    {application.applicationType === 'NEW_PLACE' ? <Form.Section><Form.SectionTitle>신규 장소 정보</Form.SectionTitle>{newPlace ? <><Form.DetailGrid><Form.DetailItem><dt>장소명</dt><dd>{newPlace.placeName || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>카테고리</dt><dd>{CATEGORY_LABELS[newPlace.category] ?? newPlace.category}</dd></Form.DetailItem><Form.DetailItem><dt>도로명 주소</dt><dd>{newPlace.roadAddress || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>지번 주소</dt><dd>{newPlace.jibunAddress || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>우편번호</dt><dd>{newPlace.postalCode || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>좌표</dt><dd>{formatCoordinates(newPlace.latitude, newPlace.longitude)}</dd></Form.DetailItem><Form.DetailItem><dt>사업장 연락처</dt><dd>{newPlace.businessContactPhone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>신청자 연락처</dt><dd>{newPlace.applicantContactPhone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>시간대</dt><dd>{newPlace.timezone || '정보 없음'}</dd></Form.DetailItem><Form.DetailItem><dt>태그</dt><dd>{tags.length ? tags.map((tag) => TAG_LABELS[tag] ?? tag).join(' · ') : '등록 정보 없음'}</dd></Form.DetailItem></Form.DetailGrid>{newPlace.description ? <Form.Section><Form.SectionTitle>장소 소개</Form.SectionTitle><S.Reason>{newPlace.description}</S.Reason></Form.Section> : null}<Form.Section><Form.SectionTitle>영업 시간</Form.SectionTitle><OperatingHours days={newPlace.operatingDays} /></Form.Section></> : <Form.RecordDescription>이 신청의 신규 장소 정보는 서버 응답에 없습니다.</Form.RecordDescription>}</Form.Section> : null}
    {application.applicationType === 'EXISTING_PLACE_CLAIM' ? <Form.Section><Form.SectionTitle>기존 장소 운영 신청</Form.SectionTitle><Form.DetailGrid><Form.DetailItem><dt>대상 장소</dt><dd><PlaceDetailLink id={application.existingPlaceId} /></dd></Form.DetailItem><Form.DetailItem><dt>심사 완료 장소</dt><dd><PlaceDetailLink id={application.placeId} /></dd></Form.DetailItem></Form.DetailGrid>{application.claimReason ? <S.Reason>{application.claimReason}</S.Reason> : <Form.RecordDescription>등록된 신청 사유가 없습니다.</Form.RecordDescription>}</Form.Section> : null}
    <Form.Section><Form.SectionTitle>제출 증빙</Form.SectionTitle>{attachmentErrorMessage ? <Shared.Notice $variant="error" role="alert">{attachmentErrorMessage}</Shared.Notice> : null}{attachments.length === 0 ? <Form.RecordDescription>등록된 증빙 파일이 없습니다.</Form.RecordDescription> : <S.AttachmentList>{attachments.map((attachment) => <S.AttachmentRow key={attachment.id}><div><strong>{DOCUMENT_LABELS[attachment.documentType]} · {attachment.originalFilename}</strong><span>{attachment.contentType || '파일'} · {formatFileSize(attachment.fileSize)} · 업로드 {formatDate(attachment.uploadedAt)}</span></div><S.AttachmentButton type="button" onClick={() => onPreview(attachment)}>미리보기</S.AttachmentButton><S.AttachmentButton type="button" disabled={downloadingAttachmentId !== null} onClick={() => onDownload(attachment)}><Shell.MaterialIcon aria-hidden="true">download</Shell.MaterialIcon>{downloadingAttachmentId === attachment.id ? '다운로드 중' : '다운로드'}</S.AttachmentButton></S.AttachmentRow>)}</S.AttachmentList>}</Form.Section>
    {application.reviewReason ? <Form.Section><Form.SectionTitle>심사 사유</Form.SectionTitle><S.Reason>{application.reviewReason}</S.Reason></Form.Section> : null}
  </>
}

export default MerchantPlaceApplicationReviewPage
