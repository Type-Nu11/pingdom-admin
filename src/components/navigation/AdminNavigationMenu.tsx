import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as Shell from '../../pages/place/PlaceManagePage.styles'
import * as S from './AdminNavigationMenu.styles'

interface NavigationItem {
  label: string
  description: string
  icon: string
  path: string
}

interface NavigationGroup {
  title: string
  description: string
  items: NavigationItem[]
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    title: '장소 및 검증',
    description: '장소 데이터와 운영 주체의 검증 작업',
    items: [
      { label: '중복 장소 후보', description: '후보 검토와 확정 병합', icon: 'difference', path: '/places/duplicate-candidates' },
      { label: '장소 병합·복구', description: '중복 그룹 병합과 이력 복구', icon: 'merge', path: '/places/duplicates' },
      { label: '장소 정보 검증', description: '정보 신고·증빙·재확인', icon: 'fact_check', path: '/places/information-verification' },
      { label: 'Merchant 검증', description: '신원과 사업자 신청 심사', icon: 'domain_verification', path: '/merchant-verifications' },
      { label: '방문자 검증', description: '제보와 정정 요청 심사', icon: 'person_check', path: '/visitor-verifications' },
      { label: '장소 Claim 심사', description: 'Merchant 장소 권한 요청', icon: 'store', path: '/merchant-place-claims' },
      { label: 'Scout 운영', description: '프로필·자격·현장 제보', icon: 'explore', path: '/scouts' },
    ],
  },
  {
    title: '신고 및 추천',
    description: '신고 검수와 추천 품질 운영',
    items: [
      { label: '신고 사용자', description: '피신고 사용자 목록과 상세', icon: 'report', path: '/reports/reported-users' },
      { label: '신고 이의제기', description: '이의제기 승인과 반려', icon: 'gavel', path: '/reports/appeals' },
      { label: '추천 성과·정책', description: '성과 비교와 운영 정책 변경', icon: 'monitoring', path: '/recommendations/metrics' },
    ],
  },
  {
    title: '운영 및 시스템',
    description: '권한, 상품, 알림과 시스템 이력',
    items: [
      { label: 'Merchant Owner', description: '신청·온보딩·운영 품질', icon: 'storefront', path: '/merchant-owners' },
      { label: 'Trust Score', description: '점수·이상치·개입 규칙', icon: 'verified_user', path: '/trust-score' },
      { label: '인증 부스트 상품', description: '상품 생성과 활성 상태', icon: 'rocket_launch', path: '/verified-boost-products' },
      { label: '사용자 역할', description: '역할 부여·회수와 이력', icon: 'manage_accounts', path: '/users/roles' },
      { label: '알림·Outbox', description: '발송 결과와 실패 재처리', icon: 'notifications_active', path: '/operations/notifications' },
      { label: '운영 이력', description: '감사·개인정보 처리 기록', icon: 'history', path: '/operations/history' },
      { label: 'S3 고아 객체', description: '삭제 후보 리포트와 정리', icon: 'cloud_off', path: '/s3-orphans' },
    ],
  },
]

const CORE_PATHS = ['/dashboard', '/places', '/main', '/bans']

export function AdminNavigationMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const isOperationsRoute = !CORE_PATHS.some((path) => location.pathname === path)

  const move = (path: string) => {
    setIsOpen(false)
    navigate(path)
  }

  return (
    <>
      <Shell.MenuButton
        type="button"
        $active={isOperationsRoute}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Shell.MaterialIcon aria-hidden="true">apps</Shell.MaterialIcon>
        <span>전체 관리 메뉴</span>
      </Shell.MenuButton>

      {isOpen ? (
        <S.Overlay role="presentation" onMouseDown={() => setIsOpen(false)}>
          <S.Dialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-navigation-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <S.Header>
              <div>
                <S.Eyebrow>PingDom Admin</S.Eyebrow>
                <S.Title id="admin-navigation-title">전체 관리 메뉴</S.Title>
                <S.Description>업무 목적에 맞는 실제 운영 화면으로 이동합니다.</S.Description>
              </div>
              <S.CloseButton type="button" aria-label="전체 관리 메뉴 닫기" onClick={() => setIsOpen(false)}>
                <Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon>
              </S.CloseButton>
            </S.Header>
            <S.GroupList>
              {NAVIGATION_GROUPS.map((group) => (
                <S.Group key={group.title}>
                  <S.GroupHeader>
                    <S.GroupTitle>{group.title}</S.GroupTitle>
                    <S.GroupDescription>{group.description}</S.GroupDescription>
                  </S.GroupHeader>
                  <S.ItemGrid>
                    {group.items.map((item) => {
                      const active = location.pathname === item.path
                      return (
                        <S.ItemButton
                          key={item.path}
                          type="button"
                          $active={active}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => move(item.path)}
                        >
                          <S.ItemIcon $active={active}>
                            <Shell.MaterialIcon aria-hidden="true">{item.icon}</Shell.MaterialIcon>
                          </S.ItemIcon>
                          <span>
                            <strong>{item.label}</strong>
                            <small>{item.description}</small>
                          </span>
                          <Shell.MaterialIcon aria-hidden="true">chevron_right</Shell.MaterialIcon>
                        </S.ItemButton>
                      )
                    })}
                  </S.ItemGrid>
                </S.Group>
              ))}
            </S.GroupList>
          </S.Dialog>
        </S.Overlay>
      ) : null}
    </>
  )
}
