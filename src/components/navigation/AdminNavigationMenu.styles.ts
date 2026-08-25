import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Navigation = styled.div`
  display: grid;
  gap: 18px;
  padding: 0 14px 6px;

  @media (max-width: 900px) {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 0;
  }
`

export const Group = styled.section`
  display: grid;
  gap: 6px;

  @media (max-width: 900px) {
    flex-shrink: 0;
  }
`

export const GroupTitle = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: ${adminColors.muted};
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: ${adminColors.primary};
  }

  @media (max-width: 900px) {
    display: none;
  }
`

export const ItemList = styled.div<{ $collapsed?: boolean }>`
  display: ${({ $collapsed }) => ($collapsed ? 'none' : 'grid')};
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

export const DashboardButton = styled(ItemButton)`
  min-height: 48px;
  margin-bottom: 2px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 14px;

  @media (max-width: 900px) {
    min-height: 40px;
    margin-bottom: 0;
  }
`

export const PlaceToolbar = styled.div<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  border-radius: 7px;

  ${({ $active }) =>
    $active &&
    css`
      background: ${adminColors.primaryTint};
    `}
`

export const PlaceToolbarLink = styled(ItemButton)`
  min-width: 0;
  border-radius: 7px 0 0 7px;
`

export const PlaceToolbarToggle = styled.button`
  min-width: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0 7px 7px 0;
  background: transparent;
  color: ${adminColors.muted};
  cursor: pointer;

  &:hover {
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }
`

export const ChildList = styled.div`
  display: grid;
  gap: 2px;
  margin: 2px 0 4px 18px;
  padding-left: 9px;
  border-left: 1px solid ${adminColors.border};

  @media (max-width: 900px) {
    display: flex;
    margin: 0;
    padding-left: 0;
    border-left: 0;
  }
`

export const ChildButton = styled(ItemButton)`
  min-height: 34px;
  padding: 7px 8px;
  font-size: 12px;

  ${MaterialIcon} {
    width: 16px;
    height: 16px;
    font-size: 16px;
  }
`
