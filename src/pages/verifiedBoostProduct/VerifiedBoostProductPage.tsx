import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminVerifiedBoostProducts } from '../../hooks/useAdminVerifiedBoostProducts'
import { useAuth } from '../../hooks/useAuth'
import type { VerifiedBoostProductStatus } from '../../types/adminVerifiedBoostProduct.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

type Dialog = 'create' | 'activate' | 'deactivate' | null
const STATUS: Record<VerifiedBoostProductStatus, string> = {
  DRAFT: '초안', ACTIVE: '활성', INACTIVE: '비활성',
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function VerifiedBoostProductPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminVerifiedBoostProducts()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priceAmount, setPriceAmount] = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const openCreate = () => { setName(''); setDescription(''); setPriceAmount(''); setDurationDays(''); setFormError(''); setDialog('create') }
  const submit = async () => {
    if (!dialog || hook.activeAction) return
    if (dialog === 'create') {
      const price = Number(priceAmount); const duration = Number(durationDays)
      if (!name.trim() || !description.trim()) { setFormError('상품명과 설명을 입력해주세요.'); return }
      if (!Number.isSafeInteger(price) || price <= 0) { setFormError('가격은 1원 이상의 정수로 입력해주세요.'); return }
      if (!Number.isInteger(duration) || duration < 1 || duration > 365) { setFormError('기간은 1~365일 정수로 입력해주세요.'); return }
      if (await hook.createProduct({ name: name.trim(), description: description.trim(), priceAmount: price, durationDays: duration })) setDialog(null)
      return
    }
    if (!hook.selectedProduct) return
    if (await hook.changeStatus(hook.selectedProduct.id, dialog)) setDialog(null)
  }

  return <Shell.AppShell>
    <Shell.SideNav aria-label="관리자 메뉴"><Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader><Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu><Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter></Shell.SideNav>
    <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}><Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>인증 부스트 상품</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || hook.activeAction !== null} onClick={() => void hook.fetchProducts(hook.page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar><Shared.Content><Shared.PageStack>
      <Shared.PageHeader><div><Shared.Eyebrow>성장 운영 &gt; 인증 부스트</Shared.Eyebrow><Shared.PageTitle>인증 부스트 상품 관리</Shared.PageTitle><Shared.PageDescription>검증된 장소의 추천 노출을 강화하는 상품을 등록하고 판매 상태를 관리합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/recommendations/metrics')}>추천 성과</Shared.HeaderButton><Shared.PrimaryButton type="button" onClick={openCreate}>상품 등록</Shared.PrimaryButton></Shared.HeaderActions></Shared.PageHeader>
      {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}{hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}{hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
      <Shared.Workspace><Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>상품 목록</Shared.PanelTitle><Shared.PanelDescription>등록된 상품을 선택해 상세와 현재 상태를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalElements.toLocaleString()}개</Shared.PanelCount></Shared.PanelHeader><Shared.ScrollArea>{hook.isLoading && hook.products.length === 0 ? <Shared.EmptyState><strong>상품을 불러오는 중입니다.</strong></Shared.EmptyState> : hook.products.length === 0 ? <Shared.EmptyState><strong>등록된 상품이 없습니다.</strong></Shared.EmptyState> : <S.CardList>{hook.products.map((product) => <S.RecordButton key={product.id} type="button" $selected={hook.selectedProduct?.id === product.id} onClick={() => void hook.fetchProduct(product.id)}><S.RecordHeader><S.RecordTitle>{product.name}</S.RecordTitle><S.StatusBadge $tone={product.status === 'ACTIVE' ? 'success' : product.status === 'DRAFT' ? 'warning' : 'danger'}>{STATUS[product.status]}</S.StatusBadge></S.RecordHeader><S.RecordMeta>상품 #{product.id} · {product.durationDays}일</S.RecordMeta><S.RecordDescription>{product.priceAmount.toLocaleString()}원</S.RecordDescription></S.RecordButton>)}</S.CardList>}</Shared.ScrollArea>{hook.totalPages > 1 ? <S.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => void hook.fetchProducts(hook.page - 1)}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => void hook.fetchProducts(hook.page + 1)}>다음</Shared.SecondaryButton></S.Pagination> : null}</Shared.Panel>
        <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>상품 상세</Shared.PanelTitle><Shared.PanelDescription>가격과 판매 기간을 확인한 뒤 상태를 변경합니다.</Shared.PanelDescription></div></Shared.PanelHeader><Shared.CompareBody>{hook.isDetailLoading ? <Shared.EmptyState><strong>상세를 불러오는 중입니다.</strong></Shared.EmptyState> : !hook.selectedProduct ? <Shared.EmptyState><strong>상품을 선택해주세요.</strong></Shared.EmptyState> : <><S.RecordHeader><div><S.RecordTitle>{hook.selectedProduct.name}</S.RecordTitle><S.RecordMeta>상품 #{hook.selectedProduct.id}</S.RecordMeta></div><S.StatusBadge $tone={hook.selectedProduct.status === 'ACTIVE' ? 'success' : hook.selectedProduct.status === 'DRAFT' ? 'warning' : 'danger'}>{STATUS[hook.selectedProduct.status]}</S.StatusBadge></S.RecordHeader><S.RecordDescription>{hook.selectedProduct.description}</S.RecordDescription><S.DetailGrid><S.DetailItem><dt>가격</dt><dd>{hook.selectedProduct.priceAmount.toLocaleString()}원</dd></S.DetailItem><S.DetailItem><dt>유효 기간</dt><dd>{hook.selectedProduct.durationDays}일</dd></S.DetailItem><S.DetailItem><dt>등록일</dt><dd>{formatDate(hook.selectedProduct.createdAt)}</dd></S.DetailItem><S.DetailItem><dt>수정일</dt><dd>{formatDate(hook.selectedProduct.updatedAt)}</dd></S.DetailItem></S.DetailGrid><S.InlineActions>{hook.selectedProduct.status !== 'ACTIVE' ? <Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog('activate')}>활성화</Shared.PrimaryButton> : <Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog('deactivate')}>비활성화</Shared.SecondaryButton>}</S.InlineActions></>}</Shared.CompareBody></Shared.Panel>
      </Shared.Workspace>
    </Shared.PageStack></Shared.Content></Shell.MainArea>
    {dialog ? <Shared.ModalOverlay role="presentation" onMouseDown={() => hook.activeAction === null && setDialog(null)}><Shared.Modal role="dialog" aria-modal="true" aria-labelledby="boost-product-dialog-title" onMouseDown={(event) => event.stopPropagation()}><Shared.ModalHeader><Shared.ModalTitle id="boost-product-dialog-title">{dialog === 'create' ? '인증 부스트 상품 등록' : `상품 ${dialog === 'activate' ? '활성화' : '비활성화'} 확인`}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader><Shared.ModalBody>{dialog === 'create' ? <S.FormGrid><S.Field>상품명 *<S.Input value={name} maxLength={100} onChange={(event) => { setName(event.target.value); setFormError('') }} /></S.Field><S.Field>가격(KRW) *<S.Input type="number" min="1" step="1" value={priceAmount} onChange={(event) => { setPriceAmount(event.target.value); setFormError('') }} /></S.Field><S.Field>기간(일) *<S.Input type="number" min="1" max="365" step="1" value={durationDays} onChange={(event) => { setDurationDays(event.target.value); setFormError('') }} /></S.Field><S.WideField>상품 설명 *<S.TextArea value={description} maxLength={500} onChange={(event) => { setDescription(event.target.value); setFormError('') }} /></S.WideField></S.FormGrid> : <Shared.ModalWarning>{hook.selectedProduct?.name} 상품을 {dialog === 'activate' ? '활성화하면 판매 가능한 상태가 됩니다.' : '비활성화하면 신규 판매 대상에서 제외됩니다.'}</Shared.ModalWarning>}{formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}</Shared.ModalBody><Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={hook.activeAction !== null} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={hook.activeAction !== null} onClick={() => void submit()}>{hook.activeAction ? '처리 중' : dialog === 'create' ? '등록' : '상태 변경'}</Shared.PrimaryButton></Shared.ModalFooter></Shared.Modal></Shared.ModalOverlay> : null}
  </Shell.AppShell>
}

export default VerifiedBoostProductPage
