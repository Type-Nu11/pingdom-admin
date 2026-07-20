import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdminDashboard } from '../../hooks/useAdminDashboard'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import * as S from './DashboardPage.styles'

type DashboardMetricKey =
  | 'placeCount'
  | 'postCount'
  | 'pendingReportCount'
  | 'bannedUserCount'

interface DashboardMetric {
  key: DashboardMetricKey
  label: string
  icon: string
  route: string
}

const DASHBOARD_METRICS: DashboardMetric[] = [
  { key: 'placeCount', label: '전체 장소', icon: 'location_on', route: '/places' },
  { key: 'postCount', label: '전체 게시글', icon: 'description', route: '/main' },
  {
    key: 'pendingReportCount',
    label: '처리 대기 신고',
    icon: 'flag',
    route: '/main',
  },
  { key: 'bannedUserCount', label: '현재 밴 사용자', icon: 'block', route: '/bans' },
]

function DashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { summary, status, isLoading, fetchSummary } = useAdminDashboard()
  const adminIdentifier = user?.username || user?.name || 'admin'

  function getMetricValue(key: DashboardMetricKey) {
    if (status === 'success' || status === 'empty') {
      return summary?.[key]?.toLocaleString() ?? '0'
    }

    if (status === 'unavailable') {
      return '-'
    }

    return null
  }

  function renderStatusPanel() {
    if (status === 'unavailable') {
      return (
        <S.StatusPanel>
          <S.MaterialIcon aria-hidden="true">info</S.MaterialIcon>
          <S.StatusText>
            <strong>대시보드 요약 데이터를 준비 중입니다.</strong>
            <span>서버 요약 API가 연결되면 전체 운영 현황이 표시됩니다.</span>
          </S.StatusText>
        </S.StatusPanel>
      )
    }

    if (status === 'error') {
      return (
        <S.StatusPanel $tone="error">
          <S.MaterialIcon aria-hidden="true">error_outline</S.MaterialIcon>
          <S.StatusText>
            <strong>대시보드 정보를 불러오지 못했습니다.</strong>
            <span>잠시 후 다시 시도해 주세요.</span>
          </S.StatusText>
          <S.RetryButton type="button" onClick={() => void fetchSummary()}>
            다시 시도
          </S.RetryButton>
        </S.StatusPanel>
      )
    }

    if (status === 'empty') {
      return (
        <S.StatusPanel>
          <S.MaterialIcon aria-hidden="true">inbox</S.MaterialIcon>
          <S.StatusText>
            <strong>표시할 운영 현황이 없습니다.</strong>
            <span>관리 데이터가 추가되면 이곳에 요약됩니다.</span>
          </S.StatusText>
        </S.StatusPanel>
      )
    }

    return null
  }

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.BrandLockup>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </S.BrandLockup>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button" $active aria-current="page">
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/places')}>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/main')}>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>게시글 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/bans')}>
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
        </S.SideMenu>

        <S.SideFooter>
          <S.AdminProfile aria-label="관리자 계정">
            <S.AdminProfileIcon>
              <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
            </S.AdminProfileIcon>
            <S.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </S.AdminProfileText>
          </S.AdminProfile>
          <S.LogoutButton
            type="button"
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
          >
            <S.MaterialIcon aria-hidden="true">logout</S.MaterialIcon>
            <span>로그아웃</span>
          </S.LogoutButton>
        </S.SideFooter>
      </S.SideNav>

      <S.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <S.TopBar>
          <S.TopTitle>대시보드</S.TopTitle>
          <S.TopActions>
            <S.RefreshButton
              type="button"
              disabled={isLoading || status === 'unavailable'}
              onClick={() => void fetchSummary()}
            >
              <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
              새로고침
            </S.RefreshButton>
            <S.IconButton type="button" aria-label="알림">
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
            <S.IconButton type="button" aria-label="도움말">
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
          </S.TopActions>
        </S.TopBar>

        <S.PageContent>
          <S.PageHeader>
            <S.PageTitle>운영 현황</S.PageTitle>
            <S.PageDescription>
              PingDom 관리자 운영 현황을 한눈에 확인하고 필요한 관리 화면으로 이동합니다.
            </S.PageDescription>
          </S.PageHeader>

          {renderStatusPanel()}

          <S.Section aria-labelledby="dashboard-summary-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-summary-title">요약 현황</S.SectionTitle>
              <S.SectionDescription>전체 데이터 기준</S.SectionDescription>
            </S.SectionHeader>
            <S.SummaryGrid>
              {DASHBOARD_METRICS.map((metric) => {
                const value = getMetricValue(metric.key)

                return (
                  <S.SummaryCard
                    key={metric.key}
                    type="button"
                    onClick={() => navigate(metric.route)}
                    aria-label={`${metric.label} 관리 화면으로 이동`}
                  >
                    <S.SummaryCardTop>
                      <S.SummaryIcon>
                        <S.MaterialIcon aria-hidden="true">{metric.icon}</S.MaterialIcon>
                      </S.SummaryIcon>
                      <S.SummaryArrow aria-hidden="true">arrow_forward</S.SummaryArrow>
                    </S.SummaryCardTop>
                    <S.SummaryLabel>{metric.label}</S.SummaryLabel>
                    {value === null ? <S.Skeleton aria-label="불러오는 중" /> : <S.SummaryValue>{value}</S.SummaryValue>}
                  </S.SummaryCard>
                )
              })}
            </S.SummaryGrid>
          </S.Section>

        </S.PageContent>
      </S.MainArea>
    </S.AppShell>
  )
}

export default DashboardPage
