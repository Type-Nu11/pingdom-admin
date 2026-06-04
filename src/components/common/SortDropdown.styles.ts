import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

export const DropdownRoot = styled.div<{ $width?: string }>`
  position: relative;
  width: ${({ $width }) => $width ?? '104px'};
  flex-shrink: 0;
`

export const DropdownTrigger = styled.button`
  width: 100%;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 10px 0 12px;
  border: 0;
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${adminColors.surfaceLow};
  color: ${adminColors.text};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    outline-color 160ms ease,
    box-shadow 160ms ease;

  &:hover:not(:disabled) {
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }

  &:focus-visible {
    outline-color: ${adminColors.primary};
    box-shadow: 0 0 0 3px ${adminColors.primaryTint};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

export const DropdownIcon = styled.span`
  flex-shrink: 0;
  color: currentColor;
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 100%;
  overflow: hidden;
  padding: 4px;
  border: 1px solid ${adminColors.border};
  border-radius: 10px;
  background: ${adminColors.surface};
  box-shadow: 0 14px 34px ${adminColors.shadow};
`

export const DropdownOption = styled.button<{
  $selected?: boolean
  $highlighted?: boolean
}>`
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: ${adminColors.text};
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover {
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }

  ${({ $highlighted }) =>
    $highlighted &&
    css`
      background: ${adminColors.primaryTint};
      color: ${adminColors.primary};
    `}

  ${({ $selected }) =>
    $selected &&
    css`
      background: ${adminColors.primaryTint};
      color: ${adminColors.primary};
      font-weight: 800;
    `}
`
