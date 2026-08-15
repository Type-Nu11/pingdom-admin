import { useEffect, useRef, useState } from 'react'
import { AdminDateTimePicker } from '../common/AdminDateTimePicker'
import type { AdminPlaceNoticeAction } from '../../hooks/useAdminPlaceOperatingNotices'
import type {
  AdminPlaceDetail,
  AdminPlaceOperatingNoticeCancelRequest,
  AdminPlaceOperatingNoticeCreateRequest,
  AdminPlaceOperatingNoticeExpireResponse,
  AdminPlaceOperatingNoticeResponse,
  AdminPlaceOperatingNoticeSeverity,
  AdminPlaceOperatingNoticeType,
  AdminPlaceOperatingNoticeUpdateRequest,
} from '../../types/adminPlace.types'
import * as S from '../../pages/place/PlaceManagePage.styles'

const NOTICE_ACTIONS: Array<{
  value: AdminPlaceNoticeAction
  label: string
  danger?: boolean
}> = [
  { value: 'create', label: '새 공지' },
  { value: 'update', label: '공지 수정' },
  { value: 'cancel', label: '공지 취소', danger: true },
  { value: 'expire', label: '만료 정리', danger: true },
]

const NOTICE_TYPE_OPTIONS: Array<{
  value: AdminPlaceOperatingNoticeType
  label: string
}> = [
  { value: 'TEMPORARY_CLOSURE', label: '임시 휴업' },
  { value: 'HOURS_CHANGE', label: '영업시간 변경' },
  { value: 'CROWDING', label: '혼잡 안내' },
  { value: 'REOPENING', label: '영업 재개' },
  { value: 'GENERAL', label: '일반 안내' },
]

const NOTICE_SEVERITY_OPTIONS: Array<{
  value: AdminPlaceOperatingNoticeSeverity
  label: string
}> = [
  { value: 'INFO', label: '정보' },
  { value: 'WARNING', label: '주의' },
  { value: 'CRITICAL', label: '긴급' },
]

interface PlaceOperatingNoticeDialogProps {
  place: AdminPlaceDetail
  runningActions: Record<AdminPlaceNoticeAction, boolean>
  actionErrors: Record<AdminPlaceNoticeAction, string>
  onClearActionError: (action: AdminPlaceNoticeAction) => void
  onClose: () => void
  onCreate: (
    placeId: number,
    payload: AdminPlaceOperatingNoticeCreateRequest
  ) => Promise<AdminPlaceOperatingNoticeResponse | null>
  onUpdate: (
    placeId: number,
    noticeId: number,
    payload: AdminPlaceOperatingNoticeUpdateRequest
  ) => Promise<AdminPlaceOperatingNoticeResponse | null>
  onCancel: (
    placeId: number,
    noticeId: number,
    payload: AdminPlaceOperatingNoticeCancelRequest
  ) => Promise<AdminPlaceOperatingNoticeResponse | null>
  onExpire: () => Promise<AdminPlaceOperatingNoticeExpireResponse | null>
}

function parseNoticeId(value: string) {
  const noticeId = Number(value)
  return Number.isInteger(noticeId) && noticeId > 0 ? noticeId : null
}

function formatNoticeStatus(status: AdminPlaceOperatingNoticeResponse['status']) {
  return {
    SCHEDULED: '예약됨',
    ACTIVE: '노출 중',
    EXPIRED: '만료됨',
    CANCELED: '취소됨',
  }[status]
}

export function PlaceOperatingNoticeDialog({
  place,
  runningActions,
  actionErrors,
  onClearActionError,
  onClose,
  onCreate,
  onUpdate,
  onCancel,
  onExpire,
}: PlaceOperatingNoticeDialogProps) {
  const [action, setAction] = useState<AdminPlaceNoticeAction>('create')
  const [noticeType, setNoticeType] =
    useState<AdminPlaceOperatingNoticeType>('GENERAL')
  const [severity, setSeverity] =
    useState<AdminPlaceOperatingNoticeSeverity>('INFO')
  const [message, setMessage] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [noticeId, setNoticeId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [formError, setFormError] = useState('')
  const [noticeResult, setNoticeResult] =
    useState<AdminPlaceOperatingNoticeResponse | null>(null)
  const [expireResult, setExpireResult] =
    useState<AdminPlaceOperatingNoticeExpireResponse | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const isRunning = Object.values(runningActions).some(Boolean)

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
      if (event.key === 'Escape' && !isRunning) {
        onClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isRunning, onClose])

  const handleClose = () => {
    if (!isRunning) {
      onClose()
    }
  }

  const handleActionChange = (nextAction: AdminPlaceNoticeAction) => {
    if (isRunning) {
      return
    }

    setAction(nextAction)
    setFormError('')
    setNoticeResult(null)
    setExpireResult(null)
    setHasConfirmed(false)
    onClearActionError(nextAction)
  }

  const clearFeedback = () => {
    setFormError('')
    setNoticeResult(null)
    setExpireResult(null)
    onClearActionError(action)
  }

  const handleCreate = async () => {
    if (!message.trim() || !startsAt || !expiresAt) {
      setFormError('공지 내용과 노출 시작·종료 일시를 모두 입력해주세요.')
      return
    }

    const startDate = new Date(startsAt)
    const expireDate = new Date(expiresAt)
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(expireDate.getTime()) ||
      startDate >= expireDate
    ) {
      setFormError('종료 일시는 시작 일시보다 이후여야 합니다.')
      return
    }

    const result = await onCreate(place.id, {
      noticeType,
      severity,
      message: message.trim(),
      startsAt: startDate.toISOString(),
      expiresAt: expireDate.toISOString(),
    })

    if (result) {
      setNoticeResult(result)
    }
  }

  const handleUpdate = async () => {
    const parsedNoticeId = parseNoticeId(noticeId)
    if (!parsedNoticeId) {
      setFormError('수정할 공지 ID를 양의 정수로 입력해주세요.')
      return
    }
    if (!message.trim()) {
      setFormError('수정할 공지 내용을 입력해주세요.')
      return
    }

    const result = await onUpdate(place.id, parsedNoticeId, {
      severity,
      message: message.trim(),
    })

    if (result) {
      setNoticeResult(result)
    }
  }

  const handleCancel = async () => {
    const parsedNoticeId = parseNoticeId(noticeId)
    if (!parsedNoticeId) {
      setFormError('취소할 공지 ID를 양의 정수로 입력해주세요.')
      return
    }
    if (!cancelReason.trim()) {
      setFormError('공지 취소 사유를 입력해주세요.')
      return
    }
    if (!hasConfirmed) {
      setFormError('공지 취소 내용을 확인해주세요.')
      return
    }

    const result = await onCancel(place.id, parsedNoticeId, {
      cancelReason: cancelReason.trim(),
    })

    if (result) {
      setNoticeResult(result)
      setHasConfirmed(false)
    }
  }

  const handleExpire = async () => {
    if (!hasConfirmed) {
      setFormError('전체 만료 정리 범위를 확인해주세요.')
      return
    }

    const result = await onExpire()
    if (result) {
      setExpireResult(result)
      setHasConfirmed(false)
    }
  }

  const handleSubmit = async () => {
    if (isRunning) {
      return
    }

    setFormError('')
    setNoticeResult(null)
    setExpireResult(null)

    if (action === 'create') {
      await handleCreate()
    } else if (action === 'update') {
      await handleUpdate()
    } else if (action === 'cancel') {
      await handleCancel()
    } else {
      await handleExpire()
    }
  }

  const submitLabel =
    action === 'create'
      ? '공지 생성'
      : action === 'update'
        ? '공지 저장'
        : action === 'cancel'
          ? '공지 취소'
          : '만료 공지 정리'

  return (
    <S.OperatingDialogOverlay role="presentation" onMouseDown={handleClose}>
      <S.OperatingDialog
        $wide
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-operating-notice-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <S.OperatingDialogHeader>
          <div>
            <S.OperatingDialogEyebrow>운영 공지</S.OperatingDialogEyebrow>
            <S.OperatingDialogTitle id="place-operating-notice-dialog-title">
              {place.name} 공지 관리
            </S.OperatingDialogTitle>
          </div>
          <S.OperatingDialogCloseButton
            ref={closeButtonRef}
            type="button"
            aria-label="운영 공지 관리 닫기"
            disabled={isRunning}
            onClick={handleClose}
          >
            <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
          </S.OperatingDialogCloseButton>
        </S.OperatingDialogHeader>

        <S.OperatingDialogBody>
          <S.OperatingDialogDescription>
            장소 운영에 영향을 주는 공지를 예약하거나 기존 공지를 수정·취소합니다.
          </S.OperatingDialogDescription>

          <S.OperatingActionTabs role="tablist" aria-label="운영 공지 작업 선택">
            {NOTICE_ACTIONS.map((option) => (
              <S.OperatingActionTab
                key={option.value}
                type="button"
                role="tab"
                aria-selected={action === option.value}
                $active={action === option.value}
                $danger={option.danger}
                disabled={isRunning}
                onClick={() => handleActionChange(option.value)}
              >
                {option.label}
              </S.OperatingActionTab>
            ))}
          </S.OperatingActionTabs>

          {action === 'create' ? (
            <>
              <S.OperatingFieldRow>
                <S.OperatingFormField>
                  <span>공지 유형 *</span>
                  <S.OperatingSelect
                    value={noticeType}
                    disabled={isRunning}
                    onChange={(event) => {
                      setNoticeType(event.target.value as AdminPlaceOperatingNoticeType)
                      clearFeedback()
                    }}
                  >
                    {NOTICE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </S.OperatingSelect>
                </S.OperatingFormField>
                <S.OperatingFormField>
                  <span>중요도 *</span>
                  <S.OperatingSelect
                    value={severity}
                    disabled={isRunning}
                    onChange={(event) => {
                      setSeverity(event.target.value as AdminPlaceOperatingNoticeSeverity)
                      clearFeedback()
                    }}
                  >
                    {NOTICE_SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </S.OperatingSelect>
                </S.OperatingFormField>
              </S.OperatingFieldRow>

              <S.OperatingFieldRow>
                <S.OperatingFormField>
                  <span>노출 시작 *</span>
                  <AdminDateTimePicker
                    ariaLabel="공지 노출 시작 일시"
                    value={startsAt}
                    disabled={isRunning}
                    onChange={(value) => {
                      setStartsAt(value)
                      clearFeedback()
                    }}
                  />
                </S.OperatingFormField>
                <S.OperatingFormField>
                  <span>노출 종료 *</span>
                  <AdminDateTimePicker
                    ariaLabel="공지 노출 종료 일시"
                    value={expiresAt}
                    disabled={isRunning}
                    onChange={(value) => {
                      setExpiresAt(value)
                      clearFeedback()
                    }}
                  />
                </S.OperatingFormField>
              </S.OperatingFieldRow>
            </>
          ) : action === 'update' || action === 'cancel' ? (
            <>
              <S.OperatingInfoNotice>
                Web 관리자 API에는 공지 목록 조회가 없어, 수정·취소할 공지 ID를 직접
                입력해야 합니다. 장소 ID는 #{place.id}로 고정됩니다.
              </S.OperatingInfoNotice>
              <S.OperatingFormField>
                <span>공지 ID *</span>
                <S.OperatingTextInput
                  type="number"
                  min="1"
                  step="1"
                  value={noticeId}
                  placeholder="예: 123"
                  disabled={isRunning}
                  onChange={(event) => {
                    setNoticeId(event.target.value)
                    clearFeedback()
                  }}
                />
              </S.OperatingFormField>
              {action === 'update' ? (
                <S.OperatingFormField>
                  <span>중요도 *</span>
                  <S.OperatingSelect
                    value={severity}
                    disabled={isRunning}
                    onChange={(event) => {
                      setSeverity(event.target.value as AdminPlaceOperatingNoticeSeverity)
                      clearFeedback()
                    }}
                  >
                    {NOTICE_SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </S.OperatingSelect>
                </S.OperatingFormField>
              ) : null}
            </>
          ) : (
            <S.OperatingDangerNotice>
              이 작업은 현재 시각 기준으로 만료 대상인 모든 장소의 운영 공지를 서버에서
              일괄 정리합니다. 선택한 장소에만 한정되지 않습니다.
            </S.OperatingDangerNotice>
          )}

          {action === 'create' || action === 'update' ? (
            <S.OperatingFormField>
              <span>공지 내용 *</span>
              <S.OperatingTextArea
                value={message}
                maxLength={500}
                placeholder="사용자에게 안내할 운영 정보를 입력해주세요."
                disabled={isRunning}
                onChange={(event) => {
                  setMessage(event.target.value)
                  clearFeedback()
                }}
              />
              <small>{message.length}/500</small>
            </S.OperatingFormField>
          ) : action === 'cancel' ? (
            <S.OperatingFormField>
              <span>취소 사유 *</span>
              <S.OperatingTextArea
                value={cancelReason}
                maxLength={500}
                placeholder="공지를 취소하는 이유를 입력해주세요."
                disabled={isRunning}
                onChange={(event) => {
                  setCancelReason(event.target.value)
                  clearFeedback()
                }}
              />
              <small>{cancelReason.length}/500</small>
            </S.OperatingFormField>
          ) : null}

          {action === 'cancel' || action === 'expire' ? (
            <S.OperatingCheckLabel>
              <input
                type="checkbox"
                checked={hasConfirmed}
                disabled={isRunning}
                onChange={(event) => {
                  setHasConfirmed(event.target.checked)
                  clearFeedback()
                }}
              />
              <span>
                {action === 'cancel'
                  ? '입력한 공지를 취소하는 작업임을 확인했습니다.'
                  : '모든 장소의 만료 대상 공지를 일괄 처리함을 확인했습니다.'}
              </span>
            </S.OperatingCheckLabel>
          ) : null}

          {noticeResult ? (
            <S.OperatingResultNotice role="status">
              <strong>처리 완료</strong>
              <span>
                공지 #{noticeResult.id} · {formatNoticeStatus(noticeResult.status)} ·{' '}
                {noticeResult.visibleNow ? '현재 노출 중' : '현재 미노출'}
              </span>
            </S.OperatingResultNotice>
          ) : null}

          {expireResult ? (
            <S.OperatingResultNotice role="status">
              <strong>만료 정리 완료</strong>
              {Object.entries(expireResult).map(([key, value]) => (
                <span key={key}>
                  {key}: {value.toLocaleString()}건
                </span>
              ))}
            </S.OperatingResultNotice>
          ) : null}

          {formError || actionErrors[action] ? (
            <S.OperatingFormNotice role="alert">
              {formError || actionErrors[action]}
            </S.OperatingFormNotice>
          ) : null}
        </S.OperatingDialogBody>

        <S.OperatingDialogActions>
          <S.SecondaryButton type="button" disabled={isRunning} onClick={handleClose}>
            닫기
          </S.SecondaryButton>
          <S.OperatingPrimaryButton
            type="button"
            $danger={action === 'cancel' || action === 'expire'}
            disabled={isRunning}
            onClick={() => void handleSubmit()}
          >
            {runningActions[action] ? '처리 중' : submitLabel}
          </S.OperatingPrimaryButton>
        </S.OperatingDialogActions>
      </S.OperatingDialog>
    </S.OperatingDialogOverlay>
  )
}
