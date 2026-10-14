import type { AdminUserSanctionAction, AdminUserSanctionHistoryItem } from '../../types/adminUserBan.types'

const ADMIN_ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  MODERATOR: '운영자',
  USER: '일반 사용자',
}

const COUNTRY_LABELS: Record<string, string> = {
  KR: '대한민국',
  JP: '일본',
  US: '미국',
}

const BAN_REASON_LABELS: Record<string, string> = {
  POLICY_VIOLATION: '운영 정책 위반',
  REPORT_BULK_ACCEPTED: '신고 일괄 승인으로 처리',
  SPAM: '스팸 또는 도배',
  HARASSMENT: '괴롭힘 또는 부적절한 행위',
}

type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral'

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function formatBanType(value: string) {
  if (value === 'PERMANENT') {
    return '영구 밴'
  }

  if (value === 'TEMPORARY') {
    return '기간 밴'
  }

  return value || '-'
}

export function getBanTypeTone(value: string): BadgeTone {
  return value === 'TEMPORARY' ? 'warning' : 'neutral'
}

export function getBanStatusTone(isBanned: boolean): BadgeTone {
  return isBanned ? 'danger' : 'success'
}

export function formatBanDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.getFullYear()}.${padDatePart(date.getMonth() + 1)}.${padDatePart(
    date.getDate()
  )} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`
}

export function formatBanExpiresAt(banType: string, value?: string | null) {
  if (value) {
    return formatBanDate(value)
  }

  if (banType === 'PERMANENT') {
    return '만료 없음'
  }

  if (banType === 'TEMPORARY') {
    return '확인 필요'
  }

  return '-'
}

export function formatOptionalText(value?: string | number | null) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return '-'
  }

  return String(value)
}

export function formatRole(value?: string | null) {
  if (!value) {
    return '-'
  }

  return ADMIN_ROLE_LABELS[value] ?? value.replaceAll('_', ' ')
}

export function formatCountry(value?: string | null) {
  if (!value) {
    return '-'
  }

  return COUNTRY_LABELS[value] ?? value
}

export function formatBanReason(value?: string | null) {
  if (!value) {
    return '등록된 밴 사유가 없습니다.'
  }

  return BAN_REASON_LABELS[value] ?? value.replaceAll('_', ' ')
}

export function formatSanctionAction(value: AdminUserSanctionAction) {
  if (value === 'APPLIED') {
    return '밴 처리'
  }

  if (value === 'RELEASED') {
    return '밴 해제'
  }

  if (value === 'EXPIRED') {
    return '기간 만료'
  }

  return value
}

export function getSanctionActionTone(value: AdminUserSanctionAction): BadgeTone {
  if (value === 'APPLIED') {
    return 'danger'
  }

  if (value === 'RELEASED') {
    return 'success'
  }

  return 'neutral'
}

export function formatSanctionHistorySummary(history: AdminUserSanctionHistoryItem) {
  const processedAt = formatBanDate(history.processedAt)
  const adminName = history.adminUsername || `관리자 ID ${history.adminUserId ?? '-'}`

  return `${adminName} · ${processedAt}`
}

export function formatSanctionHistoryPeriod(history: AdminUserSanctionHistoryItem) {
  if (history.banType === 'PERMANENT') {
    return '만료 없음'
  }

  if (history.endedAt) {
    return `${formatBanDate(history.startedAt)} ~ ${formatBanDate(history.endedAt)}`
  }

  return formatBanDate(history.startedAt)
}

export function formatCountWithUnit(value?: number | null, unit = '건') {
  return typeof value === 'number' ? `${value.toLocaleString()}${unit}` : '-'
}
