import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MerchantNavigationMenu } from '../../components/navigation/MerchantNavigationMenu'
import { MERCHANT_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { MerchantPlaceProvider } from '../providers/MerchantPlaceProvider'
import { useAuth } from '../../hooks/useAuth'
import * as S from './MerchantLayout.styles'

const getSectionTitle = (pathname: string) => {
  if (pathname.startsWith('/merchant/place-')) return '장소 관리'
  if (pathname.startsWith('/merchant/reviews')) return '장소 운영'
  if (pathname.startsWith('/merchant/operating-notices')) return '장소 운영'
  if (pathname.startsWith('/merchant/menus') || pathname.startsWith('/merchant/campaigns') || pathname.startsWith('/merchant/offers')) return '콘텐츠 관리'
  if (pathname.startsWith('/merchant/reservations')) return '예약 관리'
  if (pathname.startsWith('/merchant/payments')) return '결제 · 정산'
  if (pathname.startsWith('/merchant/verified-boost')) return 'Verified Boost'

  return '내 가게'
}

export function MerchantLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout, user } = useAuth()
  const merchantIdentifier = user?.username || user?.name || '상점주'

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  return (
    <MerchantPlaceProvider>
      <S.AppShell>
        <S.SideNav aria-label="상점주 메뉴">
          <S.SideHeader>
            <S.BrandLockup>
              <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
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
        <S.MainArea id={MERCHANT_MAIN_SCROLL_AREA_ID} className="merchant-layout-content">
          <S.TopBar>
            <S.TopTitle>{getSectionTitle(pathname)}</S.TopTitle>
            <S.TopContext>상점주 센터</S.TopContext>
          </S.TopBar>
          <Outlet />
        </S.MainArea>
      </S.AppShell>
    </MerchantPlaceProvider>
  )
}
