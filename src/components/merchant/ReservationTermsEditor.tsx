import { useRef, useState, type FormEvent } from 'react'
import { AppDialog } from '../common/AppDialog'
import { AdminSelect } from '../common/AdminStatusSelect'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import type { MerchantAvailability, MerchantReservationTerms } from '../../types/merchantStore.types'
import { parseReservationTerms, reservationTermsDraft, type ReservationTermsDraft } from '../../utils/merchantReservationTerms'
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
  return <AppDialog title="가격·취소 조건" isDismissible={!busy} onClose={() => protection.request(onClose)} description={`${availability.productName ?? '일반 장소 예약'} · ${availability.startsAt} — ${availability.endsAt}`}>
    <S.Form onSubmit={submit}>
      <S.Field $wide><S.FieldHint>{availability.reservationTerms ? '저장된 조건을 수정합니다.' : '가격·취소 조건이 아직 설정되지 않았습니다. 무료 또는 취소 불가로 간주하지 않습니다.'}</S.FieldHint></S.Field>
      <S.Field>1인당 가격<S.Input aria-label="1인당 가격" type="number" min="0" step="1" value={draft.unitAmountMinor} disabled={busy} onChange={event => change('unitAmountMinor', event.target.value)} /></S.Field>
      <S.Field>예약당 추가 비용<S.Input aria-label="예약당 추가 비용" type="number" min="0" step="1" value={draft.additionalAmountMinor} disabled={busy} onChange={event => change('additionalAmountMinor', event.target.value)} /></S.Field>
      <S.Field $wide><S.FieldHint>금액은 통화의 최소 단위입니다. KRW 1000은 1,000원, USD 1000은 10달러입니다. 추가 비용은 인원수와 관계없이 예약당 한 번 적용합니다. 무료는 0을 입력해주세요.</S.FieldHint></S.Field>
      <S.Field>통화<S.Input aria-label="통화" value={draft.currency} maxLength={3} disabled={busy} onChange={event => change('currency', event.target.value.toUpperCase())} /></S.Field>
      <S.Field>기준 시간대<S.Input aria-label="기준 시간대" value={draft.timezone} maxLength={64} disabled={busy} onChange={event => change('timezone', event.target.value)} /></S.Field>
      <S.Field>취소 가능 여부<AdminSelect aria-label="취소 가능 여부" width="100%" value={draft.cancellation} disabled={busy} onChange={event => change('cancellation', event.target.value as ReservationTermsDraft['cancellation'])}><option value="">선택해주세요</option><option value="allowed">기한 내 취소 가능</option><option value="disallowed">취소 불가</option></AdminSelect></S.Field>
      {draft.cancellation === 'allowed' ? <S.Field>시작 전 취소 기한(분)<S.Input aria-label="시작 전 취소 기한(분)" type="number" min="0" step="1" max="2147483647" value={draft.cancellationCutoffMinutes} disabled={busy} onChange={event => change('cancellationCutoffMinutes', event.target.value)} /><S.FieldHint>기한 내 취소는 수수료 없이 전액 환불됩니다. 0분은 시작 시각까지입니다.</S.FieldHint></S.Field> : null}
      <S.Field $wide><S.FieldHint>변경한 조건은 이후 새로 발급되는 예약 견적에 적용됩니다. 기존 예약의 수락 조건은 변경되지 않습니다.</S.FieldHint></S.Field>
      {validation || error ? <S.FormError role="alert">{validation || error}</S.FormError> : null}
      <S.FormActions><S.ActionButton type="button" disabled={busy} onClick={() => protection.request(onClose)}>닫기</S.ActionButton><S.ActionButton type="submit" $variant="primary" disabled={busy}>{busy ? '저장 중' : '조건 저장'}</S.ActionButton></S.FormActions>
    </S.Form>
  </AppDialog>
}
