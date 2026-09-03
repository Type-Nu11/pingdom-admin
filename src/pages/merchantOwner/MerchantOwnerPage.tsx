import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminMerchantOwners } from '../../hooks/useAdminMerchantOwners'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminMerchantOwnerPlace,
  MerchantOnboardingStatus,
  MerchantOperationalQualityStatus,
  MerchantOwnerStatus,
} from '../../types/adminMerchantOwner.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'
import * as Owner from './MerchantOwnerPage.styles'

const OWNER_STATUS: Record<MerchantOwnerStatus, string> = { PENDING: '심사 대기', ACTIVE: '운영 중', REJECTED: '반려', REVOKED: '권한 회수' }
const ONBOARDING_STATUS: Record<MerchantOnboardingStatus, string> = { NOT_STARTED: '시작 전', IN_PROGRESS: '진행 중', COMPLETED: '완료' }
const QUALITY_STATUS: Record<MerchantOperationalQualityStatus, string> = { UNMEASURED: '미측정', HEALTHY: '양호', NEEDS_ATTENTION: '주의 필요', AT_RISK: '위험' }
type Dialog =
  | { type: 'review'; action: 'revoke' }
  | { type: 'places' }
  | { type: 'onboarding' }
  | { type: 'quality'; place: AdminMerchantOwnerPlace }
  | null

function formatDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
function parsePlaceIds(value: string) {
  if (!value.trim()) return []
  const ids = value.split(',').map((part) => Number(part.trim()))
  return ids.every((id) => Number.isInteger(id) && id > 0) ? [...new Set(ids)] : null
}
function rate(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null
}

function MerchantOwnerPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminMerchantOwners()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [reason, setReason] = useState('')
  const [placeIds, setPlaceIds] = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState<MerchantOnboardingStatus>('NOT_STARTED')
  const [completionRate, setCompletionRate] = useState('0')
  const [completedAt, setCompletedAt] = useState('')
  const [qualityStatus, setQualityStatus] = useState<MerchantOperationalQualityStatus>('UNMEASURED')
  const [responseRate, setResponseRate] = useState('0')
  const [cancellationRate, setCancellationRate] = useState('0')
  const [noShowRate, setNoShowRate] = useState('0')
  const [evaluatedAt, setEvaluatedAt] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const selectProfile = (userId: number) => { setSelectedUserId(userId); void hook.fetchDetail(userId) }
  const openDialog = (next: Dialog) => {
    if (!next || !hook.profile) return
    setReason(''); setFormError('')
    if (next.type === 'places') setPlaceIds(hook.profile.placeIds.join(', '))
    if (next.type === 'onboarding') {
      setOnboardingStatus(hook.profile.onboardingStatus); setCompletionRate(String(hook.profile.onboardingCompletionRate)); setCompletedAt(hook.profile.onboardingCompletedAt?.slice(0, 16) ?? '')
    }
    if (next.type === 'quality') {
      setQualityStatus(next.place.operationalQualityStatus); setResponseRate(String(next.place.reservationResponseRate)); setCancellationRate(String(next.place.reservationCancellationRate)); setNoShowRate(String(next.place.noShowRate)); setEvaluatedAt(next.place.qualityEvaluatedAt?.slice(0, 16) ?? '')
    }
    setDialog(next)
  }

  const submit = async () => {
    if (!hook.profile || !dialog || hook.activeAction) return
    const userId = hook.profile.userId
    const trimmedReason = reason.trim()
    if (!trimmedReason) { setFormError('처리 사유를 입력해주세요.'); return }
    if (dialog.type === 'review') {
      const request = { reason: trimmedReason }
      const result = await hook.revoke(userId, request)
      if (result) setDialog(null)
      return
    }
    if (dialog.type === 'places') {
      const ids = parsePlaceIds(placeIds)
      if (ids === null) { setFormError('장소 ID는 쉼표로 구분한 1 이상의 정수로 입력해주세요.'); return }
      if (await hook.replacePlaces(userId, { placeIds: ids, reason: trimmedReason })) setDialog(null)
      return
    }
    if (dialog.type === 'onboarding') {
      const completion = rate(completionRate)
      if (completion === null) { setFormError('완료율은 0~100 사이 정수여야 합니다.'); return }
      if (onboardingStatus === 'COMPLETED' && completion !== 100) { setFormError('온보딩 완료 상태의 완료율은 100이어야 합니다.'); return }
      if (await hook.updateOnboarding(userId, { status: onboardingStatus, completionRate: completion, completedAt: completedAt || undefined, reason: trimmedReason })) setDialog(null)
      return
    }
    const rates = [rate(responseRate), rate(cancellationRate), rate(noShowRate)]
    if (rates.some((value) => value === null)) { setFormError('운영 품질 비율은 각각 0~100 사이 정수여야 합니다.'); return }
    if (await hook.updateQuality(userId, dialog.place.placeId, { status: qualityStatus, reservationResponseRate: rates[0]!, reservationCancellationRate: rates[1]!, noShowRate: rates[2]!, evaluatedAt: evaluatedAt || undefined, reason: trimmedReason })) setDialog(null)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴"><Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader><Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu><Shell.SideFooter><Shell.AdminProfile aria-label="관리자 계정"><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter></Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}><Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>상점주 관리</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.activeAction !== null} onClick={() => void hook.fetchProfiles(hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>성장 운영 &gt; 상점주 관리</Shared.Eyebrow><Shared.PageTitle>상점주 운영 관리</Shared.PageTitle><Shared.PageDescription>운영 중인 상점주의 연결 장소, 온보딩, 운영 품질을 관리합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant-place-applications')}>상점주 장소 신청 심사</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}{hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}
          {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
          <Owner.OwnerWorkspace>
            <Owner.OwnerPanel><Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>운영 중 상점주 목록</Shared.PanelTitle><Shared.PanelDescription>상점주를 선택해 가게와 운영 정보를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalCount.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader><Shared.ScrollArea>{hook.isLoading && hook.profiles.length === 0 ? <Shared.EmptyState><strong>상점주 목록을 불러오는 중입니다.</strong></Shared.EmptyState> : hook.profiles.length === 0 ? <Shared.EmptyState><strong>운영 중인 상점주가 없습니다.</strong></Shared.EmptyState> : <S.CardList>{hook.profiles.map((profile) => <S.RecordButton key={profile.userId} type="button" $selected={selectedUserId === profile.userId} onClick={() => selectProfile(profile.userId)}><S.RecordHeader><S.RecordTitle>{profile.businessName}</S.RecordTitle><S.StatusBadge $tone={profile.status === 'ACTIVE' ? 'success' : profile.status === 'PENDING' ? 'warning' : 'danger'}>{OWNER_STATUS[profile.status]}</S.StatusBadge></S.RecordHeader><S.RecordMeta>{profile.displayName} · 사용자 #{profile.userId}</S.RecordMeta><S.RecordSummary>{profile.description || '사업자 소개 없음'}</S.RecordSummary></S.RecordButton>)}</S.CardList>}</Shared.ScrollArea>{hook.totalPages > 1 ? <AdminPagination ariaLabel="상점주 목록 페이지네이션" page={hook.page} totalPages={hook.totalPages} hasNext={hook.hasNext} disabled={hook.isLoading} onPageChange={(nextPage) => { setSelectedUserId(null); hook.clearDetail(); void hook.fetchProfiles(nextPage) }} /> : null}</Shared.Panel></Owner.OwnerPanel>
            <Owner.OwnerPanel><Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>상점주 정보 및 연결 장소</Shared.PanelTitle><Shared.PanelDescription>가게 정보와 장소 운영 품질을 확인하고 관리합니다.</Shared.PanelDescription></div></Shared.PanelHeader><Shared.CompareBody>{!selectedUserId ? <Shared.EmptyState><strong>확인할 상점주를 선택해주세요.</strong></Shared.EmptyState> : hook.isDetailLoading ? <Shared.EmptyState><strong>상세 정보를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong><Shared.SecondaryButton type="button" onClick={() => void hook.fetchDetail(selectedUserId)}>다시 시도</Shared.SecondaryButton></Shared.EmptyState> : hook.profile ? <>
              <S.RecordHeader><div><S.RecordTitle>{hook.profile.businessName}</S.RecordTitle><S.RecordMeta>{hook.profile.displayName} · 사용자 #{hook.profile.userId}</S.RecordMeta></div><S.StatusBadge $tone={hook.profile.status === 'ACTIVE' ? 'success' : hook.profile.status === 'PENDING' ? 'warning' : 'danger'}>{OWNER_STATUS[hook.profile.status]}</S.StatusBadge></S.RecordHeader><S.RecordDescription>{hook.profile.description || '사업자 소개 없음'}</S.RecordDescription>
              <S.DetailGrid><S.DetailItem><dt>이메일</dt><dd>{hook.profile.contactEmail}</dd></S.DetailItem><S.DetailItem><dt>전화번호</dt><dd>{hook.profile.contactPhone}</dd></S.DetailItem><S.DetailItem><dt>온보딩</dt><dd>{ONBOARDING_STATUS[hook.profile.onboardingStatus]} · {hook.profile.onboardingCompletionRate}%</dd></S.DetailItem><S.DetailItem><dt>검토 일시</dt><dd>{hook.profile.reviewedBy ? `관리자 #${hook.profile.reviewedBy} · ${formatDate(hook.profile.reviewedAt)}` : '미처리'}</dd></S.DetailItem></S.DetailGrid>
              {hook.profile.reviewReason ? <S.RecordDescription>최근 검토 메모: {hook.profile.reviewReason}</S.RecordDescription> : null}
              <S.InlineActions><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => openDialog({ type: 'places' })}>연결 장소 변경</Shared.SecondaryButton><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => openDialog({ type: 'onboarding' })}>온보딩 변경</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => openDialog({ type: 'review', action: 'revoke' })}>권한 회수</Shared.PrimaryButton></S.InlineActions>
              <S.Section><S.SectionHeader><S.SectionTitle>연결 장소 {hook.places.length.toLocaleString()}개</S.SectionTitle></S.SectionHeader>{hook.places.length === 0 ? <Shared.EmptyState><strong>연결된 장소가 없습니다.</strong></Shared.EmptyState> : <S.CardList>{hook.places.map((place) => <S.RecordCard key={place.placeId}><S.RecordHeader><S.RecordTitle>장소 #{place.placeId}</S.RecordTitle><S.StatusBadge $tone={place.operationalQualityStatus === 'HEALTHY' ? 'success' : place.operationalQualityStatus === 'AT_RISK' ? 'danger' : 'warning'}>{QUALITY_STATUS[place.operationalQualityStatus]}</S.StatusBadge></S.RecordHeader><S.RecordMeta>응답 {place.reservationResponseRate}% · 취소 {place.reservationCancellationRate}% · 노쇼 {place.noShowRate}% · 평가 {formatDate(place.qualityEvaluatedAt)}</S.RecordMeta>{hook.profile?.status === 'ACTIVE' ? <S.InlineActions><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => openDialog({ type: 'quality', place })}>운영 품질 변경</Shared.SecondaryButton></S.InlineActions> : null}</S.RecordCard>)}</S.CardList>}</S.Section>
            </> : null}</Shared.CompareBody></Shared.Panel></Owner.OwnerPanel>
          </Owner.OwnerWorkspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>

      {dialog && hook.profile ? <Shared.ModalOverlay role="presentation" onMouseDown={() => hook.activeAction === null && setDialog(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="merchant-owner-dialog-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="merchant-owner-dialog-title">{dialog.type === 'review' ? '상점주 권한 회수' : dialog.type === 'places' ? '연결 장소 변경' : dialog.type === 'onboarding' ? '온보딩 변경' : `장소 #${dialog.place.placeId} 운영 품질`}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody><S.FormGrid>
        {dialog.type === 'places' ? <S.WideField>연결 장소 ID<S.Input value={placeIds} placeholder="101, 102, 103" disabled={hook.activeAction !== null} onChange={(event) => { setPlaceIds(event.target.value); setFormError('') }} /><small>쉼표로 구분하며, 비우면 연결 장소가 없는 상태입니다.</small></S.WideField> : null}
        {dialog.type === 'onboarding' ? <><S.Field>온보딩 상태<AdminSelect aria-label="온보딩 상태" value={onboardingStatus} disabled={hook.activeAction !== null} width="100%" onChange={(event) => setOnboardingStatus(event.target.value as MerchantOnboardingStatus)}>{Object.entries(ONBOARDING_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field><S.Field>완료율<S.Input inputMode="numeric" value={completionRate} disabled={hook.activeAction !== null} onChange={(event) => setCompletionRate(event.target.value)} /></S.Field><S.WideField>완료 시각<AdminDateTimePicker ariaLabel="온보딩 완료 시각" value={completedAt} disabled={hook.activeAction !== null} onChange={setCompletedAt} /></S.WideField></> : null}
        {dialog.type === 'quality' ? <><S.WideField>품질 상태<AdminSelect aria-label="운영 품질 상태" value={qualityStatus} disabled={hook.activeAction !== null} width="100%" onChange={(event) => setQualityStatus(event.target.value as MerchantOperationalQualityStatus)}>{Object.entries(QUALITY_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.WideField><S.Field>예약 응답률<S.Input inputMode="numeric" value={responseRate} disabled={hook.activeAction !== null} onChange={(event) => setResponseRate(event.target.value)} /></S.Field><S.Field>예약 취소율<S.Input inputMode="numeric" value={cancellationRate} disabled={hook.activeAction !== null} onChange={(event) => setCancellationRate(event.target.value)} /></S.Field><S.Field>노쇼율<S.Input inputMode="numeric" value={noShowRate} disabled={hook.activeAction !== null} onChange={(event) => setNoShowRate(event.target.value)} /></S.Field><S.Field>평가 시각<AdminDateTimePicker ariaLabel="운영 품질 평가 시각" value={evaluatedAt} disabled={hook.activeAction !== null} onChange={setEvaluatedAt} /></S.Field></> : null}
        <S.WideField>처리 사유 *<S.TextArea value={reason} maxLength={500} disabled={hook.activeAction !== null} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></S.WideField>
      </S.FormGrid>{formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => void submit()}>{hook.activeAction ? '처리 중' : dialog.type === 'review' ? '권한 회수 확정' : '변경 확정'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

export default MerchantOwnerPage
