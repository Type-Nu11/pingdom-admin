import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantReservationSetup } from '../../hooks/useMerchantReservationSetup'
import type {
  MerchantAvailability,
  MerchantAvailabilityUpsertRequest,
  MerchantReservableProduct,
  MerchantReservableProductCreateRequest,
  MerchantReservableProductType,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

const PRODUCT_TYPE_LABEL: Record<MerchantReservableProductType, string> = {
  GENERAL: '일반 예약',
  TICKET: '티켓',
  CLASS: '클래스',
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

function ProductCreator({
  placeId,
  isBusy,
  onCreate,
}: {
  placeId: number
  isBusy: boolean
  onCreate: (request: MerchantReservableProductCreateRequest) => Promise<MerchantReservableProduct | null>
}) {
  const [name, setName] = useState('')
  const [productType, setProductType] = useState<MerchantReservableProductType>('TICKET')
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) { setFormError('예약 상품명을 입력해주세요.'); return }
    setFormError('')
    const next = await onCreate({ placeId, name: name.trim(), productType })
    if (next) setName('')
  }

  return <S.Editor><S.Form onSubmit={submit}><S.Field $wide>상품명<S.Input value={name} maxLength={100} disabled={isBusy} onChange={(event) => setName(event.target.value)} /></S.Field><S.Field>상품 유형<AdminSelect aria-label="예약 상품 유형" width="100%" value={productType} disabled={isBusy} onChange={(event) => setProductType(event.target.value as MerchantReservableProductType)}><option value="TICKET">티켓</option><option value="CLASS">클래스</option></AdminSelect></S.Field><S.Field><S.FieldHint>상품 내용 수정 API는 현재 제공되지 않습니다.</S.FieldHint></S.Field>{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="submit" $variant="primary" disabled={isBusy}>상품 등록</S.ActionButton></S.FormActions></S.Form></S.Editor>
}

function AvailabilityEditor({
  availability,
  placeId,
  products,
  activeAction,
  onCreate,
  onSave,
  onToggleActive,
  onCreated,
}: {
  availability: MerchantAvailability | null
  placeId: number
  products: MerchantReservableProduct[]
  activeAction: ReturnType<typeof useMerchantReservationSetup>['activeAction']
  onCreate: (request: MerchantAvailabilityUpsertRequest) => Promise<MerchantAvailability | null>
  onSave: (availabilityId: number, request: MerchantAvailabilityUpsertRequest) => Promise<MerchantAvailability | null>
  onToggleActive: (availability: MerchantAvailability, active: boolean) => Promise<MerchantAvailability | null>
  onCreated: (availabilityId: number) => void
}) {
  const activeProducts = products.filter((product) => product.status === 'ACTIVE')
  const [productId, setProductId] = useState(availability?.productId ?? activeProducts[0]?.id ?? 0)
  const [startsAt, setStartsAt] = useState(availability ? toDateTimeInput(availability.startsAt) : '')
  const [endsAt, setEndsAt] = useState(availability ? toDateTimeInput(availability.endsAt) : '')
  const [totalCapacity, setTotalCapacity] = useState(String(availability?.totalCapacity ?? 1))
  const [formError, setFormError] = useState('')
  const isBusy = activeAction !== null
  const selectedProduct = products.find((product) => product.id === productId)
  const isPreservingInactiveProduct = Boolean(
    availability && selectedProduct?.status !== 'ACTIVE' && availability.productId === selectedProduct?.id,
  )
  const productOptions = isPreservingInactiveProduct && selectedProduct
    ? [selectedProduct, ...activeProducts]
    : activeProducts

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const capacity = Number(totalCapacity)
    if (!selectedProduct) { setFormError('예약 상품을 선택해주세요.'); return }
    if (!startsAt || !endsAt || Number.isNaN(new Date(startsAt).getTime()) || Number.isNaN(new Date(endsAt).getTime())) {
      setFormError('예약 시작·종료 일시를 모두 선택해주세요.')
      return
    }
    if (new Date(startsAt) >= new Date(endsAt)) { setFormError('종료 일시는 시작 일시보다 늦어야 합니다.'); return }
    if (!Number.isInteger(capacity) || capacity < 1) { setFormError('총 예약 가능 인원은 1명 이상이어야 합니다.'); return }

    setFormError('')
    const request: MerchantAvailabilityUpsertRequest = {
      placeId,
      ...(isPreservingInactiveProduct ? {} : {
        productId: selectedProduct.id,
        productType: selectedProduct.productType,
      }),
      startsAt,
      endsAt,
      totalCapacity: capacity,
    }
    const next = availability ? await onSave(availability.id, request) : await onCreate(request)
    if (next) onCreated(next.id)
  }

  return <S.Editor><S.Form onSubmit={submit}><S.Field $wide>예약 상품<AdminSelect aria-label="예약 상품 선택" width="100%" value={productId} disabled={isBusy || productOptions.length === 0} onChange={(event) => setProductId(Number(event.target.value))}>{productOptions.length === 0 ? <option value="">활성 예약 상품 없음</option> : productOptions.map((product) => <option key={product.id} value={product.id}>{product.name} · {PRODUCT_TYPE_LABEL[product.productType]}{product.status !== 'ACTIVE' ? ' (비활성)' : ''}</option>)}</AdminSelect></S.Field><S.Field>시작 일시<AdminDateTimePicker ariaLabel="예약 시작 일시" value={startsAt} disabled={isBusy} onChange={setStartsAt} /></S.Field><S.Field>종료 일시<AdminDateTimePicker ariaLabel="예약 종료 일시" value={endsAt} disabled={isBusy} onChange={setEndsAt} /></S.Field><S.Field>총 예약 가능 인원<S.Input type="number" min="1" value={totalCapacity} disabled={isBusy} onChange={(event) => setTotalCapacity(event.target.value)} /></S.Field>{availability ? <S.Field>현재 잔여 인원<S.Input value={`${availability.remainingCapacity}명`} disabled /></S.Field> : null}{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions>{availability ? <S.ActionButton type="button" disabled={isBusy} $variant={availability.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => void onToggleActive(availability, availability.status !== 'ACTIVE')}>{activeAction === 'activate-availability' || activeAction === 'deactivate-availability' ? '처리 중' : availability.status === 'ACTIVE' ? '비활성화' : '활성화'}</S.ActionButton> : null}<S.ActionButton type="submit" $variant="primary" disabled={isBusy || !selectedProduct}>{activeAction === 'create-availability' || activeAction === 'update-availability' ? '저장 중' : availability ? '시간 저장' : '시간 등록'}</S.ActionButton></S.FormActions></S.Form></S.Editor>
}

function MerchantReservationSetupPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const reservation = useMerchantReservationSetup()
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<number | null>(null)
  const isBusy = reservation.activeAction !== null
  const products = useMemo(() => reservation.products.filter((item) => item.placeId === reservation.selectedPlaceId), [reservation.products, reservation.selectedPlaceId])
  const availabilities = useMemo(() => reservation.availabilities.filter((item) => item.placeId === reservation.selectedPlaceId), [reservation.availabilities, reservation.selectedPlaceId])
  const selectedAvailability = availabilities.find((item) => item.id === selectedAvailabilityId) ?? null

  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }
  const selectPlace = (placeId: number) => { reservation.selectPlace(placeId); setSelectedAvailabilityId(null) }
  const startNewAvailability = () => setSelectedAvailabilityId(null)

  if (reservation.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>예약 설정</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void reservation.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{reservation.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>예약 설정</Store.PageTitle><Store.PageDescription>예약 상품과 고객이 선택할 수 있는 예약 가능 시간을 관리합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={reservation.status === 'loading' || isBusy} onClick={() => void reservation.fetchReservationSetup()}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {reservation.profile && reservation.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="예약을 관리할 장소 선택" value={reservation.selectedPlaceId ?? ''} onChange={(event) => selectPlace(Number(event.target.value))}>{reservation.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
    {reservation.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.sectionErrorMessage}</Store.Notice> : null}
    {reservation.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.actionErrorMessage}</Store.Notice> : null}
    {reservation.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{reservation.successMessage}</Store.Notice> : null}
    {reservation.status === 'loading' || reservation.isLoading ? <Store.LoadingSummary aria-label="예약 설정을 불러오는 중"><Store.Skeleton $height={280} /><Store.Skeleton $height={420} /></Store.LoadingSummary> : !reservation.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">add_business</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소가 아직 없습니다.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>운영할 장소를 신청하거나 새 장소를 등록한 뒤, 승인되면 예약 상품과 가능 시간을 관리할 수 있습니다.</Store.EmptyStoreDescription></div><Store.EmptyStoreActions><Store.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>기존 장소 신청</Store.EmptyStoreAction><Store.EmptyStoreSecondaryAction type="button" onClick={() => navigate('/merchant/place-registration')}>새 장소 등록</Store.EmptyStoreSecondaryAction></Store.EmptyStoreActions></Store.EmptyStoreState> : <S.Workspace><S.Panel><S.PanelHeader><div><S.PanelTitle>예약 상품</S.PanelTitle><S.PanelDescription>고객이 선택할 예약 상품을 등록하고 노출 상태를 변경합니다.</S.PanelDescription></div></S.PanelHeader><ProductCreator key={reservation.selectedPlaceId} placeId={reservation.selectedPlaceId} isBusy={isBusy} onCreate={reservation.createProduct} /><S.ResultMeta>총 {products.length}개</S.ResultMeta>{products.length === 0 ? <S.Empty>등록된 예약 상품이 없습니다.</S.Empty> : <S.CampaignList>{products.map((product) => <S.CampaignItem as="div" key={product.id} $selected={false}><S.CampaignTop><S.CampaignTitle>{product.name}</S.CampaignTitle><S.StatusBadge $tone={product.status === 'ACTIVE' ? 'published' : 'closed'}>{product.status === 'ACTIVE' ? '예약 가능' : '비활성'}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{PRODUCT_TYPE_LABEL[product.productType]} · 상품 #{product.id}</S.CampaignMeta><S.FormActions><S.ActionButton type="button" disabled={isBusy} $variant={product.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => void reservation.setProductActive(product, product.status !== 'ACTIVE')}>{reservation.activeAction === 'activate-product' || reservation.activeAction === 'deactivate-product' ? '처리 중' : product.status === 'ACTIVE' ? '비활성화' : '활성화'}</S.ActionButton></S.FormActions></S.CampaignItem>)}</S.CampaignList>}</S.Panel><S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedAvailability ? '가능 시간 수정' : '가능 시간 등록'}</S.PanelTitle><S.PanelDescription>상품별 예약 시작·종료 일시와 총 수용 인원을 설정합니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={isBusy} onClick={startNewAvailability}>새 시간</S.CreateButton></S.PanelHeader><AvailabilityEditor key={selectedAvailability?.id ?? `new-${reservation.selectedPlaceId}`} availability={selectedAvailability} placeId={reservation.selectedPlaceId} products={products} activeAction={reservation.activeAction} onCreate={reservation.createAvailability} onSave={reservation.saveAvailability} onToggleActive={reservation.setAvailabilityActive} onCreated={setSelectedAvailabilityId} /><S.ResultMeta>등록된 가능 시간 {availabilities.length}개</S.ResultMeta>{availabilities.length === 0 ? <S.Empty>등록된 예약 가능 시간이 없습니다.</S.Empty> : <S.CampaignList>{availabilities.map((availability) => <S.CampaignItem type="button" key={availability.id} $selected={availability.id === selectedAvailabilityId} onClick={() => setSelectedAvailabilityId(availability.id)}><S.CampaignTop><S.CampaignTitle>{products.find((product) => product.id === availability.productId)?.name ?? `상품 #${availability.productId}`}</S.CampaignTitle><S.StatusBadge $tone={availability.status === 'ACTIVE' ? 'published' : 'closed'}>{availability.status === 'ACTIVE' ? '예약 가능' : '비활성'}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{formatDateTime(availability.startsAt)} - {formatDateTime(availability.endsAt)}</S.CampaignMeta><S.CampaignMeta>잔여 {availability.remainingCapacity} / {availability.totalCapacity}명</S.CampaignMeta></S.CampaignItem>)}</S.CampaignList>}</S.Panel></S.Workspace>}
  </Store.Content></Store.Page>
}

export default MerchantReservationSetupPage
