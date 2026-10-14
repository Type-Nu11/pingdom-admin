export interface ListRange {
  page: number
  pageSize: number
  itemCount: number
  total?: number
}

export function formatListRange({ page, pageSize, itemCount, total }: ListRange): string {
  if (itemCount <= 0) return total === 0 ? '0개' : '표시할 항목 없음'
  const start = (Math.max(1, page) - 1) * pageSize + 1
  const end = start + itemCount - 1
  const range = `${start.toLocaleString('ko-KR')}–${end.toLocaleString('ko-KR')}`
  return total === undefined || total < end ? `${range}개 표시` : `${range} / ${total.toLocaleString('ko-KR')}개`
}
