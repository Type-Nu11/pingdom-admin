import type { AdminDashboardPendingItem } from '../types/adminDashboard.types'

function validId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function getDashboardPendingRows(items: AdminDashboardPendingItem[]) {
  const seen = new Set<string>()
  return items.flatMap((item, index) => {
    const key = validId(item.targetId) ? `${item.type}:${item.targetId}` : `invalid:${index}`
    if (seen.has(key)) return []
    seen.add(key)
    const application = item.type === 'MERCHANT_PLACE_APPLICATION'
    const destination = application && validId(item.targetId) && item.status === 'PENDING'
      ? { path: '/merchant-place-applications', state: { applicationId: item.targetId } }
      : null
    return [{
      key,
      title: item.title || '제목 정보 없음',
      createdAt: item.createdAt,
      label: application ? '장소 신청' : '미지원 업무',
      description: `신청 #${validId(item.targetId) ? item.targetId : '확인 불가'}`,
      destination,
      unavailableReason: '대상 또는 처리 경로 확인 필요',
    }]
  })
}
