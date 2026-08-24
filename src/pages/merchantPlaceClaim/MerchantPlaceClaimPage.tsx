import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminStatusFilter } from '../../components/common/AdminStatusFilter'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminMerchantPlaceClaims } from '../../hooks/useAdminMerchantPlaceClaims'
import { useAuth } from '../../hooks/useAuth'
import type {
  MerchantPlaceClaimAttachmentType,
  MerchantPlaceClaimStatus,
} from '../../types/adminMerchantPlaceClaim.types'
import * as Attach from '../merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage.styles'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

const STATUS: Record<MerchantPlaceClaimStatus, string> = {
  PENDING: '심사 대기',
  APPROVED: '승인',
  REJECTED: '거절',
  CANCELED: '취소',
}

const TYPES = {
  INITIAL: '기존 장소 운영 신청',
  OWNERSHIP_TRANSFER: '소유권 이전',
} as const

const DOCUMENTS: Record<MerchantPlaceClaimAttachmentType, string> = {
  BUSINESS_LICENSE: '사업자 등록증',
  RESIDENT_REGISTRATION: '주민등록 증빙',
  REPRESENTATIVE_IMAGE: '대표 이미지',
}

function date(value?: string | null) {
  if (!value) return '없음'
  const current = new Date(value)
  return Number.isNaN(current.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(current)
}

function size(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '크기 정보 없음'
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(value / 1024)} KB`
}

function statusTone(status: MerchantPlaceClaimStatus) {
  if (status === 'APPROVED') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  return 'danger' as const
}

function MerchantPlaceClaimPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminMerchantPlaceClaims()
  const [decision, setDecision] = useState<boolean | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const admin = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const submit = async () => {
    if (decision === null || hook.isReviewing) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setFormError('심사 사유를 입력해주세요.')
      return
    }
    if (await hook.review(decision, trimmedReason)) setDecision(null)
  }

  const selectClaim = (claimId: number) => {
    setDecision(null)
    setReason('')
    setFormError('')
    void hook.fetchDetail(claimId)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup>
        </Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{admin}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>기존 장소 운영 신청 심사</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.isReviewing} onClick={() => void hook.fetchClaims()}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader>
            <div><Shared.Eyebrow>검토함 &gt; 기존 장소 운영 신청</Shared.Eyebrow><Shared.PageTitle>기존 장소 운영 신청 심사</Shared.PageTitle><Shared.PageDescription>장소 운영 권한 또는 소유권 이전 요청을 장소·신청자·증빙 기준으로 검토합니다.</Shared.PageDescription></div>
            <Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-owners')}>상점주 신청</Shared.HeaderButton></Shared.HeaderActions>
          </Shared.PageHeader>
          {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
          {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
          {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
          <AdminStatusFilter label="심사 상태" value={hook.status} onChange={(event) => { void hook.fetchClaims(event.target.value as MerchantPlaceClaimStatus | '', 1) }}>
            <option value="">전체</option>
            {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </AdminStatusFilter>
          <Shared.Workspace>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>기존 장소 운영 신청</Shared.PanelTitle></div><Shared.PanelCount>{hook.total.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader>
              <Shared.ScrollArea>{hook.claims.length === 0 ? <Shared.EmptyState><strong>{hook.isLoading ? '불러오는 중입니다.' : '요청이 없습니다.'}</strong></Shared.EmptyState> : <S.CardList>{hook.claims.map((item) => <S.RecordButton key={item.id} type="button" $selected={hook.detail?.id === item.id} onClick={() => selectClaim(item.id)}><S.RecordHeader><S.RecordTitle>신청 #{item.id} · 장소 #{item.placeId}</S.RecordTitle><S.StatusBadge $tone={statusTone(item.status)}>{STATUS[item.status]}</S.StatusBadge></S.RecordHeader><S.RecordMeta>신청자 #{item.merchantOwnerUserId} · {TYPES[item.claimType]}</S.RecordMeta></S.RecordButton>)}</S.CardList>}</Shared.ScrollArea>
              <S.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => void hook.fetchClaims(hook.status, hook.page - 1)}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => void hook.fetchClaims(hook.status, hook.page + 1)}>다음</Shared.SecondaryButton></S.Pagination>
            </Shared.Panel>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>신청 상세</Shared.PanelTitle></div></Shared.PanelHeader>
              <Shared.CompareBody>{hook.isDetailLoading ? <Shared.EmptyState><strong>상세 조회 중입니다.</strong></Shared.EmptyState> : !hook.detail ? <Shared.EmptyState><strong>기존 장소 운영 신청을 선택해주세요.</strong></Shared.EmptyState> : <><S.RecordHeader><div><S.RecordTitle>{hook.detail.place?.name || `장소 #${hook.detail.placeId}`}</S.RecordTitle><S.RecordMeta>신청자 #{hook.detail.merchantOwnerUserId} · {TYPES[hook.detail.claimType]}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(hook.detail.status)}>{STATUS[hook.detail.status]}</S.StatusBadge></S.RecordHeader><S.RecordDescription>{hook.detail.claimReason}</S.RecordDescription><S.DetailGrid><S.DetailItem><dt>주소</dt><dd>{hook.detail.place?.address || '정보 없음'}</dd></S.DetailItem><S.DetailItem><dt>카테고리</dt><dd>{hook.detail.place?.category || '정보 없음'}</dd></S.DetailItem><S.DetailItem><dt>이전 소유자</dt><dd>{hook.detail.previousOwnerUserId ? `#${hook.detail.previousOwnerUserId}` : '해당 없음'}</dd></S.DetailItem><S.DetailItem><dt>신청 시각</dt><dd>{date(hook.detail.createdAt)}</dd></S.DetailItem></S.DetailGrid><ClaimAttachments /></>}</Shared.CompareBody>
            </Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
      {decision !== null && hook.detail ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !hook.isReviewing && setDecision(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="claim-review-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="claim-review-title">기존 장소 운영 신청 {decision ? '승인' : '반려'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.isReviewing} onClick={() => setDecision(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><Shared.ModalWarning>신청 #{hook.detail.id}의 장소 운영 권한이 변경될 수 있습니다. 상세 버전 {hook.detail.version} 기준으로 처리합니다.</Shared.ModalWarning><S.Section><S.Field>심사 사유 *<S.TextArea value={reason} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReason(event.target.value); setFormError('') }} /></S.Field></S.Section>{formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setDecision(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => void submit()}>{hook.isReviewing ? '처리 중' : '심사 확정'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )

  function ClaimAttachments() {
    if (!hook.detail) return null
    return <><S.Section><S.SectionTitle>제출 증빙</S.SectionTitle>{hook.isAttachmentLoading ? <S.RecordDescription>증빙 파일 목록을 불러오는 중입니다.</S.RecordDescription> : hook.attachmentErrorMessage ? <><Shared.Notice $variant="error">{hook.attachmentErrorMessage}</Shared.Notice><S.InlineActions><Shared.SecondaryButton type="button" onClick={() => void hook.fetchAttachments(hook.detail!.id)}>다시 시도</Shared.SecondaryButton></S.InlineActions></> : hook.attachments.length === 0 ? <S.RecordDescription>제출된 증빙 파일이 없습니다.</S.RecordDescription> : <Attach.AttachmentList>{hook.attachments.map((attachment) => <Attach.AttachmentRow key={attachment.id}><div><strong>{DOCUMENTS[attachment.documentType]} · 파일 #{attachment.id}</strong><span>{attachment.contentType || '파일'} · {size(attachment.fileSize)} · 순서 {attachment.displayOrder + 1}</span></div><Attach.AttachmentButton type="button" disabled={hook.downloadingAttachmentId !== null} onClick={() => void hook.downloadAttachment(hook.detail!.id, attachment)}><Shell.MaterialIcon aria-hidden="true">download</Shell.MaterialIcon>{hook.downloadingAttachmentId === attachment.id ? '다운로드 중' : '다운로드'}</Attach.AttachmentButton></Attach.AttachmentRow>)}</Attach.AttachmentList>}</S.Section>{hook.detail.reviewReason ? <S.RecordDescription>심사 사유: {hook.detail.reviewReason}</S.RecordDescription> : null}{hook.detail.status === 'PENDING' ? <><S.RecordDescription>{hook.hasLoadedAttachments ? '증빙 목록을 불러왔습니다. 심사를 진행할 수 있습니다.' : '증빙 목록을 성공적으로 불러온 뒤 심사할 수 있습니다.'}</S.RecordDescription><S.InlineActions><Shared.SecondaryButton type="button" disabled={hook.isReviewing || !hook.hasLoadedAttachments} onClick={() => { setDecision(false); setReason(''); setFormError('') }}>반려</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing || !hook.hasLoadedAttachments} onClick={() => { setDecision(true); setReason(''); setFormError('') }}>승인</Shared.PrimaryButton></S.InlineActions></> : null}</>
  }
}

export default MerchantPlaceClaimPage
