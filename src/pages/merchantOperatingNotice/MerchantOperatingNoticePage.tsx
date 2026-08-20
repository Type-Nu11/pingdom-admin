import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantOperatingNotices } from '../../hooks/useMerchantOperatingNotices'
import type {
  MerchantOperatingNotice,
  MerchantOperatingNoticeRequest,
  MerchantOperatingNoticeSeverity,
  MerchantOperatingNoticeStatus,
  MerchantOperatingNoticeType,
  MerchantOperatingNoticeUpdateRequest,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantOperatingNoticePage.styles'

type StatusFilter = 'ALL' | MerchantOperatingNoticeStatus

const NOTICE_TYPES: Record<MerchantOperatingNoticeType, string> = {
  TEMPORARY_CLOSURE: '임시 휴업',
  HOURS_CHANGE: '영업시간 변경',
  CROWDING: '혼잡 안내',
  REOPENING: '영업 재개',
  GENERAL: '일반 안내',
}

const SEVERITIES: Record<MerchantOperatingNoticeSeverity, string> = {
  INFO: '정보',
  WARNING: '주의',
  CRITICAL: '긴급',
}

const STATUSES: Record<MerchantOperatingNoticeStatus, { label: string; tone: 'scheduled' | 'active' | 'expired' | 'canceled' }> = {
  SCHEDULED: { label: '예약됨', tone: 'scheduled' },
  ACTIVE: { label: '노출 중', tone: 'active' },
  EXPIRED: { label: '만료됨', tone: 'expired' },
  CANCELED: { label: '취소됨', tone: 'canceled' },
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toPickerValue(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function NoticeEditor({
  notice,
  placeIds,
  selectedPlaceId,
  activeAction,
  onCreate,
  onUpdate,
  onRequestCancel,
}: {
  notice: MerchantOperatingNotice | null
  placeIds: number[]
  selectedPlaceId: number | null
  activeAction: ReturnType<typeof useMerchantOperatingNotices>['activeAction']
  onCreate: (request: MerchantOperatingNoticeRequest) => Promise<MerchantOperatingNotice | null>
  onUpdate: (noticeId: number, request: MerchantOperatingNoticeUpdateRequest) => Promise<MerchantOperatingNotice | null>
  onRequestCancel: (notice: MerchantOperatingNotice) => void
}) {
  const editable = !notice || notice.status === 'SCHEDULED' || notice.status === 'ACTIVE'
  const [noticeType, setNoticeType] = useState<MerchantOperatingNoticeType>(notice?.noticeType ?? 'GENERAL')
  const [severity, setSeverity] = useState<MerchantOperatingNoticeSeverity>(notice?.severity ?? 'INFO')
  const [message, setMessage] = useState(notice?.message ?? '')
  const [startsAt, setStartsAt] = useState(notice ? toPickerValue(notice.startsAt) : '')
  const [expiresAt, setExpiresAt] = useState(notice ? toPickerValue(notice.expiresAt) : '')
  const [formError, setFormError] = useState('')
  const isBusy = activeAction !== null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editable || !selectedPlaceId) return
    if (!message.trim()) {
      setFormError('방문자에게 보여줄 공지 내용을 입력해주세요.')
      return
    }

    if (notice) {
      const next = await onUpdate(notice.id, { severity, message: message.trim() })
      if (next) setFormError('')
      return
    }

    if (!startsAt || !expiresAt) {
      setFormError('노출 시작·종료 일시를 모두 선택해주세요.')
      return
    }
    const startDate = new Date(startsAt)
    const expireDate = new Date(expiresAt)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(expireDate.getTime()) || startDate >= expireDate) {
      setFormError('종료 일시는 시작 일시보다 늦어야 합니다.')
      return
    }

    const next = await onCreate({
      noticeType,
      severity,
      message: message.trim(),
      startsAt: startDate.toISOString(),
      expiresAt: expireDate.toISOString(),
    })
    if (next) setFormError('')
  }

  return <S.Editor>
    {notice && !editable ? <S.ReadonlyNotice>{notice.status === 'EXPIRED' ? '만료된 공지는 조회만 할 수 있습니다.' : '취소된 공지는 조회만 할 수 있습니다.'}</S.ReadonlyNotice> : null}
    <S.Form onSubmit={submit}>
      <S.Field>연결 장소
        <S.Select value={selectedPlaceId ?? ''} disabled>
          {placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}
        </S.Select>
      </S.Field>
      <S.Field>공지 유형
        <S.Select value={noticeType} disabled={Boolean(notice) || !editable || isBusy} onChange={(event) => setNoticeType(event.target.value as MerchantOperatingNoticeType)}>
          {Object.entries(NOTICE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </S.Select>
      </S.Field>
      <S.Field>중요도
        <S.Select value={severity} disabled={!editable || isBusy} onChange={(event) => setSeverity(event.target.value as MerchantOperatingNoticeSeverity)}>
          {Object.entries(SEVERITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </S.Select>
      </S.Field>
      <S.Field $wide>공지 내용
        <S.Textarea value={message} maxLength={1000} disabled={!editable || isBusy} placeholder="예: 오늘 시설 점검으로 오후 3시까지 임시 휴업합니다." onChange={(event) => { setMessage(event.target.value); setFormError('') }} />
        <S.FieldHint>{message.length}/1000</S.FieldHint>
      </S.Field>
      {notice ? <S.ScheduleText>노출 기간: {formatDateTime(notice.startsAt)} - {formatDateTime(notice.expiresAt)}</S.ScheduleText> : <>
        <S.Field>노출 시작 일시 *
          <AdminDateTimePicker ariaLabel="운영 공지 노출 시작 일시" value={startsAt} disabled={isBusy} onChange={(value) => { setStartsAt(value); setFormError('') }} />
        </S.Field>
        <S.Field>노출 종료 일시 *
          <AdminDateTimePicker ariaLabel="운영 공지 노출 종료 일시" value={expiresAt} disabled={isBusy} onChange={(value) => { setExpiresAt(value); setFormError('') }} />
        </S.Field>
      </>}
      {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
      <S.FormActions>
        {editable ? <S.ActionButton type="submit" disabled={isBusy} $variant="primary">{activeAction === 'create' || activeAction === 'update' ? '저장 중' : notice ? '공지 저장' : '공지 등록'}</S.ActionButton> : null}
        {notice && editable ? <S.ActionButton type="button" disabled={isBusy} $variant="danger" onClick={() => onRequestCancel(notice)}>공지 취소</S.ActionButton> : null}
      </S.FormActions>
    </S.Form>
  </S.Editor>
}

function CancelDialog({
  notice,
  isBusy,
  onClose,
  onCancel,
}: {
  notice: MerchantOperatingNotice
  isBusy: boolean
  onClose: () => void
  onCancel: (noticeId: number, cancelReason: string) => Promise<MerchantOperatingNotice | null>
}) {
  const [cancelReason, setCancelReason] = useState('')
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cancelReason.trim()) {
      setFormError('공지 취소 사유를 입력해주세요.')
      return
    }
    const next = await onCancel(notice.id, cancelReason.trim())
    if (next) onClose()
  }

  return <S.ModalOverlay role="presentation" onMouseDown={() => !isBusy && onClose()}><S.Modal role="dialog" aria-modal="true" aria-labelledby="merchant-notice-cancel-title" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="merchant-notice-cancel-title">운영 공지 취소</S.ModalTitle><S.PanelDescription>취소한 공지는 즉시 방문자에게 노출되지 않습니다.</S.PanelDescription></div><S.CloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={onClose}>close</S.CloseButton></S.ModalHeader><S.ModalBody><S.Form onSubmit={submit}><S.Field $wide>취소 사유<S.Textarea value={cancelReason} maxLength={500} disabled={isBusy} placeholder="예: 영업시간 변경 계획이 취소되었습니다." onChange={(event) => { setCancelReason(event.target.value); setFormError('') }} /><S.FieldHint>{cancelReason.length}/500</S.FieldHint></S.Field>{formError ? <S.FormError role="alert">{formError}</S.FormError> : null}<S.FormActions><S.ActionButton type="button" disabled={isBusy} onClick={onClose}>돌아가기</S.ActionButton><S.ActionButton type="submit" disabled={isBusy} $variant="danger">{isBusy ? '취소 중' : '공지 취소'}</S.ActionButton></S.FormActions></S.Form></S.ModalBody></S.Modal></S.ModalOverlay>
}

function MerchantOperatingNoticePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const notices = useMerchantOperatingNotices()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [cancelTarget, setCancelTarget] = useState<MerchantOperatingNotice | null>(null)
  const selectedNotice = notices.notices.find((notice) => notice.id === selectedId) ?? null
  const visibleNotices = useMemo(
    () => notices.notices.filter((notice) => statusFilter === 'ALL' || notice.status === statusFilter),
    [notices.notices, statusFilter]
  )
  const isBusy = notices.activeAction !== null

  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }
  const handleCreate = () => setSelectedId(null)
  const handleCancel = async (noticeId: number, cancelReason: string) => {
    const next = await notices.cancelNotice(noticeId, { cancelReason })
    if (next) setSelectedId(next.id)
    return next
  }

  if (notices.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>운영 공지 관리</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{notices.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void notices.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{notices.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>운영 공지 관리</Store.PageTitle><Store.PageDescription>임시 휴업, 영업시간 변경처럼 방문 전 알아야 할 운영 정보를 기간에 맞춰 안내합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" onClick={() => navigate('/merchant')}>내 가게 관리</S.HeaderButton><S.HeaderButton type="button" disabled={notices.status === 'loading' || isBusy || !notices.selectedPlaceId} onClick={() => notices.selectedPlaceId && void notices.fetchNotices(notices.selectedPlaceId)}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {notices.profile && notices.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="운영 공지를 관리할 장소 선택" value={notices.selectedPlaceId ?? ''} onChange={(event) => notices.selectPlace(Number(event.target.value))}>{notices.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
    {notices.selectedPlaceId ? <S.NoticeSummary $operating={notices.currentlyOperating}><S.SummaryIcon aria-hidden="true">storefront</S.SummaryIcon><span><strong>{notices.currentlyOperating === false ? '현재 휴업 상태입니다.' : '현재 영업 상태입니다.'}</strong> 이 장소에 연결된 운영 공지는 방문자에게 노출 기간에 따라 표시됩니다.</span></S.NoticeSummary> : null}
    {notices.errorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{notices.errorMessage}</Store.Notice> : null}
    {notices.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{notices.actionErrorMessage}</Store.Notice> : null}
    {notices.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{notices.successMessage}</Store.Notice> : null}
    {notices.status === 'loading' ? <Store.LoadingSummary aria-label="운영 공지를 불러오는 중"><Store.Skeleton $height={400} /><Store.Skeleton $height={400} /></Store.LoadingSummary> : !notices.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">add_business</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소를 연결해주세요.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>장소 연결이 완료되면 방문자에게 보여줄 운영 공지를 등록할 수 있습니다.</Store.EmptyStoreDescription></div></Store.EmptyStoreState> : <S.Workspace><S.Panel><S.PanelHeader><div><S.PanelTitle>운영 공지 목록</S.PanelTitle><S.PanelDescription>노출 상태와 기간을 빠르게 확인하세요.</S.PanelDescription></div><S.CreateButton type="button" disabled={isBusy || notices.isListLoading} onClick={handleCreate}>새 공지</S.CreateButton></S.PanelHeader><S.FilterBar aria-label="운영 공지 상태 필터">{([['ALL', '전체'], ['ACTIVE', '노출 중'], ['SCHEDULED', '예약됨'], ['EXPIRED', '만료됨'], ['CANCELED', '취소됨']] as const).map(([value, label]) => <S.FilterButton key={value} type="button" disabled={isBusy || notices.isListLoading} $selected={statusFilter === value} onClick={() => setStatusFilter(value)}>{label}</S.FilterButton>)}</S.FilterBar><S.ResultMeta>총 {visibleNotices.length}건</S.ResultMeta>{notices.isListLoading ? <S.ListLoading><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /><Store.Skeleton $height={74} /></S.ListLoading> : visibleNotices.length === 0 ? <S.Empty>{statusFilter === 'ALL' ? '등록된 운영 공지가 없습니다. 필요한 안내를 새로 등록해보세요.' : '선택한 상태의 운영 공지가 없습니다.'}</S.Empty> : <S.NoticeList>{visibleNotices.map((notice) => <S.NoticeItem type="button" key={notice.id} $selected={notice.id === selectedId} onClick={() => setSelectedId(notice.id)}><S.NoticeTop><S.NoticeMessage title={notice.message}>{notice.message}</S.NoticeMessage><S.StatusBadge $tone={STATUSES[notice.status].tone}>{STATUSES[notice.status].label}</S.StatusBadge></S.NoticeTop><S.NoticeMeta>{NOTICE_TYPES[notice.noticeType]} · {SEVERITIES[notice.severity]} · {formatDateTime(notice.startsAt)} - {formatDateTime(notice.expiresAt)}</S.NoticeMeta></S.NoticeItem>)}</S.NoticeList>}</S.Panel><S.Panel><S.PanelHeader><div><S.PanelTitle>{selectedNotice ? '운영 공지 상세' : '새 운영 공지'}</S.PanelTitle><S.PanelDescription>{selectedNotice ? '공지 내용과 중요도를 수정하거나 노출을 취소할 수 있습니다.' : '방문자에게 노출할 공지와 기간을 등록합니다.'}</S.PanelDescription></div></S.PanelHeader><NoticeEditor key={selectedNotice?.id ?? 'new'} notice={selectedNotice} placeIds={notices.profile?.placeIds ?? []} selectedPlaceId={notices.selectedPlaceId} activeAction={notices.activeAction} onCreate={async (request) => { const next = await notices.createNotice(request); if (next) setSelectedId(next.id); return next }} onUpdate={notices.updateNotice} onRequestCancel={setCancelTarget} /></S.Panel></S.Workspace>}
    {cancelTarget ? <CancelDialog notice={cancelTarget} isBusy={isBusy} onClose={() => setCancelTarget(null)} onCancel={handleCancel} /> : null}
  </Store.Content></Store.Page>
}

export default MerchantOperatingNoticePage
