import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { useAuth } from '../../hooks/useAuth'
import { MERCHANT_OFFER_PAGE_LIMIT, useMerchantOffers } from '../../hooks/useMerchantOffers'
import type {
  MerchantCoupon,
  MerchantOffer,
  MerchantOfferCreateRequest,
  MerchantOfferStatus,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

type StatusFilter = 'ALL' | MerchantOfferStatus

const STATUS: Record<MerchantOfferStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  DRAFT: { label: '초안', tone: 'draft' },
  PUBLISHED: { label: '공개 중', tone: 'published' },
  CLOSED: { label: '종료', tone: 'closed' },
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function labelEligibility(value: MerchantOffer['eligibilityPolicy']) {
  return value === 'PUBLIC' ? '누구나 발급 가능' : '활성 여행 일정 사용자'
}

function labelExpiry(value: MerchantOffer['expiryPolicy']) {
  if (value === 'ISSUE_PLUS_DAYS') return '발급일 + 유효기간'
  if (value === 'OFFER_END') return '혜택 종료일'
  return '발급일 + 유효기간 또는 혜택 종료일'
}

function OfferEditor({
  offer,
  preferredPlaceId,
  placeIds,
  activeAction,
  onCreate,
  onPublish,
  onClose,
  onCreated,
}: {
  offer: MerchantOffer | null
  preferredPlaceId: number | null
  placeIds: number[]
  activeAction: ReturnType<typeof useMerchantOffers>['activeAction']
  onCreate: (request: MerchantOfferCreateRequest) => Promise<MerchantOffer | null>
  onPublish: (offerId: number) => Promise<MerchantOffer | null>
  onClose: (offerId: number) => Promise<MerchantOffer | null>
  onCreated: (offerId: number) => void
}) {
  const [placeId, setPlaceId] = useState(preferredPlaceId ?? placeIds[0] ?? 0)
  const [title, setTitle] = useState(offer?.title ?? '')
  const [description, setDescription] = useState(offer?.description ?? '')
  const [benefitDescription, setBenefitDescription] = useState(offer?.benefitDescription ?? '')
  const [startsAt, setStartsAt] = useState(offer ? toDateTimeInput(offer.startsAt) : '')
  const [endsAt, setEndsAt] = useState(offer ? toDateTimeInput(offer.endsAt) : '')
  const [couponValidityDays, setCouponValidityDays] = useState(String(offer?.couponValidityDays ?? 7))
  const [inventoryPolicy, setInventoryPolicy] = useState<MerchantOffer['inventoryPolicy']>(offer?.inventoryPolicy ?? 'LIMITED')
  const [totalQuantity, setTotalQuantity] = useState(String(offer?.totalQuantity ?? 100))
  const [eligibilityPolicy, setEligibilityPolicy] = useState<MerchantOffer['eligibilityPolicy']>(offer?.eligibilityPolicy ?? 'ACTIVE_TRAVEL_SCHEDULE')
  const [expiryPolicy, setExpiryPolicy] = useState<MerchantOffer['expiryPolicy']>(offer?.expiryPolicy ?? 'ISSUE_PLUS_DAYS_CAPPED_BY_OFFER_END')
  const [formError, setFormError] = useState('')
  const isBusy = activeAction !== null

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validityDays = Number(couponValidityDays)
    const quantity = Number(totalQuantity)
    if (!placeId) { setFormError('연결 장소를 선택해주세요.'); return }
    if (!title.trim() || !description.trim() || !benefitDescription.trim()) {
      setFormError('제목, 설명, 제공 혜택을 모두 입력해주세요.')
      return
    }
    if (!startsAt || !endsAt || Number.isNaN(new Date(startsAt).getTime()) || Number.isNaN(new Date(endsAt).getTime())) {
      setFormError('혜택 시작·종료 일시를 모두 선택해주세요.')
      return
    }
    if (new Date(startsAt) >= new Date(endsAt)) { setFormError('종료 일시는 시작 일시보다 늦어야 합니다.'); return }
    if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 365) {
      setFormError('쿠폰 유효기간은 1일에서 365일 사이로 입력해주세요.')
      return
    }
    if (inventoryPolicy === 'LIMITED' && (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000)) {
      setFormError('한정 수량은 1개에서 100,000개 사이로 입력해주세요.')
      return
    }

    setFormError('')
    const next = await onCreate({
      placeId,
      title: title.trim(),
      description: description.trim(),
      benefitDescription: benefitDescription.trim(),
      startsAt,
      endsAt,
      couponValidityDays: validityDays,
      eligibilityPolicy,
      inventoryPolicy,
      expiryPolicy,
      ...(inventoryPolicy === 'LIMITED' ? { totalQuantity: quantity } : {}),
    })
    if (next) onCreated(next.id)
  }

  if (offer) {
    return <S.Editor><S.ReadonlyNotice>현재 서버 계약에는 Offer 수정 API가 없습니다. 초안은 공개할 수 있고, 공개된 혜택은 종료할 수 있습니다.</S.ReadonlyNotice><S.Form>
      <S.Field>연결 장소<S.Input value={`장소 #${offer.placeId}`} disabled /></S.Field>
      <S.Field>상태<S.Input value={STATUS[offer.status].label} disabled /></S.Field>
      <S.Field $wide>혜택 제목<S.Input value={offer.title} disabled /></S.Field>
      <S.Field $wide>혜택 설명<S.Textarea value={offer.description} disabled /></S.Field>
      <S.Field $wide>제공 혜택<S.Textarea value={offer.benefitDescription} disabled /></S.Field>
      <S.Field>운영 기간<S.Input value={`${formatDateTime(offer.startsAt)} - ${formatDateTime(offer.endsAt)}`} disabled /></S.Field>
      <S.Field>쿠폰 유효기간<S.Input value={`${offer.couponValidityDays}일`} disabled /></S.Field>
      <S.Field>발급 대상<S.Input value={labelEligibility(offer.eligibilityPolicy)} disabled /></S.Field>
      <S.Field>재고<S.Input value={offer.inventoryPolicy === 'UNLIMITED' ? '제한 없음' : `${offer.remainingQuantity ?? 0} / ${offer.totalQuantity ?? 0}개`} disabled /></S.Field>
      <S.Field $wide>만료 정책<S.Input value={labelExpiry(offer.expiryPolicy)} disabled /></S.Field>
      <S.FormActions>
        {offer.status === 'DRAFT' ? <S.ActionButton type="button" $variant="primary" disabled={isBusy} onClick={() => void onPublish(offer.id)}>{activeAction === 'publish' ? '공개 중' : '공개하기'}</S.ActionButton> : null}
        {offer.status === 'PUBLISHED' ? <S.ActionButton type="button" $variant="danger" disabled={isBusy} onClick={() => { if (window.confirm('혜택을 종료하면 새 쿠폰 발급이 중단되며 다시 공개할 수 없습니다. 종료할까요?')) void onClose(offer.id) }}>{activeAction === 'close' ? '종료 중' : '혜택 종료'}</S.ActionButton> : null}
      </S.FormActions>
    </S.Form></S.Editor>
  }

  return <S.Editor><S.Form onSubmit={create}>
    <S.Field>연결 장소<AdminSelect aria-label="혜택 연결 장소" width="100%" value={placeId} disabled={isBusy || placeIds.length === 0} onChange={(event) => setPlaceId(Number(event.target.value))}>{placeIds.length === 0 ? <option value="">연결된 장소 없음</option> : placeIds.map((id) => <option key={id} value={id}>연결 장소 #{id}</option>)}</AdminSelect></S.Field>
    <S.Field>쿠폰 유효기간<S.Input type="number" min="1" max="365" value={couponValidityDays} disabled={isBusy} onChange={(event) => setCouponValidityDays(event.target.value)} /><S.FieldHint>쿠폰 발급일 기준 1~365일</S.FieldHint></S.Field>
    <S.Field $wide>혜택 제목<S.Input value={title} maxLength={100} disabled={isBusy} onChange={(event) => setTitle(event.target.value)} /></S.Field>
    <S.Field $wide>혜택 설명<S.Textarea value={description} maxLength={1000} disabled={isBusy} onChange={(event) => setDescription(event.target.value)} /><S.FieldHint>{description.length}/1000</S.FieldHint></S.Field>
    <S.Field $wide>제공 혜택<S.Textarea value={benefitDescription} maxLength={500} disabled={isBusy} onChange={(event) => setBenefitDescription(event.target.value)} /><S.FieldHint>{benefitDescription.length}/500</S.FieldHint></S.Field>
    <S.Field>시작 일시<AdminDateTimePicker ariaLabel="혜택 시작 일시" value={startsAt} disabled={isBusy} onChange={setStartsAt} /></S.Field>
    <S.Field>종료 일시<AdminDateTimePicker ariaLabel="혜택 종료 일시" value={endsAt} disabled={isBusy} onChange={setEndsAt} /></S.Field>
    <S.Field>발급 대상<AdminSelect aria-label="혜택 발급 대상" width="100%" value={eligibilityPolicy} disabled={isBusy} onChange={(event) => setEligibilityPolicy(event.target.value as MerchantOffer['eligibilityPolicy'])}><option value="ACTIVE_TRAVEL_SCHEDULE">활성 여행 일정 사용자</option><option value="PUBLIC">누구나 발급 가능</option></AdminSelect></S.Field>
    <S.Field>만료 정책<AdminSelect aria-label="혜택 만료 정책" width="100%" value={expiryPolicy} disabled={isBusy} onChange={(event) => setExpiryPolicy(event.target.value as MerchantOffer['expiryPolicy'])}><option value="ISSUE_PLUS_DAYS_CAPPED_BY_OFFER_END">유효기간 또는 혜택 종료일</option><option value="ISSUE_PLUS_DAYS">유효기간까지</option><option value="OFFER_END">혜택 종료일까지</option></AdminSelect></S.Field>
    <S.Field>재고 정책<AdminSelect aria-label="혜택 재고 정책" width="100%" value={inventoryPolicy} disabled={isBusy} onChange={(event) => setInventoryPolicy(event.target.value as MerchantOffer['inventoryPolicy'])}><option value="LIMITED">한정 수량</option><option value="UNLIMITED">제한 없음</option></AdminSelect></S.Field>
    {inventoryPolicy === 'LIMITED' ? <S.Field>발급 수량<S.Input type="number" min="1" max="100000" value={totalQuantity} disabled={isBusy} onChange={(event) => setTotalQuantity(event.target.value)} /></S.Field> : <S.Field>발급 수량<S.Input value="제한 없음" disabled /></S.Field>}
    {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
    <S.FormActions><S.ActionButton type="submit" $variant="primary" disabled={isBusy || placeIds.length === 0}>{activeAction === 'create' ? '등록 중' : '초안 등록'}</S.ActionButton></S.FormActions>
  </S.Form></S.Editor>
}

function CouponRedeemer({
  activeAction,
  onRedeem,
}: {
  activeAction: ReturnType<typeof useMerchantOffers>['activeAction']
  onRedeem: (request: { code: string }) => Promise<MerchantCoupon | null>
}) {
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState('')
  const [redeemedCoupon, setRedeemedCoupon] = useState<MerchantCoupon | null>(null)
  const isBusy = activeAction !== null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedCode = code.trim()
    if (!UUID_PATTERN.test(normalizedCode)) {
      setFormError('관광객이 제시한 쿠폰 코드(UUID) 형식을 확인해주세요.')
      return
    }
    if (!window.confirm(`쿠폰 ${normalizedCode}을 사용 처리할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setFormError('')
    const next = await onRedeem({ code: normalizedCode })
    if (next) {
      setRedeemedCoupon(next)
      setCode('')
    }
  }

  return <S.Panel><S.PanelHeader><div><S.PanelTitle>쿠폰 사용 처리</S.PanelTitle><S.PanelDescription>관광객이 제시한 쿠폰 코드를 한 번만 사용 처리합니다.</S.PanelDescription></div></S.PanelHeader><S.Editor><S.Form onSubmit={submit}><S.Field $wide>쿠폰 코드<S.Input value={code} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={isBusy} onChange={(event) => setCode(event.target.value)} /></S.Field>{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="submit" $variant="primary" disabled={isBusy}>{activeAction === 'redeem' ? '처리 중' : '사용 처리'}</S.ActionButton></S.FormActions></S.Form>{redeemedCoupon ? <S.ReadonlyNotice role="status">쿠폰 사용이 완료되었습니다. Offer #{redeemedCoupon.offerId} · {formatDateTime(redeemedCoupon.redeemedAt ?? redeemedCoupon.issuedAt)}</S.ReadonlyNotice> : null}</S.Editor></S.Panel>
}

function MerchantOfferPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const offer = useMerchantOffers()
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const isBusy = offer.activeAction !== null
  const fetchOfferDetail = offer.fetchOfferDetail
  const visibleOffers = useMemo(() => offer.offers.filter((item) => (
    item.placeId === offer.selectedPlaceId && (statusFilter === 'ALL' || item.status === statusFilter)
  )), [offer.offers, offer.selectedPlaceId, statusFilter])
  const totalPages = Math.max(1, Math.ceil(visibleOffers.length / MERCHANT_OFFER_PAGE_LIMIT))
  const currentPage = Math.min(page, totalPages)
  const pageOffers = useMemo(() => visibleOffers.slice(
    (currentPage - 1) * MERCHANT_OFFER_PAGE_LIMIT,
    currentPage * MERCHANT_OFFER_PAGE_LIMIT,
  ), [currentPage, visibleOffers])

  useEffect(() => {
    if (selectedOfferId) void fetchOfferDetail(selectedOfferId)
  }, [fetchOfferDetail, selectedOfferId])

  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }
  const startNew = () => { setSelectedOfferId(null); offer.clearSelectedOffer() }
  const selectPlace = (placeId: number) => {
    offer.selectPlace(placeId)
    setSelectedOfferId(null)
    setPage(1)
  }

  if (offer.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>혜택·쿠폰 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{offer.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void offer.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{offer.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>혜택·쿠폰 관리</Store.PageTitle><Store.PageDescription>관광객 전용 혜택을 초안으로 등록하고 공개·종료하며, 현장에서 쿠폰을 사용 처리합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={offer.status === 'loading' || isBusy} onClick={() => void offer.fetchInitialData()}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {offer.profile && offer.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="혜택을 관리할 장소 선택" value={offer.selectedPlaceId ?? ''} onChange={(event) => selectPlace(Number(event.target.value))}>{offer.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
    {offer.errorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{offer.errorMessage}</Store.Notice> : null}
    {offer.detailErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{offer.detailErrorMessage}</Store.Notice> : null}
    {offer.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{offer.actionErrorMessage}</Store.Notice> : null}
    {offer.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{offer.successMessage}</Store.Notice> : null}
{!offer.selectedPlaceId && offer.status === 'ready' ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">add_business</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소가 아직 없습니다.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>운영할 장소를 신청하거나 새 장소를 등록한 뒤, 승인되면 혜택과 쿠폰을 관리할 수 있습니다.</Store.EmptyStoreDescription></div><Store.EmptyStoreActions><Store.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>기존 장소 신청</Store.EmptyStoreAction><Store.EmptyStoreSecondaryAction type="button" onClick={() => navigate('/merchant/place-registration')}>새 장소 등록</Store.EmptyStoreSecondaryAction></Store.EmptyStoreActions></Store.EmptyStoreState> : <><S.Workspace><S.Panel><S.PanelHeader><div><S.PanelTitle>혜택 목록</S.PanelTitle><S.PanelDescription>연결 장소에 등록한 관광객 전용 혜택입니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={offer.status !== 'ready' || isBusy} onClick={startNew}>새 혜택</S.CreateButton></S.PanelHeader><S.FilterBar aria-label="혜택 상태 필터">{([['ALL', '전체'], ['DRAFT', '초안'], ['PUBLISHED', '공개 중'], ['CLOSED', '종료']] as const).map(([value, label]) => <S.FilterButton type="button" key={value} disabled={isBusy} $selected={statusFilter === value} onClick={() => { setStatusFilter(value); setPage(1) }}>{label}</S.FilterButton>)}</S.FilterBar><S.ResultMeta>총 {visibleOffers.length}건</S.ResultMeta>{offer.status === 'loading' || offer.isListLoading ? <S.ListLoading><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /></S.ListLoading> : pageOffers.length === 0 ? <S.Empty>{statusFilter === 'ALL' ? '등록된 혜택이 없습니다. 첫 혜택을 초안으로 등록해보세요.' : '선택한 상태의 혜택이 없습니다.'}</S.Empty> : <S.CampaignList>{pageOffers.map((item) => <S.CampaignItem type="button" key={item.id} $selected={item.id === selectedOfferId} onClick={() => setSelectedOfferId(item.id)}><S.CampaignTop><S.CampaignTitle title={item.title}>{item.title}</S.CampaignTitle><S.StatusBadge $tone={STATUS[item.status].tone}>{STATUS[item.status].label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{item.benefitDescription}</S.CampaignMeta><S.CampaignMeta>{formatDateTime(item.startsAt)} - {formatDateTime(item.endsAt)}</S.CampaignMeta></S.CampaignItem>)}</S.CampaignList>}{totalPages > 1 ? <S.Pagination><S.PaginationButton type="button" disabled={isBusy || currentPage <= 1} onClick={() => setPage((current) => current - 1)}>이전</S.PaginationButton><S.PageText>{currentPage} / {totalPages}</S.PageText><S.PaginationButton type="button" disabled={isBusy || currentPage >= totalPages} onClick={() => setPage((current) => current + 1)}>다음</S.PaginationButton></S.Pagination> : null}</S.Panel><S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedOfferId ? '혜택 상세' : '새 혜택 등록'}</S.PanelTitle><S.PanelDescription>{selectedOfferId ? `혜택 #${selectedOfferId}의 정책과 상태를 확인합니다.` : '혜택을 저장하면 초안 상태로 등록됩니다.'}</S.PanelDescription></div>{offer.selectedOffer ? <S.StatusBadge $tone={STATUS[offer.selectedOffer.status].tone}>{STATUS[offer.selectedOffer.status].label}</S.StatusBadge> : null}</S.PanelHeader>{offer.isDetailLoading ? <S.Empty>혜택 상세를 불러오는 중입니다.</S.Empty> : <OfferEditor key={offer.selectedOffer?.id ?? `new-${offer.selectedPlaceId ?? 'none'}`} offer={offer.selectedOffer} preferredPlaceId={offer.selectedPlaceId} placeIds={offer.profile?.placeIds ?? []} activeAction={offer.activeAction} onCreate={offer.createOffer} onPublish={offer.publishOffer} onClose={offer.closeOffer} onCreated={setSelectedOfferId} />}</S.Panel></S.Workspace><div style={{ marginTop: 24 }}><CouponRedeemer activeAction={offer.activeAction} onRedeem={offer.redeemCoupon} /></div></>}
  </Store.Content></Store.Page>
}

export default MerchantOfferPage
