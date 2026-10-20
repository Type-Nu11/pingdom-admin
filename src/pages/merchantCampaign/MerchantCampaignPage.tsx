import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSavedDraft } from '../../hooks/useSavedDraft'
import { useUnsavedNavigation } from '../../hooks/useUnsavedChanges'
import { useNavigate } from 'react-router-dom'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminPagination } from '../../components/common/AdminPagination'
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
import * as Store from '../../components/merchant/MerchantSurface.styles'
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

function SelectedBrand({ brand }: { brand: MerchantBrand }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const logo = brand.logoUrl && /^https?:\/\//i.test(brand.logoUrl) && failedUrl !== brand.logoUrl ? brand.logoUrl : null
  return <S.SelectedBrand aria-label="선택한 브랜드">
    {logo ? <S.BrandLogo src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(brand.logoUrl)} /> : <S.BrandLogoPlaceholder aria-hidden="true">로고</S.BrandLogoPlaceholder>}
    <div><strong>{brand.name}</strong>{brand.description ? <p>{brand.description}</p> : null}<small>{failedUrl && failedUrl === brand.logoUrl ? '로고를 불러오지 못했습니다.' : !logo ? '등록된 로고 없음' : '이벤트에 표시할 브랜드입니다.'}</small></div>
  </S.SelectedBrand>
}

function CampaignEditor({
  campaign,
  profilePlaceIds,
  brands,
  preferredBrandId,
  activeAction,
  isRefreshing,
  brandStatus,
  brandError,
  onRetryBrands,
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
  isRefreshing: boolean
  brandStatus: ReturnType<typeof useMerchantCampaigns>['brandStatus']
  brandError: string
  onRetryBrands: () => void
  onCreate: (request: MerchantCampaignRequest) => Promise<MerchantCampaign | null>
  onUpdate: (campaignId: number, request: MerchantCampaignRequest) => Promise<MerchantCampaign | null>
  onPublish: (campaignId: number) => Promise<MerchantCampaign | null>
  onClose: (campaignId: number) => Promise<MerchantCampaign | null>
  onSelect: (campaignId: number | null) => void
  onOpenBrand: (brand: MerchantBrand | null) => void
}) {
  const editable = !campaign || campaign.status === 'DRAFT'
  const [placeId, setPlaceId] = useState(campaign?.placeId ?? profilePlaceIds[0] ?? 0)
  const [brandSelection, setBrandSelection] = useState({ id: campaign?.brandId ?? preferredBrandId ?? (brands.length === 1 ? brands[0].id : 0), preferredBrandId })
  const brandId = !campaign && brandSelection.preferredBrandId !== preferredBrandId
    ? preferredBrandId ?? brandSelection.id : brandSelection.id
  const [title, setTitle] = useState(campaign?.title ?? '')
  const [description, setDescription] = useState(campaign?.description ?? '')
  const [startsAt, setStartsAt] = useState(campaign ? toDateTimeInput(campaign.startsAt) : '')
  const [endsAt, setEndsAt] = useState(campaign ? toDateTimeInput(campaign.endsAt) : '')
  const [formError, setFormError] = useState('')
  const effectiveBrandId = brandId || (!campaign && brands.length === 1 ? brands[0].id : 0)
  const selectedBrand = brands.find((brand) => brand.id === effectiveBrandId) ?? null
  const isBusy = activeAction !== null || isRefreshing || brandStatus !== 'ready'
  const draft = useSavedDraft(JSON.stringify([placeId, brandId, title, description, startsAt, endsAt]), { enabled: editable, busy: activeAction !== null })

  const buildRequest = (): MerchantCampaignRequest | null => {
    if (!Number.isSafeInteger(placeId) || !profilePlaceIds.includes(placeId)) {
      setFormError('연결된 장소를 선택해주세요.')
      return null
    }
    if (!Number.isSafeInteger(effectiveBrandId) || !brands.some(brand => brand.id === effectiveBrandId)) {
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
    if (!editable || isBusy) return
    const request = buildRequest()
    if (!request) return
    const next = campaign ? await onUpdate(campaign.id, request) : await onCreate(request)
    if (next) { draft.markSaved(); onSelect(next.id) }
  }

  const publishSaved = async () => {
    if (isBusy || !campaign || campaign.status !== 'DRAFT') return
    if (!window.confirm('이 이벤트를 공개할까요? 공개 후에는 내용을 수정할 수 없습니다.')) return
    const next = await onPublish(campaign.id)
    if (next) onSelect(next.id)
  }
  const publish = () => draft.request(() => { void publishSaved() })

  const close = async () => {
    if (isBusy || !campaign || campaign.status !== 'PUBLISHED') return
    if (!window.confirm('공개 중인 이벤트를 종료할까요?')) return
    const next = await onClose(campaign.id)
    if (next) onSelect(next.id)
  }

  return <S.Editor>
    {isRefreshing ? <S.ReadonlyNotice role="status">목록을 새로 불러오는 중입니다. 작성 중인 내용은 유지됩니다.</S.ReadonlyNotice> : null}
    {campaign && !editable ? <S.ReadonlyNotice>{campaign.status === 'PUBLISHED' ? '공개 중인 이벤트는 종료만 할 수 있습니다.' : '종료된 이벤트는 조회만 할 수 있습니다.'}</S.ReadonlyNotice> : null}
    <S.Form onSubmit={save}>
      <S.Field>연결 장소
        <Store.PlaceSelect compact aria-label="이벤트 연결 장소" value={placeId} disabled={!editable || isBusy} onChange={(event) => setPlaceId(Number(event.target.value))}>
          {profilePlaceIds.map((id) => <option key={id} value={id}>연결 장소 #{id}</option>)}
        </Store.PlaceSelect>
      </S.Field>
      <S.Field as="div" $wide role="group" aria-label="이벤트 브랜드 설정">브랜드 (필수)
        <S.FieldHint>이벤트에 표시할 가게·업체의 이름, 소개와 로고입니다. 사업자등록상의 사업자명이나 연결 장소와는 별도로 선택합니다.</S.FieldHint>
        {brandStatus === 'loading' ? <S.FieldHint role="status">브랜드 정보를 불러오는 중입니다.</S.FieldHint> : brandStatus === 'error' ? <div role="alert"><S.FieldHint>{brandError}</S.FieldHint><S.BrandButton type="button" onClick={onRetryBrands}>브랜드 다시 시도</S.BrandButton></div> : null}
        <S.BrandField>
          <AdminSelect aria-label="이벤트 브랜드" width="100%" value={effectiveBrandId} disabled={!editable || isBusy || brands.length === 0 || (brands.length === 1 && Boolean(selectedBrand))} onChange={(event) => setBrandSelection({ id: Number(event.target.value), preferredBrandId })}>
            <option value={0}>{brandStatus !== 'ready' ? '브랜드 확인 필요' : brands.length === 0 ? '등록된 브랜드 없음' : '사용할 브랜드를 선택하세요'}</option>
            {effectiveBrandId > 0 && !selectedBrand ? <option value={effectiveBrandId}>{brandStatus === 'loading' ? '브랜드 정보를 불러오는 중입니다' : '브랜드 정보를 확인할 수 없습니다'} · #{effectiveBrandId}</option> : null}
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </AdminSelect>
          <S.BrandButton type="button" disabled={!editable || isBusy} onClick={() => onOpenBrand(null)}>브랜드 추가</S.BrandButton>
          <S.BrandButton type="button" disabled={!editable || isBusy || !selectedBrand} onClick={() => selectedBrand && onOpenBrand(selectedBrand)}>수정</S.BrandButton>
        </S.BrandField>
        {brandStatus === 'ready' && brands.length === 0 ? <S.FieldHint>먼저 브랜드를 등록한 뒤 이벤트를 작성하세요. 프랜차이즈가 아닌 가게도 등록할 수 있습니다.</S.FieldHint> : selectedBrand ? <SelectedBrand key={selectedBrand.id} brand={selectedBrand} /> : null}
      </S.Field>
      <S.Field $wide>이벤트 제목 (필수)
        <S.Input value={title} maxLength={120} disabled={!editable || isBusy} onChange={(event) => setTitle(event.target.value)} />
      </S.Field>
      <S.Field $wide>이벤트 소개 (필수)
        <S.Textarea value={description} maxLength={3000} disabled={!editable || isBusy} onChange={(event) => setDescription(event.target.value)} />
        <S.FieldHint>{description.length}/3000</S.FieldHint>
      </S.Field>
      <S.Field>시작 일시 (필수)
        <AdminDateTimePicker ariaLabel="이벤트 시작 일시" value={startsAt} disabled={!editable || isBusy} onChange={setStartsAt} />
      </S.Field>
      <S.Field>종료 일시 (필수)
        <AdminDateTimePicker ariaLabel="이벤트 종료 일시" value={endsAt} disabled={!editable || isBusy} onChange={setEndsAt} />
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
  onClose: closeDialog,
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
  const draft = useSavedDraft(JSON.stringify([name, description, logoUrl]), { busy: isBusy })
  const onClose = () => draft.request(closeDialog)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('브랜드명을 입력해주세요.')
      return
    }
    if (logoUrl.trim()) {
      try {
        const url = new URL(logoUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid image URL')
      } catch { setFormError('공개된 http 또는 https 이미지 주소를 입력해주세요.'); return }
    }
    const request = { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}), ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}) }
    const next = brand ? await onUpdate(brand.id, request) : await onCreate(request)
    if (next) {
      draft.markSaved()
      onCreated(next.id)
      closeDialog()
    }
  }

  return <S.ModalOverlay role="presentation" onKeyDown={(event) => { if (event.key === 'Escape' && !isBusy) { event.stopPropagation(); onClose() } }} onMouseDown={() => !isBusy && onClose()}><S.Modal role="dialog" aria-modal="true" aria-labelledby="brand-dialog-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="brand-dialog-title">{brand ? '브랜드 수정' : '브랜드 등록'}</S.ModalTitle><S.PanelDescription>이벤트에 표시할 가게·업체의 이름, 소개와 로고를 등록합니다. 프랜차이즈 전용 기능이 아닙니다.</S.PanelDescription></div><S.CloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={onClose}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.Form onSubmit={save}><S.Field $wide>브랜드명 (필수)<S.Input value={name} maxLength={100} disabled={isBusy} onChange={(event) => setName(event.target.value)} /></S.Field><S.Field $wide>브랜드 소개 (선택)<S.Textarea value={description} maxLength={1000} disabled={isBusy} onChange={(event) => setDescription(event.target.value)} /></S.Field><S.Field $wide>로고 URL (선택)<S.Input type="url" value={logoUrl} placeholder="https://" maxLength={1000} disabled={isBusy} onChange={(event) => setLogoUrl(event.target.value)} /><S.FieldHint>로고 이미지의 웹 주소를 입력해주세요. 파일을 직접 업로드하는 기능은 제공하지 않습니다.</S.FieldHint></S.Field>{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="button" disabled={isBusy} onClick={onClose}>취소</S.ActionButton><S.ActionButton type="submit" disabled={isBusy} $variant="primary">{isBusy ? '저장 중' : '저장'}</S.ActionButton></S.FormActions></S.Form></S.ModalBody></S.Modal></S.ModalOverlay>
}

function CampaignWorkspace() {
  const requestTransition = useUnsavedNavigation()
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
  const startNew = () => { setSelectedId(null); setPreferredBrandId(null) }
  const changeStatusFilter = (nextFilter: StatusFilter) => {
    setStatusFilter(nextFilter)
    campaign.goToPage(1)
  }

  useEffect(() => {
    if (currentCampaignPage > filteredTotalPages) goToPage(filteredTotalPages)
  }, [currentCampaignPage, filteredTotalPages, goToPage])

  if (campaign.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src={`${import.meta.env.BASE_URL}pingdom-logo.png`} alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>이벤트 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{campaign.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => requestTransition(() => { void campaign.fetchInitialData() })}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src={`${import.meta.env.BASE_URL}pingdom-logo.png`} alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{campaign.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>이벤트 관리</Store.PageTitle><Store.PageDescription>연결된 장소의 팝업 이벤트를 초안으로 등록하고, 검토한 뒤 공개·종료합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={campaign.status === 'loading' || isBusy} onClick={() => requestTransition(() => { void campaign.fetchInitialData() })}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {campaign.errorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{campaign.errorMessage}<Store.RetryButton type="button" disabled={campaign.isListLoading} onClick={() => void campaign.fetchCampaigns()}>목록 다시 시도</Store.RetryButton></Store.Notice> : null}
    {campaign.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{campaign.actionErrorMessage}</Store.Notice> : null}
    {campaign.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{campaign.successMessage}</Store.Notice> : null}
    <S.Workspace><S.Panel><S.PanelHeader><div><S.PanelTitle>이벤트 목록</S.PanelTitle><S.PanelDescription>등록한 이벤트의 상태와 기간을 확인합니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={campaign.status !== 'ready' || campaign.isListLoading || isBusy} onClick={() => { if (selectedId !== null) requestTransition(startNew) }}>새 이벤트</S.CreateButton></S.PanelHeader><S.FilterBar aria-label="이벤트 상태 필터">{([['ALL', '전체'], ['DRAFT', '초안'], ['PUBLISHED', '공개 중'], ['CLOSED', '종료']] as const).map(([value, label]) => <S.FilterButton type="button" key={value} disabled={campaign.status !== 'ready' || campaign.isListLoading || isBusy} $selected={statusFilter === value} onClick={() => changeStatusFilter(value)}>{label}</S.FilterButton>)}</S.FilterBar><S.ResultMeta>{campaign.hasListResult ? `총 ${filteredCampaigns.length}건 · 현재 ${campaign.page}/${filteredTotalPages}페이지${campaign.errorMessage ? ' (이전 결과)' : ''}` : '조회 결과 없음'}</S.ResultMeta>{campaign.status === 'loading' || campaign.isListLoading ? <S.ListLoading><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /></S.ListLoading> : !campaign.hasListResult ? <S.Empty><strong>{campaign.errorMessage || '이벤트 목록을 불러오지 못했습니다.'}</strong><Store.RetryButton type="button" onClick={() => void campaign.fetchCampaigns()}>목록 다시 시도</Store.RetryButton></S.Empty> : visibleCampaigns.length === 0 ? <S.Empty>{statusFilter === 'ALL' ? '등록된 이벤트가 없습니다. 첫 이벤트를 초안으로 등록해보세요.' : '선택한 상태의 이벤트가 없습니다.'}</S.Empty> : <S.CampaignList>{visibleCampaigns.map((item) => <S.CampaignItem type="button" key={item.id} $selected={item.id === selectedId} onClick={() => { if (selectedId !== item.id) requestTransition(() => setSelectedId(item.id)) }}><S.CampaignTop><S.CampaignTitle title={item.title}>{item.title}</S.CampaignTitle><S.StatusBadge $tone={STATUS[item.status].tone}>{STATUS[item.status].label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{item.brandName} · 장소 #{item.placeId}</S.CampaignMeta><S.CampaignMeta>{formatDateTime(item.startsAt)} - {formatDateTime(item.endsAt)}</S.CampaignMeta></S.CampaignItem>)}</S.CampaignList>}{filteredTotalPages > 1 ? <AdminPagination ariaLabel="상점주 이벤트 목록 페이지네이션" page={campaign.page} totalPages={filteredTotalPages} disabled={isBusy || campaign.isListLoading} onPageChange={campaign.goToPage} /> : null}</S.Panel>
      <S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedCampaign ? '이벤트 상세' : '새 이벤트 등록'}</S.PanelTitle><S.PanelDescription>{selectedCampaign ? `이벤트 #${selectedCampaign.id} · 마지막 수정 ${formatDateTime(selectedCampaign.updatedAt)}` : '이벤트 정보를 입력한 뒤 초안으로 저장하세요.'}</S.PanelDescription></div>{selectedCampaign ? <S.StatusBadge $tone={STATUS[selectedCampaign.status].tone}>{STATUS[selectedCampaign.status].label}</S.StatusBadge> : null}</S.PanelHeader>{campaign.status === 'loading' ? <S.Empty>이벤트 관리 정보를 불러오는 중입니다.</S.Empty> : <CampaignEditor key={selectedCampaign?.id ?? 'new'} campaign={selectedCampaign} profilePlaceIds={campaign.profile?.placeIds ?? []} brands={campaign.brands} preferredBrandId={preferredBrandId} activeAction={campaign.activeAction} isRefreshing={campaign.isListLoading} brandStatus={campaign.brandStatus} brandError={campaign.brandErrorMessage} onRetryBrands={() => void campaign.fetchBrands()} onCreate={campaign.createCampaign} onUpdate={campaign.updateCampaign} onPublish={campaign.publishCampaign} onClose={campaign.closeCampaign} onSelect={setSelectedId} onOpenBrand={(brand) => setBrandDialog({ brand })} />}</S.Panel></S.Workspace>
    {brandDialog ? <BrandDialogForm brand={brandDialog.brand} activeAction={campaign.activeAction} onClose={() => setBrandDialog(null)} onCreate={campaign.createBrand} onUpdate={campaign.updateBrand} onCreated={(brandId) => { setPreferredBrandId(brandId); setBrandDialog(null) }} /> : null}
  </Store.Content></Store.Page>
}

export default function MerchantCampaignPage() {
  const { user } = useAuth()
  return <CampaignWorkspace key={`${user?.id ?? ''}:${user?.role ?? ''}`} />
}
