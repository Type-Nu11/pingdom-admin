import { useState } from 'react'
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
  unit: string
  route: string
  tone: 'neutral' | 'action'
}

interface DashboardMetricNavigationState {
  openPostId?: number
  reportId?: number
  reviewStatus?: 'ALL' | 'PENDING' | 'PROCESSED'
}

type DashboardOperationalMetricKey =
  | 'todayPlaceRegistrationCount'
  | 'todayPostRegistrationCount'
  | 'last7DaysPlaceRegistrationCount'
  | 'last7DaysPostRegistrationCount'
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

type DashboardUtilityKey = 'notifications' | 'help'
type DashboardActivityTabKey = 'places' | 'posts' | 'reports' | 'userSanctions'

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
    key: 'postCount',
    label: '전체 게시글',
    icon: 'description',
    unit: '개',
    route: '/main',
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

const ACTION_METRICS: DashboardMetric[] = [
  {
    key: 'pendingReportCount',
    label: '처리 대기 신고',
    icon: 'flag',
    unit: '건',
    route: '/main',
    tone: 'action',
  },
]

const OPERATIONAL_METRICS: DashboardOperationalMetric[] = [
  {
    key: 'todayPlaceRegistrationCount',
    label: '오늘 등록 장소',
    unit: '개',
    icon: 'add_location_alt',
    route: '/places',
    tone: 'neutral',
  },
  {
    key: 'todayPostRegistrationCount',
    label: '오늘 등록 게시글',
    unit: '개',
    icon: 'post_add',
    route: '/main',
    tone: 'neutral',
  },
  {
    key: 'last7DaysPlaceRegistrationCount',
    label: '최근 7일 장소 등록',
    unit: '개',
    icon: 'location_on',
    route: '/places',
    tone: 'neutral',
  },
  {
    key: 'last7DaysPostRegistrationCount',
    label: '최근 7일 게시글 등록',
    unit: '개',
    icon: 'description',
    route: '/main',
    tone: 'neutral',
  },
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

function DashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const {
    summary,
    recentActivities,
    pendingItems,
    status,
    recentActivitiesStatus,
    pendingItemsStatus,
    isLoading,
    lastUpdatedAt,
    fetchSummary,
  } = useAdminDashboard()
  const [activeUtility, setActiveUtility] = useState<DashboardUtilityKey | null>(null)
  const [activeActivityTab, setActiveActivityTab] =
    useState<DashboardActivityTabKey | null>(null)
  const adminIdentifier = user?.username || user?.name || 'admin'
  const pendingItemCount = summary?.pendingReportCount ?? pendingItems.length

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
      case 'todayPlaceRegistrationCount':
        return metrics.today.placeRegistrationCount
      case 'todayPostRegistrationCount':
        return metrics.today.postRegistrationCount
      case 'last7DaysPlaceRegistrationCount':
        return metrics.last7Days.placeRegistrationCount
      case 'last7DaysPostRegistrationCount':
        return metrics.last7Days.postRegistrationCount
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

  function getReportStatusLabel(reportStatus: string) {
    const labels: Record<string, string> = {
      PENDING: '처리 대기',
      ACCEPTED: '수락됨',
      DECLINED: '거절됨',
      RESTORED: '복구됨',
    }

    return labels[reportStatus] ?? reportStatus
  }

  function getSanctionActionLabel(action: string) {
    const labels: Record<string, string> = {
      APPLIED: '밴 처리',
      RELEASED: '밴 해제',
      EXPIRED: '밴 만료',
    }

    return labels[action] ?? action
  }

  function getPendingTypeLabel(type: string) {
    const labels: Record<string, string> = {
      POST_REPORT: '게시글 신고',
      REPORT: '신고',
    }

    return labels[type] ?? type
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
        key: 'posts',
        title: '게시글',
        rows: recentActivities.posts.map((post) => ({
          id: `post-${post.postId}`,
          title: post.title,
          detail: `${post.username} · ${post.placeName ?? '장소 정보 없음'}`,
          timestamp: post.createdAt,
        })),
      },
      {
        key: 'reports',
        title: '신고',
        rows: recentActivities.reports.map((report) => ({
          id: `report-${report.reportId}`,
          title: report.title,
          detail: `신고 ID ${report.reportId}`,
          timestamp: report.createdAt,
          badge: {
            label: getReportStatusLabel(report.status),
            tone:
              report.status === 'ACCEPTED'
                ? 'success'
                : report.status === 'PENDING'
                  ? 'warning'
                  : report.status === 'DECLINED'
                    ? 'error'
                    : 'neutral',
          },
        })),
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
      posts: { route: '/main', label: '게시글 관리에서 보기' },
      reports: {
        route: '/main',
        label: '신고 내역 보기',
        state: { reviewStatus: 'PROCESSED' as const },
      },
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
                <S.ActivityTabCount>{group.rows.length}</S.ActivityTabCount>
              </S.ActivityTab>
            ))}
          </S.ActivityTabs>
          <S.ActivityViewAllButton
            type="button"
            onClick={() => navigate(activityNavigation.route, activityNavigation.state ? { state: activityNavigation.state } : undefined)}
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

  function renderPendingItems() {
    if (pendingItemsStatus === 'error') {
      return (
        <>
          {renderSectionError('처리 필요 항목을 불러오지 못했습니다.')}
          {pendingItems.length > 0 ? renderPendingList() : null}
        </>
      )
    }

    if (pendingItemsStatus === 'loading' && pendingItems.length === 0) {
      return (
        <S.ActivitySkeletonList aria-label="처리 필요 항목 불러오는 중">
          {[1, 2, 3].map((item) => (
            <S.ActivitySkeleton key={item} />
          ))}
        </S.ActivitySkeletonList>
      )
    }

    if (pendingItems.length === 0) {
      return <S.EmptyState>현재 처리할 항목이 없습니다.</S.EmptyState>
    }

    return renderPendingList()
  }

  function renderPendingList() {
    return (
      <S.PendingList>
        {pendingItems.map((item) => (
          <S.PendingItem
            key={`${item.type}-${item.targetId}`}
            type="button"
            onClick={() => {
              const state: DashboardMetricNavigationState = {
                reviewStatus: 'PENDING',
                ...(typeof item.postId === 'number' ? { openPostId: item.postId } : {}),
                ...(typeof item.reportId === 'number' ? { reportId: item.reportId } : {}),
              }

              navigate('/main', { state })
            }}
            aria-label={`${item.title}, ${getPendingTypeLabel(item.type)} 상세 검토로 이동`}
          >
            <S.PendingItemMain>
              <strong title={item.title}>{item.title}</strong>
              <span title={`${getPendingTypeLabel(item.type)} · ${getReportStatusLabel(item.status)}`}>
                {getPendingTypeLabel(item.type)} · {getReportStatusLabel(item.status)}
              </span>
            </S.PendingItemMain>
            <S.PendingItemMeta>
              <span>{formatActivityDate(item.createdAt) ?? '접수일 미상'}</span>
              <S.MaterialIcon aria-hidden="true">arrow_forward</S.MaterialIcon>
            </S.PendingItemMeta>
          </S.PendingItem>
        ))}
      </S.PendingList>
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
        onClick={() => {
          const state: DashboardMetricNavigationState | undefined =
            metric.key === 'pendingReportCount'
              ? { reviewStatus: 'PENDING' }
              : undefined

          navigate(metric.route, state ? { state } : undefined)
        }}
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
          <S.SummaryValue $muted={isZeroValue}>{value}{metric.unit}</S.SummaryValue>
        )}
      </S.SummaryCard>
    )
  }

  function renderUtilityPanel() {
    if (!activeUtility) {
      return null
    }

    const isNotificationPanel = activeUtility === 'notifications'

    return (
      <S.UtilityPanel role="status">
        <S.UtilityPanelHeader>
          <strong>{isNotificationPanel ? '알림' : '도움말'}</strong>
          <S.UtilityPanelClose
            type="button"
            aria-label="패널 닫기"
            onClick={() => setActiveUtility(null)}
          >
            <S.MaterialIcon aria-hidden="true">close</S.MaterialIcon>
          </S.UtilityPanelClose>
        </S.UtilityPanelHeader>
        <S.UtilityPanelText>
          {isNotificationPanel
            ? '알림 API가 연결되면 새로운 운영 이벤트를 표시합니다.'
            : '관리자 화면 도움말은 기능 연결 후 제공됩니다.'}
        </S.UtilityPanelText>
      </S.UtilityPanel>
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
            <S.IconButton
              type="button"
              aria-label="알림"
              title="알림"
              aria-expanded={activeUtility === 'notifications'}
              onClick={() =>
                setActiveUtility((current) =>
                  current === 'notifications' ? null : 'notifications'
                )
              }
            >
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
            <S.IconButton
              type="button"
              aria-label="도움말"
              title="도움말"
              aria-expanded={activeUtility === 'help'}
              onClick={() =>
                setActiveUtility((current) => (current === 'help' ? null : 'help'))
              }
            >
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
            {renderUtilityPanel()}
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
              {[...SERVICE_METRICS, ...ACTION_METRICS].map(renderMetricCard)}
            </S.SummaryGrid>
          </S.Section>

          <S.Section aria-labelledby="dashboard-pending-items-section-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-pending-items-section-title">
                처리 필요 항목
              </S.SectionTitle>
              <S.SectionDescription>지금 확인이 필요한 운영 작업</S.SectionDescription>
            </S.SectionHeader>
            <S.OperationsPanel aria-labelledby="dashboard-pending-items-title" $tone="action">
              <S.OperationsPanelHeader>
                <S.OperationsPanelTitle id="dashboard-pending-items-title">
                  신고 검토 목록
                  {summary || pendingItemsStatus !== 'loading' || pendingItems.length > 0 ? (
                    <S.PanelCount>{pendingItemCount.toLocaleString()}건</S.PanelCount>
                  ) : null}
                </S.OperationsPanelTitle>
                {pendingItemsStatus === 'loading' && pendingItems.length > 0 ? (
                  <S.PanelUpdatingText>업데이트 중</S.PanelUpdatingText>
                ) : null}
              </S.OperationsPanelHeader>
              {renderPendingItems()}
            </S.OperationsPanel>
          </S.Section>

          <S.Section aria-labelledby="dashboard-operational-metrics-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-operational-metrics-title">
                추가 운영 현황
              </S.SectionTitle>
              <S.SectionDescription>
                {summary?.operationalMetrics?.collectedAt
                  ? `집계 기준: ${formatActivityDate(summary.operationalMetrics.collectedAt) ?? '시각 미상'}`
                  : '서버 운영 지표'}
              </S.SectionDescription>
            </S.SectionHeader>
            <S.OperationalMetricGrid>
              {OPERATIONAL_METRICS.map(renderOperationalMetricCard)}
            </S.OperationalMetricGrid>
          </S.Section>

          <S.Section aria-labelledby="dashboard-recent-activities-title">
            <S.SectionHeader>
              <S.SectionTitle id="dashboard-recent-activities-title">최근 활동</S.SectionTitle>
              <S.SectionDescription>장소·게시글·신고·제재의 최신 내역</S.SectionDescription>
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
        </S.PageContent>
      </S.MainArea>
    </S.AppShell>
  )
}

export default DashboardPage
