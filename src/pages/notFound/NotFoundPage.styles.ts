import { Link } from 'react-router-dom'
import styled from 'styled-components'

export const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: #f7f8fa;
`

export const Content = styled.section`
  width: 100%;
  max-width: 420px;
  padding: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  text-align: center;
`

export const StatusCode = styled.p`
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 32px;
  font-weight: 700;
`

export const Title = styled.h1`
  margin: 0 0 12px;
  font-size: 24px;
`

export const Description = styled.p`
  margin: 0 0 24px;
  color: #6b7280;
`

export const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
`
