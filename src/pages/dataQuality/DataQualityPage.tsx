import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminStatusFilter } from '../../components/common/AdminStatusFilter'
import { AdminStatusSelect } from '../../components/common/AdminStatusSelect'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminDataQualityIssues } from '../../hooks/useAdminDataQualityIssues'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminDataQualityIssue,
  DataQualityIssueSeverity,
  DataQualityIssueStatus,
} from '../../types/adminDataQuality.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

const SEVERITY_LABELS: Record<DataQualityIssueSeverity, string> = {
  INFO: '안내',
  WARNING: '주의',
  ERROR: '오류',
}

const STATUS_LABELS: Record<DataQualityIssueStatus, string> = {
  OPEN: '미해결',
  RESOLVED: '해결됨',
  IGNORED: '무시됨',
}

function issueKey(issue: AdminDataQualityIssue) {
  return [issue.entityType, issue.entityId, issue.ruleCode, issue.detectedAt].join(':')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function entityLabel(entityType: string) {
  const type = entityType.replaceAll('_', ' ').trim()
  return type || '알 수 없는 대상'
}

function entityManagementPath(entityType: string) {
  switch (entityType.toUpperCase()) {
    case 'PLACE':
    case 'MAP_PLACE':
      return '/places'
    case 'MERCHANT_OWNER':
    case 'MERCHANT':
      return '/merchant-owners'
    case 'USER':
      return '/users/roles'
    default:
      return null
  }
}

function severityTone(severity: DataQualityIssueSeverity) {
  if (severity === 'ERROR') return 'danger' as const
  if (severity === 'WARNING') return 'warning' as const
  return 'success' as const
}

function statusTone(status: DataQualityIssueStatus) {
  if (status === 'OPEN') return 'warning' as const
  if (status === 'IGNORED') return 'danger' as const
  return 'success' as const
}

function DataQualityPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { issues, isLoading, errorMessage, fetchIssues } = useAdminDataQualityIssues()
  const [severity, setSeverity] = useState<DataQualityIssueSeverity | ''>('')
  const [status, setStatus] = useState<DataQualityIssueStatus | ''>('OPEN')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const admin = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const filteredIssues = useMemo(
    () => issues.filter((issue) => (!severity || issue.severity === severity) && (!status || issue.status === status)),
    [issues, severity, status],
  )
  const selected = useMemo(
    () => issues.find((issue) => issueKey(issue) === selectedKey) ?? null,
    [issues, selectedKey],
  )
  const openCount = useMemo(() => issues.filter((issue) => issue.status === 'OPEN').length, [issues])
  const errorCount = useMemo(() => issues.filter((issue) => issue.severity === 'ERROR').length, [issues])

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter><Shell.AdminProfile><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{admin}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>데이터 품질</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="이슈 목록 새로고침" disabled={isLoading} onClick={() => void fetchIssues()}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>운영 · 시스템 &gt; 데이터 품질</Shared.Eyebrow><Shared.PageTitle>데이터 품질 이슈 모니터링</Shared.PageTitle><Shared.PageDescription>자동 감지된 데이터 이상을 확인하고, 대상 관리 화면에서 후속 조치를 진행합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          {errorMessage ? <Shared.Notice $variant="error">{errorMessage}</Shared.Notice> : null}
          <S.MetricGrid><S.MetricCard><span>전체 이슈</span><strong>{issues.length.toLocaleString()}건</strong></S.MetricCard><S.MetricCard><span>미해결</span><strong>{openCount.toLocaleString()}건</strong></S.MetricCard><S.MetricCard><span>오류</span><strong>{errorCount.toLocaleString()}건</strong></S.MetricCard><S.MetricCard><span>현재 결과</span><strong>{filteredIssues.length.toLocaleString()}건</strong></S.MetricCard></S.MetricGrid>
          <AdminStatusFilter label="이슈 필터" description="현재 조회된 이슈 목록에서 심각도와 처리 상태를 좁혀 봅니다." controls={<><AdminStatusSelect aria-label="심각도 필터" value={severity} disabled={isLoading} onChange={(event) => setSeverity(event.target.value as DataQualityIssueSeverity | '')}><option value="">심각도 전체</option>{Object.entries(SEVERITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminStatusSelect><AdminStatusSelect aria-label="처리 상태 필터" value={status} disabled={isLoading} onChange={(event) => setStatus(event.target.value as DataQualityIssueStatus | '')}><option value="">상태 전체</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminStatusSelect></>} />
          <Shared.Workspace>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>감지 이슈</Shared.PanelTitle><Shared.PanelDescription>이슈를 선택해 규칙과 감지 사유를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{filteredIssues.length.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader><Shared.ScrollArea>{isLoading && issues.length === 0 ? <Shared.EmptyState><strong>데이터 품질 이슈를 불러오는 중입니다.</strong></Shared.EmptyState> : filteredIssues.length === 0 ? <Shared.EmptyState><strong>조건에 맞는 이슈가 없습니다.</strong></Shared.EmptyState> : <S.CardList>{filteredIssues.map((issue) => <S.RecordButton key={issueKey(issue)} type="button" $selected={selectedKey === issueKey(issue)} onClick={() => setSelectedKey(issueKey(issue))}><S.RecordHeader><S.RecordTitle>{entityLabel(issue.entityType)} #{issue.entityId}</S.RecordTitle><S.StatusBadge $tone={severityTone(issue.severity)}>{SEVERITY_LABELS[issue.severity]}</S.StatusBadge></S.RecordHeader><S.RecordMeta>{issue.ruleCode} · 감지 {formatDate(issue.detectedAt)}</S.RecordMeta><S.RecordDescription>{issue.details || '상세 사유가 제공되지 않았습니다.'}</S.RecordDescription></S.RecordButton>)}</S.CardList>}</Shared.ScrollArea></Shared.Panel>
            <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>이슈 상세</Shared.PanelTitle><Shared.PanelDescription>조회 API만 제공되므로 이 화면에서는 상태를 변경하지 않습니다.</Shared.PanelDescription></div></Shared.PanelHeader><Shared.CompareBody>{!selected ? <Shared.EmptyState><strong>목록에서 이슈를 선택하세요.</strong><p>대상, 규칙 코드, 심각도, 감지 사유를 확인할 수 있습니다.</p></Shared.EmptyState> : <><S.RecordHeader><div><S.RecordTitle>{entityLabel(selected.entityType)} #{selected.entityId}</S.RecordTitle><S.RecordMeta>{selected.ruleCode} · 감지 {formatDate(selected.detectedAt)}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(selected.status)}>{STATUS_LABELS[selected.status]}</S.StatusBadge></S.RecordHeader><S.DetailGrid><S.DetailItem><dt>대상 유형</dt><dd>{entityLabel(selected.entityType)}</dd></S.DetailItem><S.DetailItem><dt>대상 ID</dt><dd>{selected.entityId}</dd></S.DetailItem><S.DetailItem><dt>규칙 코드</dt><dd>{selected.ruleCode}</dd></S.DetailItem><S.DetailItem><dt>심각도</dt><dd>{SEVERITY_LABELS[selected.severity]}</dd></S.DetailItem><S.DetailItem><dt>처리 상태</dt><dd>{STATUS_LABELS[selected.status]}</dd></S.DetailItem><S.DetailItem><dt>감지 시각</dt><dd>{formatDate(selected.detectedAt)}</dd></S.DetailItem></S.DetailGrid><S.Section><S.SectionTitle>감지 사유</S.SectionTitle><S.RecordDescription>{selected.details || '상세 사유가 제공되지 않았습니다.'}</S.RecordDescription></S.Section>{entityManagementPath(selected.entityType) ? <S.InlineActions><Shared.SecondaryButton type="button" onClick={() => navigate(entityManagementPath(selected.entityType)!)}>대상 관리 열기</Shared.SecondaryButton></S.InlineActions> : null}</>}</Shared.CompareBody></Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default DataQualityPage
