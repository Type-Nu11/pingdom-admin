import type { ReactNode, SelectHTMLAttributes } from 'react'
import { AdminStatusSelect } from './AdminStatusSelect'
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
  return (
    <S.Panel>
      <S.Row>
        <S.LabelGroup>
          <S.FilterIcon aria-hidden="true">filter_list</S.FilterIcon>
          <S.Heading>
            <S.Title>{label}</S.Title>
            {description ? <S.Description>{description}</S.Description> : null}
          </S.Heading>
        </S.LabelGroup>
        <S.Controls>
          {controls ?? (
            <AdminStatusSelect aria-label={label} {...selectProps}>
              {children}
            </AdminStatusSelect>
          )}
        </S.Controls>
      </S.Row>
    </S.Panel>
  )
}
