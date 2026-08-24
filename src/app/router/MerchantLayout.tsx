import { Outlet, useNavigate } from 'react-router-dom'
import { MerchantNavigationMenu } from '../../components/navigation/MerchantNavigationMenu'
import { useAuth } from '../../hooks/useAuth'
import * as S from './MerchantLayout.styles'

export function MerchantLayout() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const merchantIdentifier = user?.username || user?.name || '상점주'

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  return (
    <S.AppShell>
      <S.SideNav aria-label="상점주 메뉴">
        <S.SideHeader>
          <S.BrandLockup>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
            <S.BrandLabel>Merchant</S.BrandLabel>
          </S.BrandLockup>
        </S.SideHeader>
        <S.SideMenu>
          <MerchantNavigationMenu />
        </S.SideMenu>
        <S.SideFooter>
          <S.MerchantProfile aria-label="로그인한 상점주">
            <S.MerchantProfileIcon aria-hidden="true">storefront</S.MerchantProfileIcon>
            <S.MerchantProfileText>
              <strong>{merchantIdentifier}</strong>
              <span>상점주</span>
            </S.MerchantProfileText>
          </S.MerchantProfile>
          <S.LogoutButton type="button" onClick={handleLogout}>
            <S.MaterialIcon aria-hidden="true">logout</S.MaterialIcon>
            <span>로그아웃</span>
          </S.LogoutButton>
        </S.SideFooter>
      </S.SideNav>
      <S.MainArea className="merchant-layout-content">
        <Outlet />
      </S.MainArea>
    </S.AppShell>
  )
}
