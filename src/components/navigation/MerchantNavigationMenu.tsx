import { useEffect, useRef, useState } from 'react'
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
    title: '내 가게',
    items: [
      { label: '가게 현황', icon: 'storefront', path: '/merchant' },
      { label: '장소 운영 정보', icon: 'store', path: '/merchant/place-operations' },
      { label: '운영 공지', icon: 'campaign', path: '/merchant/operating-notices' },
    ],
  },
  {
    title: '장소 관리',
    items: [
      { label: '기존 장소 신청', icon: 'add_location_alt', path: '/merchant/place-application' },
      { label: '신규 장소 등록', icon: 'location_on', path: '/merchant/place-registration' },
      { label: '장소 Claim', icon: 'assignment_turned_in', path: '/merchant/place-claims' },
      { label: '정보 재확인', icon: 'fact_check', path: '/merchant/place-reverification' },
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

export function MerchantNavigationMenu() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeItemRef = useRef<HTMLButtonElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  return (
    <S.Navigation aria-label="상점주 메뉴" $expanded={isExpanded}>
      <S.MobileToggle
        type="button"
        aria-label={`상점주 메뉴 ${isExpanded ? '접기' : '펼치기'}`}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <S.MaterialIcon aria-hidden="true">menu</S.MaterialIcon>
        <span>메뉴</span>
      </S.MobileToggle>
      <S.GroupList>
        {NAVIGATION_GROUPS.map((group) => (
          <S.Group key={group.title}>
            <S.GroupTitle>{group.title}</S.GroupTitle>
            <S.ItemList>
              {group.items.map((item) => {
                const active = isCurrentPath(pathname, item.path)

                return (
                  <S.ItemButton
                    key={item.path}
                    ref={active ? activeItemRef : undefined}
                    type="button"
                    $active={active}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      setIsExpanded(false)
                      navigate(item.path)
                    }}
                  >
                    <S.MaterialIcon aria-hidden="true">{item.icon}</S.MaterialIcon>
                    <span>{item.label}</span>
                  </S.ItemButton>
                )
              })}
            </S.ItemList>
          </S.Group>
        ))}
      </S.GroupList>
    </S.Navigation>
  )
}
