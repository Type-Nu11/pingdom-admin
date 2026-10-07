import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AppDialog } from '../../components/common/AppDialog'
import { MerchantPlaceSelect } from '../../components/merchant/MerchantPlaceSelect'
import { MerchantPlaceIdentitySummary } from '../../components/merchant/MerchantPlaceIdentitySummary'
import { useMerchantPlaceIdentity } from '../../hooks/useMerchantPlaceIdentity'
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

function BoostSelectionDialog({
  products,
  placeIds,
  existingPairs,
  isBusy,
  errorMessage,
  fallbackFocusRef,
  onClose,
  onSubmit,
}: {
  products: MerchantVerifiedBoostProduct[]
  placeIds: number[]
  existingPairs: Set<string>
  isBusy: boolean
  errorMessage: string
  fallbackFocusRef: RefObject<HTMLHeadingElement | null>
  onClose: () => void
  onSubmit: (request: MerchantVerifiedBoostSelectionCreateRequest) => Promise<boolean>
}) {
  const [productId, setProductId] = useState(products[0]?.productId ?? 0)
  const [placeId, setPlaceId] = useState(placeIds[0] ?? 0)
  const [formError, setFormError] = useState('')
  const idempotencyKeyRef = useRef(createIdempotencyKey())
  const formId = useId()
  const product = products.find((item) => item.productId === productId)

  const resetRequest = () => {
    idempotencyKeyRef.current = createIdempotencyKey()
    setFormError('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isBusy) return
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

  const closeDialog = () => { if (!isBusy) onClose() }

  return <AppDialog title="Verified Boost 상품 선택" description="상품과 적용 장소를 확인해주세요." isDismissible={!isBusy} fallbackFocusRef={fallbackFocusRef} onClose={closeDialog}
    footer={<>
      {formError ? <S.FormError role="alert" style={{ width: '100%' }}>{formError}</S.FormError> : null}
      {errorMessage ? <Store.Notice $tone="error" role="alert" style={{ width: '100%' }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{errorMessage}</Store.Notice> : null}
      <S.ActionButton type="button" disabled={isBusy} onClick={closeDialog}>취소</S.ActionButton>
      <S.ActionButton type="submit" form={formId} disabled={isBusy} $variant="primary">{isBusy ? '선택 중' : '선택 완료'}</S.ActionButton>
    </>}>
    <S.Form id={formId} onSubmit={(event) => void submit(event)}>
      <S.Field>상품<S.Select value={productId} disabled={isBusy} onChange={(event) => { setProductId(Number(event.target.value)); resetRequest() }}>{products.map((item) => <option value={item.productId} key={item.productId}>{item.name} · {item.durationDays}일 · {formatCurrency(item.priceAmount, item.currency)}</option>)}</S.Select></S.Field>
      <S.Field as="div"><span>적용 장소</span><MerchantPlaceSelect compact fullWidth showSelectedName aria-label="적용 장소" value={placeId} disabled={isBusy} onChange={(event) => { setPlaceId(Number(event.target.value)); resetRequest() }}>{placeIds.map((id) => <option value={id} key={id}>장소 #{id}</option>)}</MerchantPlaceSelect></S.Field>
      {product ? <S.ReadonlyNotice style={{ gridColumn: '1 / -1', margin: 0 }}>{product.description || '상품 설명이 없습니다.'}</S.ReadonlyNotice> : null}
    </S.Form>
  </AppDialog>
}

function MerchantVerifiedBoostPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const boost = useMerchantVerifiedBoost({ persistActionError: true })
  const [pendingStop, setPendingStop] = useState<MerchantVerifiedBoostExecution | null>(null)
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const activeSelectionIds = new Set(boost.executions.filter((execution) => execution.status === 'ACTIVE').map((execution) => execution.selectionId))
  const selectedPairs = new Set(boost.selections.map((selection) => `${selection.productId}:${selection.placeId}`))
  const productById = new Map(boost.products.map((product) => [product.productId, product]))
  const identity = useMerchantPlaceIdentity([...new Set([
    ...(boost.profile?.placeIds ?? []),
    ...boost.selections.map(selection => selection.placeId),
    ...boost.executions.map(execution => execution.placeId),
    ...(pendingStop ? [pendingStop.placeId] : []),
  ])])
  const isUnlinked = (placeId: number) => boost.profileState === 'ready' && !boost.profile?.placeIds.includes(placeId)

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
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle ref={headingRef} tabIndex={-1}>Verified Boost 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>Verified Boost 정보를 불러오지 못했습니다.</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => { void boost.fetchSelections(1, true); void boost.fetchExecutions(1, true); void boost.fetchProducts(true); void boost.fetchProfile(true) }}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  const isActionPending = boost.activeAction !== null
  const closeStopDialog = () => { if (!isActionPending) setPendingStop(null) }
  const canOpenSelection = boost.productState === 'ready' && boost.profileState === 'ready' && boost.products.length > 0 && (boost.profile?.placeIds.length ?? 0) > 0

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle ref={headingRef} tabIndex={-1}>Verified Boost 관리</Store.PageTitle><Store.PageDescription>가게 노출을 높이는 상품을 선택하고 집행 상태를 관리합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" disabled={isActionPending} onClick={() => { void boost.fetchSelections(boost.selectionPageInfo.page); void boost.fetchExecutions(boost.executionPageInfo.page); void boost.fetchProducts(); void boost.fetchProfile() }}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {!isSelectionOpen && !pendingStop && boost.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{boost.actionErrorMessage}</Store.Notice> : null}
    {boost.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{boost.successMessage}</Store.Notice> : null}
    <S.Workspace>
      <S.Panel>
        <S.PanelHeader><div><S.PanelTitle>선택한 부스트</S.PanelTitle><S.PanelDescription>활성 상품을 장소에 연결한 뒤 집행을 시작할 수 있습니다.</S.PanelDescription></div><S.CreateButton type="button" disabled={isActionPending || !canOpenSelection} onClick={() => { boost.clearActionError(); setIsSelectionOpen(true) }}>상품 선택</S.CreateButton></S.PanelHeader>
        {boost.productState === 'loading' || boost.profileState === 'loading' ? <S.ReadonlyNotice>선택 가능한 상품과 관리 장소를 확인하고 있습니다.</S.ReadonlyNotice> : boost.productState === 'error' ? <S.ReadonlyNotice>{boost.productErrorMessage}</S.ReadonlyNotice> : boost.profileState === 'error' ? <S.ReadonlyNotice>{boost.profileErrorMessage}</S.ReadonlyNotice> : boost.products.length === 0 ? <S.ReadonlyNotice>현재 선택 가능한 Verified Boost 상품이 없습니다.</S.ReadonlyNotice> : (boost.profile?.placeIds.length ?? 0) === 0 ? <S.ReadonlyNotice>관리 권한이 연결된 장소가 없어 상품을 선택할 수 없습니다.</S.ReadonlyNotice> : null}
        {boost.selectionState === 'loading' ? <S.ListLoading><Store.Skeleton $height={92} /><Store.Skeleton $height={92} /></S.ListLoading> : boost.selectionState === 'error' ? <S.Empty>{boost.selectionErrorMessage}<div style={{ marginTop: 14 }}><S.HeaderButton type="button" onClick={() => void boost.fetchSelections(boost.selectionPageInfo.page)}>다시 시도</S.HeaderButton></div></S.Empty> : boost.selections.length === 0 ? <S.Empty>선택된 Verified Boost가 없습니다.</S.Empty> : <S.CampaignList>{boost.selections.map((selection) => {
          const hasActiveExecution = activeSelectionIds.has(selection.id)
          const isStarting = boost.activeAction === 'start' && boost.activeTargetId === selection.id
          const product = productById.get(selection.productId)
          return <S.CampaignItem as="div" key={selection.id} $selected={false}>
            <S.CampaignTop><S.CampaignTitle>{product?.name || `상품 #${selection.productId}`}</S.CampaignTitle><S.StatusBadge $tone={hasActiveExecution ? 'published' : 'draft'}>{hasActiveExecution ? '집행 중' : '선택 완료'}</S.StatusBadge></S.CampaignTop>
            <MerchantPlaceIdentitySummary placeId={selection.placeId} identity={identity.places[selection.placeId]} onRetry={identity.retry} disabled={isActionPending} isUnlinked={isUnlinked(selection.placeId)} />
            <S.CampaignMeta>{product ? `${product.durationDays}일 · ${formatCurrency(product.priceAmount, product.currency)}` : `상품 #${selection.productId}`}</S.CampaignMeta>
            <S.CampaignMeta>선택 {formatDateTime(selection.selectedAt)}</S.CampaignMeta>
            <S.FormActions><S.ActionButton type="button" disabled={isActionPending || hasActiveExecution} $variant="primary" onClick={() => void boost.startExecution(selection)}>{isStarting ? '시작 중' : hasActiveExecution ? '집행 중' : '집행 시작'}</S.ActionButton></S.FormActions>
          </S.CampaignItem>
        })}</S.CampaignList>}
        {boost.selectionPageInfo.totalPages > 1 ? <AdminPagination ariaLabel="Verified Boost 선택 목록 페이지네이션" page={boost.selectionPageInfo.page} totalPages={boost.selectionPageInfo.totalPages} hasNext={boost.selectionPageInfo.hasNext} disabled={isActionPending || boost.selectionState === 'loading'} onPageChange={(nextPage) => void boost.fetchSelections(nextPage)} /> : null}
      </S.Panel>
      <S.Panel>
        <S.PanelHeader><div><S.PanelTitle>집행 내역</S.PanelTitle><S.PanelDescription>집행 중인 항목은 즉시 중단할 수 있습니다.</S.PanelDescription></div></S.PanelHeader>
        {boost.executionState === 'loading' ? <S.ListLoading><Store.Skeleton $height={92} /><Store.Skeleton $height={92} /></S.ListLoading> : boost.executionState === 'error' ? <S.Empty>{boost.executionErrorMessage}<div style={{ marginTop: 14 }}><S.HeaderButton type="button" onClick={() => void boost.fetchExecutions(boost.executionPageInfo.page)}>다시 시도</S.HeaderButton></div></S.Empty> : boost.executions.length === 0 ? <S.Empty>집행된 Verified Boost가 없습니다.</S.Empty> : <S.CampaignList>{boost.executions.map((execution) => {
          const status = EXECUTION_STATUS[execution.status]
          const isStopping = boost.activeAction === 'stop' && boost.activeTargetId === execution.id
          const product = productById.get(execution.productId)
          return <S.CampaignItem as="div" key={execution.id} $selected={false}>
            <S.CampaignTop><S.CampaignTitle>{product?.name || `상품 #${execution.productId}`}</S.CampaignTitle><S.StatusBadge $tone={status.tone}>{status.label}</S.StatusBadge></S.CampaignTop>
            <MerchantPlaceIdentitySummary placeId={execution.placeId} identity={identity.places[execution.placeId]} onRetry={identity.retry} disabled={isActionPending} isUnlinked={isUnlinked(execution.placeId)} />
            <S.CampaignMeta>선택 #{execution.selectionId}</S.CampaignMeta><S.CampaignMeta>시작 {formatDateTime(execution.startedAt)} · 종료 {formatDateTime(execution.endsAt)}</S.CampaignMeta>
            {execution.stoppedAt ? <S.CampaignMeta>중단 {formatDateTime(execution.stoppedAt)}</S.CampaignMeta> : null}
            {execution.status === 'ACTIVE' ? <S.FormActions><S.ActionButton type="button" disabled={isActionPending} $variant="danger" onClick={() => { boost.clearActionError(); setPendingStop(execution) }}>{isStopping ? '중단 중' : '집행 중단'}</S.ActionButton></S.FormActions> : null}
          </S.CampaignItem>
        })}</S.CampaignList>}
        {boost.executionPageInfo.totalPages > 1 ? <AdminPagination ariaLabel="Verified Boost 집행 내역 페이지네이션" page={boost.executionPageInfo.page} totalPages={boost.executionPageInfo.totalPages} hasNext={boost.executionPageInfo.hasNext} disabled={isActionPending || boost.executionState === 'loading'} onPageChange={(nextPage) => void boost.fetchExecutions(nextPage)} /> : null}
      </S.Panel>
    </S.Workspace>
  </Store.Content>{isSelectionOpen && canOpenSelection ? <BoostSelectionDialog products={boost.products} placeIds={boost.profile?.placeIds ?? []} existingPairs={selectedPairs} isBusy={isActionPending} errorMessage={boost.actionErrorMessage} fallbackFocusRef={headingRef} onClose={() => setIsSelectionOpen(false)} onSubmit={async (request) => Boolean(await boost.createSelection(request))} /> : null}
    {pendingStop ? <AppDialog title="Verified Boost 집행 중단" description="중단할 집행 대상을 확인해주세요." isDismissible={!isActionPending} fallbackFocusRef={headingRef} onClose={closeStopDialog}
      footer={<>
        <S.ActionButton type="button" disabled={isActionPending} onClick={closeStopDialog}>돌아가기</S.ActionButton>
        <S.ActionButton type="button" disabled={isActionPending} $variant="danger" onClick={() => void handleStop()}>{isActionPending ? '중단 중' : '집행 중단'}</S.ActionButton>
      </>}>
      <MerchantPlaceIdentitySummary placeId={pendingStop.placeId} identity={identity.places[pendingStop.placeId]} onRetry={identity.retry} disabled={isActionPending} isUnlinked={isUnlinked(pendingStop.placeId)} />
      <S.ReadonlyNotice>위 장소의 Verified Boost 집행을 중단합니다. 중단 후에는 현재 노출 상태가 즉시 변경될 수 있습니다.</S.ReadonlyNotice>
      {boost.actionErrorMessage ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{boost.actionErrorMessage}</Store.Notice> : null}
    </AppDialog> : null}
  </Store.Page>
}

export default MerchantVerifiedBoostPage
