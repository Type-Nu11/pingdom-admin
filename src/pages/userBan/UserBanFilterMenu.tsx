import { useEffect, useRef, useState } from 'react'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

interface FilterMenuOption {
  value: string
  label: string
}

interface AdminFilterMenuProps {
  ariaLabel: string
  options: FilterMenuOption[]
  value: string
  onChange: (value: string) => void
}

export function AdminFilterMenu({
  ariaLabel,
  options,
  value,
  onChange,
}: AdminFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <U.FilterMenuRoot ref={rootRef}>
      <U.FilterMenuButton
        type="button"
        $open={isOpen}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="filter-menu-label">
          {selectedOption?.label ?? options[0]?.label ?? '-'}
        </span>
        <S.MaterialIcon className="filter-menu-icon" aria-hidden="true">
          expand_more
        </S.MaterialIcon>
      </U.FilterMenuButton>
      {isOpen ? (
        <U.FilterMenuList role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <U.FilterMenuOption
              key={option.value || 'ALL'}
              type="button"
              role="option"
              $active={option.value === value}
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
              {option.value === value ? (
                <S.MaterialIcon className="filter-menu-icon" aria-hidden="true">
                  check
                </S.MaterialIcon>
              ) : null}
            </U.FilterMenuOption>
          ))}
        </U.FilterMenuList>
      ) : null}
    </U.FilterMenuRoot>
  )
}
