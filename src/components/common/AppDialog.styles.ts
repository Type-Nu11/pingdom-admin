import styled from 'styled-components'
import { adminColors, elevation, radius } from '../../styles/theme'

export const Overlay = styled.div`
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: ${adminColors.overlay};
`

export const Dialog = styled.section`
  width: min(100%, 520px);
  max-height: min(720px, calc(100dvh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${adminColors.border};
  border-radius: ${radius.lg};
  background: ${adminColors.surface};
  box-shadow: ${elevation.high};
`

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 0;
`

export const Heading = styled.div`
  min-width: 0;
`

export const Title = styled.h2`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
`

export const Description = styled.p`
  margin: 6px 0 0;
  color: ${adminColors.muted};
  font-size: 13px;
  line-height: 1.5;
`

export const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: ${radius.sm};
  background: transparent;
  color: ${adminColors.muted};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${adminColors.surfaceLow};
    color: ${adminColors.text};
  }

  &:focus-visible {
    outline: 2px solid ${adminColors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`

export const Icon = styled.span`
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  line-height: 1;
`

export const Body = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
`

export const Footer = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
`
