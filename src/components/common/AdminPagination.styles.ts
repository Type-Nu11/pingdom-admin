import styled, { css } from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

export const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid ${adminColors.border};
  background: ${adminColors.surface};
`

export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid ${adminColors.border};
  border-radius: ${radius.pill};
  background: ${adminColors.surface};
  color: ${adminColors.text};
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${adminColors.primarySoft};
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
`

export const Icon = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const PageList = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

export const PageButton = styled.button<{ $active?: boolean }>`
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid ${adminColors.border};
  border-radius: ${radius.pill};
  background: ${adminColors.surface};
  color: ${adminColors.text};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${adminColors.primarySoft};
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  ${({ $active }) =>
    $active &&
    css`
      border-color: ${adminColors.primary};
      background: ${adminColors.primary};
      color: #fff;

      &:hover:not(:disabled) {
        border-color: ${adminColors.primary};
        background: ${adminColors.primary};
        color: #fff;
      }
    `}
`
