import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  MERCHANT_CAMPAIGN_PAGE_LIMIT,
  useMerchantCampaigns,
} from '../../hooks/useMerchantCampaigns'
import type {
  MerchantBrand,
  MerchantBrandRequest,
  MerchantCampaign,
  MerchantCampaignRequest,
  MerchantCampaignStatus,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantCampaignPage.styles'

type StatusFilter = 'ALL' | MerchantCampaignStatus
type BrandDialog = { brand: MerchantBrand | null } | null

const STATUS: Record<MerchantCampaignStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  DRAFT: { label: '초안', tone: 'draft' },
  PUBLISHED: { label: '공개 중', tone: 'published' },
  CLOSED: { label: '종료', tone: 'closed' },
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateTimeInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function CampaignEditor({
  campaign,
  profilePlaceIds,
  brands,
  preferredBrandId,
  activeAction,
  onCreate,
  onUpdate,
  onPublish,
  onClose,
  onSelect,
  onOpenBrand,
}: {
  campaign: MerchantCampaign | null
  profilePlaceIds: number[]
  brands: MerchantBrand[]
  preferredBrandId: number | null
  activeAction: ReturnType<typeof useMerchantCampaigns>['activeAction']
  onCreate: (request: MerchantCampaignRequest) => Promise<MerchantCampaign | null>
  onUpdate: (campaignId: number, request: MerchantCampaignRequest) => Promise<MerchantCampaign | null>
  onPublish: (campaignId: number) => Promise<MerchantCampaign | null>
  onClose: (campaignId: number) => Promise<MerchantCampaign | null>
  onSelect: (campaignId: number | null) => void
  onOpenBrand: (brand: MerchantBrand | null) => void
}) {
  const editable = !campaign || campaign.status === 'DRAFT'
  const [placeId, setPlaceId] = useState(campaign?.placeId ?? profilePlaceIds[0] ?? 0)
  const [brandId, setBrandId] = useState(campaign?.brandId ?? preferredBrandId ?? brands[0]?.id ?? 0)
  const [title, setTitle] = useState(campaign?.title ?? '')
  const [description, setDescription] = useState(campaign?.description ?? '')
  const [startsAt, setStartsAt] = useState(campaign ? toDateTimeInput(campaign.startsAt) : '')
  const [endsAt, setEndsAt] = useState(campaign ? toDateTimeInput(campaign.endsAt) : '')
  const [formError, setFormError] = useState('')
  const effectiveBrandId = brandId || campaign?.brandId || preferredBrandId || brands[0]?.id || 0
  const selectedBrand = brands.find((brand) => brand.id === effectiveBrandId) ?? null
  const isBusy = activeAction !== null

  const buildRequest = (): MerchantCampaignRequest | null => {
    if (!Number.isSafeInteger(placeId) || !profilePlaceIds.includes(placeId)) {
      setFormError('연결된 장소를 선택해주세요.')
      return null
    }
    if (!Number.isSafeInteger(effectiveBrandId) || effectiveBrandId < 1) {
      setFormError('이벤트에 사용할 브랜드를 선택해주세요.')
      return null
    }
    if (!title.trim() || !description.trim() || !startsAt || !endsAt) {
      setFormError('필수 항목을 모두 입력해주세요.')
      return null
    }
    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      setFormError('종료 일시는 시작 일시보다 늦어야 합니다.')
      return null
    }
    setFormError('')
    return { placeId, brandId: effectiveBrandId, title: title.trim(), description: description.trim(), startsAt, endsAt }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editable) return
    const request = buildRequest()
    if (!request) return
    const next = campaign ? await onUpdate(campaign.id, request) : await onCreate(request)
    if (next) onSelect(next.id)
  }

  const publish = async () => {
    if (!campaign || campaign.status !== 'DRAFT') return
    if (!window.confirm('이 이벤트를 공개할까요? 공개 후에는 내용을 수정할 수 없습니다.')) return
    const next = await onPublish(campaign.id)
    if (next) onSelect(next.id)
  }

  const close = async () => {
    if (!campaign || campaign.status !== 'PUBLISHED') return
    if (!window.confirm('공개 중인 이벤트를 종료할까요?')) return
    const next = await onClose(campaign.id)
    if (next) onSelect(next.id)
  }

  return <S.Editor>
    {campaign && !editable ? <S.ReadonlyNotice>{campaign.status === 'PUBLISHED' ? '공개 중인 이벤트는 종료만 할 수 있습니다.' : '종료된 이벤트는 조회만 할 수 있습니다.'}</S.ReadonlyNotice> : null}
    <S.Form onSubmit={save}>
      <S.Field>연결 장소
        <S.Select value={placeId} disabled={!editable || isBusy} onChange={(event) => setPlaceId(Number(event.target.value))}>
          {profilePlaceIds.map((id) => <option key={id} value={id}>연결 장소 #{id}</option>)}
        </S.Select>
      </S.Field>
      <S.Field>브랜드
        <S.BrandField>
          <S.Select value={effectiveBrandId} disabled={!editable || isBusy || brands.length === 0} onChange={(event) => setBrandId(Number(event.target.value))}>
            {brands.length === 0 ? <option value="">등록된 브랜드 없음</option> : brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </S.Select>
          <S.BrandButton type="button" disabled={!editable || isBusy} onClick={() => onOpenBrand(null)}>브랜드 추가</S.BrandButton>
          <S.BrandButton type="button" disabled={!editable || isBusy || !selectedBrand} onClick={() => selectedBrand && onOpenBrand(selectedBrand)}>수정</S.BrandButton>
        </S.BrandField>
      </S.Field>
      <S.Field $wide>이벤트 제목
        <S.Input value={title} maxLength={120} disabled={!editable || isBusy} onChange={(event) => setTitle(event.target.value)} />
      </S.Field>
      <S.Field $wide>이벤트 소개
        <S.Textarea value={description} maxLength={3000} disabled={!editable || isBusy} onChange={(event) => setDescription(event.target.value)} />
        <S.FieldHint>{description.length}/3000</S.FieldHint>
      </S.Field>
      <S.Field>시작 일시
        <S.Input type="datetime-local" value={startsAt} disabled={!editable || isBusy} onChange={(event) => setStartsAt(event.target.value)} />
      </S.Field>
      <S.Field>종료 일시
        <S.Input type="datetime-local" value={endsAt} disabled={!editable || isBusy} onChange={(event) => setEndsAt(event.target.value)} />
      </S.Field>
      {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
      <S.FormActions>
        {editable ? <S.ActionButton type="submit" disabled={isBusy} $variant="secondary">{activeAction === 'create' || activeAction === 'update' ? '저장 중' : campaign ? '초안 저장' : '초안 등록'}</S.ActionButton> : null}
        {campaign?.status === 'DRAFT' ? <S.ActionButton type="button" disabled={isBusy} $variant="primary" onClick={() => void publish()}>{activeAction === 'publish' ? '공개 중' : '공개하기'}</S.ActionButton> : null}
        {campaign?.status === 'PUBLISHED' ? <S.ActionButton type="button" disabled={isBusy} $variant="danger" onClick={() => void close()}>{activeAction === 'close' ? '종료 중' : '이벤트 종료'}</S.ActionButton> : null}
      </S.FormActions>
    </S.Form>
  </S.Editor>
}

function BrandDialogForm({
  brand,
  activeAction,
  onClose,
  onCreate,
  onUpdate,
  onCreated,
}: {
  brand: MerchantBrand | null
  activeAction: ReturnType<typeof useMerchantCampaigns>['activeAction']
  onClose: () => void
  onCreate: (request: MerchantBrandRequest) => Promise<MerchantBrand | null>
  onUpdate: (brandId: number, request: MerchantBrandRequest) => Promise<MerchantBrand | null>
  onCreated: (brandId: number) => void
}) {
  const [name, setName] = useState(brand?.name ?? '')
  const [description, setDescription] = useState(brand?.description ?? '')
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? '')
  const [formError, setFormError] = useState('')
  const isBusy = activeAction !== null

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('브랜드명을 입력해주세요.')
      return
    }
    if (logoUrl.trim()) {
      try { new URL(logoUrl.trim()) } catch { setFormError('로고 URL 형식을 확인해주세요.'); return }
    }
    const request = { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}), ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}) }
    const next = brand ? await onUpdate(brand.id, request) : await onCreate(request)
    if (next) {
      onCreated(next.id)
      onClose()
    }
  }

  return <S.ModalOverlay role="presentation" onMouseDown={() => !isBusy && onClose()}><S.Modal role="dialog" aria-modal="true" aria-labelledby="brand-dialog-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="brand-dialog-title">{brand ? '브랜드 수정' : '브랜드 등록'}</S.ModalTitle><S.PanelDescription>이벤트에 표시할 브랜드 정보를 관리합니다.</S.PanelDescription></div><S.CloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={onClose}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.Form onSubmit={save}><S.Field $wide>브랜드명<S.Input value={name} maxLength={100} disabled={isBusy} onChange={(event) => setName(event.target.value)} /></S.Field><S.Field $wide>브랜드 소개<S.Textarea value={description} maxLength={1000} disabled={isBusy} onChange={(event) => setDescription(event.target.value)} /></S.Field><S.Field $wide>로고 URL<S.Input type="url" value={logoUrl} placeholder="https://" maxLength={1000} disabled={isBusy} onChange={(event) => setLogoUrl(event.target.value)} /><S.FieldHint>파일 업로드 API가 없어 공개된 이미지 URL만 연결할 수 있습니다.</S.FieldHint></S.Field>{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="button" disabled={isBusy} onClick={onClose}>취소</S.ActionButton><S.ActionButton type="submit" disabled={isBusy} $variant="primary">{isBusy ? '저장 중' : '저장'}</S.ActionButton></S.FormActions></S.Form></S.ModalBody></S.Modal></S.ModalOverlay>
}

function MerchantCampaignPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const campaign = useMerchantCampaigns()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [brandDialog, setBrandDialog] = useState<BrandDialog>(null)
  const [preferredBrandId, setPreferredBrandId] = useState<number | null>(null)
  const selectedCampaign = campaign.campaigns.find((item) => item.id === selectedId) ?? null
  const filteredCampaigns = useMemo(
    () => campaign.campaigns.filter((item) => statusFilter === 'ALL' || item.status === statusFilter),
    [campaign.campaigns, statusFilter]
  )
  const filteredTotalPages = Math.max(1, Math.ceil(filteredCampaigns.length / MERCHANT_CAMPAIGN_PAGE_LIMIT))
  const visibleCampaigns = useMemo(
    () => filteredCampaigns.slice(
      (campaign.page - 1) * MERCHANT_CAMPAIGN_PAGE_LIMIT,
      campaign.page * MERCHANT_CAMPAIGN_PAGE_LIMIT
    ),
    [campaign.page, filteredCampaigns]
  )
  const isBusy = campaign.activeAction !== null
  const currentCampaignPage = campaign.page
  const goToPage = campaign.goToPage

  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }
  const startNew = () => { setSelectedId(null); setPreferredBrandId((current) => current ?? campaign.brands[0]?.id ?? null) }
  const changeStatusFilter = (nextFilter: StatusFilter) => {
    setStatusFilter(nextFilter)
    campaign.goToPage(1)
  }

  useEffect(() => {
    if (currentCampaignPage > filteredTotalPages) goToPage(filteredTotalPages)
  }, [currentCampaignPage, filteredTotalPages, goToPage])

  if (campaign.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>이벤트 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{campaign.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void campaign.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{campaign.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>이벤트 관리</Store.PageTitle><Store.PageDescription>연결된 장소의 팝업 이벤트를 초안으로 등록하고, 검토한 뒤 공개·종료합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={campaign.status === 'loading' || isBusy} onClick={() => void campaign.fetchInitialData()}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {campaign.errorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{campaign.errorMessage}</Store.Notice> : null}
    {campaign.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{campaign.actionErrorMessage}</Store.Notice> : null}
    {campaign.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{campaign.successMessage}</Store.Notice> : null}
    <S.Workspace><S.Panel><S.PanelHeader><div><S.PanelTitle>이벤트 목록</S.PanelTitle><S.PanelDescription>등록한 이벤트의 상태와 기간을 확인합니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={campaign.status !== 'ready' || isBusy} onClick={startNew}>새 이벤트</S.CreateButton></S.PanelHeader><S.FilterBar aria-label="이벤트 상태 필터">{([['ALL', '전체'], ['DRAFT', '초안'], ['PUBLISHED', '공개 중'], ['CLOSED', '종료']] as const).map(([value, label]) => <S.FilterButton type="button" key={value} disabled={campaign.status !== 'ready' || isBusy} $selected={statusFilter === value} onClick={() => changeStatusFilter(value)}>{label}</S.FilterButton>)}</S.FilterBar><S.ResultMeta>총 {filteredCampaigns.length}건 · 현재 {campaign.page}/{filteredTotalPages}페이지</S.ResultMeta>{campaign.status === 'loading' || campaign.isListLoading ? <S.ListLoading><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /></S.ListLoading> : visibleCampaigns.length === 0 ? <S.Empty>{statusFilter === 'ALL' ? '등록된 이벤트가 없습니다. 첫 이벤트를 초안으로 등록해보세요.' : '선택한 상태의 이벤트가 없습니다.'}</S.Empty> : <S.CampaignList>{visibleCampaigns.map((item) => <S.CampaignItem type="button" key={item.id} $selected={item.id === selectedId} onClick={() => setSelectedId(item.id)}><S.CampaignTop><S.CampaignTitle title={item.title}>{item.title}</S.CampaignTitle><S.StatusBadge $tone={STATUS[item.status].tone}>{STATUS[item.status].label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{item.brandName} · 장소 #{item.placeId}</S.CampaignMeta><S.CampaignMeta>{formatDateTime(item.startsAt)} - {formatDateTime(item.endsAt)}</S.CampaignMeta></S.CampaignItem>)}</S.CampaignList>}{filteredTotalPages > 1 ? <S.Pagination><S.PaginationButton type="button" disabled={isBusy || campaign.isListLoading || campaign.page <= 1} onClick={() => campaign.goToPage(campaign.page - 1)}>이전</S.PaginationButton><S.PageText>{campaign.page} / {filteredTotalPages}</S.PageText><S.PaginationButton type="button" disabled={isBusy || campaign.isListLoading || campaign.page >= filteredTotalPages} onClick={() => campaign.goToPage(campaign.page + 1)}>다음</S.PaginationButton></S.Pagination> : null}</S.Panel>
      <S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedCampaign ? '이벤트 상세' : '새 이벤트 등록'}</S.PanelTitle><S.PanelDescription>{selectedCampaign ? `이벤트 #${selectedCampaign.id} · 마지막 수정 ${formatDateTime(selectedCampaign.updatedAt)}` : '이벤트 정보를 입력한 뒤 초안으로 저장하세요.'}</S.PanelDescription></div>{selectedCampaign ? <S.StatusBadge $tone={STATUS[selectedCampaign.status].tone}>{STATUS[selectedCampaign.status].label}</S.StatusBadge> : null}</S.PanelHeader>{campaign.status === 'loading' ? <S.Empty>이벤트 관리 정보를 불러오는 중입니다.</S.Empty> : <CampaignEditor key={selectedCampaign?.id ?? `new-${preferredBrandId ?? 'none'}`} campaign={selectedCampaign} profilePlaceIds={campaign.profile?.placeIds ?? []} brands={campaign.brands} preferredBrandId={preferredBrandId} activeAction={campaign.activeAction} onCreate={campaign.createCampaign} onUpdate={campaign.updateCampaign} onPublish={campaign.publishCampaign} onClose={campaign.closeCampaign} onSelect={setSelectedId} onOpenBrand={(brand) => setBrandDialog({ brand })} />}</S.Panel></S.Workspace>
    {brandDialog ? <BrandDialogForm brand={brandDialog.brand} activeAction={campaign.activeAction} onClose={() => setBrandDialog(null)} onCreate={campaign.createBrand} onUpdate={campaign.updateBrand} onCreated={(brandId) => { setPreferredBrandId(brandId); setBrandDialog(null) }} /> : null}
  </Store.Content></Store.Page>
}

export default MerchantCampaignPage
