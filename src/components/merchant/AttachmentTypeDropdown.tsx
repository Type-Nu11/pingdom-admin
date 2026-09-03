import { useEffect, useRef, useState } from 'react'
import * as S from './AttachmentTypeDropdown.styles'

export type AttachmentTypeOption<T extends string> = {
  value: T
  label: string
}

type AttachmentTypeDropdownProps<T extends string> = {
  ariaLabel: string
  disabled?: boolean
  options: readonly AttachmentTypeOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function AttachmentTypeDropdown<T extends string>({
  ariaLabel,
  disabled = false,
  options,
  value,
  onChange,
}: AttachmentTypeDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [isOpen])

  return (
    <S.Root ref={rootRef}>
      <S.Trigger
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false)
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setIsOpen(true)
          }
        }}
      >
        <span>{selectedOption?.label ?? value}</span>
        <span aria-hidden="true">{isOpen ? 'expand_less' : 'expand_more'}</span>
      </S.Trigger>
      {isOpen ? <S.Menu role="listbox" aria-label={ariaLabel}>
        {options.map((option) => <S.Option
          key={option.value}
          type="button"
          role="option"
          $selected={option.value === value}
          aria-selected={option.value === value}
          onClick={() => {
            onChange(option.value)
            setIsOpen(false)
          }}
        >
          {option.label}
        </S.Option>)}
      </S.Menu> : null}
    </S.Root>
  )
}
