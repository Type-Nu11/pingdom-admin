import { Link } from 'react-router-dom'
import styled from 'styled-components'

const neutral = {
  background: '#f9f9f9',
  surface: '#ffffff',
  border: '#e2e2e2',
  text: '#1a1a1a',
  muted: '#5f5f5f',
  primary: '#000000',
  primaryText: '#ffffff',
}

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
  border-radius: 8px;
  background: ${neutral.surface};
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
    opacity: 0.9;
  }
`
