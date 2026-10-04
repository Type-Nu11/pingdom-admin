const integerFormat = new Intl.NumberFormat('ko-KR')
const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/

function dateParts(value: string | null | undefined) {
  const parts = typeof value === 'string' ? isoDateTime.exec(value) : null
  if (!parts) return null
  const [, year, month, day, hour, minute, second = '00', offset] = parts
  const calendar = new Date(0)
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1
    || calendar.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null
  if (offset && offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59)) return null
  return { year, month, day, hour, minute, offset }
}

/** LocalDateTime has no timezone: preserve its wall-clock fields, never guess UTC/KST. */
export function formatLocalDateTime(value: string | null | undefined) {
  const parts = dateParts(value)
  if (!parts || parts.offset) return '시각 정보 없음'
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`
}

/** An instant requires an explicit offset; the caller supplies the display timezone. */
export function formatInstantDateTime(value: string | null | undefined, timezone: string) {
  const parts = dateParts(value)
  if (!parts?.offset) return '시각 정보 없음'
  const timestamp = Date.parse(value!)
  if (!Number.isFinite(timestamp)) return '시각 정보 없음'
  try {
    return `${new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(timestamp)} (${timezone})`
  } catch { return '시각 정보 없음' }
}

/** Accept explicit precision only. Unknown precision stays visibly in minor units. */
export function formatMinorAmount(amount: number | null | undefined, currency: string | null | undefined, digits?: number) {
  if (!Number.isSafeInteger(amount) || !currency || !/^[A-Z]{3}$/.test(currency)) return '금액 정보 없음'
  if (digits === undefined) return `${integerFormat.format(amount!)} ${currency} (최소 단위)`
  if (!Number.isInteger(digits) || digits < 0 || digits > 4) return '금액 정보 없음'
  const minor = BigInt(amount!)
  const absolute = minor < 0n ? -minor : minor
  const scale = 10n ** BigInt(digits)
  const fraction = digits ? `.${String(absolute % scale).padStart(digits, '0')}` : ''
  return `${minor < 0n ? '-' : ''}${integerFormat.format(absolute / scale)}${fraction} ${currency}`
}
