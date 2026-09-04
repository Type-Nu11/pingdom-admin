import styled from 'styled-components'
import { adminColors, radius } from '../../styles/theme'

export const Panel = styled.section`
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: ${radius.md};
  background: ${adminColors.surfaceLow};
`

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 12px 16px;
  border-bottom: 1px solid ${adminColors.border};
`

export const Heading = styled.div`
  min-width: 0;
`

export const Title = styled.h2`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 16px;
  font-weight: 700;
`

export const Description = styled.p`
  margin: 4px 0 0;
  color: ${adminColors.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const Count = styled.span`
  flex-shrink: 0;
  color: ${adminColors.primary};
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
`

export const ScrollArea = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  overscroll-behavior: contain;

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: -2px;
  }
`

export const Footer = styled.footer`
  flex-shrink: 0;
`
