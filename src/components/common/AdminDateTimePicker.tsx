import { useEffect, useMemo, useRef, useState } from 'react'
import * as S from './AdminDateTimePicker.styles'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function parseValue(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/)

  if (!matched) {
    return new Date()
  }

  return new Date(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
    Number(matched[4] ?? 0),
    Number(matched[5] ?? 0)
  )
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatDateTime(date: Date) {
  return `${formatDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

function formatDateLabel(value: string, includeTime: boolean) {
  if (!value) {
    return includeTime ? '일시 선택' : '날짜 선택'
  }

  const date = parseValue(value)
  const dateLabel = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`

  return includeTime
    ? `${dateLabel} ${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
      ).padStart(2, '0')}`
    : dateLabel
}

function getCalendarDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - firstDay.getDay())

  return Array.from(
    { length: 42 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

function isSameDay(left: Date | null, right: Date) {
  return Boolean(
    left &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  )
}

interface PickerProps {
  ariaLabel: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
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
}: PickerProps) {
  return (
    <DatePicker
      ariaLabel={ariaLabel}
      value={value}
      disabled={disabled}
      includeTime
      onChange={onChange}
    />
  )
}

interface DatePickerProps extends PickerProps {
  includeTime: boolean
}

function DatePicker({ ariaLabel, value, disabled, includeTime, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseValue(value))
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedDate = value ? parseValue(value) : null
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate])
  const timeValue = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(
        2,
        '0'
      )}`
    : '00:00'

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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
    nextValue.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate())
    nextValue.setSeconds(0, 0)
    onChange(includeTime ? formatDateTime(nextValue) : formatDate(nextValue))

    if (!includeTime) {
      setIsOpen(false)
    }
  }

  const handleTimeChange = (nextTime: string) => {
    const [hours, minutes] = nextTime.split(':').map(Number)
    const nextValue = selectedDate ? new Date(selectedDate) : new Date(viewDate)
    nextValue.setHours(hours, minutes, 0, 0)
    onChange(formatDateTime(nextValue))
  }

  return (
    <S.Root ref={rootRef}>
      <S.Trigger
        type="button"
        aria-label={`${ariaLabel}, ${formatDateLabel(value, includeTime)}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          if (value) {
            setViewDate(parseValue(value))
          }
          setIsOpen((open) => !open)
        }}
      >
        <span>{formatDateLabel(value, includeTime)}</span>
        <S.Icon aria-hidden="true">calendar_month</S.Icon>
      </S.Trigger>
      {isOpen ? (
        <S.Popover role="dialog" aria-label={ariaLabel}>
          <S.CalendarHeader>
            <S.IconButton
              type="button"
              aria-label="이전 달"
              onClick={() =>
                setViewDate((current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
            >
              <S.Icon aria-hidden="true">chevron_left</S.Icon>
            </S.IconButton>
            <S.CalendarTitle>
              {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
            </S.CalendarTitle>
            <S.IconButton
              type="button"
              aria-label="다음 달"
              onClick={() =>
                setViewDate((current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1)
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
                $outside={date.getMonth() !== viewDate.getMonth()}
                $selected={isSameDay(selectedDate, date)}
                $today={isSameDay(new Date(), date)}
                aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
                aria-pressed={isSameDay(selectedDate, date)}
                onClick={() => handleDateSelect(date)}
              >
                {date.getDate()}
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
        </S.Popover>
      ) : null}
    </S.Root>
  )
}

export function AdminTimePicker({ ariaLabel, value, disabled, onChange }: PickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const normalizedValue = /^\d{2}:\d{2}$/.test(value) ? value : '00:00'
  const selectedHour = normalizedValue.slice(0, 2)
  const selectedMinute = normalizedValue.slice(3, 5)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{normalizedValue}</span>
        <S.Icon aria-hidden="true">schedule</S.Icon>
      </S.Trigger>
      {isOpen ? (
        <S.TimeMenu aria-label={ariaLabel}>
          <S.TimeMenuTitle>{ariaLabel}</S.TimeMenuTitle>
          <S.TimeColumns>
            <S.TimeColumn>
              <S.TimeColumnLabel>시</S.TimeColumnLabel>
              <S.TimeOptions role="listbox" aria-label="시 선택">
                {HOURS.map((hour) => (
                  <S.TimeOption
                    key={hour}
                    type="button"
                    role="option"
                    $selected={selectedHour === hour}
                    aria-selected={selectedHour === hour}
                    onClick={() => onChange(`${hour}:${selectedMinute}`)}
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
                    key={minute}
                    type="button"
                    role="option"
                    $selected={selectedMinute === minute}
                    aria-selected={selectedMinute === minute}
                    onClick={() => onChange(`${selectedHour}:${minute}`)}
                  >
                    {minute}
                  </S.TimeOption>
                ))}
              </S.TimeOptions>
            </S.TimeColumn>
          </S.TimeColumns>
        </S.TimeMenu>
      ) : null}
    </S.TimePickerRoot>
  )
}
