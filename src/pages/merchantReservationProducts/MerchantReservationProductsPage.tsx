import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantReservationProducts } from '../../hooks/useMerchantReservationProducts'
import type {
  MerchantReservableProduct,
  MerchantReservableProductCreateRequest,
  MerchantReservableProductType,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'

const PRODUCT_TYPE_LABEL: Record<Exclude<MerchantReservableProductType, 'GENERAL'>, string> = {
  TICKET: '티켓',
  CLASS: '클래스',
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
  const [productType, setProductType] = useState<Exclude<MerchantReservableProductType, 'GENERAL'>>('TICKET')
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('예약 상품명을 입력해주세요.')
      return
    }

    setFormError('')
    const next = await onCreate({ placeId, name: name.trim(), productType })
    if (next) setName('')
  }

  return (
    <S.Editor>
      <S.Form onSubmit={submit}>
        <S.Field $wide>
          상품명
          <S.Input value={name} maxLength={100} disabled={isBusy} onChange={(event) => setName(event.target.value)} />
        </S.Field>
        <S.Field>
          상품 유형
          <AdminSelect aria-label="예약 상품 유형" width="100%" value={productType} disabled={isBusy} onChange={(event) => setProductType(event.target.value as Exclude<MerchantReservableProductType, 'GENERAL'>)}>
            <option value="TICKET">티켓</option>
            <option value="CLASS">클래스</option>
          </AdminSelect>
        </S.Field>
        <S.Field>
          <S.FieldHint>일반 예약은 상품 없이 예약 설정에서 관리합니다.</S.FieldHint>
        </S.Field>
        {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
        <S.FormActions>
          <S.ActionButton type="submit" $variant="primary" disabled={isBusy}>상품 등록</S.ActionButton>
        </S.FormActions>
      </S.Form>
    </S.Editor>
  )
}

function MerchantReservationProductsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const reservation = useMerchantReservationProducts()
  const isBusy = reservation.activeAction !== null
  const products = useMemo(
    () => reservation.products.filter((item) => item.placeId === reservation.selectedPlaceId),
    [reservation.products, reservation.selectedPlaceId],
  )

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  if (reservation.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>예약 상품</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void reservation.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return (
    <Store.Page>
      <Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{reservation.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header>
      <Store.Content>
        <Store.PageIntro><div><Store.PageTitle>예약 상품</Store.PageTitle><Store.PageDescription>티켓과 클래스를 예약 상품으로 등록하고 노출 상태를 관리합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={reservation.status === 'loading' || isBusy} onClick={() => void reservation.fetchProducts()}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
        {reservation.profile && reservation.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="예약 상품을 관리할 장소 선택" value={reservation.selectedPlaceId ?? ''} disabled={isBusy} onChange={(event) => reservation.selectPlace(Number(event.target.value))}>{reservation.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
        {reservation.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.sectionErrorMessage}</Store.Notice> : null}
        {reservation.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{reservation.actionErrorMessage}</Store.Notice> : null}
        {reservation.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{reservation.successMessage}</Store.Notice> : null}
        {reservation.status === 'loading' || reservation.isLoading ? <Store.LoadingSummary aria-label="예약 상품을 불러오는 중"><Store.Skeleton $height={420} /></Store.LoadingSummary> : !reservation.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">add_business</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소가 아직 없습니다.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>운영할 장소를 신청하거나 새 장소를 등록한 뒤, 승인되면 예약 상품을 관리할 수 있습니다.</Store.EmptyStoreDescription></div><Store.EmptyStoreActions><Store.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>기존 장소 신청</Store.EmptyStoreAction><Store.EmptyStoreSecondaryAction type="button" onClick={() => navigate('/merchant/place-registration')}>새 장소 등록</Store.EmptyStoreSecondaryAction></Store.EmptyStoreActions></Store.EmptyStoreState> : <S.Panel><S.PanelHeader><div><S.PanelTitle>예약 상품 등록</S.PanelTitle><S.PanelDescription>일반 예약 시간은 상품 등록 없이 예약 설정에서 바로 관리할 수 있습니다.</S.PanelDescription></div></S.PanelHeader><ProductCreator key={reservation.selectedPlaceId} placeId={reservation.selectedPlaceId} isBusy={isBusy} onCreate={reservation.createProduct} /><S.ResultMeta>등록된 예약 상품 {products.length}개</S.ResultMeta>{products.length === 0 ? <S.Empty>등록된 예약 상품이 없습니다.</S.Empty> : <S.CampaignList>{products.map((product) => <S.CampaignItem as="div" key={product.id} $selected={false}><S.CampaignTop><S.CampaignTitle>{product.name}</S.CampaignTitle><S.StatusBadge $tone={product.status === 'ACTIVE' ? 'published' : 'closed'}>{product.status === 'ACTIVE' ? '예약 가능' : '비활성'}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{PRODUCT_TYPE_LABEL[product.productType as Exclude<MerchantReservableProductType, 'GENERAL'>] ?? '일반 예약'} · 상품 #{product.id}</S.CampaignMeta><S.FormActions><S.ActionButton type="button" disabled={isBusy} $variant={product.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => void reservation.setProductActive(product, product.status !== 'ACTIVE')}>{reservation.activeAction === 'activate' || reservation.activeAction === 'deactivate' ? '처리 중' : product.status === 'ACTIVE' ? '비활성화' : '활성화'}</S.ActionButton></S.FormActions></S.CampaignItem>)}</S.CampaignList>}</S.Panel>}
      </Store.Content>
    </Store.Page>
  )
}

export default MerchantReservationProductsPage
