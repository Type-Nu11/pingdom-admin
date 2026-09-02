import styled, { css } from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

export const DropdownRoot = styled.div<{ $width?: string }>`
  position: relative;
  min-width: 0;
  width: ${({ $width }) => $width ?? '104px'};
  flex-shrink: 0;

  @media (max-width: 460px) {
    width: 100%;
  }
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
  border-radius: ${radius.md};
  outline: 1px solid transparent;
  background: ${adminColors.surfaceLow};
  color: ${adminColors.text};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    outline-color 160ms ease,
    box-shadow 160ms ease;

  > span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

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
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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

export const DropdownChevron = styled(DropdownIcon)<{ $open: boolean }>`
  transition: transform 160ms ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: max(100%, 168px);
  max-height: min(320px, calc(100vh - 180px));
  overflow-x: hidden;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  background: ${adminColors.surface};
  box-shadow: 0 14px 34px ${adminColors.shadow};

  scrollbar-width: thin;
  scrollbar-color: ${adminColors.primarySoft} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 8px;
    background: ${adminColors.primarySoft};
    background-clip: padding-box;
  }
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
  font-size: 14px;
  font-weight: 500;
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
      font-weight: 700;
    `}
`
