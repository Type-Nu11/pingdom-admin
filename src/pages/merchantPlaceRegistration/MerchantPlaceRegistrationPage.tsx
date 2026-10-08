import { AccessibleTabList } from '../../components/common/AccessibleTabList'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnsavedChanges, useUnsavedNavigation } from '../../hooks/useUnsavedChanges'
import { AdminTimePicker } from '../../components/common/AdminDateTimePicker'
import { getMerchantSearchSelection, type MerchantSearchCandidate } from '../../api/merchantUnifiedPlaceSearchApi'
import { useMerchantUnifiedPlaceSearch } from '../../hooks/useMerchantUnifiedPlaceSearch'
import type { MapHandle } from '../../components/map/map.types'
import { AttachmentTypeDropdown } from '../../components/merchant/AttachmentTypeDropdown'
import { MerchantConfirmationDialog } from '../../components/merchant/MerchantConfirmationDialog'
import { useAuth } from '../../hooks/useAuth'
import {
  useMerchantPlaceRegistrations,
  type MerchantPlaceRegistrationStagedAttachment,
} from '../../hooks/useMerchantPlaceRegistrations'
import type {
  MerchantOperatingDayOfWeek,
  MerchantOperatingDayStatus,
  MerchantPlaceCategory,
  MerchantPlaceRegistration,
  MerchantPlaceRegistrationAttachment,
  MerchantPlaceRegistrationOperatingDay,
  MerchantPlaceRegistrationRequest,
  MerchantPlaceRegistrationStatus,
  MerchantPlaceTag,
} from '../../types/merchantPlaceRegistration.types'
import * as Store from '../../components/merchant/MerchantSurface.styles'
import * as S from './MerchantPlaceRegistrationPage.styles'

const STATUS: Record<MerchantPlaceRegistrationStatus, { label: string; tone: 'draft' | 'pending' | 'active' | 'danger' | 'neutral' }> = {
  DRAFT: { label: '작성 중', tone: 'draft' },
  PENDING: { label: '심사 대기', tone: 'pending' },
  APPROVED: { label: '승인', tone: 'active' },
  REJECTED: { label: '반려', tone: 'danger' },
  REGISTERED: { label: '등록 완료', tone: 'active' },
  COMPLETED: { label: '승인 완료', tone: 'active' },
  CANCELED: { label: '취소', tone: 'neutral' },
}

const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

const ATTACHMENT_DOCUMENT_LABELS: Record<MerchantPlaceRegistrationAttachment['documentType'], string> = {
  BUSINESS_REGISTRATION: '사업자등록증',
  IDENTITY_DOCUMENT: '신분증',
  REPRESENTATIVE_IMAGE: '대표 이미지',
}

const ATTACHMENT_DOCUMENT_OPTIONS: Array<{ value: MerchantPlaceRegistrationAttachment['documentType']; label: string }> = [
  { value: 'BUSINESS_REGISTRATION', label: ATTACHMENT_DOCUMENT_LABELS.BUSINESS_REGISTRATION },
  { value: 'IDENTITY_DOCUMENT', label: ATTACHMENT_DOCUMENT_LABELS.IDENTITY_DOCUMENT },
  { value: 'REPRESENTATIVE_IMAGE', label: ATTACHMENT_DOCUMENT_LABELS.REPRESENTATIVE_IMAGE },
]

const REQUIRED_ATTACHMENT_TYPES = ATTACHMENT_DOCUMENT_OPTIONS.map((option) => option.value)

const CATEGORIES: Array<{ value: MerchantPlaceCategory; label: string }> = [
  { value: 'RESTAURANT', label: '음식점' }, { value: 'MUSIC', label: '음악' },
  { value: 'POP_UP', label: '팝업' }, { value: 'FASHION', label: '패션' },
  { value: 'BEAUTY', label: '뷰티' }, { value: 'EXHIBITION', label: '전시' },
  { value: 'CAFE', label: '카페' }, { value: 'CULTURAL_HERITAGE', label: '문화재' },
  { value: 'OTHER', label: '기타' },
]

const TAGS: Array<{ value: MerchantPlaceTag; label: string }> = [
  { value: 'ENGLISH_SERVICE_AVAILABLE', label: '영어 서비스' },
  { value: 'ENGLISH_MENU_AVAILABLE', label: '영어 메뉴' },
  { value: 'RESERVATION_AVAILABLE', label: '예약 가능' },
  { value: 'RESERVATION_COUPON_AVAILABLE', label: '예약 쿠폰' },
  { value: 'GENERAL_COUPON_AVAILABLE', label: '일반 쿠폰' },
  { value: 'GOOD_AMBIENCE', label: '분위기 좋음' },
]

const DAYS: Array<{ value: MerchantOperatingDayOfWeek; label: string }> = [
  { value: 'MONDAY', label: '월' }, { value: 'TUESDAY', label: '화' }, { value: 'WEDNESDAY', label: '수' },
  { value: 'THURSDAY', label: '목' }, { value: 'FRIDAY', label: '금' }, { value: 'SATURDAY', label: '토' },
  { value: 'SUNDAY', label: '일' },
]

type ScheduleDraft = {
  dayOfWeek: MerchantOperatingDayOfWeek
  status: MerchantOperatingDayStatus
  opensAt: string
  closesAt: string
}

function createDefaultSchedule(): ScheduleDraft[] {
  return DAYS.map(({ value }) => ({ dayOfWeek: value, status: 'OPEN', opensAt: '10:00', closesAt: '20:00' }))
}

function formatDate(value: string | null) {
  if (!value) return '날짜 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace(/\. /g, '.').replace('.', '')
}

function canEdit(registration: MerchantPlaceRegistration | null) {
  return !registration || registration.status === 'DRAFT'
}

function normalizeE164Phone(value: string) {
  const normalized = value.trim().replace(/[\s-]/g, '')
  return normalized.startsWith('+820') ? `+82${normalized.slice(4)}` : normalized
}

function formatPhoneInput(value: string) {
  const normalized = value.replace(/[^\d+]/g, '')
  if (!normalized.startsWith('+82')) return normalized

  const subscriberDigits = normalized.slice(3)
  if (!subscriberDigits) return '+82'
  const nationalNumber = subscriberDigits.startsWith('0') ? subscriberDigits : `0${subscriberDigits}`
  const groups = [nationalNumber.slice(0, 3), nationalNumber.slice(3, 7), nationalNumber.slice(7, 11)]
    .filter(Boolean)

  return ['+82', ...groups].join('-')
}

function formatFileSize(value: number) {
  if (!Number.isFinite(value) || value < 1) return '크기 정보 없음'
  if (value < 1024) return `${value}B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`
  return `${(value / (1024 * 1024)).toFixed(1)}MB`
}

function toTime(value: string) {
  return value
}

function parseTime(value: unknown, fallback: string) {
  if (typeof value === 'string' && /^\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    return value.slice(0, 5)
  }
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as { hour?: unknown; minute?: unknown }
  if (typeof candidate.hour !== 'number' || typeof candidate.minute !== 'number') return fallback
  return `${String(candidate.hour).padStart(2, '0')}:${String(candidate.minute).padStart(2, '0')}`
}

function parseSchedule(value: string | null) {
  const defaults = createDefaultSchedule()
  if (!value) return defaults
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return defaults
    return defaults.map((fallback) => {
      const current = parsed.find((item) => item && typeof item === 'object' && (item as { dayOfWeek?: string }).dayOfWeek === fallback.dayOfWeek) as Record<string, unknown> | undefined
      const status = current?.status
      return {
        dayOfWeek: fallback.dayOfWeek,
        status: status === 'CLOSED' || status === 'OPEN_24_HOURS' || status === 'OPEN' ? status : fallback.status,
        opensAt: parseTime(current?.opensAt, fallback.opensAt),
        closesAt: parseTime(current?.closesAt, fallback.closesAt),
      }
    })
  } catch {
    return defaults
  }
}

function RegistrationForm({
  stagedAttachments,
  setStagedAttachments,
  registration,
  profile,
  activeAction,
  onSave,
  onRequestReview,
  onReopen,
  onCancel,
  onDelete,
  onReorder,
}: {
  stagedAttachments: MerchantPlaceRegistrationStagedAttachment[]
  setStagedAttachments: Dispatch<SetStateAction<MerchantPlaceRegistrationStagedAttachment[]>>
  registration: MerchantPlaceRegistration | null
  profile: ReturnType<typeof useMerchantPlaceRegistrations>['profile']
  activeAction: ReturnType<typeof useMerchantPlaceRegistrations>['activeAction']
  onSave: (applicationId: number | null, request: MerchantPlaceRegistrationRequest) => Promise<MerchantPlaceRegistration | null>
  onRequestReview: (
    applicationId: number | null,
    request: MerchantPlaceRegistrationRequest | null,
    stagedAttachments: MerchantPlaceRegistrationStagedAttachment[],
    onAttachmentUploaded?: (attachment: MerchantPlaceRegistrationStagedAttachment) => void,
    onDraftSaved?: () => void,
  ) => Promise<MerchantPlaceRegistration | null>
  onReopen: (applicationId: number) => Promise<MerchantPlaceRegistration | null>
  onCancel: (applicationId: number) => Promise<MerchantPlaceRegistration | null>
  onDelete: (applicationId: number, attachmentId: number) => Promise<unknown>
  onReorder: (applicationId: number, attachmentIds: number[]) => Promise<unknown>
}) {
  const editable = canEdit(registration)
  const canStageAttachments = !registration || registration.status === 'DRAFT'
  const activeBusinessName = profile?.status === 'ACTIVE' && profile.businessName.trim()
    ? profile.businessName.trim()
    : null
  const hasBusinessNameMismatch = Boolean(
    activeBusinessName
    && registration?.businessName.trim()
    && registration.businessName.trim() !== activeBusinessName,
  )
  const [placeName, setPlaceName] = useState(registration?.placeName ?? '')
  const [category, setCategory] = useState<MerchantPlaceCategory>(registration?.category ?? 'RESTAURANT')
  const [roadAddress, setRoadAddress] = useState(registration?.roadAddress ?? '')
  const [jibunAddress, setJibunAddress] = useState(registration?.jibunAddress ?? '')
  const [postalCode, setPostalCode] = useState(registration?.postalCode ?? '')
  const [latitude, setLatitude] = useState(registration ? String(registration.latitude) : '')
  const [longitude, setLongitude] = useState(registration ? String(registration.longitude) : '')
  const [description, setDescription] = useState(registration?.description ?? '')
  const [businessPhone, setBusinessPhone] = useState(formatPhoneInput(registration?.businessContactPhone ?? ''))
  const [applicantPhone, setApplicantPhone] = useState(formatPhoneInput(registration?.applicantContactPhone ?? ''))
  const [legalName, setLegalName] = useState(registration?.legalName ?? '')
  const [businessName, setBusinessName] = useState(activeBusinessName ?? registration?.businessName ?? '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')
  const [merchantDisplayName, setMerchantDisplayName] = useState(registration?.merchantDisplayName ?? '')
  const [merchantContactEmail, setMerchantContactEmail] = useState(registration?.merchantContactEmail ?? '')
  const [merchantContactPhone, setMerchantContactPhone] = useState(formatPhoneInput(registration?.merchantContactPhone ?? ''))
  const [isApplicantPhoneSame, setIsApplicantPhoneSame] = useState(false)
  const [tags, setTags] = useState<MerchantPlaceTag[]>(registration?.tags ?? [])
  const [schedule, setSchedule] = useState<ScheduleDraft[]>(parseSchedule(registration?.operatingScheduleJson ?? null))
  const draft = useSavedDraft(JSON.stringify([placeName, category, roadAddress, jibunAddress, postalCode, latitude, longitude, description, businessPhone, applicantPhone, legalName, businessName, businessRegistrationNumber, merchantDisplayName, merchantContactEmail, merchantContactPhone, isApplicantPhoneSame, tags, schedule]), { enabled: editable, busy: activeAction !== null })
  const [formError, setFormError] = useState('')
  const [placeSearchQuery, setPlaceSearchQuery] = useState('')
  const placeSearch = useMerchantUnifiedPlaceSearch()
  const [pinAdjusted, setPinAdjusted] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<Awaited<ReturnType<typeof placeSearch.prepareSelection>>>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isManualPlaceEntry, setIsManualPlaceEntry] = useState(false)
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const [attachmentDocumentType, setAttachmentDocumentType] = useState<MerchantPlaceRegistrationAttachment['documentType']>('BUSINESS_REGISTRATION')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  useUnsavedChanges(editable && (Boolean(attachmentFile) || stagedAttachments.length > 0), editable && activeAction !== null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<MapHandle | null>(null)
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null)
  const manualEntryToggleRef = useRef<HTMLButtonElement | null>(null)
  const cancelPlaceSearch = () => {
    placeSearch.reset()
    setPendingSelection(null)
  }
  const invalidateAddress = cancelPlaceSearch
  const closeManualPlaceEntry = () => {
    invalidateAddress()
    setIsManualPlaceEntry(false)
    window.requestAnimationFrame(() => manualEntryToggleRef.current?.focus())
  }

  const numericLatitude = Number(latitude)
  const numericLongitude = Number(longitude)
  const hasValidCoordinate = latitude.trim() !== '' && longitude.trim() !== ''
    && Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude)
    && numericLatitude >= -90 && numericLatitude <= 90 && numericLongitude >= -180 && numericLongitude <= 180
  const marker = hasValidCoordinate ? [{ id: 1, latitude: numericLatitude, longitude: numericLongitude, label: placeName || '새 장소 위치', category, categoryName: CATEGORIES.find((item) => item.value === category)?.label }] : []
  const hasSelectedPlace = Boolean(roadAddress || jibunAddress)
  const isLocationEntryActive = hasSelectedPlace || isManualPlaceEntry || hasValidCoordinate

  useEffect(() => {
    if (isMapReady && hasValidCoordinate) {
      mapRef.current?.moveTo(numericLatitude, numericLongitude)
    }
  }, [hasValidCoordinate, isMapReady, numericLatitude, numericLongitude])

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return
    }

    const closeCategoryMenu = (event: PointerEvent) => {
      if (!categoryDropdownRef.current?.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeCategoryMenu)
    return () => document.removeEventListener('pointerdown', closeCategoryMenu)
  }, [isCategoryMenuOpen])

  const updateSchedule = (day: MerchantOperatingDayOfWeek, changes: Partial<ScheduleDraft>) => {
    setSchedule((current) => current.map((item) => item.dayOfWeek === day ? { ...item, ...changes } : item))
  }

  const toggleTag = (tag: MerchantPlaceTag) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])
  }

  const updateBusinessPhone = (value: string) => {
    setBusinessPhone(value)
    if (isApplicantPhoneSame) {
      setApplicantPhone(value)
    }
  }

  const toggleApplicantPhoneSame = (checked: boolean) => {
    setIsApplicantPhoneSame(checked)
    if (checked) {
      setApplicantPhone(businessPhone)
    }
  }

  const currentLocation = { placeName, roadAddress, jibunAddress, postalCode, latitude, longitude, pinAdjusted }

  const applySearchSelection = (candidate: MerchantSearchCandidate) => {
    const next = getMerchantSearchSelection(candidate, currentLocation)
    setPlaceName(next.placeName)
    setRoadAddress(next.roadAddress)
    setJibunAddress(next.jibunAddress)
    setPostalCode(next.postalCode)
    setLatitude(next.latitude)
    setLongitude(next.longitude)
    setPinAdjusted(next.pinAdjusted)
    setIsManualPlaceEntry(candidate.kind === 'address' || !next.postalCode || !next.roadAddress || !next.jibunAddress)
    setPendingSelection(null)
    setFormError('')
  }

  const searchPlaces = () => {
    setPendingSelection(null)
    void placeSearch.search(placeSearchQuery)
  }

  const selectPlaceSearchResult = async (candidate: MerchantSearchCandidate) => {
    const next = await placeSearch.prepareSelection(candidate)
    if (!next) return
    if (getMerchantSearchSelection(next.candidate, currentLocation).needsPinConfirmation) {
      setPendingSelection(next)
    } else {
      applySearchSelection(next.candidate)
    }
  }

  const buildRequest = (): MerchantPlaceRegistrationRequest | null => {
    const requestBusinessName = activeBusinessName ?? businessName.trim()

    if (!legalName.trim() || !requestBusinessName || !businessRegistrationNumber.trim() || !merchantDisplayName.trim() || !merchantContactEmail.trim() || !merchantContactPhone.trim() || !placeName.trim() || !roadAddress.trim() || !jibunAddress.trim() || !postalCode.trim() || !description.trim() || !businessPhone.trim() || !applicantPhone.trim()) {
      setFormError('필수 항목을 모두 입력해주세요.')
      return null
    }
    if (!hasValidCoordinate) {
      setFormError('지도에서 위치를 선택하거나 유효한 위도·경도를 입력해주세요.')
      return null
    }
    if (schedule.some((day) => day.status === 'OPEN' && (!day.opensAt || !day.closesAt || day.opensAt >= day.closesAt))) {
      setFormError('영업일의 시작 시간과 종료 시간을 확인해주세요.')
      return null
    }
    const normalizedBusinessPhone = normalizeE164Phone(businessPhone)
    const normalizedApplicantPhone = normalizeE164Phone(applicantPhone)
    const normalizedMerchantContactPhone = normalizeE164Phone(merchantContactPhone)
    if (!merchantContactEmail.includes('@')) {
      setFormError('상점주 연락 이메일 형식을 확인해주세요.')
      return null
    }
    if (!E164_PHONE_PATTERN.test(normalizedBusinessPhone) || !E164_PHONE_PATTERN.test(normalizedApplicantPhone) || !E164_PHONE_PATTERN.test(normalizedMerchantContactPhone)) {
      setFormError('연락처는 국가번호를 포함한 국제 형식으로 입력해주세요. 예: +82-010-4997-7214')
      return null
    }
    setFormError('')
    const operatingDays: MerchantPlaceRegistrationOperatingDay[] = schedule.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      status: day.status,
      ...(day.status === 'OPEN' ? { opensAt: toTime(day.opensAt), closesAt: toTime(day.closesAt), breakTimes: [] } : {}),
    }))
    return {
      legalName: legalName.trim(), businessName: requestBusinessName, businessRegistrationNumber: businessRegistrationNumber.trim(),
      merchantDisplayName: merchantDisplayName.trim(), merchantDescription: null, merchantContactEmail: merchantContactEmail.trim(), merchantContactPhone: normalizedMerchantContactPhone,
      placeName: placeName.trim(), category, latitude: numericLatitude, longitude: numericLongitude,
      roadAddress: roadAddress.trim(), jibunAddress: jibunAddress.trim(), postalCode: postalCode.trim(),
      description: description.trim(), businessContactPhone: normalizedBusinessPhone, applicantContactPhone: normalizedApplicantPhone,
      tags, timezone: 'Asia/Seoul', operatingDays,
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editable || activeAction !== null || placeSearch.phase !== 'idle' || pendingSelection) return
    if (stagedAttachments.length > 0) {
      setFormError('선택한 증빙 파일은 심사 요청을 누르면 함께 제출됩니다.')
      return
    }
    const request = buildRequest()
    if (request && await onSave(registration?.id ?? null, request)) draft.markSaved()
  }

  const addStagedAttachment = () => {
    if (!attachmentFile) {
      setFormError('추가할 증빙 파일을 선택해주세요.')
      return
    }
    const isSingleFileType = attachmentDocumentType !== 'REPRESENTATIVE_IMAGE'
    const hasExistingDocument = registration?.attachments.some((attachment) => attachment.documentType === attachmentDocumentType)
    const hasStagedDocument = stagedAttachments.some((attachment) => attachment.documentType === attachmentDocumentType)
    if (isSingleFileType && (hasExistingDocument || hasStagedDocument)) {
      setFormError(`${ATTACHMENT_DOCUMENT_LABELS[attachmentDocumentType]}은(는) 한 개만 첨부할 수 있습니다.`)
      return
    }

    setStagedAttachments((current) => [...current, { documentType: attachmentDocumentType, file: attachmentFile }])
    clearAttachmentFile()
    setFormError('')
  }

  const requestReview = async () => {
    if (activeAction !== null || !canEdit(registration) || placeSearch.phase !== 'idle' || pendingSelection) return
    const attachmentTypes = [
      ...(registration?.attachments.map((attachment) => attachment.documentType) ?? []),
      ...stagedAttachments.map((attachment) => attachment.documentType),
    ]
    const missingLabels = REQUIRED_ATTACHMENT_TYPES
      .filter((documentType) => !attachmentTypes.includes(documentType))
      .map((documentType) => ATTACHMENT_DOCUMENT_LABELS[documentType])

    if (missingLabels.length > 0) {
      setFormError(`심사 요청 전 ${missingLabels.join(', ')}을(를) 추가해주세요.`)
      return
    }

    const needsSave = !registration || draft.isDirty
    const request = needsSave ? buildRequest() : null
    if (needsSave && !request) return
    if (!editable && !registration) return
    const next = await onRequestReview(
      registration?.id ?? null,
      request,
      stagedAttachments,
      (uploadedAttachment) => {
        setStagedAttachments((current) => current.filter((attachment) => attachment !== uploadedAttachment))
      },
      draft.markSaved,
    )
    if (next?.status === 'PENDING') {
      setStagedAttachments([])
      clearAttachmentFile()
    }
  }

  const removeStagedAttachment = (index: number) => {
    setStagedAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const clearAttachmentFile = () => {
    setAttachmentFile(null)
    if (attachmentInputRef.current) attachmentInputRef.current.value = ''
  }

  const confirmCancellation = async () => {
    if (!registration) return
    const canceled = await onCancel(registration.id)
    if (canceled) setIsCancelDialogOpen(false)
  }

  const moveRepresentativeImage = async (attachmentId: number, direction: -1 | 1) => {
    if (!registration) return
    const images = registration.attachments
      .filter((attachment) => attachment.documentType === 'REPRESENTATIVE_IMAGE')
      .sort((first, second) => first.displayOrder - second.displayOrder)
    const currentIndex = images.findIndex((attachment) => attachment.id === attachmentId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= images.length) return
    const reordered = [...images]
    ;[reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]]
    await onReorder(registration.id, reordered.map((attachment) => attachment.id))
  }

  return (
    <S.RegistrationForm onSubmit={save}>
      {registration && !editable ? <S.ReadonlyBlock><strong>{STATUS[registration.status].label}</strong><br />{registration.status === 'PENDING' ? '심사 대기 중인 신청서는 수정할 수 없습니다.' : registration.status === 'REJECTED' ? '반려 사유를 확인하고 신청서를 다시 열어 내용을 보완해주세요.' : registration.status === 'APPROVED' ? '승인이 완료되어 장소 생성과 상점주 연결이 자동으로 처리되었습니다.' : '처리 완료된 신청서입니다.'}{registration.reviewReason ? <><br />검토 의견: {registration.reviewReason}</> : null}</S.ReadonlyBlock> : null}
      {hasBusinessNameMismatch ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>현재 신청서의 사업자명이 활성 상점주 정보와 달라 승인할 수 없습니다. 신청을 취소한 뒤 현재 사업자명으로 다시 작성해주세요.</Store.Notice> : null}
      <S.FormWorkspace>
        <S.FormSections>
          <S.Section><S.SectionLegend>사업자·상점주 정보</S.SectionLegend><S.SectionHint>심사와 승인 후 상점주 권한 연결에 사용하는 정보입니다.</S.SectionHint>
        <Store.Field>법적 성명 (필수)<Store.Input value={legalName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setLegalName(event.target.value)} /></Store.Field>
        <Store.Field>사업자명 (필수)<Store.Input value={activeBusinessName ?? businessName} maxLength={100} disabled={!editable || activeAction !== null || Boolean(activeBusinessName)} onChange={(event) => setBusinessName(event.target.value)} />{activeBusinessName ? <S.SectionHint>활성 상점주의 사업자명은 장소 신청에서 변경할 수 없습니다.</S.SectionHint> : null}</Store.Field>
        <Store.Field>사업자등록번호 (필수)<Store.Input value={businessRegistrationNumber} inputMode="numeric" maxLength={30} placeholder={registration ? '수정·재신청 시 다시 입력하세요.' : '사업자등록번호를 입력하세요.'} disabled={!editable || activeAction !== null} onChange={(event) => setBusinessRegistrationNumber(event.target.value)} /></Store.Field>
        <Store.Field>상점주 노출명 (필수)<Store.Input value={merchantDisplayName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setMerchantDisplayName(event.target.value)} /></Store.Field>
        <Store.Field>상점주 연락 이메일 (필수)<Store.Input type="email" value={merchantContactEmail} maxLength={255} disabled={!editable || activeAction !== null} onChange={(event) => setMerchantContactEmail(event.target.value)} /></Store.Field>
        <Store.Field>상점주 연락처 (필수)<Store.Input type="tel" inputMode="tel" value={merchantContactPhone} maxLength={30} placeholder="+82-010-4997-7214" disabled={!editable || activeAction !== null} onChange={(event) => setMerchantContactPhone(formatPhoneInput(event.target.value))} /><S.SectionHint>국가번호를 포함한 형식으로 입력하세요. 예: +82-010-4997-7214</S.SectionHint></Store.Field>
          </S.Section>
          <S.Section>
            <S.SectionLegend>장소·주소 검색</S.SectionLegend>
            <S.SectionHint>업체명이나 도로명·지번 주소를 입력하세요. 검색어에 맞춰 네이버 장소 또는 주소 후보를 찾습니다.</S.SectionHint>
            <S.PlaceSearchField $wide>
              <S.PlaceSearchLabel htmlFor="merchant-place-search">업체명 또는 주소</S.PlaceSearchLabel>
              <S.PlaceSearchControl>
                <Store.Input id="merchant-place-search" maxLength={100} value={placeSearchQuery} placeholder="예: 성수 카페, 서울 중구 세종대로 110" disabled={!editable || activeAction !== null} onChange={(event) => { cancelPlaceSearch(); setPlaceSearchQuery(event.target.value) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchPlaces() } }} />
                <S.PlaceSearchButton type="button" aria-label="장소·주소 검색" title="장소·주소 검색" disabled={!editable || activeAction !== null || placeSearch.phase !== 'idle'} onClick={searchPlaces}><span aria-hidden="true">search</span></S.PlaceSearchButton>
              </S.PlaceSearchControl>
              <S.PlaceSearchHint role="status" $error={placeSearch.isError}>
                {placeSearch.phase === 'search' ? '장소·주소를 검색하는 중입니다.' : placeSearch.phase === 'complete' ? '선택한 업체의 주소·우편번호를 확인하는 중입니다.' : placeSearch.message}
              </S.PlaceSearchHint>
              {placeSearch.results.length > 0 ? <S.PlaceSearchResults aria-label="검색 후보">
                <S.PlaceSearchResultsTitle>검색 결과 · 주소를 확인하고 선택하세요</S.PlaceSearchResultsTitle>
                {placeSearch.results.map((candidate, index) => <S.PlaceSearchResult type="button" key={index} disabled={!editable || activeAction !== null} onClick={() => void selectPlaceSearchResult(candidate)}>
                  <S.PlaceSearchResultTop><strong>{candidate.kind === 'place' ? candidate.name : candidate.roadAddress || candidate.jibunAddress}</strong><small>{candidate.kind === 'place' ? '업체' : '주소'}</small></S.PlaceSearchResultTop>
                  <S.PlaceSearchResultAddress><span aria-hidden="true">location_on</span>{candidate.kind === 'place' ? candidate.roadAddress || candidate.jibunAddress : candidate.jibunAddress || candidate.roadAddress}</S.PlaceSearchResultAddress>
                  {candidate.postalCode ? <small>우편번호 {candidate.postalCode}</small> : null}
                </S.PlaceSearchResult>)}
              </S.PlaceSearchResults> : null}
              {hasSelectedPlace ? <S.SelectedPlaceSummary>
                <strong>선택한 장소</strong>
                {!isManualPlaceEntry ? <S.SelectedPlaceNameField htmlFor="merchant-place-name">장소명<Store.Input id="merchant-place-name" value={placeName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => { cancelPlaceSearch(); setPlaceName(event.target.value) }} /></S.SelectedPlaceNameField> : <strong>{placeName || '장소명을 아래에서 입력해주세요.'}</strong>}
                <S.SelectedPlaceAddress><span>{roadAddress || jibunAddress}</span>{jibunAddress && roadAddress ? <small>{jibunAddress}</small> : null}<small>{postalCode ? `우편번호 ${postalCode}` : '우편번호를 직접 입력해주세요.'}</small></S.SelectedPlaceAddress>
              </S.SelectedPlaceSummary> : null}
            </S.PlaceSearchField>
          </S.Section>
          {!isManualPlaceEntry ? <S.ManualEntryPrompt><span>검색 결과에 없거나 주소를 수정해야 하나요?</span><S.ManualEntryButton ref={manualEntryToggleRef} type="button" aria-expanded={false} aria-controls="merchant-manual-place-fields" disabled={!editable || activeAction !== null} onClick={() => { invalidateAddress(); setFormError(''); setIsManualPlaceEntry(true) }}>직접 입력</S.ManualEntryButton></S.ManualEntryPrompt> : null}
          {isManualPlaceEntry ? <S.Section id="merchant-manual-place-fields"><S.SectionLegend><S.ManualEntryHeading><span>장소 직접 입력·보완</span><S.ManualEntryButton type="button" aria-label="장소 직접 입력 닫기" aria-expanded={true} aria-controls="merchant-manual-place-fields" disabled={activeAction !== null} onClick={closeManualPlaceEntry}>닫기</S.ManualEntryButton></S.ManualEntryHeading></S.SectionLegend><S.SectionHint>누락된 주소·우편번호를 보완할 수 있습니다. 주소를 바꾸면 우편번호도 다시 확인해주세요.</S.SectionHint><Store.Field $wide>장소명 (필수)<Store.Input value={placeName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => { cancelPlaceSearch(); setPlaceName(event.target.value) }} /></Store.Field><Store.Field $wide>도로명 주소 (필수)<Store.Input value={roadAddress} maxLength={255} disabled={!editable || activeAction !== null} onChange={(event) => { invalidateAddress(); setRoadAddress(event.target.value); setPostalCode('') }} /></Store.Field><Store.Field $wide>지번 주소 (필수)<Store.Input value={jibunAddress} maxLength={255} disabled={!editable || activeAction !== null} onChange={(event) => { invalidateAddress(); setJibunAddress(event.target.value); setPostalCode('') }} /></Store.Field><Store.Field>우편번호 (필수)<Store.Input value={postalCode} maxLength={20} disabled={!editable || activeAction !== null} onChange={(event) => { invalidateAddress(); setPostalCode(event.target.value) }} /></Store.Field></S.Section> : null}
          <S.Section><S.SectionLegend>장소 정보</S.SectionLegend><S.SectionHint>카테고리와 방문자에게 표시할 가게 소개를 입력하세요.</S.SectionHint>
        <Store.Field $wide>카테고리 (필수)<S.CategoryDropdown ref={categoryDropdownRef}><S.CategoryTrigger type="button" aria-haspopup="listbox" aria-expanded={isCategoryMenuOpen} disabled={!editable || activeAction !== null} onClick={() => setIsCategoryMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setIsCategoryMenuOpen(false); if (event.key === 'ArrowDown') { event.preventDefault(); setIsCategoryMenuOpen(true) } }}><span>{CATEGORIES.find((item) => item.value === category)?.label}</span><span aria-hidden="true">{isCategoryMenuOpen ? 'expand_less' : 'expand_more'}</span></S.CategoryTrigger>{isCategoryMenuOpen ? <S.CategoryMenu role="listbox" aria-label="장소 카테고리">{CATEGORIES.map((item) => <S.CategoryOption type="button" role="option" key={item.value} $selected={category === item.value} aria-selected={category === item.value} onClick={() => { setCategory(item.value); setIsCategoryMenuOpen(false) }}>{item.label}</S.CategoryOption>)}</S.CategoryMenu> : null}</S.CategoryDropdown><S.SectionHint>업체명 검색으로 카테고리를 변경하지 않습니다. 알맞은 카테고리를 직접 선택해주세요.</S.SectionHint></Store.Field>
        <Store.Field $wide>장소 소개 (필수)<Store.Textarea value={description} maxLength={1000} disabled={!editable || activeAction !== null} onChange={(event) => setDescription(event.target.value)} /><S.SectionHint>{description.length}/1000</S.SectionHint></Store.Field>
          </S.Section>
          <S.Section><S.SectionLegend>연락처</S.SectionLegend><S.SectionHint>사업장 연락처는 방문자에게 표시되고, 신청자 연락처는 심사와 보완 요청에만 사용됩니다.</S.SectionHint>
        <Store.Field>사업장 연락처 (필수)<Store.Input id="merchant-business-phone" type="tel" inputMode="tel" value={businessPhone} maxLength={20} placeholder="+82-010-4997-7214" disabled={!editable || activeAction !== null} onChange={(event) => updateBusinessPhone(formatPhoneInput(event.target.value))} /><S.SectionHint>방문자에게 표시될 가게 대표 연락처입니다.</S.SectionHint></Store.Field>
        <S.ContactField><S.ContactFieldLabel htmlFor="merchant-applicant-phone">신청자 연락처 (필수)</S.ContactFieldLabel><Store.Input id="merchant-applicant-phone" type="tel" inputMode="tel" value={applicantPhone} maxLength={20} placeholder="+82-010-4997-7214" disabled={!editable || activeAction !== null || isApplicantPhoneSame} onChange={(event) => setApplicantPhone(formatPhoneInput(event.target.value))} /><S.SameContactCheck><input type="checkbox" checked={isApplicantPhoneSame} disabled={!editable || activeAction !== null} onChange={(event) => toggleApplicantPhoneSame(event.target.checked)} />사업장 연락처와 동일</S.SameContactCheck><S.SectionHint>심사와 보완 요청을 위한 연락처이며 방문자에게 공개되지 않습니다.</S.SectionHint></S.ContactField>
          </S.Section>
          <S.Section><S.SectionLegend>영업시간과 특징</S.SectionLegend><S.SectionHint>영업일마다 영업, 휴무, 24시간 중 하나를 선택하세요.</S.SectionHint>
        <Store.Field $wide><S.ScheduleList>{schedule.map((day) => <S.ScheduleRow key={day.dayOfWeek}><S.DayName>{DAYS.find((item) => item.value === day.dayOfWeek)?.label}</S.DayName><S.DayStatus>{([['OPEN', '영업'], ['CLOSED', '휴무'], ['OPEN_24_HOURS', '24시간']] as const).map(([value, label]) => <S.DayStatusButton type="button" key={value} $selected={day.status === value} disabled={!editable || activeAction !== null} onClick={() => updateSchedule(day.dayOfWeek, { status: value })}>{label}</S.DayStatusButton>)}</S.DayStatus><S.ScheduleTimeControls><AdminTimePicker ariaLabel={`${DAYS.find((item) => item.value === day.dayOfWeek)?.label}요일 영업 시작 시간`} value={day.opensAt} disabled={day.status !== 'OPEN' || !editable || activeAction !== null} onChange={(value) => updateSchedule(day.dayOfWeek, { opensAt: value })} /><span aria-hidden="true">-</span><AdminTimePicker ariaLabel={`${DAYS.find((item) => item.value === day.dayOfWeek)?.label}요일 영업 종료 시간`} value={day.closesAt} disabled={day.status !== 'OPEN' || !editable || activeAction !== null} onChange={(value) => updateSchedule(day.dayOfWeek, { closesAt: value })} /></S.ScheduleTimeControls></S.ScheduleRow>)}</S.ScheduleList></Store.Field>
        <Store.Field $wide><S.TagList>{TAGS.map((tag) => <S.TagButton type="button" key={tag.value} $selected={tags.includes(tag.value)} disabled={!editable || activeAction !== null} onClick={() => toggleTag(tag.value)}>{tag.label}</S.TagButton>)}</S.TagList></Store.Field>
          </S.Section>
          <S.Section>
            <S.SectionLegend>증빙 파일</S.SectionLegend>
            <S.AttachmentNotice>
              <S.AttachmentHeading>
                <span aria-hidden="true">attach_file</span>
                <div>
                  <strong>증빙 파일</strong>
                  <p>사업자등록증, 신분증, 대표 이미지를 모두 선택한 뒤 심사 요청을 보내세요.</p>
                </div>
              </S.AttachmentHeading>
              {canStageAttachments ? <S.AttachmentUploader>
                <AttachmentTypeDropdown ariaLabel="증빙 파일 종류" value={attachmentDocumentType} options={ATTACHMENT_DOCUMENT_OPTIONS} disabled={activeAction !== null} onChange={setAttachmentDocumentType} />
                <S.FilePicker $hasFile={Boolean(attachmentFile)} $disabled={activeAction !== null}>
                  <input ref={attachmentInputRef} type="file" disabled={activeAction !== null} onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} />
                  <span aria-hidden="true">{attachmentFile ? 'description' : 'upload_file'}</span>
                  <div>
                    <strong>{attachmentFile?.name || '증빙 파일 선택'}</strong>
                    <small>{attachmentFile ? `${formatFileSize(attachmentFile.size)} · 다시 클릭해 파일 변경` : '심사 요청 때 함께 업로드됩니다.'}</small>
                  </div>
                </S.FilePicker>
                <S.SecondaryButton type="button" disabled={activeAction !== null || !attachmentFile} onClick={addStagedAttachment}>파일 추가</S.SecondaryButton>
              </S.AttachmentUploader> : null}
              {stagedAttachments.length > 0 ? <S.AttachmentList>{stagedAttachments.map((attachment, index) => <li key={`${attachment.documentType}-${attachment.file.name}-${index}`}>
                <S.AttachmentFileInfo>
                  <span aria-hidden="true">{attachment.documentType === 'REPRESENTATIVE_IMAGE' ? 'image' : 'description'}</span>
                  <div><strong>{attachment.file.name}</strong><small>{ATTACHMENT_DOCUMENT_LABELS[attachment.documentType]} · {formatFileSize(attachment.file.size)} · 업로드 대기</small></div>
                </S.AttachmentFileInfo>
                <S.AttachmentActions><S.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => removeStagedAttachment(index)}>선택 취소</S.SecondaryButton></S.AttachmentActions>
              </li>)}</S.AttachmentList> : null}
              {registration?.attachments.length ? <S.AttachmentList>{registration.attachments.map((attachment) => <li key={attachment.id}>
                <S.AttachmentFileInfo>
                  <span aria-hidden="true">{attachment.documentType === 'REPRESENTATIVE_IMAGE' ? 'image' : 'description'}</span>
                  <div><strong>{attachment.originalFilename}</strong><small>{ATTACHMENT_DOCUMENT_LABELS[attachment.documentType]} · {formatFileSize(attachment.fileSize)}</small></div>
                </S.AttachmentFileInfo>
                {registration.status === 'DRAFT' ? <S.AttachmentActions>
                  <S.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => void onDelete(registration.id, attachment.id)}>삭제</S.SecondaryButton>
                  {attachment.documentType === 'REPRESENTATIVE_IMAGE' ? <>
                    <S.SecondaryButton type="button" aria-label={`${attachment.originalFilename} 순서 위로`} disabled={activeAction !== null} onClick={() => void moveRepresentativeImage(attachment.id, -1)}>위로</S.SecondaryButton>
                    <S.SecondaryButton type="button" aria-label={`${attachment.originalFilename} 순서 아래로`} disabled={activeAction !== null} onClick={() => void moveRepresentativeImage(attachment.id, 1)}>아래로</S.SecondaryButton>
                  </> : null}
                </S.AttachmentActions> : null}
              </li>)}</S.AttachmentList> : registration?.status === 'DRAFT' ? <S.AttachmentEmpty>아직 첨부한 증빙 파일이 없습니다.</S.AttachmentEmpty> : null}
              {!registration && stagedAttachments.length === 0 ? <S.AttachmentPending>필수 증빙을 모두 선택하면 심사 요청과 함께 업로드됩니다.</S.AttachmentPending> : null}
            </S.AttachmentNotice>
          </S.Section>
        </S.FormSections>
        <S.MapPanel $active={isLocationEntryActive}>
          <S.MapHeading>
            <div>
              <S.MapTitle>장소 위치</S.MapTitle>
              <S.MapDescription>{isLocationEntryActive ? '지도를 클릭하면 핀 위치를 조정할 수 있습니다.' : '장소 검색 또는 직접 입력 후 위치를 선택하세요.'}</S.MapDescription>
            </div>
            <S.MapStatus $hasLocation={isLocationEntryActive && hasValidCoordinate}>{isLocationEntryActive && hasValidCoordinate ? '위치 선택됨' : '장소 선택 필요'}</S.MapStatus>
          </S.MapHeading>
          <S.MapViewport $active={isLocationEntryActive}><S.LocationMap $active={isLocationEntryActive} ref={mapRef} markers={marker} activeMarkerId={marker.length ? 1 : null} fitBoundsKey={hasValidCoordinate ? `${numericLatitude}:${numericLongitude}` : ''} onMapReady={() => { setIsMapReady(true); if (hasValidCoordinate) mapRef.current?.moveTo(numericLatitude, numericLongitude) }} onMapClick={editable && activeAction === null && isLocationEntryActive ? ({ latitude: nextLatitude, longitude: nextLongitude }) => { invalidateAddress(); setPinAdjusted(true); setLatitude(nextLatitude.toFixed(6)); setLongitude(nextLongitude.toFixed(6)); setFormError('') } : undefined} />{!isLocationEntryActive ? <S.MapIdleOverlay><span aria-hidden="true">search</span><strong>장소 검색 또는 직접 입력 후 위치 선택</strong></S.MapIdleOverlay> : null}</S.MapViewport>
          <S.CoordinateText>{isLocationEntryActive && hasValidCoordinate ? `선택 위치: ${numericLatitude.toFixed(6)}, ${numericLongitude.toFixed(6)}` : isLocationEntryActive ? '지도를 클릭해 핀 위치를 선택하세요.' : '장소를 먼저 검색하거나 직접 입력하세요.'}</S.CoordinateText>
          {isLocationEntryActive ? <S.CoordinateDetails>
            <summary>좌표 직접 입력</summary>
            <S.CoordinateFields>
              <Store.Field>위도<Store.Input inputMode="decimal" value={latitude} placeholder="예: 37.566500" disabled={!editable || activeAction !== null} onChange={(event) => { invalidateAddress(); setPinAdjusted(true); setLatitude(event.target.value) }} /></Store.Field>
              <Store.Field>경도<Store.Input inputMode="decimal" value={longitude} placeholder="예: 126.978000" disabled={!editable || activeAction !== null} onChange={(event) => { invalidateAddress(); setPinAdjusted(true); setLongitude(event.target.value) }} /></Store.Field>
            </S.CoordinateFields>
          </S.CoordinateDetails> : null}
        </S.MapPanel>
      </S.FormWorkspace>
      {formError ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice> : null}
      <S.FormActions>
        {registration?.status === 'REJECTED' ? <S.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => void onReopen(registration.id)}>{activeAction === 'reopen' ? '다시 여는 중' : '신청서 다시 열기'}</S.SecondaryButton> : null}
        {registration && (registration.status === 'DRAFT' || registration.status === 'PENDING') ? <S.DangerButton type="button" disabled={activeAction !== null} onClick={() => setIsCancelDialogOpen(true)}>{activeAction === 'cancel' ? '취소 중' : '신청 취소'}</S.DangerButton> : null}
        {editable ? <S.SecondaryButton type="submit" disabled={activeAction !== null || placeSearch.phase !== 'idle' || pendingSelection !== null}>{activeAction === 'save' ? '저장 중' : '임시 저장'}</S.SecondaryButton> : null}
        {(canStageAttachments || registration?.status === 'DRAFT') ? <Store.SaveButton type="button" disabled={activeAction !== null || placeSearch.phase !== 'idle' || pendingSelection !== null} onClick={() => void requestReview()}>{activeAction === 'request' ? '심사 요청 중' : '심사 요청'}</Store.SaveButton> : null}
      </S.FormActions>
      {pendingSelection ? <MerchantConfirmationDialog title="직접 조정한 핀 위치를 변경할까요?" description={`선택한 ${pendingSelection.candidate.kind === 'place' ? pendingSelection.candidate.name : '주소'}의 주소와 검색 좌표를 적용합니다. 직접 조정한 핀 위치가 바뀝니다.`} cancelLabel="기존 위치 유지" confirmLabel="검색 위치 적용" onClose={cancelPlaceSearch} onConfirm={() => applySearchSelection(pendingSelection.candidate)} /> : null}
      {registration && isCancelDialogOpen ? <MerchantConfirmationDialog title="신규 장소 등록 신청을 취소할까요?" description="취소한 신청은 심사 대상에서 제외되며 다시 되돌릴 수 없습니다." confirmLabel="신청 취소" isPending={activeAction === 'cancel'} onClose={() => setIsCancelDialogOpen(false)} onConfirm={() => void confirmCancellation()} /> : null}
    </S.RegistrationForm>
  )
}

function MerchantPlaceRegistrationPage() {
  const requestTransition = useUnsavedNavigation()
  const [stagedAttachments, setStagedAttachments] = useState<MerchantPlaceRegistrationStagedAttachment[]>([])
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const registration = useMerchantPlaceRegistrations()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newFormVersion, setNewFormVersion] = useState(0)
  const [screen, setScreen] = useState<'history' | 'form'>('history')
  const screenRef = useRef<HTMLDivElement>(null)
  const moveFocusRef = useRef(false)
  useLayoutEffect(() => {
    if (!moveFocusRef.current) return
    moveFocusRef.current = false
    screenRef.current?.scrollIntoView({ block: 'start' })
    screenRef.current?.focus({ preventScroll: true })
  }, [screen, selectedId, newFormVersion])
  const [registrationListView, setRegistrationListView] = useState<'applications' | 'canceled'>('applications')
  const visibleRegistrations = useMemo(
    () => registration.registrations.filter((item) => registrationListView === 'canceled'
      ? item.status === 'CANCELED'
      : item.status !== 'CANCELED'),
    [registration.registrations, registrationListView],
  )
  const canceledRegistrationCount = registration.registrations.length - registration.registrations.filter((item) => item.status !== 'CANCELED').length
  const selectedRegistration = useMemo(() => registration.registrations.find((item) => item.id === selectedId) ?? null, [registration.registrations, selectedId])
  const isConnectedPlace = Boolean(
    selectedRegistration?.registeredPlaceId && registration.profile?.placeIds.includes(selectedRegistration.registeredPlaceId),
  )
  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }
  const refreshRegistrations = () => {
    if (registration.activeAction !== null) return
    setStagedAttachments([])
    setSelectedId(null)
    setNewFormVersion(version => version + 1)
    void registration.fetchRegistrations()
  }
  const changeRegistrationListView = (nextView: 'applications' | 'canceled') => {
    if (registration.activeAction !== null) return
    setStagedAttachments([])
    setRegistrationListView(nextView)
    setSelectedId(null)
    setNewFormVersion(version => version + 1)
  }
  const startNewRegistration = () => {
    if (registration.activeAction !== null) return
    setStagedAttachments([])
    setRegistrationListView('applications')
    setSelectedId(null)
    setNewFormVersion(version => version + 1)
    setScreen('form')
    moveFocusRef.current = true
  }

  const showHistory = () => requestTransition(() => {
    if (registration.activeAction !== null) return
    setStagedAttachments([])
    setNewFormVersion(version => version + 1)
    setScreen('history')
    moveFocusRef.current = true
  })

  if (registration.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>신규 장소 등록</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{registration.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void registration.fetchRegistrations()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{registration.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>신규 장소 등록</Store.PageTitle><Store.PageDescription>아직 등록되지 않은 가게를 신청하세요. 이미 등록된 장소라면 기존 장소 운영 신청을 이용해야 합니다.</Store.PageDescription></div><Store.QuickLinks aria-label="신청 내역 새로고침"><Store.QuickLink type="button" onClick={() => requestTransition(refreshRegistrations)}>새로고침</Store.QuickLink></Store.QuickLinks></Store.PageIntro>
    {registration.errorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{registration.errorMessage}</Store.Notice> : null}
    {registration.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{registration.actionErrorMessage}</Store.Notice> : null}
    {registration.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{registration.successMessage}</Store.Notice> : null}
    {screen === 'form' && isConnectedPlace ? <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Store.SaveButton type="button" onClick={() => navigate('/merchant')}>연결된 가게 관리</Store.SaveButton></div> : null}
    <S.ScreenActions aria-label="장소 등록 작업"><S.SecondaryButton type="button" disabled={registration.activeAction !== null || screen === 'history'} onClick={showHistory}>신청 내역 보기</S.SecondaryButton><S.NewApplicationButton type="button" disabled={registration.status === 'loading' || registration.activeAction !== null} onClick={() => requestTransition(startNewRegistration)}>새 장소 등록 신청</S.NewApplicationButton></S.ScreenActions>
    <S.Layout ref={screenRef} tabIndex={-1} aria-label={screen === 'history' ? '신청 내역' : '신청서'}>
      {screen === 'form' ? <S.RegistrationPanel>
        <S.PanelHeading><div><S.PanelTitle>{selectedRegistration ? '등록 신청 상세' : '장소 정보 입력'}</S.PanelTitle><S.PanelDescription>{selectedRegistration ? `신청 번호 #${selectedRegistration.id} · 마지막 수정 ${formatDate(selectedRegistration.updatedAt)}` : '기본 정보, 위치, 영업시간을 입력한 뒤 심사를 요청하세요.'}</S.PanelDescription></div>{selectedRegistration ? <S.StatusBadge $tone={STATUS[selectedRegistration.status].tone}>{STATUS[selectedRegistration.status].label}</S.StatusBadge> : null}</S.PanelHeading>
        <RegistrationForm stagedAttachments={stagedAttachments} setStagedAttachments={setStagedAttachments} key={selectedRegistration?.id ?? `new-${newFormVersion}`} registration={selectedRegistration} profile={registration.profile} activeAction={registration.activeAction} onSave={async (id, request) => { const next = await registration.saveRegistration(id, request); if (next) setSelectedId(next.id); return next }} onRequestReview={async (id, request, attachments, onAttachmentUploaded, onDraftSaved) => { const next = await registration.requestRegistrationReview(id, request, attachments, onAttachmentUploaded, onDraftSaved); if (next) setSelectedId(next.id); return next }} onReopen={registration.reopenRegistration} onCancel={async (applicationId) => { const canceled = await registration.cancelRegistration(applicationId); if (canceled) { setStagedAttachments([]); setSelectedId(null); setScreen('history'); moveFocusRef.current = true }; return canceled }} onDelete={registration.deleteAttachment} onReorder={registration.reorderAttachments} />
      </S.RegistrationPanel> : null}
      {screen === 'history' ? <S.HistoryPanel aria-label="등록 신청 내역">
        <S.PanelHeading><div><S.PanelTitle>등록 신청 내역</S.PanelTitle><S.PanelDescription>작성 중이거나 처리된 신청서를 선택해 확인할 수 있습니다.</S.PanelDescription></div><S.HistoryTabs as={AccessibleTabList} panelId="registration-history-panel" role="tablist" aria-label="신규 장소 등록 신청 내역"><S.HistoryTab type="button" role="tab" aria-selected={registrationListView === 'applications'} $active={registrationListView === 'applications'} onClick={() => { if (registrationListView !== 'applications') requestTransition(() => changeRegistrationListView('applications')) }}>신청 내역</S.HistoryTab><S.HistoryTab type="button" role="tab" aria-selected={registrationListView === 'canceled'} $active={registrationListView === 'canceled'} onClick={() => { if (registrationListView !== 'canceled') requestTransition(() => changeRegistrationListView('canceled')) }}>취소 내역 ({canceledRegistrationCount})</S.HistoryTab></S.HistoryTabs></S.PanelHeading>
<div id="registration-history-panel" role="tabpanel" aria-labelledby={`registration-history-panel-tab-${registrationListView === 'applications' ? 0 : 1}`} tabIndex={0} style={{ display: 'flex', flexDirection: 'column', gap: 'inherit', minWidth: 0 }}>
        {registration.status === 'loading' ? <S.Empty role="status">신청 내역을 불러오는 중입니다.</S.Empty> : visibleRegistrations.length > 0 ? <S.ApplicationList>{visibleRegistrations.map((item) => <S.ApplicationItem type="button" key={item.id} $selected={item.id === selectedId} disabled={registration.activeAction !== null} onClick={() => { if (registration.activeAction !== null) return; requestTransition(() => { void registration.selectRegistration(item.id).then(next => { if (next) { setStagedAttachments([]); setSelectedId(next.id); moveFocusRef.current = true; setScreen('form') } }) }) }}><S.ApplicationTop><S.ApplicationName>{item.placeName}</S.ApplicationName><S.StatusBadge $tone={STATUS[item.status].tone}>{STATUS[item.status].label}</S.StatusBadge></S.ApplicationTop><S.ApplicationMeta>{CATEGORIES.find((categoryItem) => categoryItem.value === item.category)?.label ?? item.category} · {formatDate(item.updatedAt)}</S.ApplicationMeta></S.ApplicationItem>)}</S.ApplicationList> : <S.Empty>{registrationListView === 'canceled' ? '취소한 신규 장소 등록 신청이 없습니다.' : '작성 중이거나 처리된 신규 장소 등록 신청이 없습니다.'}</S.Empty>}

      </div>
      </S.HistoryPanel> : null}
    </S.Layout>
  </Store.Content></Store.Page>
}

export default MerchantPlaceRegistrationPage
import { useSavedDraft } from '../../hooks/useSavedDraft'
