import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMerchantPlaceSuggestions } from '../../api/merchantPlaceApplicationApi'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantPlaceClaims } from '../../hooks/useMerchantPlaceClaims'
import type { MerchantPlaceSearchItem } from '../../types/merchantPlaceApplication.types'
import type {
  MerchantPlaceClaimDocumentType,
  MerchantPlaceClaimStatus,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as Shared from '../merchantCampaign/MerchantCampaignPage.styles'
import * as S from './MerchantPlaceClaimRequestPage.styles'

const STATUS: Record<MerchantPlaceClaimStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  PENDING: { label: '심사 대기', tone: 'draft' },
  APPROVED: { label: '승인됨', tone: 'published' },
  REJECTED: { label: '반려', tone: 'closed' },
  CANCELED: { label: '취소됨', tone: 'closed' },
}

const DOCUMENT_TYPE: Record<MerchantPlaceClaimDocumentType, string> = {
  BUSINESS_LICENSE: '사업자 등록증',
  RESIDENT_REGISTRATION: '주민등록 증빙',
  REPRESENTATIVE_IMAGE: '대표 이미지',
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatFileSize(value: number) {
  return value >= 1024 * 1024 ? `${(value / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(value / 1024))} KB`
}

function MerchantPlaceClaimRequestPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const claims = useMerchantPlaceClaims()
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<MerchantPlaceSearchItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<MerchantPlaceSearchItem | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [documentType, setDocumentType] = useState<MerchantPlaceClaimDocumentType>('BUSINESS_LICENSE')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    const trimmed = keyword.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return undefined
    }
    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await getMerchantPlaceSuggestions(trimmed)
        setSuggestions(data.places)
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [keyword])

  const selectClaim = (claimId: number) => {
    void claims.fetchClaimDetail(claimId)
  }

  const createClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPlace || !reason.trim()) {
      setFormError('운영 권한을 신청할 장소와 사유를 입력해주세요.')
      return
    }
    const next = await claims.createClaim({ placeId: selectedPlace.id, reason: reason.trim() })
    if (!next) return
    setFormError('')
    setKeyword('')
    setSuggestions([])
    setSelectedPlace(null)
    setReason('')
  }

  const uploadAttachment = async () => {
    if (!claims.selectedClaim || !selectedFile) return
    const next = await claims.uploadAttachment(claims.selectedClaim, documentType, selectedFile)
    if (next) setSelectedFile(null)
  }

  const moveAttachment = async (attachmentId: number, direction: -1 | 1) => {
    if (!claims.selectedClaim) return
    const current = claims.attachments.filter(
      (attachment) => attachment.documentType === 'REPRESENTATIVE_IMAGE',
    )
    const index = current.findIndex((attachment) => attachment.id === attachmentId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= current.length) return
    const ids = current.map((attachment) => attachment.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await claims.reorderAttachments(claims.selectedClaim, ids)
  }

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  if (claims.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>장소 Claim</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{claims.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void claims.fetchClaims(1, true)}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  const selected = claims.selectedClaim
  const canManageAttachments = selected?.status === 'PENDING'
  const representativeAttachments = claims.attachments.filter(
    (attachment) => attachment.documentType === 'REPRESENTATIVE_IMAGE',
  )

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>장소 Claim</Store.PageTitle><Store.PageDescription>PingDom에 등록된 장소의 운영 권한을 신청하고 증빙 파일과 심사 결과를 관리합니다.</Store.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/merchant')}>내 가게 관리</Shared.HeaderButton><Shared.HeaderButton type="button" disabled={claims.isLoading || claims.activeAction !== null} onClick={() => void claims.fetchClaims(claims.pageInfo.page)}>새로고침</Shared.HeaderButton></Shared.HeaderActions></Store.PageIntro>
    {claims.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{claims.sectionErrorMessage}</Store.Notice> : null}
    {claims.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{claims.actionErrorMessage}</Store.Notice> : null}
    {claims.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{claims.successMessage}</Store.Notice> : null}
    <S.Workspace>
      <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>Claim 요청</Shared.PanelTitle><Shared.PanelDescription>승인된 장소 Claim은 내 가게 관리에서 연결된 장소로 표시됩니다.</Shared.PanelDescription></div></Shared.PanelHeader><div style={{ padding: '18px 20px 20px' }}><Shared.Form onSubmit={createClaim}><Shared.Field $wide>운영 권한을 신청할 장소<S.SearchWrap><Shared.Input value={keyword} placeholder="장소명 또는 주소 검색" disabled={claims.activeAction !== null} onChange={(event) => { setKeyword(event.target.value); setSelectedPlace(null) }} />{keyword.trim().length >= 2 && (isSearching || suggestions.length > 0) ? <S.SearchResults>{isSearching ? <S.SearchResult type="button" disabled><strong>검색 중입니다.</strong></S.SearchResult> : suggestions.map((place) => <S.SearchResult type="button" key={place.id} onClick={() => { setSelectedPlace(place); setKeyword(''); setSuggestions([]); setFormError('') }}><strong>{place.name}</strong><span>{place.address} · {place.category}</span></S.SearchResult>)}</S.SearchResults> : null}</S.SearchWrap><S.FieldHint>등록된 장소를 선택해야 합니다. 이름이 비슷한 경우 주소와 카테고리를 함께 확인하세요.</S.FieldHint>{selectedPlace ? <S.SelectedPlace><strong>{selectedPlace.name}</strong><span>{selectedPlace.address || `장소 ID ${selectedPlace.id}`} · {selectedPlace.category}</span></S.SelectedPlace> : null}</Shared.Field><Shared.Field $wide>신청 사유<Shared.Textarea value={reason} maxLength={500} placeholder="운영 권한을 신청하는 근거를 입력하세요." disabled={claims.activeAction !== null} onChange={(event) => setReason(event.target.value)} /><S.FieldHint>{reason.length}/500</S.FieldHint></Shared.Field>{formError ? <Shared.FormError role="alert">{formError}</Shared.FormError> : null}<Shared.FormActions><Shared.ActionButton type="submit" $variant="primary" disabled={claims.activeAction !== null}>{claims.activeAction === 'create' ? '등록 중' : 'Claim 요청 등록'}</Shared.ActionButton></Shared.FormActions></Shared.Form><S.DetailSection><S.SectionTitle>내 요청 내역</S.SectionTitle><S.FieldHint>총 {claims.pageInfo.totalElements.toLocaleString()}건</S.FieldHint><div style={{ marginTop: 12 }}>{claims.isLoading && claims.claims.length === 0 ? <Shared.Empty>Claim 요청을 불러오는 중입니다.</Shared.Empty> : claims.claims.length === 0 ? <Shared.Empty>등록된 Claim 요청이 없습니다.</Shared.Empty> : claims.claims.map((claim) => <S.ClaimItem type="button" key={claim.id} $selected={claim.id === selected?.id} onClick={() => selectClaim(claim.id)}><Shared.StatusBadge $tone={STATUS[claim.status].tone}>{STATUS[claim.status].label}</Shared.StatusBadge><S.ClaimTitle style={{ marginTop: 8 }}>장소 #{claim.placeId} · 요청 #{claim.id}</S.ClaimTitle><S.ClaimMeta>{claim.claimType === 'INITIAL' ? '운영 권한 신청' : '소유권 이전'} · {formatDateTime(claim.updatedAt)}</S.ClaimMeta></S.ClaimItem>)}</div>{claims.pageInfo.totalPages > 1 ? <Shared.Pagination><Shared.PaginationButton type="button" disabled={claims.isLoading || claims.pageInfo.page <= 1} onClick={() => void claims.fetchClaims(claims.pageInfo.page - 1)}>이전</Shared.PaginationButton><Shared.PageText>{claims.pageInfo.page} / {claims.pageInfo.totalPages}</Shared.PageText><Shared.PaginationButton type="button" disabled={claims.isLoading || !claims.pageInfo.hasNext} onClick={() => void claims.fetchClaims(claims.pageInfo.page + 1)}>다음</Shared.PaginationButton></Shared.Pagination> : null}</S.DetailSection></div></Shared.Panel>
      <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>Claim 상세</Shared.PanelTitle><Shared.PanelDescription>심사 대기 상태에서만 요청 취소와 증빙 파일 관리를 할 수 있습니다.</Shared.PanelDescription></div>{selected ? <Shared.StatusBadge $tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Shared.StatusBadge> : null}</Shared.PanelHeader><div style={{ padding: '18px 20px 20px' }}>{claims.isDetailLoading ? <Shared.Empty>상세 정보를 불러오는 중입니다.</Shared.Empty> : !selected ? <Shared.Empty>왼쪽 목록에서 Claim 요청을 선택해주세요.</Shared.Empty> : <><S.DetailMeta><dt>장소</dt><dd>장소 #{selected.placeId}</dd><dt>요청 유형</dt><dd>{selected.claimType === 'INITIAL' ? '운영 권한 신청' : '소유권 이전'}</dd><dt>신청 일시</dt><dd>{formatDateTime(selected.createdAt)}</dd><dt>검토 일시</dt><dd>{formatDateTime(selected.reviewedAt)}</dd><dt>신청 사유</dt><dd>{selected.reason}</dd>{selected.reviewReason ? <><dt>검토 의견</dt><dd>{selected.reviewReason}</dd></> : null}</S.DetailMeta><S.DetailSection><S.SectionTitle>증빙 파일</S.SectionTitle><S.FieldHint>첨부 파일의 원본 URL은 API 응답에 포함되지 않아, 이 화면에서는 파일 메타데이터만 표시합니다.</S.FieldHint>{claims.attachments.length === 0 ? <Shared.Empty style={{ marginTop: 14 }}>등록된 증빙 파일이 없습니다.</Shared.Empty> : <S.AttachmentList>{claims.attachments.map((attachment) => { const representativeIndex = representativeAttachments.findIndex((item) => item.id === attachment.id); return <S.AttachmentRow key={attachment.id}><div><strong>{DOCUMENT_TYPE[attachment.documentType]}</strong><span>{attachment.contentType} · {formatFileSize(attachment.fileSize)}</span></div>{canManageAttachments ? <S.AttachmentActions>{attachment.documentType === 'REPRESENTATIVE_IMAGE' ? <><S.IconButton type="button" aria-label="위로 이동" disabled={claims.activeAction !== null || representativeIndex === 0} onClick={() => void moveAttachment(attachment.id, -1)}>keyboard_arrow_up</S.IconButton><S.IconButton type="button" aria-label="아래로 이동" disabled={claims.activeAction !== null || representativeIndex === representativeAttachments.length - 1} onClick={() => void moveAttachment(attachment.id, 1)}>keyboard_arrow_down</S.IconButton></> : null}<S.IconButton type="button" aria-label="증빙 파일 삭제" disabled={claims.activeAction !== null} onClick={() => { if (window.confirm('이 증빙 파일을 삭제할까요?')) void claims.deleteAttachment(selected, attachment.id) }}>delete</S.IconButton></S.AttachmentActions> : null}</S.AttachmentRow> })}</S.AttachmentList>}{canManageAttachments ? <S.UploadRow><Shared.Field style={{ flex: 1 }}>증빙 유형<select value={documentType} disabled={claims.activeAction !== null} onChange={(event) => setDocumentType(event.target.value as MerchantPlaceClaimDocumentType)}><option value="BUSINESS_LICENSE">사업자 등록증</option><option value="RESIDENT_REGISTRATION">주민등록 증빙</option><option value="REPRESENTATIVE_IMAGE">대표 이미지</option></select></Shared.Field><S.FileInput type="file" disabled={claims.activeAction !== null} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} /><Shared.ActionButton type="button" $variant="secondary" disabled={!selectedFile || claims.activeAction !== null} onClick={() => void uploadAttachment()}>{claims.activeAction === 'upload' ? '업로드 중' : '파일 추가'}</Shared.ActionButton></S.UploadRow> : null}</S.DetailSection>{canManageAttachments ? <Shared.FormActions><Shared.ActionButton type="button" $variant="danger" disabled={claims.activeAction !== null} onClick={() => { if (window.confirm('장소 Claim 요청을 취소할까요? 취소 후에는 다시 심사를 진행할 수 없습니다.')) void claims.cancelClaim(selected) }}>{claims.activeAction === 'cancel' ? '취소 중' : 'Claim 요청 취소'}</Shared.ActionButton></Shared.FormActions> : null}</>}</div></Shared.Panel>
    </S.Workspace>
  </Store.Content></Store.Page>
}

export default MerchantPlaceClaimRequestPage
