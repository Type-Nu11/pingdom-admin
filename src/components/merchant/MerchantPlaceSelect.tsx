import type { SelectHTMLAttributes } from 'react'
import styled from 'styled-components'
import { AdminSelect } from '../common/AdminStatusSelect'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean
}

const Container = styled.div<{ $compact: boolean }>`
  width: 220px;
  max-width: 100%;
  min-width: 0;
  flex-shrink: 0;
  margin-bottom: ${({ $compact }) => $compact ? '0' : '20px'};
`

export function MerchantPlaceSelect({ compact = false, ...props }: Props) {
  return (
    <Container $compact={compact}>
      <AdminSelect {...props} width="100%" />
    </Container>
  )
}
