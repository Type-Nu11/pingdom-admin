import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdminDashboard } from '../../hooks/useAdminDashboard'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import DashboardPlaceholderCard from '../../components/common/DashboardPlaceholderCard'
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
  tone: 'neutral' | 'action'
}

const SERVICE_METRICS: DashboardMetric[] = [
  {
    key: 'placeCount',
    label: '전체 장소',
    icon: 'location_on',
    route: '/places',
    tone: 'neutral',
  },
  {
    key: 'postCount',
    label: '전체 게시글',
    icon: 'description',
    route: '/main',
    tone: 'neutral',
  },
]

const ACTION_METRICS: DashboardMetric[] = [
  {
    key: 'pendingReportCount',
    label: '처리 대기 신고',
    icon: 'flag',
    route: '/main',
    tone: 'action',
  },
  {
    key: 'bannedUserCount',
    label: '현재 밴 사용자',
    icon: 'block',
    route: '/bans',
    tone: 'action',
  },
]

function DashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { summary, status, isLoading, lastUpdatedAt, fetchSummary } = useAdminDashboard()
  const adminIdentifier = user?.username || user?.name || 'admin'

  function getMetricValue(key: DashboardMetricKey) {
    if (summary && (status === 'success' || status === 'empty' || status === 'loading' || status === 'error')) {
      return summary[key].toLocaleString()
    }

    if (status === 'error' || status === 'unavailable') {
      return '-'
    }

    return null
  }

  function renderStatusPanel() {
    if (status !== 'error') {
      return null
    }

    return (
      <S.StatusPanel $tone="error" role="alert">
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

  function formatLastUpdated(timestamp: number | null) {
    if (!timestamp) {
      return '아직 조회되지 않음'
    }

    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp)
  }

  function renderMetricCard(metric: DashboardMetric) {
    const value = getMetricValue(metric.key)

    return (
      <S.SummaryCard
        key={metric.key}
        type="button"
        $tone={metric.tone}
        onClick={() => navigate(metric.route)}
        aria-label={`${metric.label} ${value ?? '불러오는 중'} 관리 화면으로 이동`}
        aria-busy={isLoading}
      >
        <S.SummaryCardTop>
          <S.SummaryIcon $tone={metric.tone}>
            <S.MaterialIcon aria-hidden="true">{metric.icon}</S.MaterialIcon>
          </S.SummaryIcon>
          <S.SummaryArrow aria-hidden="true">arrow_forward</S.SummaryArrow>
        </S.SummaryCardTop>
        <S.SummaryLabel>{metric.label}</S.SummaryLabel>
        {value === null ? (
          <S.Skeleton aria-label="불러오는 중" />
        ) : (
          <S.SummaryValue>{value}</S.SummaryValue>
        )}
      </S.SummaryCard>
    )
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
              aria-label={isLoading ? '대시보드 새로고침 중' : '대시보드 새로고침'}
              title={isLoading ? '새로고침 중' : '대시보드 새로고침'}
              $isLoading={isLoading}
              disabled={isLoading}
              onClick={() => void fetchSummary()}
            >
              <S.MaterialIcon aria-hidden="true">refresh</S.MaterialIcon>
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
            <S.PageHeaderMain>
              <S.PageTitle>대시보드</S.PageTitle>
              <S.PageDescription>
                PingDom의 주요 운영 현황과 처리할 항목을 확인합니다.
              </S.PageDescription>
            </S.PageHeaderMain>
            <S.UpdateMeta aria-live="polite">
              마지막 업데이트: {formatLastUpdated(lastUpdatedAt)}
              {isLoading && summary ? (
                <S.RefreshingText role="status">업데이트 중</S.RefreshingText>
              ) : null}
            </S.UpdateMeta>
          </S.PageHeader>

          {renderStatusPanel()}

          <S.Section aria-labelledby="dashboard-summary-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-summary-title">서비스 현황</S.SectionTitle>
              <S.SectionDescription>전체 누적 기준</S.SectionDescription>
            </S.SectionHeader>
            <S.SummaryGrid>{SERVICE_METRICS.map(renderMetricCard)}</S.SummaryGrid>
          </S.Section>

          <S.Section aria-labelledby="dashboard-action-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-action-title">처리 필요</S.SectionTitle>
              <S.SectionDescription>관리자 확인이 필요한 현황</S.SectionDescription>
            </S.SectionHeader>
            <S.SummaryGrid>{ACTION_METRICS.map(renderMetricCard)}</S.SummaryGrid>
          </S.Section>

          <S.Section aria-labelledby="dashboard-placeholder-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-placeholder-title">추가 운영 현황</S.SectionTitle>
              <S.SectionDescription>서버 데이터 연결 후 표시됩니다</S.SectionDescription>
            </S.SectionHeader>
            <S.PlaceholderGrid>
              <DashboardPlaceholderCard
                icon="history"
                label="최근 활동"
                description="최근 장소·게시글·제재 처리 내역을 확인할 수 있습니다."
              />
              <DashboardPlaceholderCard
                icon="content_copy"
                label="중복 장소 후보"
                description="병합 검토가 필요한 중복 장소 후보를 확인할 수 있습니다."
              />
              <DashboardPlaceholderCard
                icon="event_busy"
                label="밴 만료 예정"
                description="밴 만료가 예정된 사용자를 확인할 수 있습니다."
              />
              <DashboardPlaceholderCard
                icon="monitoring"
                label="운영 추이"
                description="기간별 장소·게시글 운영 변화를 확인할 수 있습니다."
              />
            </S.PlaceholderGrid>
          </S.Section>
        </S.PageContent>
      </S.MainArea>
    </S.AppShell>
  )
}

export default DashboardPage
