import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const Navigation = styled.nav<{ $expanded: boolean }>`
  min-height: 0;

  @media (max-width: 920px) {
    position: relative;
    width: 100%;

    ${({ $expanded }) => !$expanded && css`
      ${GroupList} {
        display: none;
      }
    `}
  }
`

export const MobileToggle = styled.button`
  display: none;

  @media (max-width: 920px) {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
    border: 0;
    background: transparent;
    color: ${colors.text};
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
`

export const GroupList = styled.div`
  display: grid;
  gap: 22px;

  @media (max-width: 920px) {
    position: absolute;
    z-index: 20;
    top: calc(100% + 8px);
    left: 0;
    width: min(320px, calc(100vw - 32px));
    max-height: min(640px, calc(100vh - 88px));
    overflow: auto;
    padding: 18px;
    border: 1px solid ${colors.border};
    border-radius: 8px;
    background: ${colors.surface};
    box-shadow: 0 12px 28px ${colors.shadow};
  }
`

export const Group = styled.section`
  display: grid;
  gap: 7px;
`

export const GroupTitle = styled.h2`
  margin: 0;
  padding: 0 10px;
  color: ${colors.softText};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
`

export const ItemList = styled.div`
  display: grid;
  gap: 2px;
`

export const ItemButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 0;
  border-right: 3px solid transparent;
  border-radius: 6px 0 0 6px;
  background: transparent;
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${colors.primaryTint};
    color: ${colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  ${({ $active }) => $active && css`
    border-right-color: ${colors.primary};
    background: ${colors.primaryTint};
    color: ${colors.primary};
    font-weight: 700;
  `}
`

export const MaterialIcon = styled.span`
  width: 20px;
  flex: 0 0 auto;
  font-family: 'Material Symbols Outlined';
  font-size: 19px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`
