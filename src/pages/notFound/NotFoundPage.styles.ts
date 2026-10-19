import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { adminColors, radius, typo } from '../../styles/theme'

const neutral = adminColors

export const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family: inherit;
`

export const Content = styled.section`
  width: 100%;
  max-width: 460px;
  padding: 32px;
  border: 1px solid ${neutral.border};
  border-top: 4px solid ${neutral.primary};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 18px 48px ${neutral.shadow};
  text-align: center;
`

export const IconBadge = styled.span`
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px solid ${neutral.primarySoft};
  border-radius: ${radius.pill};
  background: ${neutral.primaryTint};
  color: ${neutral.primaryForeground};
  font-family: 'Material Symbols Outlined';
  font-size: 28px;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 500,
    'GRAD' 0,
    'opsz' 28;
`

export const StatusCode = styled.p`
  margin: 0 0 8px;
  color: ${neutral.primaryForeground};
  ${typo.title1.bold}
`

export const Title = styled.h1`
  margin: 0 0 12px;
  color: ${neutral.strongText};
  ${typo.title1.bold}
`

export const Description = styled.p`
  margin: 0;
  color: ${neutral.muted};
  ${typo.label.medium}
  word-break: keep-all;
`

export const RequestPath = styled.p`
  margin: 22px 0 0;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  ${typo.caption.bold}
  text-align: left;

  span {
    display: block;
    margin-bottom: 4px;
    color: ${neutral.softText};
    ${typo.caption.bold}
  }

  strong {
    display: block;
    overflow-wrap: anywhere;
    color: ${neutral.text};
    font-size: 14px;
  }
`

export const ActionGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 24px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

export const BackButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.primaryAction};
  color: ${neutral.primaryText};
  font-family: inherit;
  ${typo.label.bold}
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryForeground};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }
`

export const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  ${typo.label.bold}

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primaryForeground};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }
`
