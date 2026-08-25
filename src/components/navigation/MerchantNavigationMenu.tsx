import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as S from './MerchantNavigationMenu.styles'

interface NavigationItem {
  label: string
  icon: string
  path: string
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    title: '장소 운영',
    items: [
      { label: '장소 운영 정보', icon: 'store', path: '/merchant/place-operations' },
      { label: '운영 공지', icon: 'campaign', path: '/merchant/operating-notices' },
      { label: '정보 재확인', icon: 'fact_check', path: '/merchant/place-reverification' },
    ],
  },
  {
    title: '장소 신청',
    items: [
      { label: '기존 장소 신청', icon: 'add_location_alt', path: '/merchant/place-application' },
      { label: '신규 장소 등록', icon: 'location_on', path: '/merchant/place-registration' },
      { label: '장소 권한·소유권 신청', icon: 'assignment_turned_in', path: '/merchant/place-claims' },
    ],
  },
  {
    title: '콘텐츠 · 판매',
    items: [
      { label: '이벤트 관리', icon: 'event', path: '/merchant/campaigns' },
      { label: '혜택 · 쿠폰', icon: 'local_offer', path: '/merchant/offers' },
      { label: 'Verified Boost', icon: 'rocket_launch', path: '/merchant/verified-boost' },
    ],
  },
  {
    title: '예약 · 정산',
    items: [
      { label: '예약 설정', icon: 'calendar_add_on', path: '/merchant/reservations/setup' },
      { label: '예약 운영', icon: 'calendar_month', path: '/merchant/reservations' },
      { label: '결제 · 정산', icon: 'payments', path: '/merchant/payments' },
    ],
  },
]

const isCurrentPath = (pathname: string, path: string) =>
  path === '/merchant' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)

const getActiveNavigationPath = (pathname: string) =>
  NAVIGATION_GROUPS.flatMap((group) => group.items)
    .filter((item) => isCurrentPath(pathname, item.path))
    .sort((first, second) => second.path.length - first.path.length)[0]?.path

export function MerchantNavigationMenu() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeItemRef = useRef<HTMLButtonElement>(null)
  const activeNavigationPath = getActiveNavigationPath(pathname)

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  const storeActive = isCurrentPath(pathname, '/merchant')

  return (
    <S.Navigation aria-label="세부 상점주 메뉴">
      <S.StoreButton
        type="button"
        $active={storeActive}
        aria-current={storeActive ? 'page' : undefined}
        ref={storeActive ? activeItemRef : undefined}
        onClick={() => navigate('/merchant')}
      >
        <S.MaterialIcon aria-hidden="true">storefront</S.MaterialIcon>
        <span>내 가게</span>
      </S.StoreButton>
      {NAVIGATION_GROUPS.map((group) => (
        <S.Group key={group.title}>
          <S.GroupTitle>{group.title}</S.GroupTitle>
          <S.ItemList>
            {group.items.map((item) => {
              const active = activeNavigationPath === item.path

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
