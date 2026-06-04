import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors

export const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family:
    'Hanken Grotesk',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
`

export const Content = styled.section`
  width: 100%;
  max-width: 420px;
  padding: 28px;
  border: 1px solid ${neutral.border};
  border-top: 4px solid ${neutral.primary};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 18px 48px ${neutral.shadow};
  text-align: center;
`

export const StatusCode = styled.p`
  margin: 0 0 8px;
  color: ${neutral.primary};
  font-size: 32px;
  font-weight: 700;
`

export const Title = styled.h1`
  margin: 0 0 12px;
  color: ${neutral.strongText};
  font-size: 24px;
`

export const Description = styled.p`
  margin: 0 0 24px;
  color: ${neutral.muted};
`

export const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  background: ${neutral.primary};
  color: ${neutral.primaryText};
  font-weight: 600;

  &:hover {
    background: ${neutral.primaryHover};
  }
`
