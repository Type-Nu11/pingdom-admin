import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FeedbackMessage } from '../../components/common/FeedbackMessage'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { MerchantConfirmationDialog } from '../../components/merchant/MerchantConfirmationDialog'
import { MerchantPageShell } from '../../components/merchant/MerchantPageShell'
import { useMerchantPlaceMenus } from '../../hooks/useMerchantPlaceMenus'
import type {
  MerchantPlaceMenu,
  MerchantPlaceMenuCreateRequest,
  MerchantPlaceMenuCurrency,
  MerchantPlaceMenuStatus,
  MerchantPlaceMenuUpdateRequest,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'
import * as MenuStyles from './MerchantMenuPage.styles'

const STATUS: Record<MerchantPlaceMenuStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  AVAILABLE: { label: '판매 중', tone: 'published' },
  SOLD_OUT: { label: '품절', tone: 'closed' },
  HIDDEN: { label: '숨김', tone: 'draft' },
  INACTIVE: { label: '비활성', tone: 'closed' },
}

const CURRENCY_LABEL: Record<MerchantPlaceMenuCurrency, string> = {
  KRW: '원 (KRW)',
  USD: '달러 (USD)',
  JPY: '엔 (JPY)',
  CNY: '위안 (CNY)',
  EUR: '유로 (EUR)',
}

function formatPrice(priceAmount: number, currency: MerchantPlaceMenuCurrency) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(priceAmount)
}

function MenuEditor({
  menu,
  nextDisplayOrder,
  activeAction,
  onCreate,
  onUpdate,
  onStatusChange,
  onRequestDeactivate,
  canMoveUp,
  canMoveDown,
  onMove,
  onSelect,
}: {
  menu: MerchantPlaceMenu | null
  nextDisplayOrder: number
  activeAction: ReturnType<typeof useMerchantPlaceMenus>['activeAction']
  onCreate: (request: MerchantPlaceMenuCreateRequest) => Promise<MerchantPlaceMenu | null>
  onUpdate: (menuId: number, request: MerchantPlaceMenuUpdateRequest) => Promise<MerchantPlaceMenu | null>
  onStatusChange: (menuId: number, status: Exclude<MerchantPlaceMenuStatus, 'INACTIVE'>) => Promise<MerchantPlaceMenu | null>
  onRequestDeactivate: (menu: MerchantPlaceMenu) => void
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (direction: -1 | 1) => void
  onSelect: (menuId: number | null) => void
}) {
  const [name, setName] = useState(menu?.name ?? '')
  const [description, setDescription] = useState(menu?.description ?? '')
  const [priceAmount, setPriceAmount] = useState(menu?.priceAmount ? String(menu.priceAmount) : '')
  const [currency, setCurrency] = useState<MerchantPlaceMenuCurrency>(menu?.currency ?? 'KRW')
  const [imageUrl, setImageUrl] = useState(menu?.imageUrl ?? '')
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const [formError, setFormError] = useState('')
  const isInactive = menu?.status === 'INACTIVE'
  const isBusy = activeAction !== null
  const normalizedImageUrl = imageUrl.trim()
  const isImageLoadFailed = failedImageUrl === normalizedImageUrl

  const buildRequest = (): MerchantPlaceMenuCreateRequest | MerchantPlaceMenuUpdateRequest | null => {
    const normalizedPrice = Number(priceAmount)
    if (!name.trim()) {
      setFormError('메뉴명을 입력해주세요.')
      return null
    }
    if (!Number.isSafeInteger(normalizedPrice) || normalizedPrice <= 0 || normalizedPrice > 1_000_000_000) {
      setFormError('가격은 1원 이상 10억 이하의 정수로 입력해주세요.')
      return null
    }
    if (imageUrl.trim()) {
      try { new URL(imageUrl.trim()) } catch { setFormError('대표 이미지 URL 형식을 확인해주세요.'); return null }
    }
    setFormError('')
    const common = {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      priceAmount: normalizedPrice,
      currency,
      imageUrl: imageUrl.trim() || null,
    }
    return menu ? common : { ...common, displayOrder: nextDisplayOrder }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isInactive) return
    const request = buildRequest()
    if (!request) return
    const next = menu
      ? await onUpdate(menu.id, request as MerchantPlaceMenuUpdateRequest)
      : await onCreate(request as MerchantPlaceMenuCreateRequest)
    if (next) onSelect(next.id)
  }

  const changeStatus = async (status: Exclude<MerchantPlaceMenuStatus, 'INACTIVE'>) => {
    if (!menu || isInactive || status === menu.status) return
    const next = await onStatusChange(menu.id, status)
    if (next) onSelect(next.id)
  }

  const deactivate = async () => {
    if (!menu || isInactive) return
    onRequestDeactivate(menu)
  }

  return <S.Editor>
    {isInactive ? <S.ReadonlyNotice>비활성 메뉴입니다. 고객에게 노출되지 않으며 수정할 수 없습니다.</S.ReadonlyNotice> : null}
    <S.Form onSubmit={save}>
      <S.Field $wide>
        메뉴명
        <S.Input value={name} maxLength={100} disabled={isBusy || isInactive} onChange={(event) => setName(event.target.value)} />
      </S.Field>
      <S.Field>
        가격
        <S.Input inputMode="numeric" value={priceAmount} placeholder="예: 12000" disabled={isBusy || isInactive} onChange={(event) => setPriceAmount(event.target.value.replace(/[^0-9]/g, ''))} />
      </S.Field>
      <S.Field>
        통화
        <AdminSelect aria-label="메뉴 가격 통화" width="100%" value={currency} disabled={isBusy || isInactive} onChange={(event) => setCurrency(event.target.value as MerchantPlaceMenuCurrency)}>
          {Object.entries(CURRENCY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AdminSelect>
      </S.Field>
      <S.Field $wide>
        메뉴 설명
        <S.Textarea value={description} maxLength={500} disabled={isBusy || isInactive} onChange={(event) => setDescription(event.target.value)} />
        <S.FieldHint>{description.length}/500</S.FieldHint>
      </S.Field>
      <S.Field $wide>
        대표 이미지 URL
        <S.Input type="url" value={imageUrl} placeholder="https://" maxLength={500} disabled={isBusy || isInactive} onChange={(event) => setImageUrl(event.target.value)} />
        <S.FieldHint>공개된 이미지 URL만 등록할 수 있습니다.</S.FieldHint>
      </S.Field>
      {normalizedImageUrl ? <MenuStyles.ImagePreview>
        {!isImageLoadFailed ? <MenuStyles.Image src={normalizedImageUrl} alt="메뉴 대표 이미지 미리보기" onError={() => setFailedImageUrl(normalizedImageUrl)} /> : <MenuStyles.ImagePreviewText><strong>이미지를 불러올 수 없습니다.</strong>URL이 공개되어 있는지와 주소를 다시 확인해주세요.</MenuStyles.ImagePreviewText>}
        {!isImageLoadFailed ? <MenuStyles.ImagePreviewText><strong>대표 이미지 미리보기</strong></MenuStyles.ImagePreviewText> : null}
      </MenuStyles.ImagePreview> : null}
      {menu && !isInactive ? <S.Field $wide>
        판매 상태
        <AdminSelect aria-label="메뉴 판매 상태" width="100%" value={menu.status} disabled={isBusy} onChange={(event) => void changeStatus(event.target.value as Exclude<MerchantPlaceMenuStatus, 'INACTIVE'>)}>
          <option value="AVAILABLE">판매 중</option>
          <option value="SOLD_OUT">품절</option>
          <option value="HIDDEN">숨김</option>
        </AdminSelect>
      </S.Field> : null}
      {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
      <S.FormActions>
        {!isInactive ? <S.ActionButton type="submit" disabled={isBusy} $variant="primary">{activeAction === 'create' || activeAction === 'update' ? '저장 중' : menu ? '변경 사항 저장' : '메뉴 등록'}</S.ActionButton> : null}
        {menu && !isInactive ? <S.ActionButton type="button" disabled={isBusy || !canMoveUp} onClick={() => onMove(-1)}>위로 이동</S.ActionButton> : null}
        {menu && !isInactive ? <S.ActionButton type="button" disabled={isBusy || !canMoveDown} onClick={() => onMove(1)}>아래로 이동</S.ActionButton> : null}
        {menu && !isInactive ? <S.ActionButton type="button" disabled={isBusy} $variant="danger" onClick={() => void deactivate()}>{activeAction === 'deactivate' ? '비활성화 중' : '메뉴 비활성화'}</S.ActionButton> : null}
      </S.FormActions>
    </S.Form>
  </S.Editor>
}

function MerchantMenuPage() {
  const navigate = useNavigate()
  const menu = useMerchantPlaceMenus()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pendingDeactivation, setPendingDeactivation] = useState<MerchantPlaceMenu | null>(null)
  const selectedMenu = menu.menus.find((item) => item.id === selectedId) ?? null
  const selectedMenuIndex = selectedMenu ? menu.menus.findIndex((item) => item.id === selectedMenu.id) : -1
  const isBusy = menu.activeAction !== null
  const availableMenus = useMemo(() => menu.menus.filter((item) => item.status === 'AVAILABLE'), [menu.menus])

  const startNew = () => setSelectedId(null)
  const moveMenu = (item: MerchantPlaceMenu, direction: -1 | 1) => {
    const currentIndex = menu.menus.findIndex((menuItem) => menuItem.id === item.id)
    const target = menu.menus[currentIndex + direction]
    if (!target) return
    void menu.moveMenu(item, target.displayOrder)
  }
  const confirmDeactivation = async () => {
    if (!pendingDeactivation) return
    const deactivated = await menu.deactivateMenu(pendingDeactivation.id)
    if (deactivated) {
      setSelectedId(null)
      setPendingDeactivation(null)
    }
  }

  if (menu.status === 'error') {
    return (
      <MerchantPageShell title="메뉴 관리">
        <FeedbackMessage tone="error">{menu.errorMessage}</FeedbackMessage>
        <div style={{ marginTop: 16 }}>
          <Store.RetryButton type="button" onClick={() => void menu.fetchInitialData()}>다시 시도</Store.RetryButton>
        </div>
      </MerchantPageShell>
    )
  }

  return <MerchantPageShell
    title="메뉴 관리"
    description="연결된 장소의 메뉴, 판매 상태, 고객 노출 순서를 관리합니다."
    actions={<S.HeaderActions><S.HeaderButton type="button" disabled={menu.status === 'loading' || isBusy} onClick={() => void menu.fetchMenus()}>새로고침</S.HeaderButton></S.HeaderActions>}
  >
    {menu.profile && menu.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="메뉴를 관리할 장소 선택" value={menu.selectedPlaceId ?? ''} disabled={isBusy} onChange={(event) => { setSelectedId(null); menu.selectPlace(Number(event.target.value)) }}>{menu.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
    {menu.sectionErrorMessage ? <FeedbackMessage tone="error" style={{ marginBottom: 16 }}>{menu.sectionErrorMessage}</FeedbackMessage> : null}
    {menu.actionErrorMessage ? <FeedbackMessage tone="error" style={{ marginBottom: 16 }}>{menu.actionErrorMessage}</FeedbackMessage> : null}
    {menu.successMessage ? <FeedbackMessage tone="success" style={{ marginBottom: 16 }}>{menu.successMessage}</FeedbackMessage> : null}
    {menu.status === 'loading' || menu.isLoading ? <Store.LoadingSummary aria-label="메뉴를 불러오는 중"><Store.Skeleton $height={420} /></Store.LoadingSummary> : !menu.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">restaurant_menu</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소가 아직 없습니다.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>운영할 장소를 신청하거나 새 장소를 등록한 뒤, 승인되면 메뉴를 관리할 수 있습니다.</Store.EmptyStoreDescription></div><Store.EmptyStoreActions><Store.EmptyStoreAction type="button" onClick={() => navigate('/merchant/place-application')}>기존 장소 신청</Store.EmptyStoreAction><Store.EmptyStoreSecondaryAction type="button" onClick={() => navigate('/merchant/place-registration')}>새 장소 등록</Store.EmptyStoreSecondaryAction></Store.EmptyStoreActions></Store.EmptyStoreState> : <S.Workspace>
      <S.Panel><S.PanelHeader><div><S.PanelTitle>등록 메뉴</S.PanelTitle><S.PanelDescription>판매 상태와 고객에게 표시되는 순서를 확인합니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={isBusy} onClick={startNew}>새 메뉴</S.CreateButton></S.PanelHeader><S.ResultMeta>총 {menu.menus.length}개 · 판매 중 {availableMenus.length}개</S.ResultMeta>{menu.menus.length === 0 ? <S.Empty>등록된 메뉴가 없습니다. 첫 메뉴를 등록해보세요.</S.Empty> : <S.CampaignList>{menu.menus.map((item) => <S.CampaignItem type="button" key={item.id} $selected={item.id === selectedId} onClick={() => setSelectedId(item.id)}><S.CampaignTop><S.CampaignTitle title={item.name}>{item.name}</S.CampaignTitle><S.StatusBadge $tone={STATUS[item.status].tone}>{STATUS[item.status].label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>{formatPrice(item.priceAmount, item.currency)} · 표시 순서 {item.displayOrder + 1}</S.CampaignMeta>{item.description ? <S.CampaignMeta title={item.description}>{item.description}</S.CampaignMeta> : null}</S.CampaignItem>)}</S.CampaignList>}</S.Panel>
      <S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedMenu ? '메뉴 상세' : '새 메뉴 등록'}</S.PanelTitle><S.PanelDescription>{selectedMenu ? `메뉴 #${selectedMenu.id} · 표시 순서 ${selectedMenu.displayOrder + 1}` : '메뉴 정보를 입력하면 목록 마지막 순서로 등록됩니다.'}</S.PanelDescription></div>{selectedMenu ? <S.StatusBadge $tone={STATUS[selectedMenu.status].tone}>{STATUS[selectedMenu.status].label}</S.StatusBadge> : null}</S.PanelHeader><MenuEditor key={selectedMenu?.id ?? `new-${menu.menus.length}`} menu={selectedMenu} nextDisplayOrder={menu.menus.length} activeAction={menu.activeAction} onCreate={menu.createMenu} onUpdate={menu.updateMenu} onStatusChange={menu.updateMenuStatus} onRequestDeactivate={setPendingDeactivation} canMoveUp={selectedMenuIndex > 0} canMoveDown={selectedMenuIndex >= 0 && selectedMenuIndex < menu.menus.length - 1} onMove={(direction) => selectedMenu && moveMenu(selectedMenu, direction)} onSelect={setSelectedId} /></S.Panel>
    </S.Workspace>}
    {pendingDeactivation ? <MerchantConfirmationDialog title="메뉴를 비활성화할까요?" description={`'${pendingDeactivation.name}' 메뉴는 고객에게 더 이상 노출되지 않으며 다시 활성화할 수 없습니다.`} cancelLabel="유지하기" confirmLabel="메뉴 비활성화" isPending={menu.activeAction === 'deactivate'} onClose={() => setPendingDeactivation(null)} onConfirm={() => void confirmDeactivation()} /> : null}
  </MerchantPageShell>
}

export default MerchantMenuPage
