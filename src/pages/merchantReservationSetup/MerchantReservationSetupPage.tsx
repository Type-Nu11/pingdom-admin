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
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

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
  const [targetType, setTargetType] = useState<'GENERAL' | 'PRODUCT'>(availability?.productId ? 'PRODUCT' : 'GENERAL')
  const [productId, setProductId] = useState<number | null>(availability?.productId ?? activeProducts[0]?.id ?? null)
  const [startsAt, setStartsAt] = useState(availability ? toDateTimeInput(availability.startsAt) : '')
  const [endsAt, setEndsAt] = useState(availability ? toDateTimeInput(availability.endsAt) : '')
  const [totalCapacity, setTotalCapacity] = useState(String(availability?.totalCapacity ?? 1))
  const [formError, setFormError] = useState('')
  const isBusy = activeAction !== null
  const selectedProduct = products.find((product) => product.id === productId) ?? null
  const existingTargetLabel = availability?.productId
    ? `${selectedProduct?.name ?? `상품 #${availability.productId}`} · ${availability.productType === 'TICKET' ? '티켓' : '클래스'}`
    : '일반 장소 예약'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const capacity = Number(totalCapacity)
    const startDate = new Date(startsAt)
    const endDate = new Date(endsAt)

    if (!startsAt || !endsAt || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setFormError('예약 시작·종료 일시를 모두 선택해주세요.')
      return
    }
    if (startDate <= new Date()) {
      setFormError('예약 시작 일시는 현재 시각 이후로 선택해주세요.')
      return
    }
    if (endDate <= new Date()) {
      setFormError('예약 종료 일시는 현재 시각 이후로 선택해주세요.')
      return
    }
    if (startDate >= endDate) {
      setFormError('종료 일시는 시작 일시보다 늦어야 합니다.')
      return
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setFormError('총 예약 가능 인원은 1명 이상이어야 합니다.')
      return
    }
    if (!availability && targetType === 'PRODUCT' && (!selectedProduct || selectedProduct.status !== 'ACTIVE')) {
      setFormError('활성 예약 상품을 선택해주세요.')
      return
    }

    setFormError('')
    const request: MerchantAvailabilityUpsertRequest = {
      placeId,
      ...(!availability && targetType === 'PRODUCT' && selectedProduct ? {
        productId: selectedProduct.id,
        productType: selectedProduct.productType,
      } : {}),
      startsAt,
      endsAt,
      totalCapacity: capacity,
    }
    const next = availability ? await onSave(availability.id, request) : await onCreate(request)
    if (next) onCreated(next.id)
  }

  return (
    <S.Editor>
      <S.Form onSubmit={submit}>
        <S.Field $wide>
          예약 대상
          {availability ? <S.Input value={existingTargetLabel} disabled /> : <AdminSelect aria-label="예약 대상" width="100%" value={targetType} disabled={isBusy} onChange={(event) => setTargetType(event.target.value as 'GENERAL' | 'PRODUCT')}><option value="GENERAL">일반 장소 예약</option><option value="PRODUCT">등록한 예약 상품</option></AdminSelect>}
        </S.Field>
        {!availability && targetType === 'PRODUCT' ? <S.Field $wide>
          예약 상품
          <AdminSelect aria-label="예약 상품 선택" width="100%" value={productId ?? ''} disabled={isBusy || activeProducts.length === 0} onChange={(event) => setProductId(Number(event.target.value))}>
            {activeProducts.length === 0 ? <option value="">활성 예약 상품 없음</option> : activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.productType === 'TICKET' ? '티켓' : '클래스'}</option>)}
          </AdminSelect>
        </S.Field> : null}
        {availability ? <S.Field $wide><S.FieldHint>예약 대상은 등록 후 변경할 수 없습니다. 시간과 수용 인원만 수정할 수 있습니다.</S.FieldHint></S.Field> : null}
        <S.Field>
          시작 일시
          <AdminDateTimePicker ariaLabel="예약 시작 일시" value={startsAt} disabled={isBusy} onChange={setStartsAt} />
        </S.Field>
        <S.Field>
          종료 일시
          <AdminDateTimePicker ariaLabel="예약 종료 일시" value={endsAt} disabled={isBusy} onChange={setEndsAt} />
        </S.Field>
        <S.Field>
          총 예약 가능 인원
          <S.Input type="number" min="1" value={totalCapacity} disabled={isBusy} onChange={(event) => setTotalCapacity(event.target.value)} />
        </S.Field>
        {availability ? <S.Field>현재 잔여 인원<S.Input value={`${availability.remainingCapacity}명`} disabled /></S.Field> : null}
        {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
        <S.FormActions>
          {availability ? (
            <S.ActionButton type="button" disabled={isBusy} $variant={availability.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => void onToggleActive(availability, availability.status !== 'ACTIVE')}>
              {activeAction === 'activate-availability' || activeAction === 'deactivate-availability' ? '처리 중' : availability.status === 'ACTIVE' ? '비활성화' : '활성화'}
            </S.ActionButton>
          ) : null}
          <S.ActionButton type="submit" $variant="primary" disabled={isBusy}>
            {activeAction === 'create-availability' || activeAction === 'update-availability' ? '저장 중' : availability ? '시간 저장' : '시간 등록'}
          </S.ActionButton>
        </S.FormActions>
      </S.Form>
    </S.Editor>
  )
}

function MerchantReservationSetupPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const reservation = useMerchantReservationSetup()
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<number | null>(null)
  const isBusy = reservation.activeAction !== null
  const products = useMemo(
    () => reservation.products.filter((item) => item.placeId === reservation.selectedPlaceId),
    [reservation.products, reservation.selectedPlaceId],
  )
  const availabilities = useMemo(
    () => reservation.availabilities.filter((item) => item.placeId === reservation.selectedPlaceId),
    [reservation.availabilities, reservation.selectedPlaceId],
  )
  const selectedAvailability = availabilities.find((item) => item.id === selectedAvailabilityId) ?? null

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }
  const selectPlace = (placeId: number) => {
    reservation.selectPlace(placeId)
    setSelectedAvailabilityId(null)
  }
  const startNewAvailability = () => setSelectedAvailabilityId(null)

  if (reservation.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>예약 가능 시간</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void reservation.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return (
    <Store.Page>
      <Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{reservation.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header>
      <Store.Content>
        <Store.PageIntro><div><Store.PageTitle>예약 가능 시간</Store.PageTitle><Store.PageDescription>고객이 예약 신청할 수 있는 시간과 수용 인원을 등록합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={reservation.status === 'loading' || isBusy} onClick={() => void reservation.fetchReservationSetup()}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
        {reservation.profile && reservation.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="예약을 관리할 장소 선택" value={reservation.selectedPlaceId ?? ''} onChange={(event) => selectPlace(Number(event.target.value))}>{reservation.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
        {reservation.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.sectionErrorMessage}</Store.Notice> : null}
        {reservation.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.actionErrorMessage}</Store.Notice> : null}
        {reservation.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{reservation.successMessage}</Store.Notice> : null}
        {reservation.status === 'loading' || reservation.isLoading ? <Store.LoadingSummary aria-label="예약 가능 시간을 불러오는 중"><Store.Skeleton $height={420} /></Store.LoadingSummary> : !reservation.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">add_business</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소가 아직 없습니다.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>운영할 장소를 신청하거나 새 장소를 등록한 뒤, 승인되면 예약 시간을 관리할 수 있습니다.</Store.EmptyStoreDescription></div><Store.EmptyStoreActions><Store.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>기존 장소 신청</Store.EmptyStoreAction><Store.EmptyStoreSecondaryAction type="button" onClick={() => navigate('/merchant/place-registration')}>새 장소 등록</Store.EmptyStoreSecondaryAction></Store.EmptyStoreActions></Store.EmptyStoreState> : <S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedAvailability ? '예약 가능 시간 수정' : '예약 가능 시간 등록'}</S.PanelTitle><S.PanelDescription>고객이 예약 신청할 시작·종료 일시와 총 수용 인원을 설정합니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={isBusy} onClick={startNewAvailability}>새 시간</S.CreateButton></S.PanelHeader><AvailabilityEditor key={selectedAvailability?.id ?? `new-${reservation.selectedPlaceId}`} availability={selectedAvailability} placeId={reservation.selectedPlaceId} products={products} activeAction={reservation.activeAction} onCreate={reservation.createAvailability} onSave={reservation.saveAvailability} onToggleActive={reservation.setAvailabilityActive} onCreated={setSelectedAvailabilityId} /><S.ResultMeta>등록된 예약 가능 시간 {availabilities.length}개</S.ResultMeta>{availabilities.length === 0 ? <S.Empty>등록된 예약 가능 시간이 없습니다.</S.Empty> : <S.CampaignList>{availabilities.map((availability) => { const product = availability.productId === null ? null : products.find((item) => item.id === availability.productId); const targetLabel = product?.name ?? (availability.productType === 'GENERAL' ? '일반 장소 예약' : `상품 #${availability.productId}`); return <S.CampaignItem type="button" key={availability.id} $selected={availability.id === selectedAvailabilityId} onClick={() => setSelectedAvailabilityId(availability.id)}><S.CampaignTop><S.CampaignTitle>{targetLabel}</S.CampaignTitle><S.StatusBadge $tone={availability.status === 'ACTIVE' ? 'published' : 'closed'}>{availability.status === 'ACTIVE' ? '예약 가능' : '비활성'}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{formatDateTime(availability.startsAt)} - {formatDateTime(availability.endsAt)}</S.CampaignMeta><S.CampaignMeta>잔여 {availability.remainingCapacity} / {availability.totalCapacity}명</S.CampaignMeta></S.CampaignItem>})}</S.CampaignList>}</S.Panel>}
      </Store.Content>
    </Store.Page>
  )
}

export default MerchantReservationSetupPage
