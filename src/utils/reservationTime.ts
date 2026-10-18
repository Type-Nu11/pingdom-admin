// Only reservation slot/schedule LocalDateTime fields have the UTC contract.
// Do not apply this parser to unrelated LocalDateTime fields.
import { formatLocalDateTime } from './displayFormat'
const KST = 9 * 60 * 60 * 1000
const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/

export function reservationTimestamp(value: string | null | undefined): number | null {
  const match = typeof value === 'string' ? iso.exec(value) : null
  if (!match) return null
  const [, y, m, d, h, min, s = '0', fraction = '', offset] = match
  const date = new Date(0)
  date.setUTCFullYear(+y, +m - 1, +d)
  date.setUTCHours(+h, +min, +s, Number((fraction.slice(1) + '000').slice(0, 3)))
  if (+y < 1 || date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d
    || +h > 23 || +min > 59 || +s > 59) return null
  const offsetMinutes = !offset || offset === 'Z' ? 0 : Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4))
  if (offsetMinutes > 1080 || offset && offset !== 'Z' && Number(offset.slice(4)) > 59) return null
  const timestamp = date.getTime() - offsetMinutes * 60000 * (offset?.startsWith('-') ? -1 : 1)
  const year = new Date(timestamp).getUTCFullYear()
  return year >= 1 && year <= 9999 ? timestamp : null
}

function kstFields(timestamp: number) {
  const date = new Date(timestamp + KST)
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return ''
  return date.toISOString().slice(0, 16)
}

export function reservationTodayInput(now = Date.now()) { return kstFields(now).slice(0, 10) }

export function availabilityToInput(value: string | null | undefined) {
  const timestamp = reservationTimestamp(value)
  return timestamp === null ? '' : kstFields(timestamp)
}

export function reservationInputTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const wallTime = reservationTimestamp(value)
  if (wallTime === null) return null
  const timestamp = wallTime - KST
  return new Date(timestamp).getUTCFullYear() < 1 ? null : timestamp
}

export function reservationInputToUtc(value: string, original?: string) {
  const timestamp = reservationInputTimestamp(value)
  if (timestamp === null) return null
  // A capacity-only edit must not truncate seconds/nanoseconds in existing data.
  if (original && value === availabilityToInput(original)) {
    const originalTimestamp = reservationTimestamp(original)
    if (originalTimestamp === null) return null
    const fraction = iso.exec(original)?.[7] ?? ''
    return new Date(originalTimestamp).toISOString().slice(0, 19) + fraction
  }
  return new Date(timestamp).toISOString().slice(0, 19)
}

export function formatReservationSchedule(value: string | null | undefined) {
  const input = availabilityToInput(value)
  return input ? `${input.slice(0, 10).replaceAll('-', '.')} ${input.slice(11)} (한국 시각)` : '시각 정보 없음'
}

// Audit LocalDateTimes have no proven UTC contract: keep their civil fields.
// Only an explicit offset can establish an instant for these event fields.
export function formatReservationEventTime(value: string | null | undefined) {
  return value && /(Z|[+-]\d{2}:\d{2})$/.test(value) ? formatReservationSchedule(value) : formatLocalDateTime(value)
}
