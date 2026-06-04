import { useEffect, useId, useRef, useState } from 'react'
import * as S from './SortDropdown.styles'

export interface SortDropdownOption {
  value: string
  label: string
}

interface SortDropdownProps {
  ariaLabel: string
  value: string
  options: SortDropdownOption[]
  disabled?: boolean
  width?: string
  onChange: (value: string) => void
}

function SortDropdown({
  ariaLabel,
  value,
  options,
  disabled = false,
  width,
  onChange,
}: SortDropdownProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <S.DropdownRoot ref={rootRef} $width={width}>
      <S.DropdownTrigger
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selectedOption.label}</span>
        <S.DropdownIcon aria-hidden="true">expand_more</S.DropdownIcon>
      </S.DropdownTrigger>

      {isOpen ? (
        <S.DropdownMenu id={listboxId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <S.DropdownOption
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                $selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <S.DropdownIcon aria-hidden="true">check</S.DropdownIcon>
                ) : null}
              </S.DropdownOption>
            )
          })}
        </S.DropdownMenu>
      ) : null}
    </S.DropdownRoot>
  )
}

export default SortDropdown
