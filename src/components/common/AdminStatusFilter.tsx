import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import * as S from './AdminStatusFilter.styles'

interface AdminStatusFilterProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  description?: string
  controls?: ReactNode
}

export function AdminStatusFilter({
  label,
  description,
  controls,
  children,
  ...selectProps
}: AdminStatusFilterProps) {
  const labelId = useId()

  return (
    <S.Panel>
      <S.Row>
        <S.Heading>
          <S.Title id={labelId}>{label}</S.Title>
          {description ? <S.Description>{description}</S.Description> : null}
        </S.Heading>
        <S.Controls>
          {controls ?? (
            <S.Select aria-labelledby={labelId} {...selectProps}>
              {children}
            </S.Select>
          )}
        </S.Controls>
      </S.Row>
    </S.Panel>
  )
}
