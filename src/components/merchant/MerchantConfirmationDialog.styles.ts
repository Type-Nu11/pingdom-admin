import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Overlay = styled.div`
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 18, 24, 0.42);
`

export const Dialog = styled.div`
  width: min(100%, 420px);
  overflow: hidden;
  border: 1px solid ${colors.border};
  border-radius: 12px;
  background: ${colors.surface};
  box-shadow: 0 24px 56px rgba(20, 18, 24, 0.24);
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
`

export const Title = styled.h2`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${colors.muted};
  cursor: pointer;

  span { font-family: 'Material Symbols Outlined'; font-size: 20px; }
  &:hover:not(:disabled) { background: ${colors.surfaceLow}; color: ${colors.text}; }
  &:disabled { cursor: wait; opacity: 0.65; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
`

export const Body = styled.div`
  padding: 18px 20px;
`

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

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
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
