import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const HomeLink = styled(Link)`
  display: block;
  border-radius: 4px;
  &:focus-visible { outline: 2px solid ${adminColors.primary}; outline-offset: 4px; }
`

export function BrandHomeLink({ to = '/dashboard', children, className }: {
  to?: '/dashboard' | '/merchant'
  children: ReactNode
  className?: string
}) {
  // Router navigation preserves the deployment basename and unsaved-form blocker.
  return <HomeLink to={to} className={className} aria-label={to === '/merchant' ? '내 가게로 이동' : '대시보드로 이동'}>{children}</HomeLink>
}
