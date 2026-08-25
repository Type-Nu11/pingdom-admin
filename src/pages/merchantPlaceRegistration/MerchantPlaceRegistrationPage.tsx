import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminTimePicker } from '../../components/common/AdminDateTimePicker'
import type { KakaoMapHandle, KakaoPlaceSearchResult } from '../../components/map/KakaoMap'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantPlaceRegistrations } from '../../hooks/useMerchantPlaceRegistrations'
import type {
  MerchantOperatingDayOfWeek,
  MerchantOperatingDayStatus,
  MerchantPlaceCategory,
  MerchantPlaceRegistration,
  MerchantPlaceRegistrationOperatingDay,
  MerchantPlaceRegistrationRequest,
  MerchantPlaceRegistrationStatus,
  MerchantPlaceTag,
} from '../../types/merchantPlaceRegistration.types'
import * as Store from '../merchantStore/MerchantStorePage.styles'
import * as S from './MerchantPlaceRegistrationPage.styles'

const STATUS: Record<MerchantPlaceRegistrationStatus, { label: string; tone: 'draft' | 'pending' | 'active' | 'danger' | 'neutral' }> = {
  DRAFT: { label: '작성 중', tone: 'draft' },
  PENDING: { label: '심사 중', tone: 'pending' },
  APPROVED: { label: '승인됨', tone: 'active' },
  REJECTED: { label: '반려', tone: 'danger' },
  REGISTERED: { label: '등록 완료', tone: 'active' },
  COMPLETED: { label: '연결 완료', tone: 'active' },
  CANCELED: { label: '취소됨', tone: 'neutral' },
}

const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

const CATEGORIES: Array<{ value: MerchantPlaceCategory; label: string }> = [
  { value: 'RESTAURANT', label: '음식점' }, { value: 'MUSIC', label: '음악' },
  { value: 'POP_UP', label: '팝업' }, { value: 'FASHION', label: '패션' },
  { value: 'BEAUTY', label: '뷰티' }, { value: 'EXHIBITION', label: '전시' },
  { value: 'CAFE', label: '카페' }, { value: 'CULTURAL_HERITAGE', label: '문화재' },
  { value: 'OTHER', label: '기타' },
]

const KAKAO_CATEGORY_MAP: Partial<Record<string, MerchantPlaceCategory>> = {
  FD6: 'RESTAURANT',
  CE7: 'CAFE',
  CT1: 'EXHIBITION',
  AT4: 'CULTURAL_HERITAGE',
}

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
  return value.trim().replace(/[\s-]/g, '')
}

function toTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return { hour: hours, minute: minutes, second: 0, nano: 0 }
}

function parseTime(value: unknown, fallback: string) {
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
  registration,
  profile,
  activeAction,
  onSave,
  onSubmit,
  onReopen,
  onComplete,
  onCancel,
}: {
  registration: MerchantPlaceRegistration | null
  profile: ReturnType<typeof useMerchantPlaceRegistrations>['profile']
  activeAction: ReturnType<typeof useMerchantPlaceRegistrations>['activeAction']
  onSave: (applicationId: number | null, request: MerchantPlaceRegistrationRequest) => Promise<MerchantPlaceRegistration | null>
  onSubmit: (applicationId: number) => Promise<MerchantPlaceRegistration | null>
  onReopen: (applicationId: number) => Promise<MerchantPlaceRegistration | null>
  onComplete: (applicationId: number) => Promise<MerchantPlaceRegistration | null>
  onCancel: (applicationId: number) => Promise<MerchantPlaceRegistration | null>
}) {
  const hasExistingAttachments = (registration?.attachments.length ?? 0) > 0
  const editable = canEdit(registration) && !hasExistingAttachments
  const canSubmitExistingAttachments = registration?.status === 'DRAFT' && hasExistingAttachments
  const [placeName, setPlaceName] = useState(registration?.placeName ?? '')
  const [category, setCategory] = useState<MerchantPlaceCategory>(registration?.category ?? 'RESTAURANT')
  const [roadAddress, setRoadAddress] = useState(registration?.roadAddress ?? '')
  const [jibunAddress, setJibunAddress] = useState(registration?.jibunAddress ?? '')
  const [postalCode, setPostalCode] = useState(registration?.postalCode ?? '')
  const [latitude, setLatitude] = useState(registration ? String(registration.latitude) : '')
  const [longitude, setLongitude] = useState(registration ? String(registration.longitude) : '')
  const [description, setDescription] = useState(registration?.description ?? profile?.description ?? '')
  const [businessPhone, setBusinessPhone] = useState(registration?.businessContactPhone ?? profile?.contactPhone ?? '')
  const [applicantPhone, setApplicantPhone] = useState(profile?.contactPhone ?? '')
  const [isApplicantPhoneSame, setIsApplicantPhoneSame] = useState(false)
  const [tags, setTags] = useState<MerchantPlaceTag[]>(registration?.tags ?? [])
  const [schedule, setSchedule] = useState<ScheduleDraft[]>(parseSchedule(registration?.operatingScheduleJson ?? null))
  const [formError, setFormError] = useState('')
  const [placeSearchQuery, setPlaceSearchQuery] = useState('')
  const [placeSearchResults, setPlaceSearchResults] = useState<KakaoPlaceSearchResult[]>([])
  const [placeSearchMessage, setPlaceSearchMessage] = useState('')
  const [isPlaceSearchLoading, setIsPlaceSearchLoading] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isManualPlaceEntry, setIsManualPlaceEntry] = useState(false)
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const mapRef = useRef<KakaoMapHandle | null>(null)
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null)
  const placeSearchRequestIdRef = useRef(0)
  const selectedKakaoPlaceIdRef = useRef<string | null>(null)

  const numericLatitude = Number(latitude)
  const numericLongitude = Number(longitude)
  const hasValidCoordinate = latitude.trim() !== '' && longitude.trim() !== ''
    && Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude)
    && numericLatitude >= -90 && numericLatitude <= 90 && numericLongitude >= -180 && numericLongitude <= 180
  const marker = hasValidCoordinate ? [{ id: 1, latitude: numericLatitude, longitude: numericLongitude, label: placeName || '새 장소 위치', category, categoryName: CATEGORIES.find((item) => item.value === category)?.label }] : []
  const hasSelectedPlace = Boolean(roadAddress || jibunAddress)
  const isLocationEntryActive = hasSelectedPlace || isManualPlaceEntry

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

  const searchPlaces = useCallback(() => {
    const requestId = placeSearchRequestIdRef.current + 1
    placeSearchRequestIdRef.current = requestId
    const keyword = placeSearchQuery.trim()
    const services = window.kakao?.maps.services

    if (!keyword) {
      setPlaceSearchResults([])
      setPlaceSearchMessage('장소명, 건물명 또는 주소를 입력해주세요.')
      return
    }

    if (!services) {
      setPlaceSearchMessage('장소 검색 기능을 준비하고 있습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setIsPlaceSearchLoading(true)
    setPlaceSearchMessage('')

    new services.Places().keywordSearch(keyword, (results, status) => {
      if (requestId !== placeSearchRequestIdRef.current) {
        return
      }

      setIsPlaceSearchLoading(false)

      if (status === services.Status.OK) {
        setPlaceSearchResults(results)
        return
      }

      setPlaceSearchResults([])
      setPlaceSearchMessage(status === services.Status.ZERO_RESULT ? '검색 결과가 없습니다.' : '장소를 검색하지 못했습니다. 다시 시도해주세요.')
    }, { size: 8 })
  }, [placeSearchQuery])

  const selectPlaceSearchResult = useCallback((place: KakaoPlaceSearchResult) => {
    const services = window.kakao?.maps.services
    const latitude = Number(place.y)
    const longitude = Number(place.x)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setPlaceSearchMessage('선택한 장소의 좌표를 확인하지 못했습니다.')
      return
    }

    placeSearchRequestIdRef.current += 1
    selectedKakaoPlaceIdRef.current = place.id
    setIsManualPlaceEntry(false)
    setPlaceName(place.place_name)
    setRoadAddress(place.road_address_name)
    setJibunAddress(place.address_name)
    setLatitude(latitude.toFixed(6))
    setLongitude(longitude.toFixed(6))
    setPostalCode('')
    setPlaceSearchResults([])
    setPlaceSearchQuery(place.place_name)
    setPlaceSearchMessage('')
    setFormError('')

    const mappedCategory = KAKAO_CATEGORY_MAP[place.category_group_code]
    if (mappedCategory) {
      setCategory(mappedCategory)
    }

    const address = place.road_address_name || place.address_name
    if (!services || !address) {
      setPlaceSearchMessage('주소 정보를 확인하지 못했습니다. 다른 장소를 선택해주세요.')
      return
    }

    new services.Geocoder().addressSearch(address, (results, status) => {
      if (selectedKakaoPlaceIdRef.current !== place.id) {
        return
      }

      if (status !== services.Status.OK || results.length === 0) {
        setPlaceSearchMessage('우편번호를 확인하지 못했습니다. 다른 장소를 선택해주세요.')
        return
      }

      const [resolvedAddress] = results
      setRoadAddress(resolvedAddress.road_address?.address_name || place.road_address_name)
      setJibunAddress(resolvedAddress.address?.address_name || place.address_name)
      setPostalCode(resolvedAddress.road_address?.zone_no || '')
    })
  }, [])

  const buildRequest = (): MerchantPlaceRegistrationRequest | null => {
    if (!placeName.trim() || !roadAddress.trim() || !jibunAddress.trim() || !postalCode.trim() || !description.trim() || !businessPhone.trim() || !applicantPhone.trim()) {
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
    if (!E164_PHONE_PATTERN.test(normalizedBusinessPhone) || !E164_PHONE_PATTERN.test(normalizedApplicantPhone)) {
      setFormError('연락처는 국가번호를 포함한 국제 형식으로 입력해주세요. 예: +821012345678')
      return null
    }
    setFormError('')
    const operatingDays: MerchantPlaceRegistrationOperatingDay[] = schedule.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      status: day.status,
      ...(day.status === 'OPEN' ? { opensAt: toTime(day.opensAt), closesAt: toTime(day.closesAt), breakTimes: [] } : {}),
    }))
    return {
      placeName: placeName.trim(), category, latitude: numericLatitude, longitude: numericLongitude,
      roadAddress: roadAddress.trim(), jibunAddress: jibunAddress.trim(), postalCode: postalCode.trim(),
      description: description.trim(), businessContactPhone: normalizedBusinessPhone, applicantContactPhone: normalizedApplicantPhone,
      tags, timezone: 'Asia/Seoul', operatingDays,
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const request = buildRequest()
    if (request) await onSave(registration?.id ?? null, request)
  }

  const submit = async () => {
    const request = buildRequest()
    if (!request) return
    const saved = await onSave(registration?.id ?? null, request)
    if (saved) await onSubmit(saved.id)
  }

  return (
    <S.RegistrationForm onSubmit={save}>
      {registration && !editable ? <S.ReadonlyBlock><strong>{STATUS[registration.status].label}</strong><br />{hasExistingAttachments ? '기존 증빙 서류를 보존하기 위해 이 화면에서는 신청서를 수정할 수 없습니다.' : registration.status === 'PENDING' ? '심사 중인 신청서는 수정할 수 없습니다.' : registration.status === 'REJECTED' ? '반려 사유를 확인하고 신청서를 다시 열어 내용을 보완해주세요.' : registration.status === 'APPROVED' ? '관리자 승인이 완료됐습니다. 최종 장소 등록을 요청해주세요.' : '처리 완료된 신청서입니다.'}{registration.reviewReason ? <><br />검토 의견: {registration.reviewReason}</> : null}</S.ReadonlyBlock> : null}
      <S.FormWorkspace>
        <S.FormSections>
          <S.Section><S.SectionLegend>장소 검색</S.SectionLegend><S.SectionHint>장소명, 건물명 또는 주소를 검색해 등록할 장소를 선택하세요.</S.SectionHint>
        <S.PlaceSearchField $wide><S.PlaceSearchLabel htmlFor="merchant-place-search">장소명, 건물명 또는 주소 검색</S.PlaceSearchLabel><S.PlaceSearchControl><Store.Input id="merchant-place-search" value={placeSearchQuery} placeholder="예: 성수 카페, 롯데월드, 서울시청" disabled={!editable || activeAction !== null || !isMapReady} onChange={(event) => { const nextQuery = event.target.value; setPlaceSearchQuery(nextQuery); setPlaceSearchMessage(''); if (!nextQuery.trim()) { placeSearchRequestIdRef.current += 1; setIsPlaceSearchLoading(false); setPlaceSearchResults([]) } }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchPlaces() } }} /><S.PlaceSearchButton type="button" aria-label="장소 검색" title="장소 검색" disabled={!editable || activeAction !== null || !isMapReady || isPlaceSearchLoading} onClick={searchPlaces}><span aria-hidden="true">search</span></S.PlaceSearchButton></S.PlaceSearchControl>{isPlaceSearchLoading ? <S.PlaceSearchHint>장소를 검색하는 중입니다.</S.PlaceSearchHint> : null}{placeSearchMessage ? <S.PlaceSearchHint $error>{placeSearchMessage}</S.PlaceSearchHint> : null}{placeSearchResults.length > 0 ? <S.PlaceSearchResults role="listbox" aria-label="연관 장소"><S.PlaceSearchResultsTitle>연관 장소</S.PlaceSearchResultsTitle>{placeSearchResults.map((place) => <S.PlaceSearchResult type="button" role="option" key={place.id} aria-label={`${place.place_name}, ${place.road_address_name || place.address_name}`} onClick={() => selectPlaceSearchResult(place)}><S.PlaceSearchResultTop><strong>{place.place_name}</strong>{place.category_group_name ? <span>{place.category_group_name}</span> : null}</S.PlaceSearchResultTop>{place.category_name ? <S.PlaceSearchResultCategory>{place.category_name}</S.PlaceSearchResultCategory> : null}<S.PlaceSearchResultAddress><span aria-hidden="true">location_on</span>{place.road_address_name || place.address_name}</S.PlaceSearchResultAddress></S.PlaceSearchResult>)}</S.PlaceSearchResults> : null}{hasSelectedPlace ? <S.SelectedPlaceSummary><strong>선택한 장소</strong><S.SelectedPlaceNameField htmlFor="merchant-place-name">장소명<Store.Input id="merchant-place-name" value={placeName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setPlaceName(event.target.value)} /></S.SelectedPlaceNameField><S.SelectedPlaceAddress><span>{roadAddress || jibunAddress}</span>{jibunAddress && roadAddress ? <small>{jibunAddress}</small> : null}{postalCode ? <small>우편번호 {postalCode}</small> : null}</S.SelectedPlaceAddress></S.SelectedPlaceSummary> : null}</S.PlaceSearchField>
          </S.Section>
          {!isManualPlaceEntry ? <S.ManualEntryPrompt><span>검색 결과에 없거나 주소를 수정해야 하나요?</span><S.ManualEntryButton type="button" disabled={!editable || activeAction !== null} onClick={() => { selectedKakaoPlaceIdRef.current = null; setPlaceSearchResults([]); setPlaceSearchMessage(''); setFormError(''); setIsManualPlaceEntry(true) }}>직접 입력</S.ManualEntryButton></S.ManualEntryPrompt> : null}
          {isManualPlaceEntry ? <S.Section><S.SectionLegend>장소 직접 입력</S.SectionLegend><S.SectionHint>검색 결과에 없는 장소는 주소와 위치를 직접 등록할 수 있습니다.</S.SectionHint><Store.Field $wide>장소명<Store.Input value={placeName} maxLength={100} disabled={!editable || activeAction !== null} onChange={(event) => setPlaceName(event.target.value)} /></Store.Field><Store.Field $wide>도로명 주소<Store.Input value={roadAddress} maxLength={255} disabled={!editable || activeAction !== null} onChange={(event) => setRoadAddress(event.target.value)} /></Store.Field><Store.Field $wide>지번 주소<Store.Input value={jibunAddress} maxLength={255} disabled={!editable || activeAction !== null} onChange={(event) => setJibunAddress(event.target.value)} /></Store.Field><Store.Field>우편번호<Store.Input value={postalCode} maxLength={20} disabled={!editable || activeAction !== null} onChange={(event) => setPostalCode(event.target.value)} /></Store.Field></S.Section> : null}
          <S.Section><S.SectionLegend>장소 정보</S.SectionLegend><S.SectionHint>카테고리와 방문자에게 표시할 가게 소개를 입력하세요.</S.SectionHint>
        <Store.Field $wide>카테고리<S.CategoryDropdown ref={categoryDropdownRef}><S.CategoryTrigger type="button" aria-haspopup="listbox" aria-expanded={isCategoryMenuOpen} disabled={!editable || activeAction !== null} onClick={() => setIsCategoryMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setIsCategoryMenuOpen(false); if (event.key === 'ArrowDown') { event.preventDefault(); setIsCategoryMenuOpen(true) } }}><span>{CATEGORIES.find((item) => item.value === category)?.label}</span><span aria-hidden="true">{isCategoryMenuOpen ? 'expand_less' : 'expand_more'}</span></S.CategoryTrigger>{isCategoryMenuOpen ? <S.CategoryMenu role="listbox" aria-label="장소 카테고리">{CATEGORIES.map((item) => <S.CategoryOption type="button" role="option" key={item.value} $selected={category === item.value} aria-selected={category === item.value} onClick={() => { setCategory(item.value); setIsCategoryMenuOpen(false) }}>{item.label}</S.CategoryOption>)}</S.CategoryMenu> : null}</S.CategoryDropdown><S.SectionHint>카카오 장소 카테고리와 일치하면 자동으로 선택됩니다.</S.SectionHint></Store.Field>
        <Store.Field $wide>장소 소개<Store.Textarea value={description} maxLength={1000} disabled={!editable || activeAction !== null} onChange={(event) => setDescription(event.target.value)} /><S.SectionHint>{description.length}/1000</S.SectionHint></Store.Field>
          </S.Section>
          <S.Section><S.SectionLegend>연락처</S.SectionLegend><S.SectionHint>사업장 연락처는 방문자에게 표시되고, 신청자 연락처는 심사와 보완 요청에만 사용됩니다.</S.SectionHint>
        <Store.Field>사업장 연락처<Store.Input id="merchant-business-phone" type="tel" inputMode="tel" value={businessPhone} maxLength={30} placeholder="+821012345678" disabled={!editable || activeAction !== null} onChange={(event) => updateBusinessPhone(event.target.value)} /><S.SectionHint>방문자에게 표시될 가게 대표 연락처입니다.</S.SectionHint></Store.Field>
        <S.ContactField><S.ContactFieldLabel htmlFor="merchant-applicant-phone">신청자 연락처</S.ContactFieldLabel><Store.Input id="merchant-applicant-phone" type="tel" inputMode="tel" value={applicantPhone} maxLength={30} placeholder="+821012345678" disabled={!editable || activeAction !== null || isApplicantPhoneSame} onChange={(event) => setApplicantPhone(event.target.value)} /><S.SameContactCheck><input type="checkbox" checked={isApplicantPhoneSame} disabled={!editable || activeAction !== null} onChange={(event) => toggleApplicantPhoneSame(event.target.checked)} />사업장 연락처와 동일</S.SameContactCheck><S.SectionHint>심사와 보완 요청을 위한 연락처이며 방문자에게 공개되지 않습니다.</S.SectionHint></S.ContactField>
          </S.Section>
          <S.Section><S.SectionLegend>영업시간과 특징</S.SectionLegend><S.SectionHint>영업일마다 영업, 휴무, 24시간 중 하나를 선택하세요.</S.SectionHint>
        <Store.Field $wide><S.ScheduleList>{schedule.map((day) => <S.ScheduleRow key={day.dayOfWeek}><S.DayName>{DAYS.find((item) => item.value === day.dayOfWeek)?.label}</S.DayName><S.DayStatus>{([['OPEN', '영업'], ['CLOSED', '휴무'], ['OPEN_24_HOURS', '24시간']] as const).map(([value, label]) => <S.DayStatusButton type="button" key={value} $selected={day.status === value} disabled={!editable || activeAction !== null} onClick={() => updateSchedule(day.dayOfWeek, { status: value })}>{label}</S.DayStatusButton>)}</S.DayStatus><S.ScheduleTimeControls><AdminTimePicker ariaLabel={`${DAYS.find((item) => item.value === day.dayOfWeek)?.label}요일 영업 시작 시간`} value={day.opensAt} disabled={day.status !== 'OPEN' || !editable || activeAction !== null} onChange={(value) => updateSchedule(day.dayOfWeek, { opensAt: value })} /><span aria-hidden="true">-</span><AdminTimePicker ariaLabel={`${DAYS.find((item) => item.value === day.dayOfWeek)?.label}요일 영업 종료 시간`} value={day.closesAt} disabled={day.status !== 'OPEN' || !editable || activeAction !== null} onChange={(value) => updateSchedule(day.dayOfWeek, { closesAt: value })} /></S.ScheduleTimeControls></S.ScheduleRow>)}</S.ScheduleList></Store.Field>
        <Store.Field $wide><S.TagList>{TAGS.map((tag) => <S.TagButton type="button" key={tag.value} $selected={tags.includes(tag.value)} disabled={!editable || activeAction !== null} onClick={() => toggleTag(tag.value)}>{tag.label}</S.TagButton>)}</S.TagList></Store.Field>
          </S.Section>
          <S.Section><S.SectionLegend>증빙 파일</S.SectionLegend><S.AttachmentNotice>{hasExistingAttachments ? '기존 증빙 서류는 보존됩니다. 첨부 파일 수정 기능은 별도 업로드 계약과 함께 제공됩니다.' : '증빙 서류 업로드 기능이 준비되기 전에는 신청서를 임시 저장만 할 수 있습니다.'}{registration?.attachments.length ? <ul>{registration.attachments.map((attachment) => <li key={attachment.id}>{attachment.originalFilename} · {attachment.documentType}</li>)}</ul> : null}</S.AttachmentNotice></S.Section>
        </S.FormSections>
        <S.MapPanel $active={isLocationEntryActive}>
          <S.MapHeading>
            <div>
              <S.MapTitle>장소 위치</S.MapTitle>
              <S.MapDescription>{isLocationEntryActive ? '지도를 클릭하면 핀 위치를 조정할 수 있습니다.' : '장소 검색 또는 직접 입력 후 위치를 선택하세요.'}</S.MapDescription>
            </div>
            <S.MapStatus $hasLocation={isLocationEntryActive && hasValidCoordinate}>{isLocationEntryActive && hasValidCoordinate ? '위치 선택됨' : '장소 선택 필요'}</S.MapStatus>
          </S.MapHeading>
          <S.MapViewport $active={isLocationEntryActive}><S.LocationMap $active={isLocationEntryActive} ref={mapRef} markers={marker} activeMarkerId={marker.length ? 1 : null} fitBoundsKey={hasValidCoordinate ? `${numericLatitude}:${numericLongitude}` : ''} onMapReady={() => setIsMapReady(true)} onMapClick={editable && activeAction === null && isLocationEntryActive ? ({ latitude: nextLatitude, longitude: nextLongitude }) => { selectedKakaoPlaceIdRef.current = null; setLatitude(nextLatitude.toFixed(6)); setLongitude(nextLongitude.toFixed(6)); setFormError('') } : undefined} />{!isLocationEntryActive ? <S.MapIdleOverlay><span aria-hidden="true">search</span><strong>장소 검색 또는 직접 입력 후 위치 선택</strong></S.MapIdleOverlay> : null}</S.MapViewport>
          <S.CoordinateText>{isLocationEntryActive && hasValidCoordinate ? `선택 위치: ${numericLatitude.toFixed(6)}, ${numericLongitude.toFixed(6)}` : isLocationEntryActive ? '지도를 클릭해 핀 위치를 선택하세요.' : '장소를 먼저 검색하거나 직접 입력하세요.'}</S.CoordinateText>
          {isLocationEntryActive ? <S.CoordinateDetails>
            <summary>좌표 직접 입력</summary>
            <S.CoordinateFields>
              <Store.Field>위도<Store.Input inputMode="decimal" value={latitude} placeholder="예: 37.566500" disabled={!editable || activeAction !== null} onChange={(event) => { selectedKakaoPlaceIdRef.current = null; setLatitude(event.target.value) }} /></Store.Field>
              <Store.Field>경도<Store.Input inputMode="decimal" value={longitude} placeholder="예: 126.978000" disabled={!editable || activeAction !== null} onChange={(event) => { selectedKakaoPlaceIdRef.current = null; setLongitude(event.target.value) }} /></Store.Field>
            </S.CoordinateFields>
          </S.CoordinateDetails> : null}
        </S.MapPanel>
      </S.FormWorkspace>
      {formError ? <Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{formError}</Store.Notice> : null}
      <S.FormActions>
        {registration?.status === 'REJECTED' ? <S.SecondaryButton type="button" disabled={activeAction !== null} onClick={() => void onReopen(registration.id)}>{activeAction === 'reopen' ? '다시 여는 중' : '신청서 다시 열기'}</S.SecondaryButton> : null}
        {registration?.status === 'APPROVED' ? <Store.SaveButton type="button" disabled={activeAction !== null} onClick={() => { if (window.confirm('승인된 신청서를 실제 장소로 등록할까요?')) void onComplete(registration.id) }}>{activeAction === 'complete' ? '등록 중' : '장소 등록 완료'}</Store.SaveButton> : null}
        {registration && (registration.status === 'DRAFT' || registration.status === 'PENDING') ? <S.DangerButton type="button" disabled={activeAction !== null} onClick={() => { if (window.confirm('이 신규 장소 등록 신청을 취소할까요?')) void onCancel(registration.id) }}>{activeAction === 'cancel' ? '취소 중' : '신청 취소'}</S.DangerButton> : null}
        {editable ? <><S.SecondaryButton type="submit" disabled={activeAction !== null}>{activeAction === 'save' ? '저장 중' : '임시 저장'}</S.SecondaryButton><Store.SaveButton type="button" disabled title="증빙 서류 업로드 기능이 준비된 뒤 심사 요청할 수 있습니다.">첨부 업로드 준비 중</Store.SaveButton></> : null}
        {canSubmitExistingAttachments ? <Store.SaveButton type="button" disabled={activeAction !== null} onClick={() => void submit()}>{activeAction === 'submit' ? '제출 중' : '심사 요청'}</Store.SaveButton> : null}
      </S.FormActions>
    </S.RegistrationForm>
  )
}

function MerchantPlaceRegistrationPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const registration = useMerchantPlaceRegistrations()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedRegistration = useMemo(() => registration.registrations.find((item) => item.id === selectedId) ?? null, [registration.registrations, selectedId])
  const isConnectedPlace = Boolean(
    selectedRegistration?.registeredPlaceId && registration.profile?.placeIds.includes(selectedRegistration.registeredPlaceId),
  )
  const handleLogout = () => { void logout(); navigate('/login', { replace: true }) }

  if (registration.status === 'error') {
    return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>신규 장소 등록</Store.PageTitle></div></Store.PageIntro><Store.Notice $tone="error" role="alert"><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{registration.errorMessage}</Store.Notice><div style={{ marginTop: 16 }}><Store.RetryButton type="button" onClick={() => void registration.fetchRegistrations()}>다시 시도</Store.RetryButton></div></Store.Content></Store.Page>
  }

  return <Store.Page><Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.HeaderUser><Store.AccountIcon aria-hidden="true">storefront</Store.AccountIcon><strong>{registration.profile?.displayName || user?.username || '상점주'}</strong><Store.LogoutButton type="button" onClick={handleLogout}>로그아웃</Store.LogoutButton></Store.HeaderUser></Store.Header><Store.Content><Store.PageIntro><div><Store.PageTitle>신규 장소 등록</Store.PageTitle><Store.PageDescription>아직 등록되지 않은 가게를 신청하세요. 이미 등록된 장소라면 기존 장소 운영 신청을 이용해야 합니다.</Store.PageDescription></div><Store.QuickLinks aria-label="신청 내역 새로고침"><Store.QuickLink type="button" onClick={() => void registration.fetchRegistrations()}>새로고침</Store.QuickLink></Store.QuickLinks></Store.PageIntro>
    {registration.errorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{registration.errorMessage}</Store.Notice> : null}
    {registration.actionErrorMessage ? <Store.Notice $tone="error" role="alert" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">error_outline</Store.NoticeIcon>{registration.actionErrorMessage}</Store.Notice> : null}
    {registration.successMessage ? <Store.Notice $tone="success" role="status" style={{ marginBottom: 16 }}><Store.NoticeIcon aria-hidden="true">check_circle</Store.NoticeIcon>{registration.successMessage}</Store.Notice> : null}
    {isConnectedPlace ? <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Store.SaveButton type="button" onClick={() => navigate('/merchant')}>연결된 가게 관리</Store.SaveButton></div> : null}
    <S.Layout><S.RegistrationPanel><S.PanelHeading><div><S.PanelTitle>{selectedRegistration ? '등록 신청 상세' : '장소 정보 입력'}</S.PanelTitle><S.PanelDescription>{selectedRegistration ? `신청 번호 #${selectedRegistration.id} · 마지막 수정 ${formatDate(selectedRegistration.updatedAt)}` : '기본 정보, 위치, 영업시간을 입력한 뒤 심사를 요청하세요.'}</S.PanelDescription></div>{selectedRegistration ? <S.StatusBadge $tone={STATUS[selectedRegistration.status].tone}>{STATUS[selectedRegistration.status].label}</S.StatusBadge> : null}</S.PanelHeading><RegistrationForm key={selectedRegistration?.id ?? 'new'} registration={selectedRegistration} profile={registration.profile} activeAction={registration.activeAction} onSave={async (id, request) => { const next = await registration.saveRegistration(id, request); if (next) setSelectedId(next.id); return next }} onSubmit={registration.submitRegistration} onReopen={registration.reopenRegistration} onComplete={registration.completeRegistration} onCancel={registration.cancelRegistration} /></S.RegistrationPanel>{registration.registrations.length > 0 ? <S.HistoryPanel><S.PanelHeading><div><S.PanelTitle>등록 신청 내역</S.PanelTitle><S.PanelDescription>작성 중이거나 처리된 신청서를 선택해 확인할 수 있습니다.</S.PanelDescription></div></S.PanelHeading><S.ApplicationList>{registration.registrations.map((item) => <S.ApplicationItem type="button" key={item.id} $selected={item.id === selectedId} onClick={() => { setSelectedId(item.id); void registration.selectRegistration(item.id) }}><S.ApplicationTop><S.ApplicationName>{item.placeName}</S.ApplicationName><S.StatusBadge $tone={STATUS[item.status].tone}>{STATUS[item.status].label}</S.StatusBadge></S.ApplicationTop><S.ApplicationMeta>{CATEGORIES.find((categoryItem) => categoryItem.value === item.category)?.label ?? item.category} · {formatDate(item.updatedAt)}</S.ApplicationMeta></S.ApplicationItem>)}</S.ApplicationList><S.NewApplicationButton type="button" onClick={() => setSelectedId(null)}>새 장소 등록 신청</S.NewApplicationButton></S.HistoryPanel> : null}</S.Layout>
  </Store.Content></Store.Page>
}

export default MerchantPlaceRegistrationPage
