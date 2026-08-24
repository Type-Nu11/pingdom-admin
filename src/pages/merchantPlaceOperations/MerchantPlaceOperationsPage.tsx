import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDatePicker, AdminTimePicker } from '../../components/common/AdminDateTimePicker'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantPlaceOperations } from '../../hooks/useMerchantPlaceOperations'
import type {
  MerchantPlaceDayOfWeek,
  MerchantPlaceMediaItem,
  MerchantPlaceOperatingException,
  MerchantPlaceOperatingScheduleUpdateRequest,
  MerchantPlaceOperatingStatus,
  MerchantPlaceRegularOperatingHour,
} from '../../types/merchantStore.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantPlaceOperationsPage.styles'

const DAY_OPTIONS: Array<{ value: MerchantPlaceDayOfWeek; label: string }> = [
  { value: 'MONDAY', label: '월요일' },
  { value: 'TUESDAY', label: '화요일' },
  { value: 'WEDNESDAY', label: '수요일' },
  { value: 'THURSDAY', label: '목요일' },
  { value: 'FRIDAY', label: '금요일' },
  { value: 'SATURDAY', label: '토요일' },
  { value: 'SUNDAY', label: '일요일' },
]

const STATUS_OPTIONS: Array<{
  value: MerchantPlaceOperatingStatus
  label: string
  description: string
  danger?: boolean
}> = [
  { value: 'OPERATING', label: '영업 중', description: '방문자에게 정상 운영 중인 장소로 표시합니다.' },
  { value: 'TEMPORARILY_CLOSED', label: '임시 휴업', description: '일시적인 휴업 상태와 운영 공지를 함께 안내합니다.' },
  { value: 'PERMANENTLY_CLOSED', label: '폐업', description: '더 이상 영업하지 않는 장소로 변경합니다.', danger: true },
]

interface TimeDraft {
  id: string
  opensAt: string
  closesAt: string
}

interface RegularDayDraft {
  dayOfWeek: MerchantPlaceDayOfWeek
  hours: TimeDraft[]
}

interface ExceptionDraft {
  id: string
  date: string
  closed: boolean
  hours: TimeDraft[]
}

let draftSequence = 0

function createDraftId() {
  draftSequence += 1
  return `merchant-place-operation-${draftSequence}`
}

function getTimeValue(value: string) {
  return value.match(/^(\d{2}:\d{2})/)?.[1] ?? '09:00'
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function formatDateTime(value: string | null) {
  if (!value) return '확인 시각 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function createRegularHours(hours: MerchantPlaceRegularOperatingHour[] = []): RegularDayDraft[] {
  return DAY_OPTIONS.map(({ value }) => ({
    dayOfWeek: value,
    hours: hours
      .filter((item) => item.dayOfWeek === value)
      .map((item) => ({ id: createDraftId(), opensAt: getTimeValue(item.opensAt), closesAt: getTimeValue(item.closesAt) })),
  }))
}

function createException(exception?: MerchantPlaceOperatingException): ExceptionDraft {
  const hours = (exception?.hours ?? []).map((item) => ({
    id: createDraftId(),
    opensAt: getTimeValue(item.opensAt),
    closesAt: getTimeValue(item.closesAt),
  }))

  return {
    id: createDraftId(),
    date: exception?.date ?? '',
    closed: exception?.closed ?? true,
    hours: exception?.closed || hours.length > 0 ? hours : [{ id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }],
  }
}

function validateTimeRanges(hours: TimeDraft[]) {
  if (hours.some((item) => !item.opensAt || !item.closesAt)) return '시작 시간과 종료 시간을 모두 선택해주세요.'
  const sorted = [...hours].sort((left, right) => left.opensAt.localeCompare(right.opensAt))
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]
    if (current.opensAt >= current.closesAt) return '종료 시간은 시작 시간보다 늦어야 합니다.'
    if (index > 0 && sorted[index - 1].closesAt > current.opensAt) return '같은 날짜 또는 요일의 영업시간은 겹칠 수 없습니다.'
  }
  return ''
}

function ScheduleEditor({
  regularHours: initialRegularHours,
  exceptions: initialExceptions,
  isSaving,
  onSave,
}: {
  regularHours: MerchantPlaceRegularOperatingHour[]
  exceptions: MerchantPlaceOperatingException[]
  isSaving: boolean
  onSave: (request: MerchantPlaceOperatingScheduleUpdateRequest) => Promise<unknown>
}) {
  const [regularHours, setRegularHours] = useState(() => createRegularHours(initialRegularHours))
  const [exceptions, setExceptions] = useState(() => initialExceptions.map(createException))
  const [formError, setFormError] = useState('')

  const updateDay = (dayOfWeek: MerchantPlaceDayOfWeek, enabled: boolean) => {
    setRegularHours((current) => current.map((day) => day.dayOfWeek === dayOfWeek ? {
      ...day,
      hours: enabled ? day.hours.length > 0 ? day.hours : [{ id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }] : [],
    } : day))
  }

  const updateHour = (dayOfWeek: MerchantPlaceDayOfWeek, hourId: string, patch: Partial<TimeDraft>) => {
    setRegularHours((current) => current.map((day) => day.dayOfWeek === dayOfWeek ? {
      ...day,
      hours: day.hours.map((hour) => hour.id === hourId ? { ...hour, ...patch } : hour),
    } : day))
  }

  const updateException = (exceptionId: string, patch: Partial<Pick<ExceptionDraft, 'date' | 'closed'>>) => {
    setExceptions((current) => current.map((exception) => {
      if (exception.id !== exceptionId) return exception
      const next = { ...exception, ...patch }
      if (patch.closed === false && next.hours.length === 0) {
        next.hours = [{ id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }]
      }
      return next
    }))
  }

  const updateExceptionHour = (exceptionId: string, hourId: string, patch: Partial<TimeDraft>) => {
    setExceptions((current) => current.map((exception) => exception.id === exceptionId ? {
      ...exception,
      hours: exception.hours.map((hour) => hour.id === hourId ? { ...hour, ...patch } : hour),
    } : exception))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    for (const day of regularHours) {
      const message = validateTimeRanges(day.hours)
      if (message) {
        setFormError(`${DAY_OPTIONS.find((item) => item.value === day.dayOfWeek)?.label}: ${message}`)
        return
      }
    }

    const dates = new Set<string>()
    for (const exception of exceptions) {
      if (!exception.date) {
        setFormError('예외 일정의 날짜를 선택해주세요.')
        return
      }
      if (dates.has(exception.date)) {
        setFormError('같은 날짜의 예외 일정은 한 번만 등록할 수 있습니다.')
        return
      }
      dates.add(exception.date)
      if (!exception.closed) {
        const message = validateTimeRanges(exception.hours)
        if (message) {
          setFormError(`예외 일정: ${message}`)
          return
        }
      }
    }

    setFormError('')
    await onSave({
      regularHours: regularHours.flatMap((day) => day.hours.map((hour) => ({
        dayOfWeek: day.dayOfWeek,
        opensAt: toApiTime(hour.opensAt),
        closesAt: toApiTime(hour.closesAt),
      }))),
      exceptions: exceptions.map((exception) => ({
        date: exception.date,
        closed: exception.closed,
        hours: exception.closed ? [] : exception.hours.map((hour) => ({
          opensAt: toApiTime(hour.opensAt),
          closesAt: toApiTime(hour.closesAt),
        })),
      })),
    })
  }

  return <S.PanelBody><form onSubmit={submit}>
    <S.ScheduleSection>
      <S.ScheduleSectionHeader><strong>정규 영업시간</strong><span>영업하는 요일을 선택하세요.</span></S.ScheduleSectionHeader>
      <S.WeekList>{regularHours.map((day) => <S.WeekRow key={day.dayOfWeek}>
        <S.CheckLabel><input type="checkbox" checked={day.hours.length > 0} disabled={isSaving} onChange={(event) => updateDay(day.dayOfWeek, event.target.checked)} />{DAY_OPTIONS.find((item) => item.value === day.dayOfWeek)?.label}</S.CheckLabel>
        {day.hours.length > 0 ? <S.HourList>{day.hours.map((hour) => <S.HourRow key={hour.id}><S.TimeControls><AdminTimePicker ariaLabel={`${DAY_OPTIONS.find((item) => item.value === day.dayOfWeek)?.label} 시작 시간`} value={hour.opensAt} disabled={isSaving} onChange={(value) => updateHour(day.dayOfWeek, hour.id, { opensAt: value })} /><span>-</span><AdminTimePicker ariaLabel={`${DAY_OPTIONS.find((item) => item.value === day.dayOfWeek)?.label} 종료 시간`} value={hour.closesAt} disabled={isSaving} onChange={(value) => updateHour(day.dayOfWeek, hour.id, { closesAt: value })} /></S.TimeControls><S.IconButton type="button" aria-label="영업 시간 삭제" disabled={isSaving} onClick={() => setRegularHours((current) => current.map((item) => item.dayOfWeek === day.dayOfWeek ? { ...item, hours: item.hours.filter((itemHour) => itemHour.id !== hour.id) } : item))}>remove</S.IconButton></S.HourRow>)}<S.TextButton type="button" disabled={isSaving} onClick={() => setRegularHours((current) => current.map((item) => item.dayOfWeek === day.dayOfWeek ? { ...item, hours: [...item.hours, { id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }] } : item))}>시간대 추가</S.TextButton></S.HourList> : null}
      </S.WeekRow>)}</S.WeekList>
    </S.ScheduleSection>
    <S.ScheduleSection>
      <S.ScheduleSectionHeader><strong>예외 일정</strong><S.TextButton type="button" disabled={isSaving} onClick={() => setExceptions((current) => [...current, createException()])}>일정 추가</S.TextButton></S.ScheduleSectionHeader>
      {exceptions.length === 0 ? <S.Empty>등록된 예외 일정이 없습니다.</S.Empty> : <S.ExceptionList>{exceptions.map((exception) => <S.ExceptionEditor key={exception.id}><S.ExceptionHeader><AdminDatePicker ariaLabel="예외 일정 날짜" value={exception.date} disabled={isSaving} onChange={(value) => updateException(exception.id, { date: value })} /><S.IconButton type="button" $danger aria-label="예외 일정 삭제" disabled={isSaving} onClick={() => setExceptions((current) => current.filter((item) => item.id !== exception.id))}>delete</S.IconButton></S.ExceptionHeader><S.CheckLabel><input type="checkbox" checked={exception.closed} disabled={isSaving} onChange={(event) => updateException(exception.id, { closed: event.target.checked })} />종일 휴무</S.CheckLabel>{!exception.closed ? <S.HourList>{exception.hours.map((hour) => <S.HourRow key={hour.id}><S.TimeControls><AdminTimePicker ariaLabel="대체 영업 시작 시간" value={hour.opensAt} disabled={isSaving} onChange={(value) => updateExceptionHour(exception.id, hour.id, { opensAt: value })} /><span>-</span><AdminTimePicker ariaLabel="대체 영업 종료 시간" value={hour.closesAt} disabled={isSaving} onChange={(value) => updateExceptionHour(exception.id, hour.id, { closesAt: value })} /></S.TimeControls><S.IconButton type="button" aria-label="대체 영업 시간 삭제" disabled={isSaving || exception.hours.length <= 1} onClick={() => setExceptions((current) => current.map((item) => item.id === exception.id ? { ...item, hours: item.hours.filter((itemHour) => itemHour.id !== hour.id) } : item))}>remove</S.IconButton></S.HourRow>)}<S.TextButton type="button" disabled={isSaving} onClick={() => setExceptions((current) => current.map((item) => item.id === exception.id ? { ...item, hours: [...item.hours, { id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }] } : item))}>시간대 추가</S.TextButton></S.HourList> : null}</S.ExceptionEditor>)}</S.ExceptionList>}
    </S.ScheduleSection>
    {formError ? <S.FormError role="alert">{formError}</S.FormError> : null}
    <S.FormActions><S.ActionButton type="submit" disabled={isSaving} $variant="primary">{isSaving ? '저장 중' : '영업시간 저장'}</S.ActionButton></S.FormActions>
  </form></S.PanelBody>
}

function ConfirmDialog({
  kind,
  media,
  isBusy,
  onClose,
  onConfirm,
}: {
  kind: 'permanent-close' | 'delete-media'
  media?: MerchantPlaceMediaItem
  isBusy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const title = kind === 'permanent-close' ? '폐업 상태로 변경' : '탐색 미디어 삭제'
  const description = kind === 'permanent-close'
    ? '폐업 상태로 변경하면 방문자에게 더 이상 정상 운영 장소로 표시되지 않습니다.'
    : '삭제한 탐색 미디어는 되돌릴 수 없습니다. 대표 이미지라면 다른 이미지로 먼저 변경하는 것이 좋습니다.'

  return <S.ModalOverlay role="presentation" onMouseDown={() => !isBusy && onClose()}><S.Modal role="dialog" aria-modal="true" aria-labelledby="merchant-place-operation-confirm" onMouseDown={(event) => event.stopPropagation()}><S.ModalHeader><div><S.ModalTitle id="merchant-place-operation-confirm">{title}</S.ModalTitle><S.PanelDescription>{media ? `미디어 #${media.id}` : ''}</S.PanelDescription></div><S.CloseButton type="button" aria-label="닫기" disabled={isBusy} onClick={onClose}>close</S.CloseButton></S.ModalHeader><S.ModalBody>{description}<S.FormActions><S.ActionButton type="button" disabled={isBusy} onClick={onClose}>돌아가기</S.ActionButton><S.ActionButton type="button" disabled={isBusy} $variant="danger" onClick={onConfirm}>{isBusy ? '처리 중' : kind === 'permanent-close' ? '폐업으로 변경' : '삭제'}</S.ActionButton></S.FormActions></S.ModalBody></S.Modal></S.ModalOverlay>
}

function MerchantPlaceOperationsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const operations = useMerchantPlaceOperations()
  const [selectedStatus, setSelectedStatus] = useState<MerchantPlaceOperatingStatus | null>(null)
  const [dialog, setDialog] = useState<{ kind: 'permanent-close' } | { kind: 'delete-media'; media: MerchantPlaceMediaItem } | null>(null)
  const isBusy = operations.activeAction !== null
  const currentStatus = operations.operating?.operatingStatus ?? operations.place?.operatingStatus ?? 'OPERATING'
  const nextStatus = selectedStatus ?? currentStatus
  const mediaItems = operations.media?.media ?? []
  const representativeMediaId = operations.media?.representativeMediaId ?? null

  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }
  const saveStatus = async () => {
    if (nextStatus === currentStatus) return
    if (nextStatus === 'PERMANENTLY_CLOSED') {
      setDialog({ kind: 'permanent-close' })
      return
    }
    await operations.updateOperatingStatus(nextStatus)
  }

  if (operations.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>장소 운영 정보</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{operations.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void operations.fetchInitialData()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{operations.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.Eyebrow>Merchant Portal</Store.Eyebrow><Store.PageTitle>장소 운영 정보</Store.PageTitle><Store.PageDescription>방문자에게 보이는 영업 상태, 영업시간과 탐색 이미지를 최신 정보로 관리합니다.</Store.PageDescription></div><S.HeaderActions><S.HeaderButton type="button" onClick={() => navigate('/merchant')}>내 가게 관리</S.HeaderButton><S.HeaderButton type="button" disabled={operations.status === 'loading' || isBusy || !operations.selectedPlaceId} onClick={() => operations.selectedPlaceId && void operations.fetchPlaceOperations(operations.selectedPlaceId)}>새로고침</S.HeaderButton></S.HeaderActions></Store.PageIntro>
    {operations.profile && operations.profile.placeIds.length > 1 ? <Store.PlaceSelect aria-label="운영 정보를 관리할 장소 선택" value={operations.selectedPlaceId ?? ''} onChange={(event) => operations.selectPlace(Number(event.target.value))}>{operations.profile.placeIds.map((placeId) => <option key={placeId} value={placeId}>연결 장소 #{placeId}</option>)}</Store.PlaceSelect> : null}
    {operations.selectedPlaceId ? <S.StateSummary $operating={operations.operating?.currentlyOperating ?? null}><S.StateIcon aria-hidden="true">storefront</S.StateIcon><span><strong>{operations.operating?.currentlyOperating === false ? '현재 영업하지 않는 상태입니다.' : '현재 영업 중으로 계산됩니다.'}</strong> 마지막 운영 상태 확인: {formatDateTime(operations.operating?.checkedAt ?? operations.place?.operatingStatusCheckedAt ?? null)}</span></S.StateSummary> : null}
    {operations.sectionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{operations.sectionErrorMessage}</Store.Notice> : null}
    {operations.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{operations.actionErrorMessage}</Store.Notice> : null}
    {operations.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{operations.successMessage}</Store.Notice> : null}
    {operations.status === 'loading' || operations.isLoading ? <Store.LoadingSummary aria-label="장소 운영 정보를 불러오는 중"><Store.Skeleton $height={312} /><Store.Skeleton $height={560} /></Store.LoadingSummary> : !operations.selectedPlaceId ? <Store.EmptyStoreState><Store.EmptyStoreIcon aria-hidden="true">add_business</Store.EmptyStoreIcon><div><Store.EmptyStoreTitle>관리할 장소를 연결해주세요.</Store.EmptyStoreTitle><Store.EmptyStoreDescription>장소 연결이 완료되면 영업 상태, 영업시간과 탐색 미디어를 관리할 수 있습니다.</Store.EmptyStoreDescription></div></Store.EmptyStoreState> : <S.Workspace><S.Column><S.Panel><S.PanelHeader><div><S.PanelTitle>운영 상태</S.PanelTitle><S.PanelDescription>임시 휴업이나 폐업 상태를 즉시 반영합니다.</S.PanelDescription></div></S.PanelHeader><S.PanelBody><S.StatusOptions>{STATUS_OPTIONS.map((option) => <S.StatusOption key={option.value} $selected={nextStatus === option.value} $danger={option.danger}><input type="radio" name="merchant-place-status" value={option.value} checked={nextStatus === option.value} disabled={isBusy} onChange={() => setSelectedStatus(option.value)} /><div><strong>{option.label}</strong><small>{option.description}</small></div></S.StatusOption>)}</S.StatusOptions>{nextStatus === 'PERMANENTLY_CLOSED' ? <S.DangerNotice>폐업으로 변경하면 해당 장소의 운영 상태가 방문자 화면에 즉시 반영됩니다.</S.DangerNotice> : null}<S.FormActions><S.ActionButton type="button" $variant={nextStatus === 'PERMANENTLY_CLOSED' ? 'danger' : 'primary'} disabled={isBusy || nextStatus === currentStatus} onClick={() => void saveStatus()}>{operations.activeAction === 'status' ? '저장 중' : '상태 저장'}</S.ActionButton></S.FormActions></S.PanelBody></S.Panel><S.Panel><S.PanelHeader><div><S.PanelTitle>탐색 미디어</S.PanelTitle><S.PanelDescription>대표 이미지와 등록된 미디어를 확인합니다.</S.PanelDescription></div></S.PanelHeader><S.PanelBody><S.UploadArea><span>업로드 URL은 발급되지만, 업로드한 파일을 탐색 미디어로 등록하는 서버 API가 아직 없습니다.</span><S.UploadButton type="button" disabled title="탐색 미디어 등록 API가 추가된 뒤 업로드할 수 있습니다.">이미지 업로드 대기</S.UploadButton></S.UploadArea>{mediaItems.length > 0 ? <S.MediaGrid>{mediaItems.map((media, index) => <S.MediaItem key={media.id} $representative={representativeMediaId === media.id}><S.MediaImage src={media.thumbnailUrl || media.imageUrl} alt={`탐색 미디어 ${index + 1}`} /><S.MediaBody><S.MediaMeta>{representativeMediaId === media.id ? <S.RepresentativeBadge>대표 이미지</S.RepresentativeBadge> : <span>탐색 이미지</span>}<span>{index +1}번째</span></S.MediaMeta><S.MediaActions><S.ActionButton type="button" disabled={isBusy || representativeMediaId === media.id} onClick={() => void operations.updateRepresentativeMedia(media.id)}>대표로 설정</S.ActionButton><S.MediaOrderActions><S.IconButton type="button" aria-label="이전 순서로 이동" disabled={isBusy || index === 0} title="이전 순서로 이동" onClick={() => void operations.moveMedia(media.id, 'previous')}>arrow_upward</S.IconButton><S.IconButton type="button" aria-label="다음 순서로 이동" disabled={isBusy || index === mediaItems.length - 1} title="다음 순서로 이동" onClick={() => void operations.moveMedia(media.id, 'next')}>arrow_downward</S.IconButton><S.IconButton type="button" $danger aria-label="미디어 삭제" disabled={isBusy} onClick={() => setDialog({ kind: 'delete-media', media })}>delete</S.IconButton></S.MediaOrderActions></S.MediaActions></S.MediaBody></S.MediaItem>)}</S.MediaGrid> : <S.Empty>등록된 탐색 미디어가 없습니다.</S.Empty>}</S.PanelBody></S.Panel></S.Column><S.Column><S.Panel><S.PanelHeader><div><S.PanelTitle>영업시간</S.PanelTitle><S.PanelDescription>정규 영업시간과 특정 날짜의 휴무·대체 영업시간을 설정합니다.</S.PanelDescription></div></S.PanelHeader>{operations.operating ? <ScheduleEditor key={`${operations.selectedPlaceId}-${operations.operating.checkedAt}`} regularHours={operations.operating.regularHours} exceptions={operations.operating.operatingExceptions} isSaving={isBusy} onSave={operations.updateOperatingSchedule} /> : <S.PanelBody><S.Empty>영업시간 정보를 불러오지 못했습니다.</S.Empty></S.PanelBody>}</S.Panel></S.Column></S.Workspace>}
    {dialog ? <ConfirmDialog kind={dialog.kind} media={dialog.kind === 'delete-media' ? dialog.media : undefined} isBusy={isBusy} onClose={() => setDialog(null)} onConfirm={() => { if (dialog.kind === 'permanent-close') { void operations.updateOperatingStatus('PERMANENTLY_CLOSED').then((next) => { if (next) setDialog(null) }) } else { void operations.deleteMedia(dialog.media.id).then((next) => { if (next !== null) setDialog(null) }) } }} /> : null}
  </Store.Content></Store.Page>
}

export default MerchantPlaceOperationsPage
