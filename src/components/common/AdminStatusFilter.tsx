import { useId, type SelectHTMLAttributes } from 'react'
import * as S from './AdminStatusFilter.styles'

interface AdminStatusFilterProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function AdminStatusFilter({ label, children, ...selectProps }: AdminStatusFilterProps) {
  const labelId = useId()

  return (
    <S.Panel>
      <S.Row>
        <S.Title id={labelId}>{label}</S.Title>
        <S.Select aria-labelledby={labelId} {...selectProps}>
          {children}
        </S.Select>
      </S.Row>
    </S.Panel>
  )
}
