const koreanTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

// Only operating checkedAt has the offset-free UTC contract.
export function formatMerchantOperatingTime(value?: string | null) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})?$/.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute, second, fraction, offset] = match
  const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`)
  if (!Number.isFinite(calendar.getTime()) || calendar.getUTCFullYear() !== Number(year)
    || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null
  if (offset && offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59)) return null
  const milliseconds = fraction ? `.${fraction.padEnd(3, '0').slice(0, 3)}` : ''
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${milliseconds}${offset ?? 'Z'}`)
  if (!Number.isFinite(date.getTime())) return null
  const parts = koreanTime.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
  return {
    dateTime: date.toISOString(),
    label: `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} (KST)`,
  }
}
