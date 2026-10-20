export type ReservationReviewAction = 'confirm' | 'reject'

export function reservationReviewReason(action: ReservationReviewAction, input = '') {
  const reason = input.trim()
  if (!reason && action === 'reject') throw new Error('반려 사유를 입력해주세요.')
  if (reason.length > 500) throw new Error('처리 사유는 최대 500자까지 입력할 수 있습니다.')
  return reason || undefined
}
