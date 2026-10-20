import { useState } from 'react'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { MerchantPlaceSelect } from '../../components/merchant/MerchantPlaceSelect'
import type { MerchantReservationQuery } from '../../types/merchantStore.types'
import { EMPTY_RESERVATION_FILTERS, reservationFilterQuery, type MerchantReservationFilters } from '../../utils/merchantReservationQuery'
import { reservationTodayInput } from '../../utils/reservationTime'
import * as S from '../../components/merchant/MerchantWorkspace.styles'
import * as R from './MerchantReservationOperationsPage.styles'

export function MerchantReservationFilters({ initialPlaceId, placeIds, busy, onApply }: {
  initialPlaceId?: number
  placeIds: number[]
  busy: boolean
  onApply: (query: MerchantReservationQuery) => void
}) {
  const [filters, setFilters] = useState<MerchantReservationFilters>({ ...EMPTY_RESERVATION_FILTERS, placeId: initialPlaceId ? String(initialPlaceId) : '' })
  const [applied, setApplied] = useState(filters)
  const [error, setError] = useState('')
  const update = (field: keyof MerchantReservationFilters, value: string) => setFilters(current => ({ ...current, [field]: value }))
  const changed = JSON.stringify(filters) !== JSON.stringify(applied)
  return <R.Filters aria-label="예약 조회 필터" onSubmit={event => {
    event.preventDefault()
    if (busy) return
    const next = reservationFilterQuery(filters)
    if (typeof next === 'string') { setError(next); return }
    setError(''); setApplied(filters); onApply(next)
  }}>
    <S.Field>예약 상태
      <AdminSelect aria-label="예약 상태" width="100%" value={filters.status} disabled={busy} onChange={event => update('status', event.target.value)}>
        <option value="">전체 상태</option><option value="PENDING">승인 대기</option><option value="CONFIRMED">확정</option><option value="REJECTED">반려</option><option value="CANCELED">취소</option>
      </AdminSelect>
    </S.Field>
    <S.Field as="div"><span id="reservation-place-label">조회 매장</span>
      <MerchantPlaceSelect compact fullWidth aria-label="예약 조회 매장" value={filters.placeId} disabled={busy} onChange={event => update('placeId', event.target.value)}>
        <option value="">전체 소유 매장</option>
        {[...new Set([...placeIds, ...(initialPlaceId ? [initialPlaceId] : [])])].map(id => <option key={id} value={id}>장소 #{id}</option>)}
      </MerchantPlaceSelect>
    </S.Field>
    <S.Field as="div"><span>예약 시작 기간 · 시작 포함</span>
      <AdminDateTimePicker ariaLabel="예약 시작 기간 시작" value={filters.from} disabled={busy} wallClock today={reservationTodayInput()} onChange={value => update('from', value)} />
    </S.Field>
    <S.Field as="div"><span>예약 시작 기간 · 종료 제외</span>
      <AdminDateTimePicker ariaLabel="예약 시작 기간 종료" value={filters.to} disabled={busy} wallClock today={reservationTodayInput()} onChange={value => update('to', value)} />
    </S.Field>
    {error ? <S.FormError role="alert">{error}</S.FormError> : null}
    <R.FilterFooter>
      <R.Hint role="status">{changed ? '입력한 조건이 아직 적용되지 않았습니다. 조회를 눌러주세요.' : '한국 시각 기준 · 예약 시작 시각이 지정 기간에 포함된 신청을 조회합니다.'}</R.Hint>
      <S.FormActions>
        <S.ActionButton type="button" disabled={busy} onClick={() => { setFilters(EMPTY_RESERVATION_FILTERS); setApplied(EMPTY_RESERVATION_FILTERS); setError(''); onApply({ page: 1 }) }}>초기화</S.ActionButton>
        <S.ActionButton type="submit" disabled={busy} $variant="primary">조회</S.ActionButton>
      </S.FormActions>
    </R.FilterFooter>
  </R.Filters>
}
