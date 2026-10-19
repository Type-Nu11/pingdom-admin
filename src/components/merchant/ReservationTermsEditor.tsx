import { useRef, useState, type FormEvent } from 'react'
import { AppDialog } from '../common/AppDialog'
import { AdminSelect } from '../common/AdminStatusSelect'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import type { MerchantAvailability, MerchantReservationTerms } from '../../types/merchantStore.types'
import { parseReservationTerms, reservationTermsDraft, type ReservationTermsDraft } from '../../utils/merchantReservationTerms'
import { formatReservationSchedule } from '../../utils/reservationTime'
import * as S from './MerchantWorkspace.styles'

export function ReservationTermsEditor({ availability, busy, error, onSave, onClose }: {
  availability: MerchantAvailability
  busy: boolean
  error: string
  onSave: (id: number, terms: MerchantReservationTerms) => Promise<unknown | null>
  onClose: () => void
}) {
  const initial = useRef(reservationTermsDraft(availability.reservationTerms ?? null))
  const [draft, setDraft] = useState(initial.current)
  const [validation, setValidation] = useState('')
  const saving = useRef(false)
  const protection = useUnsavedChanges(JSON.stringify(initial.current) !== JSON.stringify(draft), busy)
  const change = <K extends keyof ReservationTermsDraft>(key: K, value: ReservationTermsDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }))
    setValidation('')
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || saving.current) return
    const terms = parseReservationTerms(draft)
    if (typeof terms === 'string') { setValidation(terms); return }
    saving.current = true
    try {
      const result = await onSave(availability.id, terms)
      if (result) { protection.markClean(); onClose() }
    } finally { saving.current = false }
  }
  return <AppDialog title="예약 취소 조건" isDismissible={!busy} onClose={() => protection.request(onClose)} description={`예약 가능 시간 #${availability.id} · ${formatReservationSchedule(availability.startsAt)} — ${formatReservationSchedule(availability.endsAt)}`}>
    <S.Form onSubmit={submit}>
      <S.Field $wide><S.FieldHint>{availability.reservationTerms ? '저장된 조건을 수정합니다.' : '예약 취소 조건이 아직 설정되지 않았습니다. 취소 불가로 간주하지 않습니다.'}</S.FieldHint></S.Field>
      <S.Field>기준 시간대<S.Input aria-label="기준 시간대" value={draft.timezone} maxLength={64} disabled={busy} onChange={event => change('timezone', event.target.value)} /></S.Field>
      <S.Field $wide><S.FieldHint>Asia/Seoul과 같은 IANA 시간대를 입력해주세요. 시간대를 바꿔도 등록된 예약 시작·종료 시각은 이동하지 않습니다.</S.FieldHint></S.Field>
      <S.Field>취소 가능 여부<AdminSelect aria-label="취소 가능 여부" width="100%" value={draft.cancellation} disabled={busy} onChange={event => change('cancellation', event.target.value as ReservationTermsDraft['cancellation'])}><option value="">선택해주세요</option><option value="allowed">기한 내 취소 가능</option><option value="disallowed">취소 불가</option></AdminSelect></S.Field>
      {draft.cancellation === 'allowed' ? <S.Field>시작 전 취소 기한(분)<S.Input aria-label="시작 전 취소 기한(분)" type="number" min="0" step="1" max="2147483647" value={draft.cancellationCutoffMinutes} disabled={busy} onChange={event => change('cancellationCutoffMinutes', event.target.value)} /><S.FieldHint>60분은 예약 시작 1시간 전까지, 0분은 시작 시각까지 취소할 수 있다는 뜻입니다.</S.FieldHint></S.Field> : null}
      <S.Field $wide><S.FieldHint>변경한 조건은 이후 새로 발급되는 예약 견적에 적용됩니다. 기존 예약의 수락 조건은 변경되지 않습니다.</S.FieldHint></S.Field>
      {validation || error ? <S.FormError role="alert">{validation || error}</S.FormError> : null}
      <S.FormActions><S.ActionButton type="button" disabled={busy} onClick={() => protection.request(onClose)}>닫기</S.ActionButton><S.ActionButton type="submit" $variant="primary" disabled={busy}>{busy ? '저장 중' : '조건 저장'}</S.ActionButton></S.FormActions>
    </S.Form>
  </AppDialog>
}
