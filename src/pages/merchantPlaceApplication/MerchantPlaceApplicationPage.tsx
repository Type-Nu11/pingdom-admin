import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantPlaceApplications } from '../../hooks/useMerchantPlaceApplications'
import type {
  MerchantPlaceApplication,
  MerchantPlaceApplicationRequest,
  MerchantPlaceApplicationStatus,
  MerchantPlaceSearchItem,
} from '../../types/merchantPlaceApplication.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantPlaceApplicationPage.styles'

const STATUS: Record<MerchantPlaceApplicationStatus, { label: string; tone: 'draft' | 'pending' | 'active' | 'danger' | 'neutral' }> = {
  DRAFT: { label: '작성 중', tone: 'draft' },
  PENDING: { label: '심사 대기', tone: 'pending' },
  APPROVED: { label: '승인', tone: 'active' },
  REJECTED: { label: '반려', tone: 'danger' },
  REGISTERED: { label: '등록 완료', tone: 'active' },
  COMPLETED: { label: '승인 완료', tone: 'active' },
  CANCELED: { label: '취소', tone: 'neutral' },
}

const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

function formatDate(value: string | null) {
  if (!value) return '날짜 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace(/\. /g, '.').replace('.', '')
}

function canEdit(application: MerchantPlaceApplication | null) {
  return !application || application.status === 'DRAFT'
}

function normalizeE164Phone(value: string) {
  return value.trim().replace(/[\s-]/g, '')
}

function ApplicationForm({
  application,
  profile,
  suggestions,
  isSearching,
  activeAction,
  onSearch,
  onSave,
  onSubmit,
  onReopen,
  onCancel,
}: {
  application: MerchantPlaceApplication | null
  profile: ReturnType<typeof useMerchantPlaceApplications>['profile']
  suggestions: MerchantPlaceSearchItem[]
  isSearching: boolean
  activeAction: ReturnType<typeof useMerchantPlaceApplications>['activeAction']
  onSearch: (keyword: string) => void
  onSave: (applicationId: number | null, request: MerchantPlaceApplicationRequest) => Promise<MerchantPlaceApplication | null>
  onSubmit: (applicationId: number) => Promise<MerchantPlaceApplication | null>
  onReopen: (applicationId: number) => Promise<MerchantPlaceApplication | null>
  onCancel: (applicationId: number) => Promise<MerchantPlaceApplication | null>
}) {
  const hasExistingAttachments = (application?.attachments.length ?? 0) > 0
  const editable = canEdit(application) && !hasExistingAttachments
  const canSubmitExistingAttachments = application?.status === 'DRAFT' && hasExistingAttachments
  const [legalName, setLegalName] = useState(application?.legalName ?? '')
  const [businessName, setBusinessName] = useState(application?.businessName ?? profile?.businessName ?? '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')
  const [displayName, setDisplayName] = useState(application?.merchantDisplayName ?? profile?.displayName ?? '')
  const [email, setEmail] = useState(application?.merchantContactEmail ?? profile?.contactEmail ?? '')
  const [phone, setPhone] = useState(application?.merchantContactPhone ?? profile?.contactPhone ?? '')
  const [description, setDescription] = useState(application?.merchantDescription ?? profile?.description ?? '')
  const [reason, setReason] = useState(application?.claimReason ?? '')
  const [keyword, setKeyword] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<MerchantPlaceSearchItem | null>(
    application?.existingPlaceId
      ? { id: application.existingPlaceId, name: application.placeName ?? `장소 #${application.existingPlaceId}`, englishName: null, address: '', roadAddress: null, category: '', operatingStatus: 'OPERATING' }
      : null,
  )
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(keyword), 250)
    return () => window.clearTimeout(timer)
  }, [keyword, onSearch])

  const buildRequest = (): MerchantPlaceApplicationRequest | null => {
    if (!legalName.trim() || !businessName.trim() || !businessRegistrationNumber.trim() || !displayName.trim() || !email.trim() || !phone.trim()) {
      setFormError('필수 항목을 모두 입력해주세요.')
      return null
    }
    if (!email.includes('@')) {
      setFormError('이메일 형식을 확인해주세요.')
      return null
    }
    const normalizedPhone = normalizeE164Phone(phone)
    if (!E164_PHONE_PATTERN.test(normalizedPhone)) {
      setFormError('연락처는 국가번호를 포함한 국제 형식으로 입력해주세요. 예: +821012345678')
      return null
    }
    if (!selectedPlace || !reason.trim()) {
      setFormError('운영할 장소와 신청 사유를 입력해주세요.')
      return null
    }
    setFormError('')
    return {
      applicationType: 'EXISTING_PLACE_CLAIM',
      legalName: legalName.trim(),
      businessName: businessName.trim(),
      businessRegistrationNumber: businessRegistrationNumber.trim(),
      merchantDisplayName: displayName.trim(),
      merchantDescription: description.trim() || null,
      merchantContactEmail: email.trim(),
      merchantContactPhone: normalizedPhone,
      existingPlaceId: selectedPlace.id,
      claimReason: reason.trim(),
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const request = buildRequest()
    if (!request) return
    await onSave(application?.id ?? null, request)
  }

  const choosePlace = (place: MerchantPlaceSearchItem) => {
    setSelectedPlace(place)
    setKeyword('')
    setFormError('')
  }

  return (
    <Store.Form onSubmit={save}>
      {application && !editable ? <S.ReadonlyBlock>
        <strong>{STATUS[application.status].label}</strong><br />
        {hasExistingAttachments ? '기존 증빙 서류를 보존하기 위해 이 화면에서는 신청서를 수정할 수 없습니다.' : application.status === 'PENDING' ? '심사 대기 중인 신청서는 수정할 수 없습니다.' : application.status === 'REJECTED' ? '반려 사유를 확인하고 신청서를 다시 열어 내용을 보완해주세요.' : '처리 완료된 신청서입니다.'}
        {application.reviewReason ? <><br />검토 의견: {application.reviewReason}</> : null}
      </S.ReadonlyBlock> : null}
      <Store.Field>
        법적 성명
        <Store.Input value={legalName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setLegalName(event.target.value)} />
      </Store.Field>
      <Store.Field>
        사업자명
        <Store.Input value={businessName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setBusinessName(event.target.value)} />
      </Store.Field>
      <Store.Field>
        사업자등록번호
        <Store.Input value={businessRegistrationNumber} inputMode="numeric" maxLength={30} placeholder={application ? '수정·재신청 시 다시 입력하세요.' : '사업자등록번호를 입력하세요.'} disabled={!editable || activeAction !== null} onChange={(event) => setBusinessRegistrationNumber(event.target.value)} />
      </Store.Field>
      <Store.Field>
        상점주 노출명
        <Store.Input value={displayName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setDisplayName(event.target.value)} />
      </Store.Field>
      <Store.Field>
        연락 이메일
        <Store.Input type="email" value={email} maxLength={255} disabled={!editable || activeAction !== null} onChange={(event) => setEmail(event.target.value)} />
      </Store.Field>
      <Store.Field>
        연락처
        <Store.Input type="tel" value={phone} inputMode="tel" maxLength={30} placeholder="+821012345678" disabled={!editable || activeAction !== null} onChange={(event) => setPhone(event.target.value)} />
        <S.SearchHint>국가번호를 포함한 국제 형식으로 입력하세요. 예: +821012345678</S.SearchHint>
      </Store.Field>
      <Store.Field $wide>
        운영할 장소
        <S.SearchWrap>
          <Store.Input value={keyword} placeholder="가게명 또는 주소로 검색" disabled={!editable || activeAction !== null} onChange={(event) => setKeyword(event.target.value)} />
          {editable && keyword.trim().length >= 2 && (isSearching || suggestions.length > 0) ? <S.SearchResults>{isSearching ? <S.SearchResult type="button" disabled><strong>검색 중</strong></S.SearchResult> : suggestions.map((place) => <S.SearchResult type="button" key={place.id} onClick={() => choosePlace(place)}><strong>{place.name}</strong><span>{place.address} · {place.category}</span></S.SearchResult>)}</S.SearchResults> : null}
        </S.SearchWrap>
        <S.SearchHint>등록된 장소만 선택할 수 있습니다. 이름이 비슷한 경우 주소와 카테고리를 함께 확인해주세요.</S.SearchHint>
        {selectedPlace ? <S.SelectedPlace><span aria-hidden="true">storefront</span><div><strong>{selectedPlace.name}</strong><p>{selectedPlace.address || `장소 ID ${selectedPlace.id}`}{selectedPlace.category ? ` · ${selectedPlace.category}` : ''}</p></div></S.SelectedPlace> : null}
      </Store.Field>
      <Store.Field $wide>
        운영 권한 신청 사유
        <Store.Textarea value={reason} maxLength={500} placeholder="해당 장소를 운영하는 근거와 관리 권한을 신청하는 이유를 입력하세요." disabled={!editable || activeAction !== null} onChange={(event) => setReason(event.target.value)} />
        <S.SearchHint>{reason.length}/500</S.SearchHint>
      </Store.Field>
      <Store.Field $wide>
        상점 소개
        <Store.Textarea value={description} maxLength={1000} placeholder="방문자에게 보여줄 가게 소개를 입력하세요. 선택 항목입니다." disabled={!editable || activeAction !== null} onChange={(event) => setDescription(event.target.value)} />
        <S.SearchHint>{description.length}/1000</S.SearchHint>
      </Store.Field>
      <S.AttachmentNotice>
        {hasExistingAttachments
          ? '기존 증빙 서류는 보존됩니다. 첨부 파일 수정 기능은 별도 업로드 계약과 함께 제공됩니다.'
          : '증빙 서류 업로드 기능이 준비되기 전에는 신청서를 임시 저장만 할 수 있습니다.'}
        {application?.attachments.length ? <S.AttachmentList>{application.attachments.map((attachment) => <li key={attachment.id}><strong>{attachment.originalFilename}</strong> · {attachment.documentType}</li>)}</S.AttachmentList> : null}
      </S.AttachmentNotice>
      {formError ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice> : null}
      <S.FormActions>
        {application?.status === 'REJECTED' ? <S.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => void onReopen(application.id)}>{activeAction === 'reopen' ? '다시 여는 중' : '신청서 다시 열기'}</S.SecondaryButton> : null}
        {application && (application.status === 'DRAFT' || application.status === 'PENDING') ? <S.DangerButton type="button" disabled={activeAction !== null} onClick={() => { if (window.confirm('이 운영 장소 신청을 취소할까요?')) void onCancel(application.id) }}>{activeAction === 'cancel' ? '취소 중' : '신청 취소'}</S.DangerButton> : null}
        {editable ? <><S.SecondaryButton type="submit" disabled={activeAction !== null}>{activeAction === 'save' ? '저장 중' : '임시 저장'}</S.SecondaryButton><Store.SaveButton type="button" disabled title="증빙 서류 업로드 기능이 준비된 뒤 심사 요청할 수 있습니다.">첨부 업로드 준비 중</Store.SaveButton></> : null}
        {canSubmitExistingAttachments ? <Store.SaveButton type="button" disabled={activeAction !== null} onClick={() => void onSubmit(application.id)}>{activeAction === 'submit' ? '제출 중' : '심사 요청'}</Store.SaveButton> : null}
      </S.FormActions>
    </Store.Form>
  )
}

function MerchantPlaceApplicationPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const claim = useMerchantPlaceApplications()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedApplication = useMemo(
    () => claim.applications.find((application) => application.id === selectedId) ?? null,
    [claim.applications, selectedId],
  )

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  if (claim.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>운영 장소 신청</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{claim.error}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void claim.fetchApplications()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return (
    <Store.Page>
      <Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{claim.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header>
      <Store.Content>
        <Store.PageIntro><div><Store.PageTitle>운영 장소 신청</Store.PageTitle><Store.PageDescription>이미 등록된 장소를 선택하고 운영 권한을 신청하세요. 신청이 승인되면 해당 장소를 내 가게에서 관리할 수 있습니다.</Store.PageDescription></div><Store.QuickLinks aria-label="상점주 바로가기"><Store.QuickLink type="button" onClick={() => void claim.fetchApplications()}>새로고침</Store.QuickLink></Store.QuickLinks></Store.PageIntro>
        {claim.error ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{claim.error}</Store.Notice> : null}
        {claim.actionError ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{claim.actionError}</Store.Notice> : null}
        {claim.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{claim.successMessage}</Store.Notice> : null}
        <S.Layout>
          <S.Panel>
            <S.PanelHeading><div><S.PanelTitle>신청 내역</S.PanelTitle><S.PanelDescription>제출 후에는 심사 상태와 검토 의견을 확인할 수 있습니다.</S.PanelDescription></div></S.PanelHeading>
            {claim.status === 'loading' ? <Store.Empty>신청 내역을 불러오는 중입니다.</Store.Empty> : claim.applications.length === 0 ? <S.Empty>아직 운영 장소 신청이 없습니다. 등록된 장소를 검색해 첫 신청서를 작성하세요.</S.Empty> : <S.ApplicationList>{claim.applications.map((application) => <S.ApplicationItem type="button" key={application.id} $selected={application.id === selectedId} onClick={() => setSelectedId(application.id)}><S.ApplicationTop><S.ApplicationName>{application.placeName || `장소 #${application.existingPlaceId ?? '-'}`}</S.ApplicationName><S.StatusBadge $tone={STATUS[application.status].tone}>{STATUS[application.status].label}</S.StatusBadge></S.ApplicationTop><S.ApplicationMeta>{application.businessName} · {formatDate(application.updatedAt)}</S.ApplicationMeta></S.ApplicationItem>)}</S.ApplicationList>}
            <S.NewApplicationButton type="button" onClick={() => setSelectedId(null)}>새 운영 장소 신청</S.NewApplicationButton>
          </S.Panel>
          <S.Panel>
            <S.PanelHeading><div><S.PanelTitle>{selectedApplication ? '운영 장소 신청 상세' : '새 운영 장소 신청'}</S.PanelTitle><S.PanelDescription>{selectedApplication ? `신청 번호 #${selectedApplication.id} · 마지막 수정 ${formatDate(selectedApplication.updatedAt)}` : '장소 검색부터 심사 요청까지 한 신청서에서 진행합니다.'}</S.PanelDescription></div>{selectedApplication ? <S.StatusBadge $tone={STATUS[selectedApplication.status].tone}>{STATUS[selectedApplication.status].label}</S.StatusBadge> : null}</S.PanelHeading>
            <ApplicationForm key={selectedApplication?.id ?? 'new'} application={selectedApplication} profile={claim.profile} suggestions={claim.suggestions} isSearching={claim.isSearching} activeAction={claim.activeAction} onSearch={claim.searchPlaces} onSave={async (id, request) => { const next = await claim.saveApplication(id, request); if (next) setSelectedId(next.id); return next }} onSubmit={claim.submitApplication} onReopen={claim.reopenApplication} onCancel={claim.cancelApplication} />
          </S.Panel>
        </S.Layout>
      </Store.Content>
    </Store.Page>
  )
}

export default MerchantPlaceApplicationPage
