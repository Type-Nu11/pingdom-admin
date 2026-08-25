import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { useAuth } from '../../hooks/useAuth'
import { useAdminDashboard } from '../../hooks/useAdminDashboard'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import * as S from './DashboardPage.styles'

type DashboardMetricKey =
  | 'placeCount'
  | 'bannedUserCount'

interface DashboardMetric {
  key: DashboardMetricKey
  label: string
  icon: string
  unit: string
  route: string
  tone: 'neutral' | 'action'
}

type DashboardOperationalMetricKey =
  | 'duplicatePlaceGroupCount'
  | 'expiringBannedUserCount'
  | 'missingLocationPlaceCount'

interface DashboardOperationalMetric {
  key: DashboardOperationalMetricKey
  label: string
  unit: string
  icon: string
  route: string
  tone: 'neutral' | 'action'
}

type DashboardActivityTabKey = 'places' | 'userSanctions'

interface DashboardActivityRow {
  id: string
  title: string
  detail: string
  timestamp?: string
  badge?: {
    label: string
    tone: 'neutral' | 'success' | 'warning' | 'error'
  }
}

interface DashboardActivityGroup {
  key: DashboardActivityTabKey
  title: string
  rows: DashboardActivityRow[]
}

function formatActivityCount(count: number) {
  return count >= 10 ? '10+' : count.toLocaleString()
}

const SERVICE_METRICS: DashboardMetric[] = [
  {
    key: 'placeCount',
    label: '전체 장소',
    icon: 'location_on',
    unit: '개',
    route: '/places',
    tone: 'neutral',
  },
  {
    key: 'bannedUserCount',
    label: '현재 밴 사용자',
    icon: 'block',
    unit: '명',
    route: '/bans',
    tone: 'neutral',
  },
]

const OPERATIONAL_METRICS: DashboardOperationalMetric[] = [
  {
    key: 'duplicatePlaceGroupCount',
    label: '중복 장소 후보',
    unit: '건',
    icon: 'content_copy',
    route: '/places/duplicates',
    tone: 'action',
  },
  {
    key: 'expiringBannedUserCount',
    label: '밴 만료 예정',
    unit: '명',
    icon: 'event_upcoming',
    route: '/bans',
    tone: 'action',
  },
  {
    key: 'missingLocationPlaceCount',
    label: '좌표 누락 장소',
    unit: '개',
    icon: 'location_disabled',
    route: '/places',
    tone: 'action',
  },
]

const QUICK_ACTIONS = [
  { label: '상점주 신청 심사', icon: 'storefront', route: '/merchant-owners' },
  { label: '신규 장소 등록 심사', icon: 'add_location_alt', route: '/place-registration-applications' },
  { label: '기존 장소 운영 신청 심사', icon: 'store', route: '/merchant-place-claims' },
  { label: '장소 정보 검증', icon: 'fact_check', route: '/places/information-verification' },
]

function DashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const {
    summary,
    recentActivities,
    status,
    recentActivitiesStatus,
    isLoading,
    lastUpdatedAt,
    fetchSummary,
  } = useAdminDashboard()
  const [activeActivityTab, setActiveActivityTab] =
    useState<DashboardActivityTabKey | null>(null)
  const adminIdentifier = user?.username || user?.name || 'admin'
  const visibleOperationalMetrics = summary?.operationalMetrics
    ? OPERATIONAL_METRICS.filter((metric) => getOperationalMetricValue(metric.key) !== 0)
    : OPERATIONAL_METRICS

  function getMetricValue(key: DashboardMetricKey) {
    if (summary && (status === 'success' || status === 'empty' || status === 'loading' || status === 'error')) {
      return summary[key].toLocaleString()
    }

    if (status === 'error' || status === 'unavailable') {
      return '-'
    }

    return null
  }

  function getOperationalMetricValue(key: DashboardOperationalMetricKey) {
    if (!summary) {
      return status === 'error' || status === 'unavailable' ? undefined : null
    }

    const metrics = summary.operationalMetrics
    if (!metrics) {
      return undefined
    }

    switch (key) {
      case 'duplicatePlaceGroupCount':
        return metrics.duplicatePlaceGroupCount
      case 'expiringBannedUserCount':
        return metrics.expiringBannedUserCount
      case 'missingLocationPlaceCount':
        return metrics.missingLocationPlaceCount
    }
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

    const updatedAt = new Date(timestamp)
    const now = new Date()
    const isToday = updatedAt.toDateString() === now.toDateString()
    const time = new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(updatedAt)

    if (isToday) {
      return `오늘 ${time}`
    }

    return `${updatedAt.getMonth() + 1}월 ${updatedAt.getDate()}일 ${time}`
  }

  function formatActivityDate(timestamp?: string) {
    if (!timestamp) {
      return null
    }

    const date = new Date(timestamp)

    if (Number.isNaN(date.getTime())) {
      return null
    }

    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    const time = new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)

    if (isToday) {
      return `오늘 ${time}`
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return `어제 ${time}`
    }

    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`
  }

  function getSanctionActionLabel(action: string) {
    const labels: Record<string, string> = {
      APPLIED: '밴 처리',
      RELEASED: '밴 해제',
      EXPIRED: '밴 만료',
    }

    return labels[action] ?? action
  }

  function renderSectionError(message: string) {
    return (
      <S.DataStatus $tone="error" role="alert">
        <S.MaterialIcon aria-hidden="true">error_outline</S.MaterialIcon>
        <S.DataStatusText>{message}</S.DataStatusText>
        <S.InlineRetryButton type="button" onClick={() => void fetchSummary()}>
          다시 시도
        </S.InlineRetryButton>
      </S.DataStatus>
    )
  }

  function renderActivitySkeleton() {
    return (
      <S.ActivitySkeletonList aria-label="최근 활동 불러오는 중">
        {[1, 2, 3, 4].map((item) => (
          <S.ActivitySkeleton key={item} />
        ))}
      </S.ActivitySkeletonList>
    )
  }

  function renderActivityGroups() {
    if (!recentActivities) {
      if (recentActivitiesStatus === 'loading') {
        return renderActivitySkeleton()
      }

      if (recentActivitiesStatus === 'error') {
        return renderSectionError('최근 활동을 불러오지 못했습니다.')
      }

      return <S.EmptyState>최근 운영 활동이 없습니다.</S.EmptyState>
    }

    const groups: DashboardActivityGroup[] = [
      {
        key: 'places',
        title: '장소',
        rows: recentActivities.places.map((place) => {
          const placeName = place.name?.trim() || '이름 없는 장소'
          const address = place.address?.trim()
          const registrant = place.registrant || `사용자 ID ${place.userId}`
          const detail =
            address && placeName === address
              ? `등록자 ${registrant}`
              : `등록자 ${registrant}${address ? ` · ${address}` : ''}`

          return {
            id: `place-${place.placeId}`,
            title: placeName,
            detail,
            timestamp: place.createdAt ?? undefined,
          }
        }),
      },
      {
        key: 'userSanctions',
        title: '제재',
        rows: recentActivities.userSanctions.map((sanction) => ({
          id: `sanction-${sanction.sanctionId}`,
          title: sanction.targetUsername || `사용자 ID ${sanction.targetUserId}`,
          detail: `${sanction.banType === 'PERMANENT' ? '영구 밴' : '기간 밴'} · 제재 ID ${sanction.sanctionId}`,
          timestamp: sanction.processedAt,
          badge: {
            label: getSanctionActionLabel(sanction.action),
            tone: sanction.action === 'APPLIED' ? 'warning' : 'neutral',
          },
        })),
      },
    ]

    if (groups.every((group) => group.rows.length === 0)) {
      return <S.EmptyState>최근 운영 활동이 없습니다.</S.EmptyState>
    }

    const selectedGroup = activeActivityTab
      ? groups.find((group) => group.key === activeActivityTab) ?? groups[0]
      : groups.find((group) => group.rows.length > 0) ?? groups[0]
    const selectedTabId = `dashboard-activity-tab-${selectedGroup.key}`
    const activityPanelId = 'dashboard-activity-panel'
    const activityNavigation = {
      places: { route: '/places', label: '장소 관리에서 보기' },
      userSanctions: { route: '/bans', label: '사용자 밴에서 보기' },
    }[selectedGroup.key]

    return (
      <>
        <S.ActivityTabToolbar>
          <S.ActivityTabs role="tablist" aria-label="최근 활동 유형">
            {groups.map((group) => (
              <S.ActivityTab
                key={group.key}
                type="button"
                id={`dashboard-activity-tab-${group.key}`}
                role="tab"
                aria-selected={selectedGroup.key === group.key}
                aria-controls={activityPanelId}
                $active={selectedGroup.key === group.key}
                onClick={() => setActiveActivityTab(group.key)}
              >
                {group.title}
                <S.ActivityTabCount>{formatActivityCount(group.rows.length)}</S.ActivityTabCount>
              </S.ActivityTab>
            ))}
          </S.ActivityTabs>
          <S.ActivityViewAllButton
            type="button"
            onClick={() => navigate(activityNavigation.route)}
          >
            {activityNavigation.label}
            <S.MaterialIcon aria-hidden="true">arrow_forward</S.MaterialIcon>
          </S.ActivityViewAllButton>
        </S.ActivityTabToolbar>
        {selectedGroup.rows.length === 0 ? (
          <S.EmptyState
            id={activityPanelId}
            role="tabpanel"
            aria-labelledby={selectedTabId}
          >
            {selectedGroup.title} 활동이 없습니다.
          </S.EmptyState>
        ) : (
          <S.ActivityGroups
            id={activityPanelId}
            role="tabpanel"
            aria-labelledby={selectedTabId}
          >
            <S.ActivityGroup>
              <S.ActivityList>
                {selectedGroup.rows.map((row) => {
                  const formattedDate = formatActivityDate(row.timestamp)

                  return (
                    <S.ActivityItem key={row.id}>
                      <S.ActivityItemMain>
                        <strong title={row.title}>{row.title}</strong>
                        <span title={row.detail}>{row.detail}</span>
                      </S.ActivityItemMain>
                      {row.badge || formattedDate ? (
                        <S.ActivityItemAside>
                          {row.badge ? (
                            <S.ActivityBadge $tone={row.badge.tone}>
                              {row.badge.label}
                            </S.ActivityBadge>
                          ) : null}
                          {formattedDate ? (
                            <S.ActivityItemDate>{formattedDate}</S.ActivityItemDate>
                          ) : null}
                        </S.ActivityItemAside>
                      ) : null}
                    </S.ActivityItem>
                  )
                })}
              </S.ActivityList>
            </S.ActivityGroup>
          </S.ActivityGroups>
        )}
      </>
    )
  }

  function renderOperationalMetricCard(metric: DashboardOperationalMetric) {
    const value = getOperationalMetricValue(metric.key)
    const isZeroValue = value === 0
    const tone = isZeroValue ? 'neutral' : metric.tone

    return (
      <S.OperationalMetricCard
        key={metric.key}
        type="button"
        $tone={tone}
        onClick={() => navigate(metric.route)}
        aria-label={`${metric.label} ${value ?? '확인 중'} 관리 화면으로 이동`}
        aria-busy={isLoading}
      >
        <S.OperationalMetricIcon $tone={tone}>
          <S.MaterialIcon aria-hidden="true">{metric.icon}</S.MaterialIcon>
        </S.OperationalMetricIcon>
        <S.OperationalMetricContent>
          <S.OperationalMetricLabel>{metric.label}</S.OperationalMetricLabel>
          {value === null ? (
            <S.Skeleton aria-label="불러오는 중" />
          ) : (
            <S.OperationalMetricValue $muted={isZeroValue}>
              {value === undefined ? '-' : value.toLocaleString()}
              {value === undefined ? '' : metric.unit}
            </S.OperationalMetricValue>
          )}
        </S.OperationalMetricContent>
        <S.SummaryArrow aria-hidden="true">arrow_forward</S.SummaryArrow>
      </S.OperationalMetricCard>
    )
  }

  function renderMetricCard(metric: DashboardMetric) {
    const value = getMetricValue(metric.key)
    const isZeroValue = value === '0'
    const tone = isZeroValue ? 'neutral' : metric.tone

    return (
      <S.SummaryCard
        key={metric.key}
        type="button"
        $tone={tone}
        onClick={() => navigate(metric.route)}
        aria-label={`${metric.label} ${value ?? '불러오는 중'} 관리 화면으로 이동`}
        aria-busy={isLoading}
      >
        <S.SummaryCardTop>
          <S.SummaryIcon $tone={tone}>
            <S.MaterialIcon aria-hidden="true">{metric.icon}</S.MaterialIcon>
          </S.SummaryIcon>
          <S.SummaryArrow aria-hidden="true">arrow_forward</S.SummaryArrow>
        </S.SummaryCardTop>
        <S.SummaryLabel>{metric.label}</S.SummaryLabel>
        {value === null ? (
          <S.Skeleton aria-label="불러오는 중" />
        ) : (
          <>
            <S.SummaryValue $muted={isZeroValue}>{value}{metric.unit}</S.SummaryValue>
            {metric.key === 'placeCount' ? renderPlaceRegistrationSummary() : null}
          </>
        )}
      </S.SummaryCard>
    )
  }

  function renderPlaceRegistrationSummary() {
    const todayCount = summary?.operationalMetrics?.today.placeRegistrationCount
    const last7DaysCount = summary?.operationalMetrics?.last7Days.placeRegistrationCount

    if (todayCount === undefined || last7DaysCount === undefined) {
      return <S.SummarySupportingText>등록 추이를 확인할 수 없습니다.</S.SummarySupportingText>
    }

    return (
      <S.SummarySupportingText>
        오늘 {todayCount.toLocaleString()}개 등록 · 최근 7일 {last7DaysCount.toLocaleString()}개 등록
      </S.SummarySupportingText>
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
          <AdminNavigationMenu />
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
            <S.TopTitle as="h1">대시보드</S.TopTitle>
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
            <AdminNotificationButton />
          </S.TopActions>
        </S.TopBar>

        <S.PageContent>
          <S.PageHeader>
            <S.PageHeaderMain>
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
              <S.SectionTitle id="dashboard-summary-title">관리 요약</S.SectionTitle>
              <S.SectionDescription>현재 운영 수치</S.SectionDescription>
            </S.SectionHeader>
            <S.SummaryGrid>
              {SERVICE_METRICS.map(renderMetricCard)}
            </S.SummaryGrid>
          </S.Section>

          <S.Section aria-labelledby="dashboard-operational-metrics-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-operational-metrics-title">우선 확인</S.SectionTitle>
              <S.SectionDescription>
                조치가 필요한 운영 항목
              </S.SectionDescription>
            </S.SectionHeader>
            {visibleOperationalMetrics.length > 0 ? (
              <S.OperationalMetricGrid>
                {visibleOperationalMetrics.map(renderOperationalMetricCard)}
              </S.OperationalMetricGrid>
            ) : (
              <S.OperationalEmptyState>
                현재 처리할 항목이 없습니다.
              </S.OperationalEmptyState>
            )}
          </S.Section>

          <S.DashboardBottomGrid>
            <S.Section aria-labelledby="dashboard-recent-activities-title">
              <S.SectionHeader>
                <S.SectionTitle id="dashboard-recent-activities-title">최근 활동</S.SectionTitle>
                <S.SectionDescription>장소와 사용자 제재의 최신 내역</S.SectionDescription>
              </S.SectionHeader>
              <S.OperationsPanel>
                {recentActivitiesStatus === 'loading' && recentActivities ? (
                  <S.ActivityPanelMeta aria-live="polite">업데이트 중</S.ActivityPanelMeta>
                ) : null}
                {recentActivitiesStatus === 'error' && recentActivities
                  ? renderSectionError('최근 활동을 새로 불러오지 못했습니다.')
                  : null}
                {renderActivityGroups()}
              </S.OperationsPanel>
            </S.Section>

            <S.Section aria-labelledby="dashboard-quick-actions-title">
              <S.SectionHeader>
                <S.SectionTitle id="dashboard-quick-actions-title">빠른 이동</S.SectionTitle>
                <S.SectionDescription>주요 심사 화면</S.SectionDescription>
              </S.SectionHeader>
              <S.QuickActionPanel>
                {QUICK_ACTIONS.map((action) => (
                  <S.QuickActionButton key={action.route} type="button" onClick={() => navigate(action.route)}>
                    <S.QuickActionIcon aria-hidden="true">{action.icon}</S.QuickActionIcon>
                    <span>{action.label}</span>
                    <S.MaterialIcon aria-hidden="true">arrow_forward</S.MaterialIcon>
                  </S.QuickActionButton>
                ))}
              </S.QuickActionPanel>
            </S.Section>
          </S.DashboardBottomGrid>
        </S.PageContent>
      </S.MainArea>
    </S.AppShell>
  )
}

export default DashboardPage
