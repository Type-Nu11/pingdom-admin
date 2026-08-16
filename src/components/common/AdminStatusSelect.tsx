import type { SelectHTMLAttributes } from 'react'
import * as S from './AdminStatusFilter.styles'

export function AdminStatusSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <S.Select {...props} />
}
