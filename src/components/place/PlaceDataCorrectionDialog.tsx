import { useEffect, useRef, useState, type FormEvent } from 'react'
import type {
  AdminPlaceBasicInformationUpdateRequest,
  AdminPlaceCoordinatesUpdateRequest,
  AdminPlaceDetail,
  AdminPlaceGeocodingUpdateRequest,
  AdminPlaceKakaoPlaceIdUpdateRequest,
  AdminPlaceStandardCategory,
} from '../../types/adminPlace.types'
import * as S from '../../pages/place/PlaceManagePage.styles'

export type PlaceDataCorrectionAction =
  | 'basic-information'
  | 'geocoding'
  | 'coordinates'
  | 'kakao-place-id'

interface PlaceDataCorrectionDialogProps {
  place: AdminPlaceDetail
  updatingAction: PlaceDataCorrectionAction | null
  errorMessages: Record<PlaceDataCorrectionAction, string>
  onClearError: (action: PlaceDataCorrectionAction) => void
  onClose: () => void
  onUpdateBasicInformation: (
    payload: AdminPlaceBasicInformationUpdateRequest
  ) => Promise<boolean>
  onUpdateKakaoPlaceId: (
    payload: AdminPlaceKakaoPlaceIdUpdateRequest
  ) => Promise<boolean>
  onUpdateCoordinates: (
    payload: AdminPlaceCoordinatesUpdateRequest
  ) => Promise<boolean>
  onUpdateGeocoding: (
    payload: AdminPlaceGeocodingUpdateRequest
  ) => Promise<boolean>
}

const MODES: Array<{
  value: PlaceDataCorrectionAction
  label: string
  description: string
}> = [
  {
    value: 'basic-information',
    label: '기본 정보',
    description: '장소명과 표준 카테고리를 함께 보정합니다.',
  },
  {
    value: 'geocoding',
    label: '주소·좌표',
    description: '대표 주소와 정규화 주소, 좌표를 함께 보정합니다.',
  },
  {
    value: 'coordinates',
    label: '좌표만',
    description: '주소는 유지하고 지도 좌표만 보정합니다.',
  },
  {
    value: 'kakao-place-id',
    label: 'Kakao ID',
    description: 'Kakao 장소 연결을 변경하거나 해제합니다.',
  },
]

const BASIC_INFORMATION_CATEGORY_OPTIONS: Array<{
  value: AdminPlaceStandardCategory
  label: string
}> = [
  { value: 'RESTAURANT', label: '음식점' },
  { value: 'MUSIC', label: '음악' },
  { value: 'POP_UP', label: '팝업' },
  { value: 'FASHION', label: '패션' },
  { value: 'BEAUTY', label: '뷰티' },
  { value: 'EXHIBITION', label: '전시' },
  { value: 'CAFE', label: '카페' },
  { value: 'CULTURAL_HERITAGE', label: '문화재' },
  { value: 'OTHER', label: '기타' },
]

const CATEGORY_CODE_BY_LABEL: Record<string, AdminPlaceStandardCategory> = {
  음식점: 'RESTAURANT',
  음악: 'MUSIC',
  팝업: 'POP_UP',
  패션: 'FASHION',
  뷰티: 'BEAUTY',
  전시: 'EXHIBITION',
  카페: 'CAFE',
  문화재: 'CULTURAL_HERITAGE',
  기타: 'OTHER',
}

function getStandardCategory(value?: string | null): AdminPlaceStandardCategory | '' {
  const normalizedValue = value?.trim().replace(/[\s-]+/g, '_').toUpperCase()
  const matchingOption = BASIC_INFORMATION_CATEGORY_OPTIONS.find(
    (option) => option.value === normalizedValue
  )

  return matchingOption?.value ?? CATEGORY_CODE_BY_LABEL[value?.trim() ?? ''] ?? ''
}

function isCoordinateInRange(value: string, min: number, max: number) {
  const numberValue = Number(value)
  return (
    value.trim() !== '' &&
    Number.isFinite(numberValue) &&
    numberValue >= min &&
    numberValue <= max
  )
}

function formatCoordinate(value: number) {
  return Number.isFinite(value) ? value.toFixed(6) : '-'
}

export function PlaceDataCorrectionDialog({
  place,
  updatingAction,
  errorMessages,
  onClearError,
  onClose,
  onUpdateBasicInformation,
  onUpdateKakaoPlaceId,
  onUpdateCoordinates,
  onUpdateGeocoding,
}: PlaceDataCorrectionDialogProps) {
  const [mode, setMode] = useState<PlaceDataCorrectionAction>('basic-information')
  const [name, setName] = useState(place.name)
  const [category, setCategory] = useState<AdminPlaceStandardCategory | ''>(() =>
    getStandardCategory(place.category ?? place.categoryName)
  )
  const [kakaoPlaceId, setKakaoPlaceId] = useState(place.kakaoPlaceId ?? '')
  const [address, setAddress] = useState(place.address ?? '')
  const [roadAddress, setRoadAddress] = useState(place.roadAddress ?? '')
  const [jibunAddress, setJibunAddress] = useState(place.jibunAddress ?? '')
  const [postalCode, setPostalCode] = useState(place.postalCode ?? '')
  const [latitude, setLatitude] = useState(String(place.latitude))
  const [longitude, setLongitude] = useState(String(place.longitude))
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const isSubmitting = updatingAction !== null

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    closeButtonRef.current?.focus()

    return () => {
      previouslyFocusedElement?.focus()
    }
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSubmitting, onClose])

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const clearMessages = () => {
    setFormError('')
    onClearError(mode)
  }

  const changeMode = (nextMode: PlaceDataCorrectionAction) => {
    if (isSubmitting) {
      return
    }

    setMode(nextMode)
    setFormError('')
    onClearError(nextMode)
  }

  const handleKakaoPlaceIdSubmit = async () => {
    const nextKakaoPlaceId = kakaoPlaceId.trim()

    if (nextKakaoPlaceId.length > 50) {
      setFormError('Kakao place id는 50자 이하여야 합니다.')
      return
    }

    if ((place.kakaoPlaceId ?? '') === nextKakaoPlaceId) {
      setFormError('현재 Kakao place id와 다른 값을 입력해주세요.')
      return
    }

    if (await onUpdateKakaoPlaceId({ kakaoPlaceId: nextKakaoPlaceId })) {
      onClose()
    }
  }

  const handleBasicInformationSubmit = async () => {
    const nextName = name.trim()
    const nextReason = reason.trim()
    const currentCategory = getStandardCategory(place.category ?? place.categoryName)

    if (!nextName) {
      setFormError('장소명을 입력해주세요.')
      return
    }
    if (nextName.length > 100) {
      setFormError('장소명은 100자 이하여야 합니다.')
      return
    }
    if (!nextReason) {
      setFormError('기본 정보 보정 사유를 입력해주세요.')
      return
    }
    if (nextReason.length > 500) {
      setFormError('보정 사유는 500자 이하여야 합니다.')
      return
    }
    if (!category) {
      setFormError('표준 카테고리를 선택해주세요.')
      return
    }
    if (nextName === place.name && category === currentCategory) {
      setFormError('현재 장소명 또는 카테고리와 다른 값을 입력해주세요.')
      return
    }

    if (
      await onUpdateBasicInformation({
        name: nextName,
        category,
        reason: nextReason,
      })
    ) {
      onClose()
    }
  }

  const getCoordinatePayload = () => {
    if (!isCoordinateInRange(latitude, -90, 90)) {
      setFormError('위도는 -90 이상 90 이하의 숫자로 입력해주세요.')
      return null
    }

    if (!isCoordinateInRange(longitude, -180, 180)) {
      setFormError('경도는 -180 이상 180 이하의 숫자로 입력해주세요.')
      return null
    }

    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
    }
  }

  const handleCoordinatesSubmit = async () => {
    const payload = getCoordinatePayload()
    if (!payload) {
      return
    }

    if (place.latitude === payload.latitude && place.longitude === payload.longitude) {
      setFormError('현재 좌표와 다른 값을 입력해주세요.')
      return
    }

    if (await onUpdateCoordinates(payload)) {
      onClose()
    }
  }

  const handleGeocodingSubmit = async () => {
    const coordinatePayload = getCoordinatePayload()
    if (!coordinatePayload) {
      return
    }

    const nextAddress = address.trim()
    const nextRoadAddress = roadAddress.trim()
    const nextJibunAddress = jibunAddress.trim()
    const nextPostalCode = postalCode.trim()
    const nextReason = reason.trim()

    if (!nextAddress) {
      setFormError('대표 주소를 입력해주세요.')
      return
    }
    if (
      nextAddress.length > 255 ||
      nextRoadAddress.length > 255 ||
      nextJibunAddress.length > 255
    ) {
      setFormError('주소는 각 항목별로 255자 이하여야 합니다.')
      return
    }
    if (nextPostalCode.length > 20) {
      setFormError('우편번호는 20자 이하여야 합니다.')
      return
    }
    if (!nextReason) {
      setFormError('주소·좌표 보정 사유를 입력해주세요.')
      return
    }

    const hasChanged =
      nextAddress !== (place.address ?? '') ||
      nextRoadAddress !== (place.roadAddress ?? '') ||
      nextJibunAddress !== (place.jibunAddress ?? '') ||
      nextPostalCode !== (place.postalCode ?? '') ||
      coordinatePayload.latitude !== place.latitude ||
      coordinatePayload.longitude !== place.longitude

    if (!hasChanged) {
      setFormError('현재 주소 또는 좌표와 다른 값을 입력해주세요.')
      return
    }

    if (
      await onUpdateGeocoding({
        address: nextAddress,
        roadAddress: nextRoadAddress,
        jibunAddress: nextJibunAddress,
        postalCode: nextPostalCode,
        ...coordinatePayload,
        reason: nextReason,
      })
    ) {
      onClose()
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setFormError('')
    onClearError(mode)

    if (mode === 'basic-information') {
      await handleBasicInformationSubmit()
    } else if (mode === 'kakao-place-id') {
      await handleKakaoPlaceIdSubmit()
    } else if (mode === 'coordinates') {
      await handleCoordinatesSubmit()
    } else {
      await handleGeocodingSubmit()
    }
  }

  return (
    <S.OperatingDialogOverlay role="presentation" onMouseDown={handleClose}>
      <S.OperatingDialog
        as="form"
        $wide
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-data-correction-title"
        onSubmit={(event) => void handleSubmit(event)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <S.OperatingDialogHeader>
          <div>
            <S.OperatingDialogEyebrow>데이터 품질</S.OperatingDialogEyebrow>
            <S.OperatingDialogTitle id="place-data-correction-title">
              {place.name} 정보 보정
            </S.OperatingDialogTitle>
          </div>
          <S.OperatingDialogCloseButton
            ref={closeButtonRef}
            type="button"
            aria-label="장소 정보 보정 닫기"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
          </S.OperatingDialogCloseButton>
        </S.OperatingDialogHeader>

        <S.OperatingDialogBody>
          <S.OperatingDialogDescription>
            장소 기본 정보와 식별자, 주소·좌표 중 필요한 범위만 선택해 보정합니다.
            변경 결과는 저장 즉시 목록과 지도 마커에 반영됩니다.
          </S.OperatingDialogDescription>

          <S.OperatingActionTabs $columns={4} role="tablist" aria-label="정보 보정 방식">
            {MODES.map((option) => (
              <S.OperatingActionTab
                key={option.value}
                type="button"
                role="tab"
                aria-selected={mode === option.value}
                $active={mode === option.value}
                disabled={isSubmitting}
                onClick={() => changeMode(option.value)}
              >
                {option.label}
              </S.OperatingActionTab>
            ))}
          </S.OperatingActionTabs>
          <S.OperatingInfoNotice>
            {MODES.find((option) => option.value === mode)?.description}
          </S.OperatingInfoNotice>

          {mode === 'basic-information' ? (
            <>
              <S.OperatingFormField>
                <span>장소명 *</span>
                <S.OperatingTextInput
                  value={name}
                  maxLength={100}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setName(event.target.value)
                    clearMessages()
                  }}
                />
                <small>{name.length}/100</small>
              </S.OperatingFormField>
              <S.OperatingFormField>
                <span>표준 카테고리 *</span>
                <S.OperatingSelect
                  value={category}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setCategory(event.target.value as AdminPlaceStandardCategory)
                    clearMessages()
                  }}
                >
                  <option value="" disabled>
                    카테고리를 선택해주세요.
                  </option>
                  {BASIC_INFORMATION_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </S.OperatingSelect>
              </S.OperatingFormField>
              <S.OperatingFormField>
                <span>보정 사유 *</span>
                <S.OperatingTextArea
                  value={reason}
                  maxLength={500}
                  placeholder="정보 출처와 보정 이유를 입력해주세요."
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setReason(event.target.value)
                    clearMessages()
                  }}
                />
                <small>{reason.length}/500</small>
              </S.OperatingFormField>
            </>
          ) : mode === 'kakao-place-id' ? (
            <>
              <S.OperatingComparisonGrid>
                <S.OperatingComparisonItem>
                  <span>현재 연결</span>
                  <strong>{place.kakaoPlaceId || '연결 정보 없음'}</strong>
                </S.OperatingComparisonItem>
                <S.OperatingComparisonArrow aria-hidden="true">
                  arrow_forward
                </S.OperatingComparisonArrow>
                <S.OperatingComparisonItem $changed>
                  <span>변경 후</span>
                  <strong>{kakaoPlaceId.trim() || '연결 해제'}</strong>
                </S.OperatingComparisonItem>
              </S.OperatingComparisonGrid>
              <S.OperatingFormField>
                <span>Kakao place ID</span>
                <S.OperatingTextInput
                  value={kakaoPlaceId}
                  maxLength={50}
                  placeholder="비워서 저장하면 기존 연결을 해제합니다."
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setKakaoPlaceId(event.target.value)
                    clearMessages()
                  }}
                />
                <small>{kakaoPlaceId.length}/50</small>
              </S.OperatingFormField>
            </>
          ) : (
            <>
              {mode === 'geocoding' ? (
                <>
                  <S.OperatingFormField>
                    <span>대표 주소 *</span>
                    <S.OperatingTextInput
                      value={address}
                      maxLength={255}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setAddress(event.target.value)
                        clearMessages()
                      }}
                    />
                    <small>{address.length}/255</small>
                  </S.OperatingFormField>
                  <S.OperatingFieldRow>
                    <S.OperatingFormField>
                      <span>도로명 주소</span>
                      <S.OperatingTextInput
                        value={roadAddress}
                        maxLength={255}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          setRoadAddress(event.target.value)
                          clearMessages()
                        }}
                      />
                    </S.OperatingFormField>
                    <S.OperatingFormField>
                      <span>지번 주소</span>
                      <S.OperatingTextInput
                        value={jibunAddress}
                        maxLength={255}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          setJibunAddress(event.target.value)
                          clearMessages()
                        }}
                      />
                    </S.OperatingFormField>
                  </S.OperatingFieldRow>
                  <S.OperatingFormField>
                    <span>우편번호</span>
                    <S.OperatingTextInput
                      value={postalCode}
                      maxLength={20}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setPostalCode(event.target.value)
                        clearMessages()
                      }}
                    />
                    <small>{postalCode.length}/20</small>
                  </S.OperatingFormField>
                </>
              ) : null}

              <S.OperatingCoordinateComparison>
                <span>
                  현재 {formatCoordinate(place.latitude)}, {formatCoordinate(place.longitude)}
                </span>
                <S.MaterialIcon aria-hidden="true">arrow_forward</S.MaterialIcon>
                <strong>
                  변경 {latitude || '-'}, {longitude || '-'}
                </strong>
              </S.OperatingCoordinateComparison>
              <S.OperatingFieldRow>
                <S.OperatingFormField>
                  <span>위도 *</span>
                  <S.OperatingTextInput
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={latitude}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setLatitude(event.target.value)
                      clearMessages()
                    }}
                  />
                </S.OperatingFormField>
                <S.OperatingFormField>
                  <span>경도 *</span>
                  <S.OperatingTextInput
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={longitude}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setLongitude(event.target.value)
                      clearMessages()
                    }}
                  />
                </S.OperatingFormField>
              </S.OperatingFieldRow>
              {mode === 'geocoding' ? (
                <S.OperatingFormField>
                  <span>보정 사유 *</span>
                  <S.OperatingTextArea
                    value={reason}
                    maxLength={500}
                    placeholder="정보 출처와 보정 이유를 입력해주세요."
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setReason(event.target.value)
                      clearMessages()
                    }}
                  />
                  <small>{reason.length}/500</small>
                </S.OperatingFormField>
              ) : null}
            </>
          )}

          {formError || errorMessages[mode] ? (
            <S.OperatingFormNotice role="alert">
              {formError || errorMessages[mode]}
            </S.OperatingFormNotice>
          ) : null}
        </S.OperatingDialogBody>

        <S.OperatingDialogActions>
          <S.SecondaryButton type="button" disabled={isSubmitting} onClick={handleClose}>
            취소
          </S.SecondaryButton>
          <S.OperatingPrimaryButton type="submit" disabled={isSubmitting}>
            {updatingAction === mode ? '저장 중' : '변경 내용 저장'}
          </S.OperatingPrimaryButton>
        </S.OperatingDialogActions>
      </S.OperatingDialog>
    </S.OperatingDialogOverlay>
  )
}
