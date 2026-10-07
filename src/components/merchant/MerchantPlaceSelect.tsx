import { Children, cloneElement, isValidElement, type ReactNode, type SelectHTMLAttributes } from 'react'
import styled from 'styled-components'
import { AdminSelect } from '../common/AdminStatusSelect'
import { useMerchantPlaceIdentity } from '../../hooks/useMerchantPlaceIdentity'
import { adminColors as colors } from '../../styles/theme'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean
  fullWidth?: boolean
  showSelectedName?: boolean
}

const Container = styled.div<{ $compact: boolean; $fullWidth: boolean }>`
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : '220px'};
  max-width: 100%;
  min-width: 0;
  flex-shrink: 0;
  margin-bottom: ${({ $compact }) => $compact ? '0' : '20px'};
  [role='option'] > span:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: normal;
    line-height: 1.5;
  }
`

const Meta = styled.small`
  display: block; margin-top: 6px; color: ${colors.muted}; line-height: 1.5; overflow-wrap: anywhere;
  strong { display: block; color: ${colors.text}; }
`
const Retry = styled.button`
  margin-top: 6px; padding: 6px 10px; border: 1px solid ${colors.border}; border-radius: 6px;
  background: ${colors.surface}; color: ${colors.text}; font: inherit; font-size: 12px; cursor: pointer;
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export function MerchantPlaceSelect({ compact = false, fullWidth = false, showSelectedName = false, value, onChange, children, ...props }: Props) {
  const options = Children.toArray(children)
  const ids = options.flatMap(child => isValidElement<{ value?: number | string }>(child) && Number(child.props.value) > 0 ? [Number(child.props.value)] : [])
  const identity = useMerchantPlaceIdentity(ids)
  const failedIds = ids.filter(id => identity.places[id]?.status === 'error')
  return (
    <Container $compact={compact} $fullWidth={fullWidth}>
      <AdminSelect
        {...props}
        value={value}
        children={options.map(child => isValidElement<{ value?: string | number; children?: ReactNode }>(child) && Number(child.props.value) > 0
          ? cloneElement(child, {}, identity.label(Number(child.props.value), true)) : child)}
        width="100%"
        onChange={event => {
          // Match native select semantics: reselecting the current place is not a change.
          if (String(value ?? props.defaultValue ?? '') === event.target.value) return
          onChange?.(event)
        }}
      />
      {identity.places[Number(value)]?.status === 'ready' ? <Meta>{showSelectedName ? <strong>{identity.places[Number(value)].name}</strong> : null}{identity.places[Number(value)].address || '주소 정보 없음'} · #{value}</Meta> : null}
      {failedIds.length ? <Retry type="button" disabled={props.disabled} onClick={() => failedIds.forEach(identity.retry)}>매장 정보 다시 조회</Retry> : null}
    </Container>
  )
}
