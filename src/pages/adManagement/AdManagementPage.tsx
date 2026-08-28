import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminAds } from '../../hooks/useAdminAds'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminAdCreateRequest,
  AdminAdDisplayStatus,
} from '../../types/adminAd.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'
import * as A from './AdManagementPage.styles'

type Dialog = 'create' | 'delete' | null

const STATUS: Record<AdminAdDisplayStatus, string> = {
  SCHEDULED: '예약',
  ACTIVE: '노출 중',
  EXPIRED: '종료',
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function statusTone(status: AdminAdDisplayStatus) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'EXPIRED') return 'danger' as const
  return 'warning' as const
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function AdManagementPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminAds()
  const [keyword, setKeyword] = useState('')
  const [displayStatus, setDisplayStatus] = useState<AdminAdDisplayStatus | ''>('')
  const [startedFrom, setStartedFrom] = useState('')
  const [startedTo, setStartedTo] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [formError, setFormError] = useState('')
  const [imageFailedAdId, setImageFailedAdId] = useState<number | null>(null)
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const isBusy = hook.activeAction !== null

  const clearCreateForm = () => {
    setTitle('')
    setImageUrl('')
    setRedirectUrl('')
    setStartAt('')
    setEndAt('')
    setFormError('')
  }

  const openCreate = () => {
    clearCreateForm()
    setDialog('create')
  }

  const openDelete = () => {
    setDeleteConfirmation('')
    setFormError('')
    setDialog('delete')
  }

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (startedFrom && startedTo && new Date(startedFrom).getTime() > new Date(startedTo).getTime()) {
      setFormError('조회 종료 시각은 시작 시각보다 늦어야 합니다.')
      return
    }

    setFormError('')
    hook.clearSelectedAd()
    void hook.fetchAds({
      page: 1,
      limit: 10,
      keyword: keyword.trim() || undefined,
      displayStatus: displayStatus || undefined,
      startedFrom: startedFrom || undefined,
      startedTo: startedTo || undefined,
    })
  }

  const resetSearch = () => {
    setKeyword('')
    setDisplayStatus('')
    setStartedFrom('')
    setStartedTo('')
    setFormError('')
    hook.clearSelectedAd()
    void hook.fetchAds({ page: 1, limit: 10 })
  }

  const createRequest = (): AdminAdCreateRequest | null => {
    if (!title.trim()) {
      setFormError('광고 제목을 입력해주세요.')
      return null
    }

    if (!isHttpUrl(imageUrl.trim())) {
      setFormError('배너 이미지 URL은 http 또는 https 주소여야 합니다.')
      return null
    }

    if (!isHttpUrl(redirectUrl.trim())) {
      setFormError('이동 URL은 http 또는 https 주소여야 합니다.')
      return null
    }

    if (!startAt || !endAt) {
      setFormError('노출 시작과 종료 일시를 모두 선택해주세요.')
      return null
    }

    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      setFormError('노출 종료 시각은 시작 시각보다 늦어야 합니다.')
      return null
    }

    return {
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      redirectUrl: redirectUrl.trim(),
      startAt,
      endAt,
    }
  }

  const submitDialog = async () => {
    if (!dialog || isBusy) return

    if (dialog === 'create') {
      const request = createRequest()
      if (!request) return
      if (await hook.createAd(request)) setDialog(null)
      return
    }

    if (!hook.selectedAd) return

    if (deleteConfirmation !== hook.selectedAd.title) {
      setFormError('삭제할 광고 제목을 정확히 입력해주세요.')
      return
    }

    if (await hook.deleteAd(hook.selectedAd.adId)) setDialog(null)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>광고 관리</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || isBusy} onClick={() => void hook.fetchAds(hook.query)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div><Shared.Eyebrow>운영 시스템 &gt; 광고</Shared.Eyebrow><Shared.PageTitle>광고 관리</Shared.PageTitle><Shared.PageDescription>앱에 노출되는 배너 광고의 기간과 연결 주소를 등록하고, 노출 상태를 확인합니다.</Shared.PageDescription></div>
              <Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/recommendations/metrics')}>추천 성과</Shared.HeaderButton><Shared.PrimaryButton type="button" disabled={isBusy} onClick={openCreate}>광고 등록</Shared.PrimaryButton></Shared.HeaderActions>
            </Shared.PageHeader>

            <S.SearchBar onSubmit={submitSearch}>
              <S.Field>검색어<S.Input value={keyword} disabled={isBusy} placeholder="광고 제목 검색" onChange={(event) => setKeyword(event.target.value)} /></S.Field>
              <S.Field>노출 상태<AdminSelect aria-label="노출 상태" width="100%" value={displayStatus} disabled={isBusy} onChange={(event) => setDisplayStatus(event.target.value as AdminAdDisplayStatus | '')}><option value="">전체</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field>
              <S.Field>노출 시작<AdminDateTimePicker ariaLabel="광고 노출 시작 필터" value={startedFrom} disabled={isBusy} onChange={(value) => { setStartedFrom(value); setFormError('') }} /></S.Field>
              <S.Field>노출 종료<AdminDateTimePicker ariaLabel="광고 노출 종료 필터" value={startedTo} disabled={isBusy} onChange={(value) => { setStartedTo(value); setFormError('') }} /></S.Field>
              <Shared.SecondaryButton type="button" disabled={hook.isLoading || isBusy} onClick={resetSearch}>초기화</Shared.SecondaryButton>
              <Shared.PrimaryButton type="submit" disabled={hook.isLoading || isBusy}>{hook.isLoading ? '조회 중' : '조회'}</Shared.PrimaryButton>
            </S.SearchBar>

            {formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}
            {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
            {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
            {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}

            <Shared.Workspace>
              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>광고 목록</Shared.PanelTitle><Shared.PanelDescription>광고를 선택하면 배너와 연결 주소를 확인할 수 있습니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalCount.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader>
                <Shared.ScrollArea>
                  {hook.isLoading && hook.ads.length === 0 ? <Shared.EmptyState><strong>광고를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.errorMessage && hook.ads.length === 0 ? <Shared.EmptyState><strong>광고 목록을 불러오지 못했습니다.</strong><span>잠시 후 새로고침하거나 서버 상태를 확인해주세요.</span></Shared.EmptyState> : hook.ads.length === 0 ? <Shared.EmptyState><strong>조건에 맞는 광고가 없습니다.</strong></Shared.EmptyState> : <S.CardList>{hook.ads.map((ad) => <S.RecordButton key={ad.adId} type="button" $selected={hook.selectedAd?.adId === ad.adId} onClick={() => { setImageFailedAdId(null); void hook.fetchAd(ad.adId) }}><S.RecordHeader><div><S.RecordTitle title={ad.title}>{ad.title}</S.RecordTitle><S.RecordMeta>광고 #{ad.adId} · {formatDate(ad.createdAt)}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(ad.displayStatus)}>{STATUS[ad.displayStatus]}</S.StatusBadge></S.RecordHeader><S.RecordDescription>{formatDate(ad.startAt)} ~ {formatDate(ad.endAt)}</S.RecordDescription></S.RecordButton>)}</S.CardList>}
                </Shared.ScrollArea>
                {hook.totalPages > 1 ? <S.Pagination><Shared.SecondaryButton type="button" disabled={hook.page <= 1 || hook.isLoading} onClick={() => void hook.fetchAds({ ...hook.query, page: hook.page - 1 })}>이전</Shared.SecondaryButton><span>{Math.max(hook.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => void hook.fetchAds({ ...hook.query, page: hook.page + 1 })}>다음</Shared.SecondaryButton></S.Pagination> : null}
              </Shared.Panel>

              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>광고 상세</Shared.PanelTitle><Shared.PanelDescription>현재 앱 노출 상태와 배너 연결 정보를 검토합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
                <Shared.CompareBody>
                  {hook.isDetailLoading ? <Shared.EmptyState><strong>광고 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong></Shared.EmptyState> : !hook.selectedAd ? <Shared.EmptyState><strong>광고를 선택해주세요.</strong><span>목록에서 광고를 선택하면 배너와 일정 정보가 표시됩니다.</span></Shared.EmptyState> : <>
                    <S.RecordHeader><div><S.RecordTitle>{hook.selectedAd.title}</S.RecordTitle><S.RecordMeta>광고 #{hook.selectedAd.adId}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(hook.selectedAd.displayStatus)}>{STATUS[hook.selectedAd.displayStatus]}</S.StatusBadge></S.RecordHeader>
                    <A.BannerPreview>
                      {imageFailedAdId === hook.selectedAd.adId ? <A.BannerFallback>배너 이미지를 불러오지 못했습니다.</A.BannerFallback> : <A.BannerImage src={hook.selectedAd.imageUrl} alt={`${hook.selectedAd.title} 배너`} referrerPolicy="no-referrer" onError={() => setImageFailedAdId(hook.selectedAd!.adId)} />}
                      <A.BannerCaption><span>배너 이미지</span><A.ExternalLink href={hook.selectedAd.imageUrl} target="_blank" rel="noreferrer">원본 열기</A.ExternalLink></A.BannerCaption>
                    </A.BannerPreview>
                    <S.DetailGrid>
                      <S.DetailItem><dt>노출 시작</dt><dd>{formatDate(hook.selectedAd.startAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>노출 종료</dt><dd>{formatDate(hook.selectedAd.endAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>등록 일시</dt><dd>{formatDate(hook.selectedAd.createdAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>수정 일시</dt><dd>{formatDate(hook.selectedAd.updatedAt)}</dd></S.DetailItem>
                    </S.DetailGrid>
                    <S.Section><S.SectionHeader><S.SectionTitle>연결 주소</S.SectionTitle></S.SectionHeader><S.RecordDescription><A.ExternalLink href={hook.selectedAd.redirectUrl} target="_blank" rel="noreferrer">{hook.selectedAd.redirectUrl}</A.ExternalLink></S.RecordDescription></S.Section>
                    <S.Section><S.SectionHeader><S.SectionTitle>운영 작업</S.SectionTitle></S.SectionHeader><S.RecordDescription>광고 삭제는 되돌릴 수 없습니다. 삭제 후 같은 ID로 복구하거나 수정할 수 없습니다.</S.RecordDescription><S.InlineActions><A.DangerButton type="button" disabled={isBusy} onClick={openDelete}>광고 삭제</A.DangerButton></S.InlineActions></S.Section>
                  </>}
                </Shared.CompareBody>
              </Shared.Panel>
            </Shared.Workspace>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>

      {dialog ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !isBusy && setDialog(null)}>
        <Shared.Modal role="dialog" aria-modal="true" aria-labelledby="ad-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
          <Shared.ModalHeader><Shared.ModalTitle id="ad-dialog-title">{dialog === 'create' ? '광고 등록' : '광고 삭제 확인'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader>
          <Shared.ModalBody>
            {dialog === 'create' ? <S.FormGrid>
              <S.WideField>광고 제목 *<S.Input value={title} maxLength={100} disabled={isBusy} onChange={(event) => { setTitle(event.target.value); setFormError('') }} /><small>{title.length}/100</small></S.WideField>
              <S.WideField>배너 이미지 URL *<S.Input inputMode="url" value={imageUrl} maxLength={500} disabled={isBusy} placeholder="https://cdn.pingdom.com/banner.png" onChange={(event) => { setImageUrl(event.target.value); setFormError('') }} /><small>{imageUrl.length}/500</small></S.WideField>
              <S.WideField>클릭 시 이동 URL *<S.Input inputMode="url" value={redirectUrl} maxLength={500} disabled={isBusy} placeholder="https://pingdom.com/event" onChange={(event) => { setRedirectUrl(event.target.value); setFormError('') }} /><small>{redirectUrl.length}/500</small></S.WideField>
              <S.Field>노출 시작 일시 *<AdminDateTimePicker ariaLabel="광고 노출 시작 일시" value={startAt} disabled={isBusy} onChange={(value) => { setStartAt(value); setFormError('') }} /></S.Field>
              <S.Field>노출 종료 일시 *<AdminDateTimePicker ariaLabel="광고 노출 종료 일시" value={endAt} disabled={isBusy} onChange={(value) => { setEndAt(value); setFormError('') }} /></S.Field>
            </S.FormGrid> : <>
              <Shared.ModalWarning><strong>{hook.selectedAd?.title}</strong> 광고를 삭제합니다. 앱 노출 정보가 즉시 제거되며, 이 작업은 되돌릴 수 없습니다.</Shared.ModalWarning>
              <S.Section><S.Field>광고 제목 재입력 *<S.Input value={deleteConfirmation} disabled={isBusy} placeholder={hook.selectedAd?.title} onChange={(event) => { setDeleteConfirmation(event.target.value); setFormError('') }} /><small>삭제할 광고 제목을 정확히 입력해주세요.</small></S.Field></S.Section>
            </>}
            {formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}
          </Shared.ModalBody>
          <Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={isBusy} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton>{dialog === 'delete' ? <A.DangerButton type="button" disabled={isBusy || deleteConfirmation !== hook.selectedAd?.title} onClick={() => void submitDialog()}>{isBusy ? '삭제 중' : '삭제 확정'}</A.DangerButton> : <Shared.PrimaryButton type="button" disabled={isBusy} onClick={() => void submitDialog()}>{isBusy ? '등록 중' : '등록'}</Shared.PrimaryButton>}</Shared.ModalFooter>
        </Shared.Modal>
      </Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

export default AdManagementPage
