import type {
  MerchantOperatingBreakTime,
  MerchantPlaceRegistrationOperatingDay,
} from '../types/merchantPlaceRegistration.types'

export type RegistrationScheduleDraft = Required<MerchantPlaceRegistrationOperatingDay>

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const

function parseTime(value: unknown, fallback: string) {
  if (typeof value === 'string' && /^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return value.slice(0, 5)
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as { hour?: unknown; minute?: unknown }
  if (typeof candidate.hour !== 'number' || typeof candidate.minute !== 'number') return fallback
  return `${String(candidate.hour).padStart(2, '0')}:${String(candidate.minute).padStart(2, '0')}`
}

export function parseRegistrationSchedule(value: string | null): RegistrationScheduleDraft[] {
  const defaults = DAYS.map(dayOfWeek => ({ dayOfWeek, status: 'OPEN' as const, opensAt: '10:00', closesAt: '20:00', breakTimes: [] }))
  if (!value) return defaults
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return defaults
    return defaults.map(fallback => {
      const current = parsed.find(item => item && typeof item === 'object' && item.dayOfWeek === fallback.dayOfWeek)
      const status = current?.status
      return {
        dayOfWeek: fallback.dayOfWeek,
        status: status === 'CLOSED' || status === 'OPEN_24_HOURS' || status === 'OPEN' ? status : fallback.status,
        opensAt: parseTime(current?.opensAt, fallback.opensAt),
        closesAt: parseTime(current?.closesAt, fallback.closesAt),
        // Breaks are not edited by this form, so retain their server precision.
        breakTimes: Array.isArray(current?.breakTimes) ? current.breakTimes.map((period: MerchantOperatingBreakTime) => ({ ...period })) : [],
      }
    })
  } catch {
    return defaults
  }
}

export function buildRegistrationOperatingDays(schedule: RegistrationScheduleDraft[]): MerchantPlaceRegistrationOperatingDay[] {
  return schedule.map(day => ({
    dayOfWeek: day.dayOfWeek,
    status: day.status,
    ...(day.status === 'OPEN' ? { opensAt: day.opensAt, closesAt: day.closesAt, breakTimes: day.breakTimes.map(period => ({ ...period })) } : {}),
  }))
}
