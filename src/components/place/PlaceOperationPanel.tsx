import { useEffect, useRef, useState } from 'react'
import {
  AdminDatePicker,
  AdminTimePicker,
} from '../common/AdminDateTimePicker'
import type {
  AdminPlaceDayOfWeek,
  AdminPlaceDetail,
  AdminPlaceDiscoveryStatus,
  AdminPlaceDiscoveryStatusUpdateRequest,
  AdminPlaceOperatingException,
  AdminPlaceOperatingScheduleUpdateRequest,
  AdminPlaceOperatingStatus,
  AdminPlaceOperatingStatusUpdateRequest,
  AdminPlaceRegularOperatingHour,
} from '../../types/adminPlace.types'
import * as S from '../../pages/place/PlaceManagePage.styles'

export type PlaceOperation =
  | 'operating-status'
  | 'discovery-status'
  | 'operating-schedule'

interface PlaceOperationPanelProps {
  action: PlaceOperation
  place: AdminPlaceDetail
  actionErrorMessage: string
  updatingAction: PlaceOperation | null
  onClose: () => void
  onDiscoveryStatusUpdated: (status: AdminPlaceDiscoveryStatus) => void
  onUpdateOperatingStatus: (
    placeId: number,
    payload: AdminPlaceOperatingStatusUpdateRequest
  ) => Promise<boolean>
  onUpdateDiscoveryStatus: (
    placeId: number,
    payload: AdminPlaceDiscoveryStatusUpdateRequest
  ) => Promise<boolean>
  onUpdateOperatingSchedule: (
    placeId: number,
    payload: AdminPlaceOperatingScheduleUpdateRequest
  ) => Promise<boolean>
}

const OPERATING_STATUS_OPTIONS: Array<{
  value: AdminPlaceOperatingStatus
  label: string
}> = [
  { value: 'OPERATING', label: '운영 중' },
  { value: 'TEMPORARILY_CLOSED', label: '임시 휴업' },
  { value: 'PERMANENTLY_CLOSED', label: '영구 폐업' },
]

const DISCOVERY_STATUS_OPTIONS: Array<{
  value: AdminPlaceDiscoveryStatus
  label: string
}> = [
  { value: 'VISIBLE', label: '탐색 노출' },
  { value: 'HIDDEN', label: '탐색 숨김' },
]

const OPERATING_STATUS_DESCRIPTIONS: Record<AdminPlaceOperatingStatus, string> = {
  OPERATING: '앱 장소 조회와 추천에 계속 노출됩니다.',
  TEMPORARILY_CLOSED: '일시적인 휴업 상태로 관리합니다.',
  PERMANENTLY_CLOSED: '앱 장소 조회와 추천에서 숨겨집니다.',
}

const DISCOVERY_STATUS_DESCRIPTIONS: Record<AdminPlaceDiscoveryStatus, string> = {
  VISIBLE: '공개 탐색과 자동완성, 추천 후보에 노출합니다.',
  HIDDEN: '공개 탐색, 자동완성, 북마크 목록, 추천 후보에서 제외합니다.',
}

const DAY_OF_WEEK_OPTIONS: Array<{
  value: AdminPlaceDayOfWeek
  label: string
}> = [
  { value: 'MONDAY', label: '월요일' },
  { value: 'TUESDAY', label: '화요일' },
  { value: 'WEDNESDAY', label: '수요일' },
  { value: 'THURSDAY', label: '목요일' },
  { value: 'FRIDAY', label: '금요일' },
  { value: 'SATURDAY', label: '토요일' },
  { value: 'SUNDAY', label: '일요일' },
]

interface OperatingTimeRangeDraft {
  id: string
  opensAt: string
  closesAt: string
}

interface RegularOperatingDayDraft {
  dayOfWeek: AdminPlaceDayOfWeek
  hours: OperatingTimeRangeDraft[]
}

interface OperatingExceptionDraft {
  id: string
  date: string
  closed: boolean
  hours: OperatingTimeRangeDraft[]
}

let draftId = 0

function createDraftId() {
  draftId += 1
  return `operating-schedule-${draftId}`
}

function getTimeInputValue(value?: string) {
  if (!value) {
    return ''
  }

  return value.match(/^(\d{2}:\d{2})/)?.[1] ?? ''
}

function getApiTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function getDayOfWeekLabel(dayOfWeek: AdminPlaceDayOfWeek) {
  return DAY_OF_WEEK_OPTIONS.find(({ value }) => value === dayOfWeek)?.label ?? dayOfWeek
}

function createOperatingHourDrafts(hours: AdminPlaceRegularOperatingHour[] = []) {
  const hoursByDay = new Map<AdminPlaceDayOfWeek, AdminPlaceRegularOperatingHour[]>()

  hours.forEach((hour) => {
    hoursByDay.set(hour.dayOfWeek, [...(hoursByDay.get(hour.dayOfWeek) ?? []), hour])
  })

  return DAY_OF_WEEK_OPTIONS.map(({ value: dayOfWeek }) => ({
    dayOfWeek,
    hours: (hoursByDay.get(dayOfWeek) ?? []).map((hour) => ({
      id: createDraftId(),
      opensAt: getTimeInputValue(hour.opensAt) || '09:00',
      closesAt: getTimeInputValue(hour.closesAt) || '18:00',
    })),
  }))
}

function createOperatingExceptionDraft(
  exception?: AdminPlaceOperatingException
): OperatingExceptionDraft {
  const hours = (exception?.hours ?? []).map((hour) => ({
    id: createDraftId(),
    opensAt: getTimeInputValue(hour.opensAt) || '09:00',
    closesAt: getTimeInputValue(hour.closesAt) || '18:00',
  }))

  return {
    id: createDraftId(),
    date: exception?.date ?? '',
    closed: exception?.closed ?? true,
    hours:
      exception?.closed || hours.length > 0
        ? hours
        : [{ id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }],
  }
}

function validateSchedule(
  regularHours: RegularOperatingDayDraft[],
  exceptions: OperatingExceptionDraft[],
  reason: string
) {
  if (!reason.trim()) {
    return '수정 사유를 입력해주세요.'
  }

  if (
    regularHours.some((day) =>
      day.hours.some((hour) => !hour.opensAt || !hour.closesAt)
    )
  ) {
    return '영업하는 요일의 시작 시간과 종료 시간을 모두 입력해주세요.'
  }

  const dates = new Set<string>()

  for (const exception of exceptions) {
    if (!exception.date) {
      return '예외 일정의 날짜를 입력해주세요.'
    }

    if (dates.has(exception.date)) {
      return '같은 날짜의 예외 일정은 한 번만 등록할 수 있습니다.'
    }

    dates.add(exception.date)

    if (
      !exception.closed &&
      (exception.hours.length === 0 ||
        exception.hours.some((hour) => !hour.opensAt || !hour.closesAt))
    ) {
      return '대체 영업일의 시작 시간과 종료 시간을 모두 입력해주세요.'
    }
  }

  return ''
}

export function PlaceOperationPanel({
  action,
  place,
  actionErrorMessage,
  updatingAction,
  onClose,
  onDiscoveryStatusUpdated,
  onUpdateOperatingStatus,
  onUpdateDiscoveryStatus,
  onUpdateOperatingSchedule,
}: PlaceOperationPanelProps) {
  const [operatingStatus, setOperatingStatus] = useState(
    place.operatingStatus ?? 'OPERATING'
  )
  const [discoveryStatus, setDiscoveryStatus] = useState(
    place.discoveryStatus ?? 'VISIBLE'
  )
  const [regularHours, setRegularHours] = useState(() =>
    createOperatingHourDrafts(place.regularHours)
  )
  const [exceptions, setExceptions] = useState(() =>
    (place.operatingExceptions ?? []).map(createOperatingExceptionDraft)
  )
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const isSaving = updatingAction === action

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

  const handleSubmitStatus = async () => {
    if (isSaving || place.operatingStatus === operatingStatus) {
      return
    }

    if (!reason.trim()) {
      setFormError('운영 상태 확인 사유를 입력해주세요.')
      return
    }

    setFormError('')
    const isSuccess = await onUpdateOperatingStatus(place.id, {
      operatingStatus,
      reason: reason.trim(),
    })

    if (isSuccess) {
      onClose()
    }
  }

  const handleSubmitDiscovery = async () => {
    if (isSaving || place.discoveryStatus === discoveryStatus) {
      return
    }

    if (!reason.trim()) {
      setFormError('탐색 상태 변경 사유를 입력해주세요.')
      return
    }

    setFormError('')
    const isSuccess = await onUpdateDiscoveryStatus(place.id, {
      discoveryStatus,
      reason: reason.trim(),
    })

    if (isSuccess) {
      onDiscoveryStatusUpdated(discoveryStatus)
      onClose()
    }
  }

  const handleSubmitSchedule = async () => {
    if (isSaving) {
      return
    }

    const validationMessage = validateSchedule(regularHours, exceptions, reason)
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setFormError('')
    const isSuccess = await onUpdateOperatingSchedule(place.id, {
      regularHours: regularHours.flatMap((day) =>
        day.hours.map((hour) => ({
          dayOfWeek: day.dayOfWeek,
          opensAt: getApiTimeValue(hour.opensAt),
          closesAt: getApiTimeValue(hour.closesAt),
        }))
      ),
      exceptions: exceptions.map((exception) => ({
        date: exception.date,
        closed: exception.closed,
        hours: exception.closed
          ? []
          : exception.hours.map((hour) => ({
              opensAt: getApiTimeValue(hour.opensAt),
              closesAt: getApiTimeValue(hour.closesAt),
            })),
      })),
      reason: reason.trim(),
    })

    if (isSuccess) {
      onClose()
    }
  }

  const updateRegularDay = (dayOfWeek: AdminPlaceDayOfWeek, enabled: boolean) => {
    setRegularHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              hours: enabled
                ? day.hours.length > 0
                  ? day.hours
                  : [{ id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }]
                : [],
            }
          : day
      )
    )
  }

  const updateRegularHour = (
    dayOfWeek: AdminPlaceDayOfWeek,
    hourId: string,
    patch: Partial<Pick<OperatingTimeRangeDraft, 'opensAt' | 'closesAt'>>
  ) => {
    setRegularHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              hours: day.hours.map((hour) =>
                hour.id === hourId ? { ...hour, ...patch } : hour
              ),
            }
          : day
      )
    )
  }

  const addRegularHour = (dayOfWeek: AdminPlaceDayOfWeek) => {
    setRegularHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              hours: [
                ...day.hours,
                { id: createDraftId(), opensAt: '09:00', closesAt: '18:00' },
              ],
            }
          : day
      )
    )
  }

  const removeRegularHour = (dayOfWeek: AdminPlaceDayOfWeek, hourId: string) => {
    setRegularHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, hours: day.hours.filter((hour) => hour.id !== hourId) }
          : day
      )
    )
  }

  const updateException = (
    exceptionId: string,
    patch: Partial<Pick<OperatingExceptionDraft, 'date' | 'closed'>>
  ) => {
    setExceptions((current) =>
      current.map((exception) => {
        if (exception.id !== exceptionId) {
          return exception
        }

        const next = { ...exception, ...patch }
        if (patch.closed === false && next.hours.length === 0) {
          next.hours = [{ id: createDraftId(), opensAt: '09:00', closesAt: '18:00' }]
        }
        return next
      })
    )
  }

  const updateExceptionHour = (
    exceptionId: string,
    hourId: string,
    patch: Partial<Pick<OperatingTimeRangeDraft, 'opensAt' | 'closesAt'>>
  ) => {
    setExceptions((current) =>
      current.map((exception) =>
        exception.id === exceptionId
          ? {
              ...exception,
              hours: exception.hours.map((hour) =>
                hour.id === hourId ? { ...hour, ...patch } : hour
              ),
            }
          : exception
      )
    )
  }

  const dialogTitle =
    action === 'operating-status'
      ? '운영 상태 변경'
      : action === 'discovery-status'
        ? '탐색 상태 변경'
        : '영업시간 수정'
  const dialogId = `place-${action}-dialog-title`

  return (
    <S.OperatingDialogOverlay role="presentation" onMouseDown={handleClose}>
      <S.OperatingDialog
        $wide={action === 'operating-schedule'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <S.OperatingDialogHeader>
          <S.OperatingDialogTitle id={dialogId}>{dialogTitle}</S.OperatingDialogTitle>
          <S.OperatingDialogCloseButton
            ref={closeButtonRef}
            type="button"
            aria-label={`${dialogTitle} 닫기`}
            disabled={isSaving}
            onClick={handleClose}
          >
            <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
          </S.OperatingDialogCloseButton>
        </S.OperatingDialogHeader>

        <S.OperatingDialogBody>
          {action === 'operating-status' ? (
            <>
              <S.OperatingDialogDescription>
                {place.name}의 운영 상태를 변경합니다. 비운영 상태의 장소는 앱 장소
                조회와 추천에서 숨겨집니다.
              </S.OperatingDialogDescription>
              <S.OperatingFormField as="fieldset">
                <legend>운영 상태</legend>
                <S.OperatingOptionGrid>
                  {OPERATING_STATUS_OPTIONS.map((option) => (
                    <S.OperatingOption
                      key={option.value}
                      $selected={operatingStatus === option.value}
                      $tone={option.value === 'PERMANENTLY_CLOSED' ? 'danger' : 'normal'}
                    >
                      <input
                        type="radio"
                        name="place-operating-status"
                        value={option.value}
                        checked={operatingStatus === option.value}
                        disabled={isSaving}
                        onChange={() => {
                          setOperatingStatus(option.value)
                          setFormError('')
                        }}
                      />
                      <strong>{option.label}</strong>
                      <small>{OPERATING_STATUS_DESCRIPTIONS[option.value]}</small>
                    </S.OperatingOption>
                  ))}
                </S.OperatingOptionGrid>
              </S.OperatingFormField>
              {operatingStatus === 'PERMANENTLY_CLOSED' ? (
                <S.OperatingDangerNotice>
                  영구 폐업으로 변경하면 해당 장소는 앱에서 노출되지 않습니다.
                </S.OperatingDangerNotice>
              ) : null}
            </>
          ) : action === 'discovery-status' ? (
            <>
              <S.OperatingDialogDescription>
                {place.name}의 공개 탐색 노출 여부를 변경합니다. 장소는 관리자 목록과
                지도에서 계속 관리할 수 있습니다.
              </S.OperatingDialogDescription>
              <S.OperatingFormField as="fieldset">
                <legend>탐색 상태</legend>
                <S.OperatingOptionGrid>
                  {DISCOVERY_STATUS_OPTIONS.map((option) => (
                    <S.OperatingOption
                      key={option.value}
                      $selected={discoveryStatus === option.value}
                      $tone={option.value === 'HIDDEN' ? 'muted' : 'normal'}
                    >
                      <input
                        type="radio"
                        name="place-discovery-status"
                        value={option.value}
                        checked={discoveryStatus === option.value}
                        disabled={isSaving}
                        onChange={() => {
                          setDiscoveryStatus(option.value)
                          setFormError('')
                        }}
                      />
                      <strong>{option.label}</strong>
                      <small>{DISCOVERY_STATUS_DESCRIPTIONS[option.value]}</small>
                    </S.OperatingOption>
                  ))}
                </S.OperatingOptionGrid>
              </S.OperatingFormField>
              {discoveryStatus === 'HIDDEN' ? (
                <S.OperatingInfoNotice>
                  탐색 숨김으로 변경하면 공개 탐색·자동완성·북마크 목록·추천 후보에서
                  제외됩니다.
                </S.OperatingInfoNotice>
              ) : null}
            </>
          ) : (
            <>
              <S.OperatingDialogDescription>
                {place.name}의 영업시간과 예외 일정을 수정합니다.
              </S.OperatingDialogDescription>
              <S.OperatingEditorSection>
                <S.OperatingEditorSectionHeader>
                  <strong>정규 영업시간</strong>
                  <span>영업하는 요일을 선택하세요.</span>
                </S.OperatingEditorSectionHeader>
                <S.OperatingWeekList>
                  {regularHours.map((day) => (
                    <S.OperatingWeekRow key={day.dayOfWeek}>
                      <S.OperatingWeekRowHeader>
                        <S.OperatingCheckLabel>
                          <input
                            type="checkbox"
                            checked={day.hours.length > 0}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateRegularDay(day.dayOfWeek, event.target.checked)
                            }
                          />
                          <span>{getDayOfWeekLabel(day.dayOfWeek)}</span>
                        </S.OperatingCheckLabel>
                      </S.OperatingWeekRowHeader>
                      {day.hours.length > 0 ? (
                        <S.OperatingExceptionHours>
                          {day.hours.map((hour) => (
                            <S.OperatingExceptionTimeRow key={hour.id}>
                              <S.OperatingTimeControls>
                                <AdminTimePicker
                                  value={hour.opensAt}
                                  ariaLabel={`${getDayOfWeekLabel(day.dayOfWeek)} 시작 시간`}
                                  disabled={isSaving}
                                  onChange={(value) =>
                                    updateRegularHour(day.dayOfWeek, hour.id, {
                                      opensAt: value,
                                    })
                                  }
                                />
                                <span>-</span>
                                <AdminTimePicker
                                  value={hour.closesAt}
                                  ariaLabel={`${getDayOfWeekLabel(day.dayOfWeek)} 종료 시간`}
                                  disabled={isSaving}
                                  onChange={(value) =>
                                    updateRegularHour(day.dayOfWeek, hour.id, {
                                      closesAt: value,
                                    })
                                  }
                                />
                              </S.OperatingTimeControls>
                              <S.OperatingIconButton
                                type="button"
                                aria-label={`${getDayOfWeekLabel(day.dayOfWeek)} 영업시간 삭제`}
                                title="시간 삭제"
                                disabled={isSaving}
                                onClick={() => removeRegularHour(day.dayOfWeek, hour.id)}
                              >
                                <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
                              </S.OperatingIconButton>
                            </S.OperatingExceptionTimeRow>
                          ))}
                          <S.OperatingTextButton
                            type="button"
                            disabled={isSaving}
                            onClick={() => addRegularHour(day.dayOfWeek)}
                          >
                            <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                            시간대 추가
                          </S.OperatingTextButton>
                        </S.OperatingExceptionHours>
                      ) : null}
                    </S.OperatingWeekRow>
                  ))}
                </S.OperatingWeekList>
              </S.OperatingEditorSection>

              <S.OperatingEditorSection>
                <S.OperatingEditorSectionHeader>
                  <strong>예외 일정</strong>
                  <S.DetailInlineButton
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      setExceptions((current) => [
                        ...current,
                        createOperatingExceptionDraft(),
                      ])
                    }
                  >
                    <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                    일정 추가
                  </S.DetailInlineButton>
                </S.OperatingEditorSectionHeader>
                {exceptions.length > 0 ? (
                  <S.OperatingExceptionEditorList>
                    {exceptions.map((exception) => (
                      <S.OperatingExceptionEditor key={exception.id}>
                        <S.OperatingExceptionEditorHeader>
                          <AdminDatePicker
                            value={exception.date}
                            ariaLabel="예외 일정 날짜"
                            disabled={isSaving}
                            onChange={(value) =>
                              updateException(exception.id, { date: value })
                            }
                          />
                          <S.OperatingIconButton
                            type="button"
                            aria-label="예외 일정 삭제"
                            title="일정 삭제"
                            disabled={isSaving}
                            onClick={() =>
                              setExceptions((current) =>
                                current.filter(({ id }) => id !== exception.id)
                              )
                            }
                          >
                            <S.MaterialIcon aria-hidden="true">delete</S.MaterialIcon>
                          </S.OperatingIconButton>
                        </S.OperatingExceptionEditorHeader>
                        <S.OperatingCheckLabel>
                          <input
                            type="checkbox"
                            checked={exception.closed}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateException(exception.id, {
                                closed: event.target.checked,
                              })
                            }
                          />
                          <span>종일 휴무</span>
                        </S.OperatingCheckLabel>
                        {!exception.closed ? (
                          <S.OperatingExceptionHours>
                            {exception.hours.map((hour) => (
                              <S.OperatingExceptionTimeRow key={hour.id}>
                                <S.OperatingTimeControls>
                                  <AdminTimePicker
                                    value={hour.opensAt}
                                    ariaLabel="대체 영업 시작 시간"
                                    disabled={isSaving}
                                    onChange={(value) =>
                                      updateExceptionHour(exception.id, hour.id, {
                                        opensAt: value,
                                      })
                                    }
                                  />
                                  <span>-</span>
                                  <AdminTimePicker
                                    value={hour.closesAt}
                                    ariaLabel="대체 영업 종료 시간"
                                    disabled={isSaving}
                                    onChange={(value) =>
                                      updateExceptionHour(exception.id, hour.id, {
                                        closesAt: value,
                                      })
                                    }
                                  />
                                </S.OperatingTimeControls>
                                <S.OperatingIconButton
                                  type="button"
                                  aria-label="대체 영업 시간 삭제"
                                  title="시간 삭제"
                                  disabled={exception.hours.length <= 1 || isSaving}
                                  onClick={() =>
                                    setExceptions((current) =>
                                      current.map((item) =>
                                        item.id === exception.id
                                          ? {
                                              ...item,
                                              hours: item.hours.filter(
                                                ({ id }) => id !== hour.id
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                >
                                  <S.MaterialIcon aria-hidden="true">remove</S.MaterialIcon>
                                </S.OperatingIconButton>
                              </S.OperatingExceptionTimeRow>
                            ))}
                            <S.OperatingTextButton
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                setExceptions((current) =>
                                  current.map((item) =>
                                    item.id === exception.id
                                      ? {
                                          ...item,
                                          hours: [
                                            ...item.hours,
                                            {
                                              id: createDraftId(),
                                              opensAt: '09:00',
                                              closesAt: '18:00',
                                            },
                                          ],
                                        }
                                      : item
                                  )
                                )
                              }
                            >
                              <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                              시간대 추가
                            </S.OperatingTextButton>
                          </S.OperatingExceptionHours>
                        ) : null}
                      </S.OperatingExceptionEditor>
                    ))}
                  </S.OperatingExceptionEditorList>
                ) : (
                  <S.OperatingEmptyState>등록된 예외 일정이 없습니다.</S.OperatingEmptyState>
                )}
              </S.OperatingEditorSection>
            </>
          )}

          <S.OperatingFormField>
            <span>{action === 'operating-status' ? '확인 사유' : action === 'discovery-status' ? '변경 사유' : '수정 사유'}</span>
            <S.OperatingTextArea
              value={reason}
              maxLength={500}
              placeholder={
                action === 'operating-status'
                  ? '예: 현장 확인 결과 임시 휴업'
                  : action === 'discovery-status'
                    ? '예: 운영 정책 검토를 위해 탐색 노출을 중지'
                    : '예: 광복절 휴무와 주말 영업시간 반영'
              }
              disabled={isSaving}
              onChange={(event) => {
                setReason(event.target.value)
                setFormError('')
              }}
            />
            <small>{reason.length}/500</small>
          </S.OperatingFormField>
          {formError ? (
            <S.OperatingFormNotice role="alert">{formError}</S.OperatingFormNotice>
          ) : actionErrorMessage ? (
            <S.OperatingFormNotice role="alert">
              {actionErrorMessage}
            </S.OperatingFormNotice>
          ) : null}
        </S.OperatingDialogBody>

        <S.OperatingDialogActions>
          <S.SecondaryButton type="button" disabled={isSaving} onClick={handleClose}>
            취소
          </S.SecondaryButton>
          <S.OperatingPrimaryButton
            type="button"
            $danger={
              action === 'operating-status' && operatingStatus === 'PERMANENTLY_CLOSED'
            }
            disabled={
              isSaving ||
              (action === 'operating-status' && place.operatingStatus === operatingStatus) ||
              (action === 'discovery-status' && place.discoveryStatus === discoveryStatus)
            }
            onClick={() => {
              if (action === 'operating-status') {
                void handleSubmitStatus()
              } else if (action === 'discovery-status') {
                void handleSubmitDiscovery()
              } else {
                void handleSubmitSchedule()
              }
            }}
          >
            {isSaving
              ? '저장 중'
              : action === 'operating-schedule'
                ? '영업시간 저장'
                : '상태 저장'}
          </S.OperatingPrimaryButton>
        </S.OperatingDialogActions>
      </S.OperatingDialog>
    </S.OperatingDialogOverlay>
  )
}
