import { useState } from 'react'
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
]

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    title: '장소 운영',
    items: [],
  },
  {
    title: '검토함',
    items: [
      { label: '상점주 장소 신청 심사', icon: 'assignment_turned_in', path: '/merchant-place-applications' },
      { label: '예약 심사', icon: 'event_available', path: '/reservations/review' },
      { label: '리뷰 삭제 요청', icon: 'rate_review', path: '/review-deletion-requests' },
      { label: '장소 정보 검증', icon: 'fact_check', path: '/places/information-verification' },
      { label: '방문자 제보·정정 심사', icon: 'person_check', path: '/visitor-verifications' },
    ],
  },
  {
    title: '사용자 · 안전',
    items: [
      { label: '신고 사용자', icon: 'report', path: '/reports/reported-users' },
      { label: '신고 이의제기', icon: 'gavel', path: '/reports/appeals' },
      { label: '사용자 밴', icon: 'block', path: '/bans' },
      { label: '사용자 역할', icon: 'manage_accounts', path: '/users/roles' },
    ],
  },
  {
    title: '성장 운영',
    items: [
      { label: '상점주 관리', icon: 'storefront', path: '/merchant-owners' },
      { label: '탐색 후보 운영', icon: 'explore', path: '/scouts' },
      { label: '신뢰 점수', icon: 'verified_user', path: '/trust-score' },
      { label: '인증 부스트', icon: 'rocket_launch', path: '/verified-boost-products' },
      { label: '추천 성과 · 정책', icon: 'monitoring', path: '/recommendations/metrics' },
      { label: '광고 관리', icon: 'campaign', path: '/operations/ads' },
    ],
  },
  {
    title: '시스템',
    items: [
      { label: '데이터 품질', icon: 'rule', path: '/data-quality' },
      { label: '알림 발송 현황', icon: 'notifications_active', path: '/operations/notifications' },
      { label: '운영 이력', icon: 'history', path: '/operations/history' },
      { label: '미연결 파일', icon: 'cloud_off', path: '/s3-orphans' },
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
  const [isPlaceManagementOpen, setIsPlaceManagementOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState(() => new Set(NAVIGATION_GROUPS.map((group) => group.title)))

  const dashboardActive = isCurrentPath(pathname, '/dashboard')
  const placeManagementActive = isPlaceManagementPath(pathname)
  const navigateFromMenu = (path: string) =>
    navigate(path, { state: { preserveScrollPosition: true } })

  return (
    <S.Navigation aria-label="세부 관리자 메뉴">
      <S.DashboardButton
        type="button"
        $active={dashboardActive}
        aria-current={dashboardActive ? 'page' : undefined}
        onClick={() => navigateFromMenu('/dashboard')}
      >
        <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
        <span>대시보드</span>
      </S.DashboardButton>
      {NAVIGATION_GROUPS.map((group) => {
        const isGroupOpen = openGroups.has(group.title)

        return (
          <S.Group key={group.title}>
            <S.GroupTitle
              type="button"
              aria-expanded={isGroupOpen}
              aria-controls={`admin-navigation-group-${group.title}`}
              onClick={() => setOpenGroups((current) => {
                const next = new Set(current)
                if (next.has(group.title)) next.delete(group.title)
                else next.add(group.title)
                return next
              })}
            >
              <span>{group.title}</span>
              <S.MaterialIcon aria-hidden="true">
                {isGroupOpen ? 'expand_less' : 'expand_more'}
              </S.MaterialIcon>
            </S.GroupTitle>
            <S.ItemList id={`admin-navigation-group-${group.title}`} $collapsed={!isGroupOpen}>
              {group.title === '장소 운영' ? (
                <>
                <S.PlaceToolbar $active={placeManagementActive}>
                  <S.PlaceToolbarLink
                    type="button"
                    $active={pathname === '/places'}
                    aria-current={pathname === '/places' ? 'page' : undefined}
                    onClick={() => {
                      setIsPlaceManagementOpen(true)
                      navigateFromMenu('/places')
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
                          type="button"
                          $active={active}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => {
                            navigateFromMenu(item.path)
                          }}
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
                  type="button"
                  $active={active}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    navigateFromMenu(item.path)
                  }}
                  >
                    <S.MaterialIcon aria-hidden="true">{item.icon}</S.MaterialIcon>
                    <span>{item.label}</span>
                  </S.ItemButton>
                )
              })}
            </S.ItemList>
          </S.Group>
        )
      })}
    </S.Navigation>
  )
}
