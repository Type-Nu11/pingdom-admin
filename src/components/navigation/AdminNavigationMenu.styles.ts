import styled, { css } from 'styled-components'
import { adminColors } from '../../styles/theme'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgb(15 23 42 / 52%);
  backdrop-filter: blur(3px);
`

export const Dialog = styled.section`
  width: min(1120px, 100%);
  max-height: min(820px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${adminColors.border};
  border-radius: 14px;
  background: ${adminColors.surface};
  box-shadow: 0 24px 72px rgb(15 23 42 / 24%);
`

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 28px 22px;
  border-bottom: 1px solid ${adminColors.border};
`

export const Eyebrow = styled.p`
  margin: 0 0 6px;
  color: ${adminColors.primary};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const Title = styled.h2`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 24px;
  line-height: 1.3;
`

export const Description = styled.p`
  margin: 7px 0 0;
  color: ${adminColors.muted};
  font-size: 14px;
`

export const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${adminColors.border};
  border-radius: 8px;
  background: ${adminColors.surface};
  color: ${adminColors.muted};
  cursor: pointer;

  &:hover {
    border-color: ${adminColors.primarySoft};
    background: ${adminColors.primaryTint};
    color: ${adminColors.primary};
  }
`

export const GroupList = styled.div`
  display: grid;
  gap: 24px;
  overflow-y: auto;
  padding: 24px 28px 30px;
`

export const Group = styled.section`
  display: grid;
  gap: 12px;
`

export const GroupHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

export const GroupTitle = styled.h3`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 16px;
`

export const GroupDescription = styled.p`
  margin: 0;
  color: ${adminColors.muted};
  font-size: 13px;
`

export const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

export const ItemButton = styled.button<{ $active?: boolean }>`
  min-width: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid ${adminColors.borderSoft};
  border-radius: 10px;
  background: ${adminColors.surface};
  color: ${adminColors.text};
  text-align: left;
  cursor: pointer;

  > span:nth-child(2) {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${adminColors.strongText};
    font-size: 14px;
  }

  small {
    color: ${adminColors.muted};
    font-size: 12px;
  }

  > span:last-child {
    color: ${adminColors.muted};
  }

  &:hover {
    border-color: ${adminColors.primarySoft};
    background: ${adminColors.primaryTint};
  }

  ${({ $active }) => $active && css`
    border-color: ${adminColors.primary};
    background: ${adminColors.primaryTint};
  `}
`

export const ItemIcon = styled.span<{ $active?: boolean }>`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${adminColors.borderSoft};
  border-radius: 9px;
  background: ${adminColors.surfaceLow};
  color: ${adminColors.muted};

  ${({ $active }) => $active && css`
    border-color: ${adminColors.primarySoft};
    background: ${adminColors.surface};
    color: ${adminColors.primary};
  `}
`
