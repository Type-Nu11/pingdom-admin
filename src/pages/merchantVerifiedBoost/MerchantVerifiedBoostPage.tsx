import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantVerifiedBoost } from '../../hooks/useMerchantVerifiedBoost'
import type {
  MerchantVerifiedBoostExecution,
  MerchantVerifiedBoostExecutionStatus,
  MerchantVerifiedBoostProduct,
  MerchantVerifiedBoostSelectionCreateRequest,
} from '../../types/merchantStore.types'
import * as S from '../merchantCampaign/MerchantCampaignPage.styles'
import * as Store from '../merchantStore/MerchantStorePage.styles'

const EXECUTION_STATUS: Record<MerchantVerifiedBoostExecutionStatus, { label: string; tone: 'draft' | 'published' | 'closed' }> = {
  ACTIVE: { label: '집행 중', tone: 'published' },
  STOPPED: { label: '중단됨', tone: 'closed' },
  EXPIRED: { label: '종료됨', tone: 'draft' },
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('ko-KR').format(amount)} ${currency}`
  }
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function Pagination({
  page,
  totalPages,
  isBusy,
  onChange,
}: {
  page: number
  totalPages: number
  isBusy: boolean
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return <S.Pagination><S.PaginationButton type="button" disabled={isBusy || page <= 1} onClick={() => onChange(page - 1)}>이전</S.PaginationButton><S.PageText>{page} / {totalPages}</S.PageText><S.PaginationButton type="button" disabled={isBusy || page >= totalPages} onClick={() => onChange(page + 1)}>다음</S.PaginationButton></S.Pagination>
}

function BoostSelectionDialog({
  products,
  placeIds,
  existingPairs,
  isBusy,
  onClose,
  onSubmit,
}: {
  products: MerchantVerifiedBoostProduct[]
  placeIds: number[]
  existingPairs: Set<string>
  isBusy: boolean
  onClose: () => void
  onSubmit: (request: MerchantVerifiedBoostSelectionCreateRequest) => Promise<boolean>
}) {
  const [productId, setProductId] = useState(products[0]?.productId ?? 0)
  const [placeId, setPlaceId] = useState(placeIds[0] ?? 0)
  const [formError, setFormError] = useState('')
  const idempotencyKeyRef = useRef(createIdempotencyKey())
  const product = products.find((item) => item.productId === productId)

  const resetRequest = () => {
    idempotencyKeyRef.current = createIdempotencyKey()
    setFormError('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!productId || !placeId) {
      setFormError('상품과 장소를 모두 선택해주세요.')
      return
    }
    if (existingPairs.has(`${productId}:${placeId}`)) {
      setFormError('이미 선택된 상품과 장소 조합입니다.')
      return
    }
    if (await onSubmit({ productId, placeId, idempotencyKey: idempotencyKeyRef.current })) onClose()
  }

  return <S.ModalOverlay role="presentation" onMouseDown={() => !isBusy && onClose()}><S.Modal role="dialog" aria-modal="true" aria-labelledby="verified-boost-selection-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="verified-boost-selection-title">Verified Boost 상품 선택</S.ModalTitle></div><S.CloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={onClose}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.Form onSubmit={(event) => void submit(event)}><S.Field>상품<S.Select value={productId} disabled={isBusy} onChange={(event) => { setProductId(Number(event.target.value)); resetRequest() }}>{products.map((item) => <option value={item.productId} key={item.productId}>{item.name} · {item.durationDays}일 · {formatCurrency(item.priceAmount, item.currency)}</option>)}</S.Select></S.Field><S.Field>적용 장소<S.Select value={placeId} disabled={isBusy} onChange={(event) => { setPlaceId(Number(event.target.value)); resetRequest() }}>{placeIds.map((id) => <option value={id} key={id}>장소 #{id}</option>)}</S.Select></S.Field>{product ? <S.ReadonlyNotice style={{ gridColumn: '1 / -1', margin: 0 }}>{product.description || '상품 설명이 없습니다.'}</S.ReadonlyNotice> : null}{formError ? <S.FormError>{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="button" disabled={isBusy} onClick={onClose}>취소</S.ActionButton><S.ActionButton type="submit" disabled={isBusy} $variant="primary">{isBusy ? '선택 중' : '선택 완료'}</S.ActionButton></S.FormActions></S.Form></S.ModalBody></S.Modal></S.ModalOverlay>
}

function MerchantVerifiedBoostPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const boost = useMerchantVerifiedBoost()
  const [pendingStop, setPendingStop] = useState<MerchantVerifiedBoostExecution | null>(null)
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const activeSelectionIds = new Set(boost.executions.filter((execution) => execution.status === 'ACTIVE').map((execution) => execution.selectionId))
  const selectedPairs = new Set(boost.selections.map((selection) => `${selection.productId}:${selection.placeId}`))
  const productById = new Map(boost.products.map((product) => [product.productId, product]))

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  const handleStop = async () => {
    if (!pendingStop) return
    const stopped = await boost.stopExecution(pendingStop)
    if (stopped) setPendingStop(null)
  }

  const isInitialFailure = boost.selectionState === 'error' && boost.executionState === 'error'

  if (isInitialFailure) {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>Verified Boost 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>Verified Boost 정보를 불러오지 못했습니다.</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => { void boost.fetchSelections(1, true); void boost.fetchExecutions(1, true); void boost.fetchProducts(true); void boost.fetchProfile(true) }}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  const isActionPending = boost.activeAction !== null
  const canOpenSelection = boost.productState === 'ready' && boost.profileState === 'ready' && boost.products.length > 0 && (boost.profile?.placeIds.length ?? 0) > 0

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>Verified Boost 관리</Store.PageTitle><Store.PageDescription>활성 상품을 선택한 뒤 집행 상태를 확인하고 시작하거나 중단합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" onClick={() => navigate('/merchant')}>내 가게 관리</S.HeaderButton><S.HeaderButton type="button" disabled={isActionPending} onClick={() => { void boost.fetchSelections(boost.selectionPageInfo.page); void boost.fetchExecutions(boost.executionPageInfo.page); void boost.fetchProducts(); void boost.fetchProfile() }}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {boost.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{boost.actionErrorMessage}</Store.Notice> : null}
    {boost.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{boost.successMessage}</Store.Notice> : null}
    <S.Workspace>
      <S.Panel>
        <S.PanelHeader><div><S.PanelTitle>선택한 부스트</S.PanelTitle><S.PanelDescription>활성 상품을 장소에 연결한 뒤 집행을 시작할 수 있습니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={isActionPending || !canOpenSelection} onClick={() => setIsSelectionOpen(true)}>상품 선택</S.CreateButton></S.PanelHeader>
        {boost.productState === 'loading' || boost.profileState === 'loading' ? <S.ReadonlyNotice>선택 가능한 상품과 관리 장소를 확인하고 있습니다.</S.ReadonlyNotice> : boost.productState === 'error' ? <S.ReadonlyNotice>{boost.productErrorMessage}</S.ReadonlyNotice> : boost.profileState === 'error' ? <S.ReadonlyNotice>{boost.profileErrorMessage}</S.ReadonlyNotice> : boost.products.length === 0 ? <S.ReadonlyNotice>현재 선택 가능한 Verified Boost 상품이 없습니다.</S.ReadonlyNotice> : (boost.profile?.placeIds.length ?? 0) === 0 ? <S.ReadonlyNotice>관리 권한이 연결된 장소가 없어 상품을 선택할 수 없습니다.</S.ReadonlyNotice> : null}
        {boost.selectionState === 'loading' ? <S.ListLoading><Store.Skeleton $height={92} /><Store.Skeleton $height={92} /></S.ListLoading> : boost.selectionState === 'error' ? <S.Empty>{boost.selectionErrorMessage}<div style={{ marginTop: 14 }}><S.HeaderButton type="button" onClick={() => void boost.fetchSelections(boost.selectionPageInfo.page)}>다시 시도</S.HeaderButton></div></S.Empty> : boost.selections.length === 0 ? <S.Empty>선택된 Verified Boost가 없습니다.</S.Empty> : <S.CampaignList>{boost.selections.map((selection) => {
          const hasActiveExecution = activeSelectionIds.has(selection.id)
          const isStarting = boost.activeAction === 'start' && boost.activeTargetId === selection.id
          const product = productById.get(selection.productId)
          return <S.CampaignItem as="div" key={selection.id} $selected={false}><S.CampaignTop><S.CampaignTitle>{product?.name || `상품 #${selection.productId}`}</S.CampaignTitle><S.StatusBadge $tone={hasActiveExecution ? 'published' : 'draft'}>{hasActiveExecution ? '집행 중' : '선택 완료'}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>장소 #{selection.placeId} · {product ? `${product.durationDays}일 · ${formatCurrency(product.priceAmount, product.currency)}` : `상품 #${selection.productId}`}</S.CampaignMeta><S.CampaignMeta>선택 {formatDateTime(selection.selectedAt)}</S.CampaignMeta><S.FormActions><S.ActionButton type="button" disabled={isActionPending || hasActiveExecution} $variant="primary" onClick={() => void boost.startExecution(selection)}>{isStarting ? '시작 중' : hasActiveExecution ? '집행 중' : '집행 시작'}</S.ActionButton></S.FormActions></S.CampaignItem>
        })}</S.CampaignList>}
        <Pagination page={boost.selectionPageInfo.page} totalPages={boost.selectionPageInfo.totalPages} isBusy={isActionPending || boost.selectionState === 'loading'} onChange={(page) => void boost.fetchSelections(page)} />
      </S.Panel>
      <S.Panel>
        <S.PanelHeader><div><S.PanelTitle>집행 내역</S.PanelTitle><S.PanelDescription>집행 중인 항목은 즉시 중단할 수 있습니다.</S.PanelDescription></div></S.PanelHeader>
        {boost.executionState === 'loading' ? <S.ListLoading><Store.Skeleton $height={92} /><Store.Skeleton $height={92} /></S.ListLoading> : boost.executionState === 'error' ? <S.Empty>{boost.executionErrorMessage}<div style={{ marginTop: 14 }}><S.HeaderButton type="button" onClick={() => void boost.fetchExecutions(boost.executionPageInfo.page)}>다시 시도</S.HeaderButton></div></S.Empty> : boost.executions.length === 0 ? <S.Empty>집행된 Verified Boost가 없습니다.</S.Empty> : <S.CampaignList>{boost.executions.map((execution) => {
          const status = EXECUTION_STATUS[execution.status]
          const isStopping = boost.activeAction === 'stop' && boost.activeTargetId === execution.id
          const product = productById.get(execution.productId)
          return <S.CampaignItem as="div" key={execution.id} $selected={false}><S.CampaignTop><S.CampaignTitle>{product?.name || `상품 #${execution.productId}`}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop><S.CampaignMeta>장소 #{execution.placeId} · 선택 #{execution.selectionId}</S.CampaignMeta><S.CampaignMeta>시작 {formatDateTime(execution.startedAt)} · 종료 {formatDateTime(execution.endsAt)}</S.CampaignMeta>{execution.stoppedAt ? <S.CampaignMeta>중단 {formatDateTime(execution.stoppedAt)}</S.CampaignMeta> : null}{execution.status === 'ACTIVE' ? <S.FormActions><S.ActionButton type="button" disabled={isActionPending} $variant="danger" onClick={() => setPendingStop(execution)}>{isStopping ? '중단 중' : '집행 중단'}</S.ActionButton></S.FormActions> : null}</S.CampaignItem>
        })}</S.CampaignList>}
        <Pagination page={boost.executionPageInfo.page} totalPages={boost.executionPageInfo.totalPages} isBusy={isActionPending || boost.executionState === 'loading'} onChange={(page) => void boost.fetchExecutions(page)} />
      </S.Panel>
    </S.Workspace>
  </Store.Content>{isSelectionOpen && canOpenSelection ? <BoostSelectionDialog products={boost.products} placeIds={boost.profile?.placeIds ?? []} existingPairs={selectedPairs} isBusy={isActionPending} onClose={() => setIsSelectionOpen(false)} onSubmit={async (request) => Boolean(await boost.createSelection(request))} /> : null}{pendingStop ? <S.ModalOverlay role="presentation" onMouseDown={() => !isActionPending && setPendingStop(null)}><S.Modal role="dialog" aria-modal="true" aria-labelledby="verified-boost-stop-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="verified-boost-stop-title">Verified Boost 집행 중단</S.ModalTitle></div><S.CloseButton type="button" aria-label="닫기" disabled={isActionPending} onClick={() => setPendingStop(null)}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.ReadonlyNotice>장소 #{pendingStop.placeId}의 Verified Boost 집행을 중단합니다. 중단 후에는 현재 노출 상태가 즉시 변경될 수 있습니다.</S.ReadonlyNotice><S.FormActions><S.ActionButton type="button" disabled={isActionPending} onClick={() => setPendingStop(null)}>돌아가기</S.ActionButton><S.ActionButton type="button" disabled={isActionPending} $variant="danger" onClick={() => void handleStop()}>{isActionPending ? '중단 중' : '집행 중단'}</S.ActionButton></S.FormActions></S.ModalBody></S.Modal></S.ModalOverlay> : null}</Store.Page>
}

export default MerchantVerifiedBoostPage
