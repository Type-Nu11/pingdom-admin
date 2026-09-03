import styled from 'styled-components'
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
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: ${adminColors.surfaceLow};
  color: ${adminColors.text};
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.32;
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
  padding: 4px;
  border: 1px solid ${adminColors.border};
  border-radius: 12px;
  background: ${adminColors.surface};
`

export const PageButton = styled.button<{ $active?: boolean }>`
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: ${({ $active }) => ($active ? adminColors.primary : 'transparent')};
  color: ${({ $active }) => ($active ? adminColors.primaryText : adminColors.text)};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    background: ${({ $active }) => ($active ? adminColors.primary : adminColors.primaryTint)};
    color: ${({ $active }) => ($active ? adminColors.primaryText : adminColors.primary)};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`
