import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminStatusFilter } from '../../components/common/AdminStatusFilter'
import { AdminStatusSelect } from '../../components/common/AdminStatusSelect'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminMerchantVerifications } from '../../hooks/useAdminMerchantVerifications'
import { useAuth } from '../../hooks/useAuth'
import type { MerchantVerificationStatus } from '../../types/adminMerchantVerification.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

const LABELS: Record<MerchantVerificationStatus, string> = {
  PENDING: '심사 대기',
  APPROVED: '승인',
  REJECTED: '거절',
}

function formatReviewStatus(
  identityStatus: MerchantVerificationStatus,
  businessStatus: MerchantVerificationStatus
) {
  if (identityStatus === businessStatus) return LABELS[identityStatus]
  return `신원 ${LABELS[identityStatus]} · 사업자 ${LABELS[businessStatus]}`
}

function formatDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function MerchantVerificationPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminMerchantVerifications()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [identityApproved, setIdentityApproved] = useState(true)
  const [businessApproved, setBusinessApproved] = useState(true)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const changeFilters = (
    identity: MerchantVerificationStatus | '',
    business: MerchantVerificationStatus | ''
  ) => {
    setSelectedUserId(null); hook.clearDetail(); void hook.fetchItems(identity, business, 1)
  }

  const openReview = () => {
    setIdentityApproved(hook.detail?.identityStatus !== 'REJECTED')
    setBusinessApproved(hook.detail?.businessStatus !== 'REJECTED')
    setReason(''); setFormError(''); setIsReviewOpen(true)
  }

  const submitReview = async () => {
    if (!hook.detail || hook.isReviewing) return
    if (!reason.trim()) { setFormError('심사 사유를 입력해주세요.'); return }
    if (await hook.review(hook.detail.userId, {
      identityApproved,
      businessApproved,
      reason: reason.trim(),
    })) setIsReviewOpen(false)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>Merchant 검증 심사</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.isReviewing} onClick={() => void hook.fetchItems(hook.identityStatus, hook.businessStatus, hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>Merchant Owner &gt; 검증 심사</Shared.Eyebrow><Shared.PageTitle>Merchant 신원 및 사업자 검증</Shared.PageTitle><Shared.PageDescription>신청자의 법적 이름과 사업자 등록 정보를 각각 판정합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-owners')}>Merchant Owner 운영</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}{hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
          <AdminStatusFilter
            label="심사 상태 필터"
            description="신원과 사업자 심사 상태를 조합해 조회합니다."
            controls={<><AdminStatusSelect aria-label="신원 검증 상태" value={hook.identityStatus} onChange={(event) => changeFilters(event.target.value as MerchantVerificationStatus | '', hook.businessStatus)}><option value="">신원 전체</option>{Object.entries(LABELS).map(([value,label]) => <option key={value} value={value}>{`신원 ${label}`}</option>)}</AdminStatusSelect><AdminStatusSelect aria-label="사업자 검증 상태" value={hook.businessStatus} onChange={(event) => changeFilters(hook.identityStatus, event.target.value as MerchantVerificationStatus | '')}><option value="">사업자 전체</option>{Object.entries(LABELS).map(([value,label]) => <option key={value} value={value}>{`사업자 ${label}`}</option>)}</AdminStatusSelect></>}
          />
          {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
          <Shared.Workspace>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>검증 신청</Shared.PanelTitle><Shared.PanelDescription>항목을 선택해 심사 정보를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalCount.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader><Shared.ScrollArea>{hook.isLoading && hook.items.length === 0 ? <Shared.EmptyState><strong>검증 신청을 불러오는 중입니다.</strong></Shared.EmptyState> : hook.items.length === 0 ? <Shared.EmptyState><strong>조건에 맞는 신청이 없습니다.</strong></Shared.EmptyState> : <S.CardList>{hook.items.map((item) => <S.RecordButton key={item.userId} type="button" $selected={selectedUserId === item.userId} onClick={() => { setSelectedUserId(item.userId); void hook.fetchDetail(item.userId) }}><S.RecordHeader><S.RecordTitle>{item.businessName}</S.RecordTitle><S.StatusBadge $tone={item.identityStatus === 'APPROVED' && item.businessStatus === 'APPROVED' ? 'success' : item.identityStatus === 'REJECTED' || item.businessStatus === 'REJECTED' ? 'danger' : 'warning'}>{formatReviewStatus(item.identityStatus, item.businessStatus)}</S.StatusBadge></S.RecordHeader><S.RecordMeta>{item.legalName} · 사용자 #{item.userId}</S.RecordMeta><S.RecordDescription>사업자 번호 {item.maskedBusinessRegistrationNumber}</S.RecordDescription></S.RecordButton>)}</S.CardList>}</Shared.ScrollArea>{hook.totalPages > 1 ? <S.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => { setSelectedUserId(null); hook.clearDetail(); void hook.fetchItems(hook.identityStatus, hook.businessStatus, hook.page - 1) }}>이전</Shared.SecondaryButton><span>{Math.max(hook.page,1)} / {Math.max(hook.totalPages,1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => { setSelectedUserId(null); hook.clearDetail(); void hook.fetchItems(hook.identityStatus, hook.businessStatus, hook.page + 1) }}>다음</Shared.SecondaryButton></S.Pagination> : null}</Shared.Panel>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>검증 신청 상세</Shared.PanelTitle><Shared.PanelDescription>선택한 신청의 심사 정보를 확인합니다.</Shared.PanelDescription></div></Shared.PanelHeader><Shared.CompareBody>{!selectedUserId ? <Shared.EmptyState><strong>목록에서 신청을 선택하세요.</strong></Shared.EmptyState> : hook.isDetailLoading ? <Shared.EmptyState><strong>신청 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedUserId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : hook.detail ? <><S.RecordHeader><div><S.RecordTitle>{hook.detail.businessName}</S.RecordTitle><S.RecordMeta>{hook.detail.legalName} · 사용자 #{hook.detail.userId}</S.RecordMeta></div></S.RecordHeader><S.DetailGrid><S.DetailItem><dt>법적 이름</dt><dd>{hook.detail.legalName}</dd></S.DetailItem><S.DetailItem><dt>사업자명</dt><dd>{hook.detail.businessName}</dd></S.DetailItem><S.DetailItem><dt>사업자 등록번호</dt><dd>{hook.detail.businessRegistrationNumber}</dd></S.DetailItem><S.DetailItem><dt>신원 상태</dt><dd>{LABELS[hook.detail.identityStatus]}</dd></S.DetailItem><S.DetailItem><dt>사업자 상태</dt><dd>{LABELS[hook.detail.businessStatus]}</dd></S.DetailItem><S.DetailItem><dt>접수 시각</dt><dd>{formatDate(hook.detail.createdAt)}</dd></S.DetailItem><S.DetailItem><dt>심사 관리자</dt><dd>{hook.detail.reviewedBy ? `ID ${hook.detail.reviewedBy}` : '미심사'}</dd></S.DetailItem><S.DetailItem><dt>심사 사유</dt><dd>{hook.detail.reviewReason || '아직 입력되지 않음'}</dd></S.DetailItem></S.DetailGrid><S.InlineActions><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={openReview}>심사 결과 입력</Shared.PrimaryButton></S.InlineActions></> : null}</Shared.CompareBody></Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>

      {isReviewOpen && hook.detail ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !hook.isReviewing && setIsReviewOpen(false)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="merchant-verification-review-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="merchant-verification-review-title">Merchant 검증 심사</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.isReviewing} onClick={() => setIsReviewOpen(false)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><S.FormGrid><S.CheckField><input type="checkbox" checked={identityApproved} disabled={hook.isReviewing} onChange={(event) => setIdentityApproved(event.target.checked)} />신원 승인</S.CheckField><S.CheckField><input type="checkbox" checked={businessApproved} disabled={hook.isReviewing} onChange={(event) => setBusinessApproved(event.target.checked)} />사업자 승인</S.CheckField><S.WideField>심사 사유 *<S.TextArea value={reason} maxLength={500} disabled={hook.isReviewing} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></S.WideField></S.FormGrid>{!identityApproved || !businessApproved ? <Shared.ModalWarning>체크를 해제한 항목은 거절 처리됩니다. 두 결과를 각각 확인해주세요.</Shared.ModalWarning> : null}{formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.isReviewing} onClick={() => setIsReviewOpen(false)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.isReviewing} onClick={() => void submitReview()}>{hook.isReviewing ? '저장 중' : '심사 결과 저장'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

export default MerchantVerificationPage
