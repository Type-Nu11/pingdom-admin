import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Warning = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0;
  padding: 13px 14px;
  border-radius: 8px;
  background: ${colors.errorTint};
  color: ${colors.error};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;

  span { flex: 0 0 auto; margin-top: 1px; font-family: 'Material Symbols Outlined'; font-size: 19px; }
`

export const CancelButton = styled.button`
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: ${colors.primarySoft}; color: ${colors.primary}; background: ${colors.primaryTint}; }
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const ConfirmButton = styled(CancelButton)`
  border-color: ${colors.error};
  background: ${colors.error};
  color: #fff;

  &:hover:not(:disabled) { border-color: ${colors.error}; background: ${colors.error}; color: #fff; filter: brightness(0.92); }
`
