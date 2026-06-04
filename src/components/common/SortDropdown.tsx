import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
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
  const [activeIndex, setActiveIndex] = useState(0)
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0]
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === selectedOption.value),
    0
  )

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

  function openDropdown() {
    setActiveIndex(selectedIndex)
    setIsOpen(true)
  }

  function closeDropdown() {
    setIsOpen(false)
  }

  function toggleDropdown() {
    if (isOpen) {
      closeDropdown()

      return
    }

    openDropdown()
  }

  function moveActiveOption(direction: number) {
    if (options.length === 0) {
      return
    }

    setActiveIndex((prevIndex) => {
      const baseIndex = prevIndex >= 0 ? prevIndex : selectedIndex

      return (baseIndex + direction + options.length) % options.length
    })
  }

  function selectOption(optionIndex: number) {
    const nextOption = options[optionIndex]

    if (!nextOption) {
      return
    }

    onChange(nextOption.value)
    closeDropdown()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()

      if (!isOpen) {
        openDropdown()

        return
      }

      moveActiveOption(1)

      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()

      if (!isOpen) {
        openDropdown()

        return
      }

      moveActiveOption(-1)

      return
    }

    if (event.key === 'Enter' && isOpen) {
      event.preventDefault()
      selectOption(activeIndex)

      return
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      closeDropdown()
    }
  }

  return (
    <S.DropdownRoot ref={rootRef} $width={width}>
      <S.DropdownTrigger
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption.label}</span>
        <S.DropdownIcon aria-hidden="true">expand_more</S.DropdownIcon>
      </S.DropdownTrigger>

      {isOpen ? (
        <S.DropdownMenu
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${listboxId}-option-${activeIndex}`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isHighlighted = index === activeIndex

            return (
              <S.DropdownOption
                id={`${listboxId}-option-${index}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                $selected={isSelected}
                $highlighted={isHighlighted}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  selectOption(index)
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
