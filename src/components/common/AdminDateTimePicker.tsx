import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import * as S from './AdminDateTimePicker.styles'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function calendarParts(date: Date, wallClock = false) {
  return wallClock
    ? { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), weekday: date.getUTCDay(), hour: date.getUTCHours(), minute: date.getUTCMinutes() }
    : { year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), weekday: date.getDay(), hour: date.getHours(), minute: date.getMinutes() }
}

function calendarDate(year: number, month: number, day: number, hour = 0, minute = 0, wallClock = false) {
  if (!wallClock) return new Date(year, month, day, hour, minute)
  const date = new Date(0)
  date.setUTCFullYear(year, month, day)
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

function parseValue(value: string, wallClock = false, today?: string): Date {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/)

  if (!matched) {
    return wallClock && today ? parseValue(today, true) : new Date()
  }

  return calendarDate(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
    Number(matched[4] ?? 0),
    Number(matched[5] ?? 0), wallClock
  )
}

function formatDate(date: Date, wallClock = false) {
  const p = calendarParts(date, wallClock)
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(
    p.day
  ).padStart(2, '0')}`
}

function formatDateTime(date: Date, wallClock = false) {
  const p = calendarParts(date, wallClock)
  return `${formatDate(date, wallClock)}T${String(p.hour).padStart(2, '0')}:${String(
    p.minute
  ).padStart(2, '0')}`
}

function formatDateLabel(value: string, includeTime: boolean, wallClock = false) {
  if (!value) {
    return includeTime ? '일시 선택' : '날짜 선택'
  }

  const p = calendarParts(parseValue(value, wallClock), wallClock)
  const dateLabel = `${p.year}. ${p.month + 1}. ${p.day}.`

  return includeTime
    ? `${dateLabel} ${String(p.hour).padStart(2, '0')}:${String(
        p.minute
      ).padStart(2, '0')}`
    : dateLabel
}

function getCalendarDays(viewDate: Date, wallClock = false) {
  const p = calendarParts(viewDate, wallClock)
  const firstDay = calendarDate(p.year, p.month, 1, 0, 0, wallClock)
  const start = calendarParts(calendarDate(p.year, p.month, 1 - calendarParts(firstDay, wallClock).weekday, 0, 0, wallClock), wallClock)

  return Array.from(
    { length: 42 },
    (_, index) => calendarDate(start.year, start.month, start.day + index, 0, 0, wallClock)
  )
}

function isSameDay(left: Date | null, right: Date, wallClock = false) {
  return Boolean(
    left &&
      calendarParts(left, wallClock).year === calendarParts(right, wallClock).year &&
      calendarParts(left, wallClock).month === calendarParts(right, wallClock).month &&
      calendarParts(left, wallClock).day === calendarParts(right, wallClock).day
  )
}

interface FloatingPosition {
  top: number
  left: number
}

function useFloatingLayerPosition(
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  layerRef: React.RefObject<HTMLElement | null>
) {
  const [position, setPosition] = useState<FloatingPosition | null>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      return
    }

    let animationFrameId = 0

    const updatePosition = () => {
      const anchor = anchorRef.current
      const layer = layerRef.current

      if (!anchor || !layer) {
        return
      }

      const edgeMargin = 20
      const gap = 8
      const anchorRect = anchor.getBoundingClientRect()
      const layerRect = layer.getBoundingClientRect()
      const left = Math.min(
        Math.max(edgeMargin, anchorRect.left),
        window.innerWidth - layerRect.width - edgeMargin
      )
      const preferredTop = anchorRect.bottom + gap
      const top =
        preferredTop + layerRect.height <= window.innerHeight - edgeMargin
          ? preferredTop
          : Math.max(edgeMargin, anchorRect.top - layerRect.height - gap)

      setPosition({ top, left })
    }

    animationFrameId = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, isOpen, layerRef])

  return position
}

function isInsidePickerLayer(target: EventTarget | null) {
  return target instanceof Element && target.closest('[data-admin-picker-layer]') !== null
}

function getNextOptionIndex(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  optionCount: number
) {
  switch (event.key) {
    case 'ArrowDown':
      return (currentIndex + 1) % optionCount
    case 'ArrowUp':
      return (currentIndex - 1 + optionCount) % optionCount
    case 'Home':
      return 0
    case 'End':
      return optionCount - 1
    default:
      return null
  }
}

function focusTimeOption(optionId: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(optionId)?.focus()
  })
}

interface PickerProps {
  ariaLabel: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  /** Civil fields stored in UTC-shaped Dates, never browser DST-normalized. */
  wallClock?: boolean
  today?: string
}

export function AdminDatePicker({ ariaLabel, value, disabled, onChange }: PickerProps) {
  return (
    <DatePicker
      ariaLabel={ariaLabel}
      value={value}
      disabled={disabled}
      includeTime={false}
      onChange={onChange}
    />
  )
}

export function AdminDateTimePicker({
  ariaLabel,
  value,
  disabled,
  onChange,
  wallClock,
  today,
}: PickerProps) {
  return (
    <DatePicker
      ariaLabel={ariaLabel}
      value={value}
      disabled={disabled}
      includeTime
      wallClock={wallClock}
      today={today}
      onChange={onChange}
    />
  )
}

interface DatePickerProps extends PickerProps {
  includeTime: boolean
}

function DatePicker({ ariaLabel, value, disabled, includeTime, onChange, wallClock = false, today }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseValue(value, wallClock, today))
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const floatingPosition = useFloatingLayerPosition(isOpen, rootRef, popoverRef)
  const selectedDate = value ? parseValue(value, wallClock, today) : null
  const calendarDays = useMemo(() => getCalendarDays(viewDate, wallClock), [viewDate, wallClock])
  const timeValue = selectedDate
    ? `${String(calendarParts(selectedDate, wallClock).hour).padStart(2, '0')}:${String(calendarParts(selectedDate, wallClock).minute).padStart(
        2,
        '0'
      )}`
    : '00:00'

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !popoverRef.current?.contains(event.target as Node) &&
        !isInsidePickerLayer(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const handleDateSelect = (nextDate: Date) => {
    const nextValue = selectedDate ? new Date(selectedDate) : new Date(nextDate)
    if (wallClock) {
      nextValue.setUTCFullYear(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate())
      nextValue.setUTCSeconds(0, 0)
    } else {
      nextValue.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate())
      nextValue.setSeconds(0, 0)
    }
    onChange(includeTime ? formatDateTime(nextValue, wallClock) : formatDate(nextValue, wallClock))

    if (!includeTime) {
      setIsOpen(false)
    }
  }

  const handleTimeChange = (nextTime: string) => {
    const [hours, minutes] = nextTime.split(':').map(Number)
    const nextValue = selectedDate ? new Date(selectedDate) : new Date(viewDate)
    if (wallClock) nextValue.setUTCHours(hours, minutes, 0, 0)
    else nextValue.setHours(hours, minutes, 0, 0)
    onChange(formatDateTime(nextValue, wallClock))
  }

  const handleEscape = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !isOpen) return
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(false)
    rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  return (
    <S.Root ref={rootRef}>
      <S.Trigger
        type="button"
        aria-label={`${ariaLabel}, ${formatDateLabel(value, includeTime, wallClock)}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled}
        onKeyDown={handleEscape}
        onClick={() => {
          if (value) {
            setViewDate(parseValue(value, wallClock, today))
          }
          setIsOpen((open) => !open)
        }}
      >
        <span>{formatDateLabel(value, includeTime, wallClock)}</span>
        <S.Icon aria-hidden="true">calendar_month</S.Icon>
      </S.Trigger>
      {isOpen
        ? createPortal(
            <S.Popover
              ref={popoverRef}
              role="dialog"
              aria-label={ariaLabel}
              data-admin-picker-layer
              onKeyDown={handleEscape}
              style={
                floatingPosition
                  ? { top: floatingPosition.top, left: floatingPosition.left }
                  : { top: -9999, left: -9999, visibility: 'hidden' }
              }
            >
          <S.CalendarHeader>
            <S.IconButton
              type="button"
              aria-label="이전 달"
              onClick={() =>
                setViewDate((current) =>
                  calendarDate(calendarParts(current, wallClock).year, calendarParts(current, wallClock).month - 1, 1, 0, 0, wallClock)
                )
              }
            >
              <S.Icon aria-hidden="true">chevron_left</S.Icon>
            </S.IconButton>
            <S.CalendarTitle>
              {calendarParts(viewDate, wallClock).year}년 {calendarParts(viewDate, wallClock).month + 1}월
            </S.CalendarTitle>
            <S.IconButton
              type="button"
              aria-label="다음 달"
              onClick={() =>
                setViewDate((current) =>
                  calendarDate(calendarParts(current, wallClock).year, calendarParts(current, wallClock).month + 1, 1, 0, 0, wallClock)
                )
              }
            >
              <S.Icon aria-hidden="true">chevron_right</S.Icon>
            </S.IconButton>
          </S.CalendarHeader>
          <S.Weekdays aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </S.Weekdays>
          <S.DayGrid>
            {calendarDays.map((date) => (
              <S.DayButton
                key={date.toISOString()}
                type="button"
                $outside={calendarParts(date, wallClock).month !== calendarParts(viewDate, wallClock).month}
                $selected={isSameDay(selectedDate, date, wallClock)}
                $today={isSameDay(wallClock && today ? parseValue(today, true) : new Date(), date, wallClock)}
                aria-label={`${calendarParts(date, wallClock).year}년 ${calendarParts(date, wallClock).month + 1}월 ${calendarParts(date, wallClock).day}일`}
                aria-pressed={isSameDay(selectedDate, date, wallClock)}
                onClick={() => handleDateSelect(date)}
              >
                {calendarParts(date, wallClock).day}
              </S.DayButton>
            ))}
          </S.DayGrid>
          {includeTime ? (
            <S.Footer>
              <AdminTimePicker
                ariaLabel="시간 선택"
                value={timeValue}
                onChange={handleTimeChange}
              />
              <S.SecondaryButton
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
              >
                초기화
              </S.SecondaryButton>
              <S.PrimaryButton
                type="button"
                onClick={() => {
                  setIsOpen(false)
                }}
              >
                적용
              </S.PrimaryButton>
            </S.Footer>
          ) : null}
            </S.Popover>,
            document.body
          )
        : null}
    </S.Root>
  )
}

export function AdminTimePicker({ ariaLabel, value, disabled, onChange }: PickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pickerId = useId()
  const floatingPosition = useFloatingLayerPosition(isOpen, rootRef, menuRef)
  const normalizedValue = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '00:00'
  const selectedHour = normalizedValue.slice(0, 2)
  const selectedMinute = normalizedValue.slice(3, 5)

  const handleEscape = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !isOpen) return false
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(false)
    rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return true
  }

  const getOptionId = (unit: 'hour' | 'minute', option: string) =>
    `${pickerId}-${unit}-${option}`

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    options: string[],
    currentIndex: number,
    unit: 'hour' | 'minute',
    onSelect: (option: string) => void
  ) => {
    const nextIndex = getNextOptionIndex(event, currentIndex, options.length)

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    const nextOption = options[nextIndex]
    onSelect(nextOption)
    focusTimeOption(getOptionId(unit, nextOption))
  }

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node) &&
        !isInsidePickerLayer(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <S.TimePickerRoot ref={rootRef}>
      <S.Trigger
        type="button"
        aria-label={`${ariaLabel}, ${normalizedValue}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (handleEscape(event)) return
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return
          }

          event.preventDefault()
          setIsOpen(true)
          focusTimeOption(getOptionId('hour', selectedHour))
        }}
      >
        <span>{normalizedValue}</span>
        <S.Icon aria-hidden="true">schedule</S.Icon>
      </S.Trigger>
      {isOpen
        ? createPortal(
            <S.TimeMenu
              ref={menuRef}
              role="dialog"
              aria-label={ariaLabel}
              data-admin-picker-layer
              onKeyDown={handleEscape}
              style={
                floatingPosition
                  ? { top: floatingPosition.top, left: floatingPosition.left }
                  : { top: -9999, left: -9999, visibility: 'hidden' }
              }
            >
          <S.TimeMenuTitle>{ariaLabel}</S.TimeMenuTitle>
          <S.TimeColumns>
            <S.TimeColumn>
              <S.TimeColumnLabel>시</S.TimeColumnLabel>
              <S.TimeOptions role="listbox" aria-label="시 선택">
                {HOURS.map((hour) => (
                  <S.TimeOption
                    id={getOptionId('hour', hour)}
                    key={hour}
                    type="button"
                    role="option"
                    $selected={selectedHour === hour}
                    aria-selected={selectedHour === hour}
                    tabIndex={selectedHour === hour ? 0 : -1}
                    onClick={() => onChange(`${hour}:${selectedMinute}`)}
                    onKeyDown={(event) =>
                      handleOptionKeyDown(
                        event,
                        HOURS,
                        HOURS.indexOf(hour),
                        'hour',
                        (nextHour) => onChange(`${nextHour}:${selectedMinute}`)
                      )
                    }
                  >
                    {hour}
                  </S.TimeOption>
                ))}
              </S.TimeOptions>
            </S.TimeColumn>
            <S.TimeSeparator>:</S.TimeSeparator>
            <S.TimeColumn>
              <S.TimeColumnLabel>분</S.TimeColumnLabel>
              <S.TimeOptions role="listbox" aria-label="분 선택">
                {MINUTES.map((minute) => (
                  <S.TimeOption
                    id={getOptionId('minute', minute)}
                    key={minute}
                    type="button"
                    role="option"
                    $selected={selectedMinute === minute}
                    aria-selected={selectedMinute === minute}
                    tabIndex={selectedMinute === minute ? 0 : -1}
                    onClick={() => onChange(`${selectedHour}:${minute}`)}
                    onKeyDown={(event) =>
                      handleOptionKeyDown(
                        event,
                        MINUTES,
                        MINUTES.indexOf(minute),
                        'minute',
                        (nextMinute) => onChange(`${selectedHour}:${nextMinute}`)
                      )
                    }
                  >
                    {minute}
                  </S.TimeOption>
                ))}
              </S.TimeOptions>
            </S.TimeColumn>
          </S.TimeColumns>
            </S.TimeMenu>,
            document.body
          )
        : null}
    </S.TimePickerRoot>
  )
}
