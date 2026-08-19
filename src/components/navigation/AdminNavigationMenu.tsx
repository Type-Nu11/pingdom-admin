import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as S from './AdminNavigationMenu.styles'

interface NavigationItem {
  label: string
  icon: string
  path: string
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

const PLACE_MANAGEMENT_CHILDREN: NavigationItem[] = [
  { label: '기간형 이벤트', icon: 'event', path: '/places/events' },
  { label: '중복 장소 후보', icon: 'difference', path: '/places/duplicate-candidates' },
  { label: '장소 병합 · 복구', icon: 'merge', path: '/places/duplicates' },
  { label: '장소 정보 검증', icon: 'fact_check', path: '/places/information-verification' },
]

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    title: '장소 · 검증',
    items: [
      { label: 'Merchant 검증', icon: 'domain_verification', path: '/merchant-verifications' },
      { label: '방문자 검증', icon: 'person_check', path: '/visitor-verifications' },
      { label: '장소 Claim 심사', icon: 'store', path: '/merchant-place-claims' },
      { label: 'Scout 운영', icon: 'explore', path: '/scouts' },
    ],
  },
  {
    title: '신고 · 추천',
    items: [
      { label: '게시글 관리', icon: 'description', path: '/main' },
      { label: '신고 사용자', icon: 'report', path: '/reports/reported-users' },
      { label: '신고 이의제기', icon: 'gavel', path: '/reports/appeals' },
      { label: '사용자 밴', icon: 'block', path: '/bans' },
      { label: '추천 성과 · 정책', icon: 'monitoring', path: '/recommendations/metrics' },
    ],
  },
  {
    title: '운영 · 시스템',
    items: [
      { label: 'Merchant Owner', icon: 'storefront', path: '/merchant-owners' },
      { label: 'Trust Score', icon: 'verified_user', path: '/trust-score' },
      { label: '인증 부스트 상품', icon: 'rocket_launch', path: '/verified-boost-products' },
      { label: '사용자 역할', icon: 'manage_accounts', path: '/users/roles' },
      { label: '광고 관리', icon: 'campaign', path: '/operations/ads' },
      { label: '알림 · Outbox', icon: 'notifications_active', path: '/operations/notifications' },
      { label: '운영 이력', icon: 'history', path: '/operations/history' },
      { label: 'S3 고아 객체', icon: 'cloud_off', path: '/s3-orphans' },
    ],
  },
]

const isCurrentPath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

const isPlaceManagementPath = (pathname: string) =>
  pathname === '/places' || PLACE_MANAGEMENT_CHILDREN.some((item) => isCurrentPath(pathname, item.path))

export function AdminNavigationMenu() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeItemRef = useRef<HTMLButtonElement>(null)
  const [isPlaceManagementOpen, setIsPlaceManagementOpen] = useState(() => isPlaceManagementPath(pathname))

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isPlaceManagementOpen, pathname])

  const dashboardActive = isCurrentPath(pathname, '/dashboard')
  const placeManagementActive = isPlaceManagementPath(pathname)

  return (
    <S.Navigation aria-label="세부 관리자 메뉴">
      <S.DashboardButton
        type="button"
        $active={dashboardActive}
        aria-current={dashboardActive ? 'page' : undefined}
        ref={dashboardActive ? activeItemRef : undefined}
        onClick={() => navigate('/dashboard')}
      >
        <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
        <span>대시보드</span>
      </S.DashboardButton>
      {NAVIGATION_GROUPS.map((group) => (
        <S.Group key={group.title}>
          <S.GroupTitle>{group.title}</S.GroupTitle>
          <S.ItemList>
            {group.title === '장소 · 검증' ? (
              <>
                <S.PlaceToolbar $active={placeManagementActive}>
                  <S.PlaceToolbarLink
                    type="button"
                    $active={pathname === '/places'}
                    aria-current={pathname === '/places' ? 'page' : undefined}
                    ref={pathname === '/places' ? activeItemRef : undefined}
                    onClick={() => {
                      setIsPlaceManagementOpen(true)
                      navigate('/places')
                    }}
                  >
                    <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
                    <span>장소 관리</span>
                  </S.PlaceToolbarLink>
                  <S.PlaceToolbarToggle
                    type="button"
                    aria-label={`장소 관리 하위 메뉴 ${isPlaceManagementOpen ? '접기' : '펼치기'}`}
                    aria-expanded={isPlaceManagementOpen}
                    aria-controls="place-management-submenu"
                    onClick={() => setIsPlaceManagementOpen((open) => !open)}
                  >
                    <S.MaterialIcon aria-hidden="true">
                      {isPlaceManagementOpen ? 'expand_less' : 'expand_more'}
                    </S.MaterialIcon>
                  </S.PlaceToolbarToggle>
                </S.PlaceToolbar>
                {isPlaceManagementOpen ? (
                  <S.ChildList id="place-management-submenu">
                    {PLACE_MANAGEMENT_CHILDREN.map((item) => {
                      const active = isCurrentPath(pathname, item.path)

                      return (
                        <S.ChildButton
                          key={item.path}
                          ref={active ? activeItemRef : undefined}
                          type="button"
                          $active={active}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => navigate(item.path)}
                        >
                          <S.MaterialIcon aria-hidden="true">{item.icon}</S.MaterialIcon>
                          <span>{item.label}</span>
                        </S.ChildButton>
                      )
                    })}
                  </S.ChildList>
                ) : null}
              </>
            ) : null}
            {group.items.map((item) => {
              const active = isCurrentPath(pathname, item.path)

              return (
                <S.ItemButton
                  key={item.path}
                  ref={active ? activeItemRef : undefined}
                  type="button"
                  $active={active}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(item.path)}
                >
                  <S.MaterialIcon aria-hidden="true">{item.icon}</S.MaterialIcon>
                  <span>{item.label}</span>
                </S.ItemButton>
              )
            })}
          </S.ItemList>
        </S.Group>
      ))}
    </S.Navigation>
  )
}
