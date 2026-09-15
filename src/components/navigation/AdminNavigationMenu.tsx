import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { readNavigationState, saveNavigationState } from './adminNavigationState'
import { useLocation, useNavigate } from 'react-router-dom'
import * as S from './AdminNavigationMenu.styles'

interface NavigationItem {
  label: string
  icon: string
  path: string
}

interface NavigationGroup {
  id: string
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
    id: 'places',
    title: '장소 운영',
    items: [],
  },
  {
    id: 'reviews',
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
    id: 'safety',
    title: '사용자 · 안전',
    items: [
      { label: '신고 사용자', icon: 'report', path: '/reports/reported-users' },
      { label: '신고 이의제기', icon: 'gavel', path: '/reports/appeals' },
      { label: '사용자 밴', icon: 'block', path: '/bans' },
      { label: '사용자 역할', icon: 'manage_accounts', path: '/users/roles' },
    ],
  },
  {
    id: 'growth',
    title: '성장 운영',
    items: [
      { label: '상점주 관리', icon: 'storefront', path: '/merchant-owners' },
      { label: '탐색 후보 운영', icon: 'explore', path: '/scouts' },
      { label: '신뢰 점수', icon: 'verified_user', path: '/trust-score' },
      { label: '인증 부스트', icon: 'rocket_launch', path: '/verified-boost-products' },
      { label: '추천 성과 · 정책', icon: 'monitoring', path: '/recommendations/metrics' },
    ],
  },
  {
    id: 'system',
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

let savedSideMenuScrollTop = 0
let savedSideMenuScrollLeft = 0

export function AdminNavigationMenu() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const navigationRef = useRef<HTMLDivElement | null>(null)
  const [navigationState, setNavigationState] = useState(readNavigationState)
  const isPlaceManagementOpen = navigationState.placeManagementOpen
  useEffect(() => { saveNavigationState(navigationState) }, [navigationState])

  const dashboardActive = isCurrentPath(pathname, '/dashboard')
  const placeManagementActive = isPlaceManagementPath(pathname)

  useLayoutEffect(() => {
    const sideMenu = navigationRef.current?.parentElement
    if (!sideMenu) return

    sideMenu.scrollTop = savedSideMenuScrollTop
    sideMenu.scrollLeft = savedSideMenuScrollLeft

    const saveScrollPosition = () => {
      savedSideMenuScrollTop = sideMenu.scrollTop
      savedSideMenuScrollLeft = sideMenu.scrollLeft
    }

    sideMenu.addEventListener('scroll', saveScrollPosition, { passive: true })

    return () => {
      saveScrollPosition()
      sideMenu.removeEventListener('scroll', saveScrollPosition)
    }
  }, [])

  return (
    <S.Navigation ref={navigationRef} aria-label="세부 관리자 메뉴">
      <S.DashboardButton
        type="button"
        $active={dashboardActive}
        aria-current={dashboardActive ? 'page' : undefined}
        onClick={() => navigate('/dashboard')}
      >
        <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
        <span>대시보드</span>
      </S.DashboardButton>
      {NAVIGATION_GROUPS.map((group) => {
        const isGroupOpen = !navigationState.closedGroups.includes(group.id)
        const groupActive = group.id === 'places' ? placeManagementActive : group.items.some(item => isCurrentPath(pathname, item.path))

        return (
          <S.Group key={group.id}>
            <S.GroupTitle
              type="button"
              $active={groupActive && !isGroupOpen}
              aria-label={groupActive && !isGroupOpen ? `${group.title}, 현재 페이지 포함` : group.title}
              aria-expanded={isGroupOpen}
              aria-controls={`admin-navigation-group-${group.id}`}
              onClick={() => setNavigationState(current => ({ ...current, closedGroups: current.closedGroups.includes(group.id)
                ? current.closedGroups.filter(id => id !== group.id) : [...current.closedGroups, group.id] }))}
            >
              <span>{group.title}</span>
              <S.MaterialIcon aria-hidden="true">
                {isGroupOpen ? 'expand_less' : 'expand_more'}
              </S.MaterialIcon>
            </S.GroupTitle>
            <S.ItemList id={`admin-navigation-group-${group.id}`} $collapsed={!isGroupOpen}>
              {group.id === 'places' ? (
                <>
                <S.PlaceToolbar $active={placeManagementActive}>
                  <S.PlaceToolbarLink
                    type="button"
                    $active={pathname === '/places'}
                    aria-current={pathname === '/places' ? 'page' : undefined}
                    onClick={() => {
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
                    onClick={() => setNavigationState(current => ({ ...current, placeManagementOpen: !current.placeManagementOpen }))}
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
                            navigate(item.path)
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
        )
      })}
    </S.Navigation>
  )
}
