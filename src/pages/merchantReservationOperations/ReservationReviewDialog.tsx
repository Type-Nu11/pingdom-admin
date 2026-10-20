import { useId, useState, type RefObject } from 'react'
import { AppDialog } from '../../components/common/AppDialog'
import type { MerchantReservationDetail } from '../../types/merchantStore.types'
import { formatReservationSchedule } from '../../utils/reservationTime'
import { reservationReviewReason, type ReservationReviewAction } from '../../utils/reservationReview'
import * as S from '../../components/merchant/MerchantWorkspace.styles'
import * as Store from '../../components/merchant/MerchantSurface.styles'
import * as R from './MerchantReservationOperationsPage.styles'

export function ReservationReviewDialog({ detail, action, pending, available, error, onClose, onSubmit, fallbackFocusRef }: {
  detail: MerchantReservationDetail
  action: ReservationReviewAction
  pending: boolean
  available: boolean
  error: string
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
  fallbackFocusRef: RefObject<HTMLHeadingElement | null>
}) {
  const formId = useId()
  const [reason, setReason] = useState('')
  const [validation, setValidation] = useState('')
  const label = action === 'confirm' ? '승인' : '반려'
  const reservation = detail.reservation
  return <AppDialog title={'예약 #' + reservation.id + ' ' + label}
    description="장소와 예약 내용을 확인한 뒤 처리해주세요." isDismissible={!pending} onClose={onClose} fallbackFocusRef={fallbackFocusRef}
    footer={<><S.ActionButton type="button" disabled={pending} onClick={onClose}>닫기</S.ActionButton>
      <S.ActionButton type="submit" form={formId} disabled={pending || !available} $variant={action === 'reject' ? 'danger' : 'primary'}>{pending ? '처리 중' : '예약 ' + label}</S.ActionButton></>}>
    <R.Info>
      <R.Wide><dt>장소</dt><dd>{detail.placeName || '장소'} · #{detail.placeId}</dd></R.Wide>
      <R.Wide><dt>예약 시간</dt><dd>{formatReservationSchedule(reservation.reservationStartsAt ?? reservation.confirmation?.startsAt)} – {formatReservationSchedule(reservation.reservationEndsAt ?? reservation.confirmation?.endsAt)}</dd></R.Wide>
      <div><dt>예약 번호</dt><dd>#{reservation.id}</dd></div><div><dt>예약 인원</dt><dd>{reservation.quantity}명</dd></div>
    </R.Info>
    <S.Form id={formId} onSubmit={async event => {
      event.preventDefault()
      if (pending || !available) return
      try { reservationReviewReason(action, reason) }
      catch (failure) { setValidation((failure as Error).message); return }
      setValidation('')
      await onSubmit(reason)
    }}>
      <S.Field $wide>{label} 사유 ({action === 'reject' ? '필수' : '선택'})
        <S.Textarea aria-label={label + ' 사유'} aria-invalid={Boolean(validation)} aria-describedby={formId + '-hint'}
          maxLength={500} value={reason} disabled={pending} onChange={event => { setReason(event.target.value); setValidation('') }} />
        <S.FieldHint id={formId + '-hint'}>{reason.length}/500자{action === 'confirm' ? ' · 사유 없이 승인할 수 있습니다.' : ' · 고객에게 안내할 반려 사유를 입력해주세요.'}</S.FieldHint>
      </S.Field>
    </S.Form>
    {validation || error ? <Store.Notice $tone="error" role="alert">{validation || error}</Store.Notice> : null}
    {!available && !pending ? <S.ReadonlyNotice>예약 상태 또는 접근 권한을 다시 확인해야 합니다. 창을 닫고 상세를 다시 조회해주세요.</S.ReadonlyNotice> : null}
  </AppDialog>
}
