import {
  Children,
  isValidElement,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import SortDropdown, { type SortDropdownOption } from './SortDropdown'

interface AdminStatusSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  width?: string
}

function optionLabel(children: ReactNode) {
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
    .join('')
}

function toOptions(children: ReactNode): SortDropdownOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) {
      return []
    }

    const value = String(child.props.value ?? optionLabel(child.props.children))

    return [{ value, label: optionLabel(child.props.children) || value }]
  })
}

export function AdminSelect({
  children,
  value,
  defaultValue,
  disabled,
  onChange,
  width,
  'aria-label': ariaLabel,
}: AdminStatusSelectProps) {
  const options = toOptions(children)
  const selectedValue = String(value ?? defaultValue ?? options[0]?.value ?? '')

  return (
    <SortDropdown
      ariaLabel={ariaLabel ?? '선택'}
      value={selectedValue}
      options={options}
      disabled={disabled}
      width={width ?? '164px'}
      onChange={(nextValue) => {
        onChange?.({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as ChangeEvent<HTMLSelectElement>)
      }}
    />
  )
}

export const AdminStatusSelect = AdminSelect
