export const BAN_TYPE_FILTER_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'PERMANENT', label: '영구 밴' },
  { value: 'TEMPORARY', label: '기간 밴' },
]

export const BAN_LIST_SORT_OPTIONS = [
  { value: 'BANNED_AT', label: '밴 처리일' },
  { value: 'EXPIRES_AT', label: '만료일' },
  { value: 'USER_ID', label: '사용자 ID' },
]

export const SORT_DIRECTION_OPTIONS = [
  { value: 'DESC', label: '내림차순' },
  { value: 'ASC', label: '오름차순' },
]

export const SANCTION_ACTION_FILTER_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'APPLIED', label: '밴 처리' },
  { value: 'RELEASED', label: '밴 해제' },
  { value: 'EXPIRED', label: '기간 만료' },
]
