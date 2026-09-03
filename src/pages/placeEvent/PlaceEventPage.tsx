import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminPlaceEvents } from '../../hooks/useAdminPlaceEvents'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminPlaceEventListItem,
  AdminPlaceEventPublicationStatus,
  AdminPlaceEventRequest,
  AdminPlaceEventScheduleStatus,
  AdminPlaceEventType,
} from '../../types/adminPlaceEvent.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; event: AdminPlaceEventListItem }
  | { type: 'publish'; event: AdminPlaceEventListItem }
  | { type: 'cancel'; event: AdminPlaceEventListItem }
  | null

const EVENT_TYPES: Record<AdminPlaceEventType, string> = {
  POP_UP: '팝업',
  PERFORMANCE: '공연',
  EXHIBITION: '전시',
}

const PUBLICATION_STATUS: Record<AdminPlaceEventPublicationStatus, string> = {
  DRAFT: '초안',
  PUBLISHED: '공개',
  CANCELLED: '취소',
}

const SCHEDULE_STATUS: Record<AdminPlaceEventScheduleStatus, string> = {
  UPCOMING: '예정',
  ONGOING: '진행 중',
  ENDED: '종료',
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

function toDateTimeValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16)
  }

  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function statusTone(status: AdminPlaceEventPublicationStatus) {
  if (status === 'PUBLISHED') return 'success' as const
  if (status === 'CANCELLED') return 'danger' as const
  return 'warning' as const
}

function PlaceEventPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminPlaceEvents()
  const [keyword, setKeyword] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [eventType, setEventType] = useState<AdminPlaceEventType | ''>('')
  const [publicationStatus, setPublicationStatus] =
    useState<AdminPlaceEventPublicationStatus | ''>('')
  const [scheduleStatus, setScheduleStatus] = useState<AdminPlaceEventScheduleStatus | ''>('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [formPlaceId, setFormPlaceId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formEventType, setFormEventType] = useState<AdminPlaceEventType>('POP_UP')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const isBusy = hook.activeAction !== null

  const clearForm = () => {
    setFormPlaceId('')
    setTitle('')
    setDescription('')
    setFormEventType('POP_UP')
    setStartAt('')
    setEndAt('')
    setReason('')
    setFormError('')
  }

  const openCreate = () => {
    clearForm()
    setDialog({ type: 'create' })
  }

  const openEdit = (event: AdminPlaceEventListItem) => {
    setFormPlaceId(String(event.placeId))
    setTitle(event.title)
    setDescription(event.description || '')
    setFormEventType(event.eventType)
    setStartAt(toDateTimeValue(event.startAt))
    setEndAt(toDateTimeValue(event.endAt))
    setReason('')
    setFormError('')
    setDialog({ type: 'edit', event })
  }

  const openAction = (type: 'publish' | 'cancel', event: AdminPlaceEventListItem) => {
    setReason('')
    setFormError('')
    setDialog({ type, event })
  }

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericPlaceId = placeId.trim() ? Number(placeId) : undefined

    if (placeId.trim() && (!Number.isSafeInteger(numericPlaceId) || numericPlaceId! < 1)) {
      setFormError('장소 ID는 1 이상의 정수로 입력해주세요.')
      return
    }

    setFormError('')
    void hook.fetchEvents({
      page: 1,
      limit: 10,
      keyword: keyword.trim() || undefined,
      placeId: numericPlaceId,
      eventType: eventType || undefined,
      publicationStatus: publicationStatus || undefined,
      scheduleStatus: scheduleStatus || undefined,
    })
  }

  const resetSearch = () => {
    setKeyword('')
    setPlaceId('')
    setEventType('')
    setPublicationStatus('')
    setScheduleStatus('')
    setFormError('')
    void hook.fetchEvents({ page: 1, limit: 10 })
  }

  const buildRequest = (): AdminPlaceEventRequest | null => {
    const numericPlaceId = Number(formPlaceId)

    if (!Number.isSafeInteger(numericPlaceId) || numericPlaceId < 1) {
      setFormError('장소 ID는 1 이상의 정수로 입력해주세요.')
      return null
    }

    if (!title.trim()) {
      setFormError('이벤트 제목을 입력해주세요.')
      return null
    }

    if (!startAt || !endAt) {
      setFormError('시작 일시와 종료 일시를 모두 선택해주세요.')
      return null
    }

    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      setFormError('종료 일시는 시작 일시보다 늦어야 합니다.')
      return null
    }

    if (!reason.trim()) {
      setFormError('처리 사유를 입력해주세요.')
      return null
    }

    return {
      placeId: numericPlaceId,
      title: title.trim(),
      description: description.trim() || undefined,
      eventType: formEventType,
      startAt,
      endAt,
      reason: reason.trim(),
    }
  }

  const submitDialog = async () => {
    if (!dialog || isBusy) return

    if (dialog.type === 'create' || dialog.type === 'edit') {
      const request = buildRequest()
      if (!request) return

      const result =
        dialog.type === 'create'
          ? await hook.createEvent(request)
          : await hook.updateEvent(dialog.event.eventId, request)

      if (result) setDialog(null)
      return
    }

    if (!reason.trim()) {
      setFormError('처리 사유를 입력해주세요.')
      return
    }

    const result =
      dialog.type === 'publish'
        ? await hook.publishEvent(dialog.event.eventId, { reason: reason.trim() })
        : await hook.cancelEvent(dialog.event.eventId, { reason: reason.trim() })

    if (result) setDialog(null)
  }

  const dialogTitle =
    dialog?.type === 'create'
      ? '기간형 이벤트 등록'
      : dialog?.type === 'edit'
        ? '기간형 이벤트 수정'
        : dialog?.type === 'publish'
          ? '이벤트 공개 확인'
          : '이벤트 취소 확인'

  const dialogSubmitLabel =
    dialog?.type === 'create'
      ? '초안 등록'
      : dialog?.type === 'edit'
        ? '수정 저장'
        : dialog?.type === 'publish'
          ? '공개 확정'
          : '취소 확정'

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </Shell.BrandLockup>
        </Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile>
            <Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon>
            <Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}>
            <Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span>
          </Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>기간형 이벤트 관리</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton type="button" aria-label="목록 새로고침" disabled={hook.isLoading || isBusy} onClick={() => void hook.fetchEvents(hook.query)}>
              <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
            </Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>장소 관리 &gt; 기간형 이벤트</Shared.Eyebrow>
                <Shared.PageTitle>기간형 이벤트 관리</Shared.PageTitle>
                <Shared.PageDescription>장소에 연결된 팝업, 공연, 전시 일정을 초안부터 공개와 취소까지 관리합니다.</Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton>
                <Shared.PrimaryButton type="button" disabled={isBusy} onClick={openCreate}>이벤트 등록</Shared.PrimaryButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>

            <S.SearchBar onSubmit={submitSearch}>
              <S.SearchFilterGrid>
                <S.Field>검색어<S.Input value={keyword} placeholder="이벤트명 또는 장소명" disabled={isBusy} onChange={(event) => setKeyword(event.target.value)} /></S.Field>
                <S.Field>장소 ID<S.Input inputMode="numeric" value={placeId} placeholder="전체" disabled={isBusy} onChange={(event) => setPlaceId(event.target.value)} /></S.Field>
                <S.Field>이벤트 유형<AdminSelect aria-label="이벤트 유형" width="100%" value={eventType} disabled={isBusy} onChange={(event) => setEventType(event.target.value as AdminPlaceEventType | '')}><option value="">전체</option>{Object.entries(EVENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field>
                <S.Field>공개 상태<AdminSelect aria-label="공개 상태" width="100%" value={publicationStatus} disabled={isBusy} onChange={(event) => setPublicationStatus(event.target.value as AdminPlaceEventPublicationStatus | '')}><option value="">전체</option>{Object.entries(PUBLICATION_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field>
                <S.Field>일정 상태<AdminSelect aria-label="일정 상태" width="100%" value={scheduleStatus} disabled={isBusy} onChange={(event) => setScheduleStatus(event.target.value as AdminPlaceEventScheduleStatus | '')}><option value="">전체</option>{Object.entries(SCHEDULE_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field>
                <S.SearchFilterActions><Shared.SecondaryButton type="button" disabled={hook.isLoading || isBusy} onClick={resetSearch}>초기화</Shared.SecondaryButton><Shared.PrimaryButton type="submit" disabled={hook.isLoading || isBusy}>{hook.isLoading ? '조회 중' : '조회'}</Shared.PrimaryButton></S.SearchFilterActions>
              </S.SearchFilterGrid>
            </S.SearchBar>

            {formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}
            {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
            {hook.actionErrorMessage ? <Shared.Notice $variant="error">{hook.actionErrorMessage}</Shared.Notice> : null}
            {hook.successMessage ? <Shared.Notice $variant="success">{hook.successMessage}</Shared.Notice> : null}

            <Shared.Workspace>
              <Shared.Panel>
                <Shared.PanelHeader>
                  <div><Shared.PanelTitle>이벤트 목록</Shared.PanelTitle><Shared.PanelDescription>이벤트를 선택하면 일정과 운영 상태를 확인할 수 있습니다.</Shared.PanelDescription></div>
                  <Shared.PanelCount>{hook.totalCount.toLocaleString()}건</Shared.PanelCount>
                </Shared.PanelHeader>
                <Shared.ScrollArea>
                  {hook.isLoading && hook.events.length === 0 ? <Shared.EmptyState><strong>기간형 이벤트를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.errorMessage && hook.events.length === 0 ? <Shared.EmptyState><strong>이벤트 목록을 불러오지 못했습니다.</strong><span>잠시 후 새로고침하거나 서버 상태를 확인해주세요.</span></Shared.EmptyState> : hook.events.length === 0 ? <Shared.EmptyState><strong>조건에 맞는 이벤트가 없습니다.</strong></Shared.EmptyState> : <S.CardList>
                    {hook.events.map((item) => <S.RecordButton key={item.eventId} type="button" $selected={hook.selectedEvent?.eventId === item.eventId} onClick={() => void hook.fetchEvent(item.eventId)}>
                      <S.RecordHeader><div><S.RecordTitle title={item.title}>{item.title}</S.RecordTitle><S.RecordMeta title={item.placeAddress}>{item.placeName} · 장소 #{item.placeId}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(item.publicationStatus)}>{PUBLICATION_STATUS[item.publicationStatus]}</S.StatusBadge></S.RecordHeader>
                      <S.RecordDescription>{EVENT_TYPES[item.eventType]} · {SCHEDULE_STATUS[item.scheduleStatus]} · {formatDate(item.startAt)} ~ {formatDate(item.endAt)}</S.RecordDescription>
                    </S.RecordButton>)}
                  </S.CardList>}
                </Shared.ScrollArea>
                {hook.totalPages > 1 ? <AdminPagination ariaLabel="기간형 이벤트 목록 페이지네이션" page={hook.page} totalPages={hook.totalPages} hasNext={hook.hasNext} disabled={hook.isLoading} onPageChange={(nextPage) => void hook.fetchEvents({ ...hook.query, page: nextPage })} /> : null}
              </Shared.Panel>

              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>이벤트 상세</Shared.PanelTitle><Shared.PanelDescription>공개 전 초안을 수정하고, 검토 후 공개 또는 취소합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
                <Shared.CompareBody>
                  {hook.isDetailLoading ? <Shared.EmptyState><strong>이벤트 상세를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.detailErrorMessage ? <Shared.EmptyState><strong>{hook.detailErrorMessage}</strong></Shared.EmptyState> : !hook.selectedEvent ? <Shared.EmptyState><strong>이벤트를 선택해주세요.</strong><span>목록에서 이벤트를 선택하면 장소와 일정 정보를 표시합니다.</span></Shared.EmptyState> : <>
                    <S.RecordHeader><div><S.RecordTitle>{hook.selectedEvent.title}</S.RecordTitle><S.RecordMeta>이벤트 #{hook.selectedEvent.eventId} · 장소 #{hook.selectedEvent.placeId}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(hook.selectedEvent.publicationStatus)}>{PUBLICATION_STATUS[hook.selectedEvent.publicationStatus]}</S.StatusBadge></S.RecordHeader>
                    {hook.selectedEvent.description ? <S.RecordDescription>{hook.selectedEvent.description}</S.RecordDescription> : <S.RecordDescription>등록된 상세 설명이 없습니다.</S.RecordDescription>}
                    <S.DetailGrid>
                      <S.DetailItem><dt>장소</dt><dd>{hook.selectedEvent.placeName}</dd></S.DetailItem>
                      <S.DetailItem><dt>이벤트 유형</dt><dd>{EVENT_TYPES[hook.selectedEvent.eventType]}</dd></S.DetailItem>
                      <S.DetailItem><dt>장소 주소</dt><dd>{hook.selectedEvent.placeAddress}</dd></S.DetailItem>
                      <S.DetailItem><dt>일정 상태</dt><dd>{SCHEDULE_STATUS[hook.selectedEvent.scheduleStatus]}</dd></S.DetailItem>
                      <S.DetailItem><dt>시작 일시</dt><dd>{formatDate(hook.selectedEvent.startAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>종료 일시</dt><dd>{formatDate(hook.selectedEvent.endAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>생성 일시</dt><dd>{formatDate(hook.selectedEvent.createdAt)}</dd></S.DetailItem>
                      <S.DetailItem><dt>수정 일시</dt><dd>{formatDate(hook.selectedEvent.updatedAt)}</dd></S.DetailItem>
                    </S.DetailGrid>
                    <S.Section>
                      <S.SectionHeader><S.SectionTitle>운영 작업</S.SectionTitle></S.SectionHeader>
                      <S.RecordDescription>공개와 취소 작업에는 운영 이력을 남길 사유 입력이 필요합니다.</S.RecordDescription>
                      <S.InlineActions>
                        {hook.selectedEvent.publicationStatus === 'DRAFT' ? <><Shared.SecondaryButton type="button" disabled={isBusy} onClick={() => openEdit(hook.selectedEvent!)}>수정</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={isBusy || hook.selectedEvent.scheduleStatus === 'ENDED'} onClick={() => openAction('publish', hook.selectedEvent!)}>공개</Shared.PrimaryButton></> : null}
                        {hook.selectedEvent.publicationStatus !== 'CANCELLED' ? <Shared.SecondaryButton type="button" disabled={isBusy} onClick={() => openAction('cancel', hook.selectedEvent!)}>이벤트 취소</Shared.SecondaryButton> : null}
                      </S.InlineActions>
                    </S.Section>
                  </>}
                </Shared.CompareBody>
              </Shared.Panel>
            </Shared.Workspace>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>

      {dialog ? <Shared.ModalOverlay role="presentation" onMouseDown={() => !isBusy && setDialog(null)}>
        <Shared.Modal role="dialog" aria-modal="true" aria-labelledby="place-event-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
          <Shared.ModalHeader><Shared.ModalTitle id="place-event-dialog-title">{dialogTitle}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={() => setDialog(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader>
          <Shared.ModalBody>
            {dialog.type === 'create' || dialog.type === 'edit' ? <S.FormGrid>
              <S.Field>장소 ID *<S.Input inputMode="numeric" value={formPlaceId} disabled={isBusy || dialog.type === 'edit'} placeholder="예: 42" onChange={(event) => { setFormPlaceId(event.target.value); setFormError('') }} /></S.Field>
              <S.Field>이벤트 유형 *<AdminSelect aria-label="등록 이벤트 유형" width="100%" value={formEventType} disabled={isBusy} onChange={(event) => { setFormEventType(event.target.value as AdminPlaceEventType); setFormError('') }}>{Object.entries(EVENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field>
              <S.WideField>이벤트 제목 *<S.Input maxLength={150} value={title} disabled={isBusy} onChange={(event) => { setTitle(event.target.value); setFormError('') }} /><small>{title.length}/150</small></S.WideField>
              <S.Field>시작 일시 *<AdminDateTimePicker ariaLabel="이벤트 시작 일시" value={startAt} disabled={isBusy} onChange={(value) => { setStartAt(value); setFormError('') }} /></S.Field>
              <S.Field>종료 일시 *<AdminDateTimePicker ariaLabel="이벤트 종료 일시" value={endAt} disabled={isBusy} onChange={(value) => { setEndAt(value); setFormError('') }} /></S.Field>
              <S.WideField>상세 설명<S.TextArea maxLength={1000} value={description} disabled={isBusy} onChange={(event) => { setDescription(event.target.value); setFormError('') }} /><small>{description.length}/1000</small></S.WideField>
              <S.WideField>처리 사유 *<S.TextArea maxLength={500} value={reason} disabled={isBusy} placeholder="등록 또는 수정이 필요한 운영 사유를 입력해주세요." onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></S.WideField>
            </S.FormGrid> : <>
              <Shared.ModalWarning>{dialog.type === 'publish' ? `${dialog.event.title} 이벤트를 공개하면 앱 탐색 화면에 노출될 수 있습니다.` : `${dialog.event.title} 이벤트를 취소하면 앱 탐색 노출에서 제외됩니다.`}</Shared.ModalWarning>
              <S.Section><S.Field>처리 사유 *<S.TextArea maxLength={500} value={reason} disabled={isBusy} placeholder="처리 근거를 입력해주세요." onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></S.Field></S.Section>
            </>}
            {formError || hook.actionErrorMessage ? <Shared.Notice $variant="error">{formError || hook.actionErrorMessage}</Shared.Notice> : null}
          </Shared.ModalBody>
          <Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={isBusy} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={isBusy} onClick={() => void submitDialog()}>{isBusy ? '처리 중' : dialogSubmitLabel}</Shared.PrimaryButton></Shared.ModalFooter>
        </Shared.Modal>
      </Shared.ModalOverlay> : null}
    </Shell.AppShell>
  )
}

export default PlaceEventPage
