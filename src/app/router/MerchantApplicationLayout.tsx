import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { MerchantLayout } from './MerchantLayout'
import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid ${adminColors.border};
  background: ${adminColors.surface};
  a { color: ${adminColors.softText}; text-decoration: none; }
  a[aria-current='page'] { color: ${adminColors.primary}; font-weight: 700; }
`

export function MerchantApplicationLayout() {
  const { user } = useAuth()
  if (user?.role === 'MERCHANT_OWNER') return <MerchantLayout />
  return <>
    <Navigation aria-label="상점주 신청 메뉴">
      <NavLink to="/merchant/onboarding">신청 안내</NavLink>
      <NavLink to="/merchant/place-application">기존 장소 신청</NavLink>
      <NavLink to="/merchant/place-registration">신규 장소 신청</NavLink>
    </Navigation>
    <Outlet />
  </>
}
