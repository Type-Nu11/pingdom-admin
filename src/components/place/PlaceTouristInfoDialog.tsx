import { useEffect, useRef, useState } from 'react'
import type {
  AdminPlaceDetail,
  AdminPlaceTouristCategory,
  AdminPlaceTouristInfoUpdateRequest,
} from '../../types/adminPlace.types'
import * as S from '../../pages/place/PlaceManagePage.styles'

const TOURIST_CATEGORY_OPTIONS: Array<{
  value: AdminPlaceTouristCategory
  label: string
}> = [
  { value: 'K_POP', label: 'K-POP' },
  { value: 'BEAUTY', label: '뷰티' },
  { value: 'FASHION', label: '패션' },
  { value: 'CAFE', label: '카페' },
  { value: 'FOOD', label: '음식' },
  { value: 'POP_UP', label: '팝업' },
  { value: 'EXHIBITION', label: '전시' },
  { value: 'NIGHTLIFE', label: '나이트라이프' },
  { value: 'OTHER', label: '기타' },
]

interface PlaceTouristInfoDialogProps {
  place: AdminPlaceDetail
  isSaving: boolean
  errorMessage: string
  onClose: () => void
  onSubmit: (
    placeId: number,
    payload: AdminPlaceTouristInfoUpdateRequest
  ) => Promise<boolean>
}

export function PlaceTouristInfoDialog({
  place,
  isSaving,
  errorMessage,
  onClose,
  onSubmit,
}: PlaceTouristInfoDialogProps) {
  const [englishName, setEnglishName] = useState(place.englishName ?? '')
  const [touristSummary, setTouristSummary] = useState(place.touristSummary ?? '')
  const [touristCategories, setTouristCategories] = useState<AdminPlaceTouristCategory[]>(
    place.touristCategories ?? []
  )
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

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
      if (event.key === 'Escape' && !isSaving) {
        onClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSaving, onClose])

  const handleClose = () => {
    if (!isSaving) {
      onClose()
    }
  }

  const handleCategoryChange = (
    category: AdminPlaceTouristCategory,
    checked: boolean
  ) => {
    setTouristCategories((current) =>
      checked
        ? current.includes(category)
          ? current
          : [...current, category]
        : current.filter((item) => item !== category)
    )
    setFormError('')
  }

  const handleSubmit = async () => {
    if (isSaving) {
      return
    }

    if (!reason.trim()) {
      setFormError('수정 사유를 입력해주세요.')
      return
    }

    setFormError('')
    const isSuccess = await onSubmit(place.id, {
      englishName: englishName.trim() || null,
      touristSummary: touristSummary.trim() || null,
      touristCategories,
      reason: reason.trim(),
    })

    if (isSuccess) {
      onClose()
    }
  }

  return (
    <S.OperatingDialogOverlay role="presentation" onMouseDown={handleClose}>
      <S.OperatingDialog
        $wide
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-tourist-info-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <S.OperatingDialogHeader>
          <div>
            <S.OperatingDialogEyebrow>관광 정보</S.OperatingDialogEyebrow>
            <S.OperatingDialogTitle id="place-tourist-info-dialog-title">
              {place.name} 관광 정보 수정
            </S.OperatingDialogTitle>
          </div>
          <S.OperatingDialogCloseButton
            ref={closeButtonRef}
            type="button"
            aria-label="관광 정보 수정 닫기"
            disabled={isSaving}
            onClick={handleClose}
          >
            <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
          </S.OperatingDialogCloseButton>
        </S.OperatingDialogHeader>

        <S.OperatingDialogBody>
          <S.OperatingDialogDescription>
            앱에서 해외 방문자에게 제공할 영문 이름, 관광 요약, 관심 카테고리를
            관리합니다. 비워서 저장한 이름과 요약은 기존 값에서 제거됩니다.
          </S.OperatingDialogDescription>

          <S.OperatingFormField>
            <span>영문 장소명</span>
            <S.OperatingTextInput
              value={englishName}
              maxLength={150}
              placeholder="예: Gyeongbokgung Palace"
              disabled={isSaving}
              onChange={(event) => {
                setEnglishName(event.target.value)
                setFormError('')
              }}
            />
            <small>{englishName.length}/150</small>
          </S.OperatingFormField>

          <S.OperatingFormField>
            <span>관광 요약</span>
            <S.OperatingTextArea
              value={touristSummary}
              maxLength={500}
              placeholder="관광객이 장소를 이해하는 데 필요한 핵심 정보를 입력해주세요."
              disabled={isSaving}
              onChange={(event) => {
                setTouristSummary(event.target.value)
                setFormError('')
              }}
            />
            <small>{touristSummary.length}/500</small>
          </S.OperatingFormField>

          <S.OperatingFormField as="fieldset">
            <legend>관광 카테고리</legend>
            <S.OperatingCategoryGrid>
              {TOURIST_CATEGORY_OPTIONS.map((option) => {
                const isSelected = touristCategories.includes(option.value)

                return (
                  <S.OperatingCategoryOption key={option.value} $selected={isSelected}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isSaving}
                      onChange={(event) =>
                        handleCategoryChange(option.value, event.target.checked)
                      }
                    />
                    <span>{option.label}</span>
                  </S.OperatingCategoryOption>
                )
              })}
            </S.OperatingCategoryGrid>
            <small>{touristCategories.length}/9</small>
          </S.OperatingFormField>

          <S.OperatingFormField>
            <span>수정 사유 *</span>
            <S.OperatingTextArea
              value={reason}
              maxLength={500}
              placeholder="관광 정보를 수정하는 이유를 입력해주세요."
              disabled={isSaving}
              onChange={(event) => {
                setReason(event.target.value)
                setFormError('')
              }}
            />
            <small>{reason.length}/500</small>
          </S.OperatingFormField>

          {formError || errorMessage ? (
            <S.OperatingFormNotice role="alert">
              {formError || errorMessage}
            </S.OperatingFormNotice>
          ) : null}
        </S.OperatingDialogBody>

        <S.OperatingDialogActions>
          <S.SecondaryButton type="button" disabled={isSaving} onClick={handleClose}>
            취소
          </S.SecondaryButton>
          <S.OperatingPrimaryButton
            type="button"
            disabled={isSaving}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? '저장 중' : '관광 정보 저장'}
          </S.OperatingPrimaryButton>
        </S.OperatingDialogActions>
      </S.OperatingDialog>
    </S.OperatingDialogOverlay>
  )
}
