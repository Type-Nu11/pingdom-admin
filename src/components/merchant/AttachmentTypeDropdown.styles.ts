import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Root = styled.div`
  position: relative;
  min-width: 0;
`

export const Trigger = styled.button`
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  > span:last-child { color: ${colors.muted}; font-family: 'Material Symbols Outlined'; font-size: 18px; }
  &[aria-expanded='true'] { border-color: ${colors.primary}; box-shadow: 0 0 0 3px ${colors.primaryTint}; }
  &:hover:not(:disabled) { border-color: ${colors.primarySoft}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  &:disabled { cursor: wait; opacity: 0.65; }
`

export const Menu = styled.div`
  position: absolute;
  z-index: 12;
  top: calc(100% + 2px);
  right: 0;
  left: 0;
  display: grid;
  gap: 3px;
  padding: 5px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  box-shadow: 0 14px 30px ${colors.shadow};
`

export const Option = styled.button<{ $selected: boolean }>`
  min-height: 34px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: ${({ $selected }) => ($selected ? colors.primaryTint : 'transparent')};
  color: ${({ $selected }) => ($selected ? colors.primary : colors.text)};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 600)};
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible { outline: 0; background: ${colors.primaryTint}; color: ${colors.primary}; }
`
