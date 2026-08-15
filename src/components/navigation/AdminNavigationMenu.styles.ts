import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Navigation = styled.div`
  display: grid;
  gap: 18px;
  padding: 18px 14px 6px;
  border-top: 1px solid ${adminColors.borderSoft};

  @media (max-width: 900px) {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 0 0 0 8px;
    border-top: 0;
  }
`

export const Group = styled.section`
  display: grid;
  gap: 6px;

  @media (max-width: 900px) {
    flex-shrink: 0;
  }
`

export const GroupTitle = styled.h3`
  margin: 0;
  padding: 0 10px;
  color: ${adminColors.muted};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;

  @media (max-width: 900px) {
    display: none;
  }
`

export const ItemList = styled.div`
  display: grid;
  gap: 2px;

  @media (max-width: 900px) {
    display: flex;
    gap: 2px;
  }
`

export const MaterialIcon = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  line-height: 1;
  font-weight: 400;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const ItemButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: ${adminColors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }

  ${({ $active }) =>
    $active &&
    css`
      background: ${adminColors.primaryTint};
      color: ${adminColors.primary};
      font-weight: 700;

      ${MaterialIcon} {
        font-variation-settings:
          'FILL' 1,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }
    `}

  @media (max-width: 900px) {
    width: auto;
    min-height: 40px;
    flex-shrink: 0;
    white-space: nowrap;
  }
`
