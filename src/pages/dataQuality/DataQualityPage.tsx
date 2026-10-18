import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminPagination } from '../../components/common/AdminPagination'
import { AdminStatusFilter } from '../../components/common/AdminStatusFilter'
import { AdminStatusSelect } from '../../components/common/AdminStatusSelect'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminDataQualityIssues } from '../../hooks/useAdminDataQualityIssues'
import { useAuth } from '../../hooks/useAuth'
import { formatLocalDateTime as formatDate } from '../../utils/displayFormat'
import type {
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
  const {
    owner, revision, result, phase, issues, page, limit, total, totalPages, hasNext,
    requestedPage, isLoading, isPreviousResult, errorMessage, fetchIssues,
  } = useAdminDataQualityIssues()
  const [filter, setFilter] = useState<{ owner: string; severity: DataQualityIssueSeverity | '' }>({ owner, severity: '' })
  const severity = filter.owner === owner ? filter.severity : ''
  // The API has no issue ID. An index is only a row identity within this verified result.
  const [selection, setSelection] = useState<{ owner: string; revision: number; index: number } | null>(null)
  const rows = useMemo(() => issues.map((issue, index) => ({ issue, index })), [issues])
  const filteredRows = useMemo(() => rows.filter(({ issue }) => !severity || issue.severity === severity), [rows, severity])
  const selected = selection?.owner === owner && selection.revision === revision
    ? filteredRows.find(row => row.index === selection.index)?.issue ?? null : null
  const errorCount = issues.filter(issue => issue.severity === 'ERROR').length
  const admin = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')
  const hasResult = result !== null
  const errorNotice = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (phase === 'error') errorNotice.current?.focus()
  }, [phase, errorMessage, requestedPage, owner])
  const totalLabel = total === null ? '—' : `${total.toLocaleString()}건`
  const resultDescription = result
    ? `전체 ${result.total.toLocaleString()}건 · ${page} / ${Math.max(1, totalPages)}페이지${isPreviousResult ? ' (이전 결과)' : ''}`
    : phase === 'error' ? '조회 결과를 확인할 수 없습니다.' : '아직 조회 결과가 없습니다.'

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src={`${import.meta.env.BASE_URL}pingdom-logo.png`} alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu><AdminNavigationMenu /></Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile>
            <Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon>
            <Shell.AdminProfileText><strong>{admin}</strong><span>관리자</span></Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>데이터 품질</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions><AdminNotificationButton />
            <Shell.IconButton type="button" aria-label="이슈 목록 새로고침" disabled={isLoading} onClick={() => void fetchIssues()}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader>
            <div><Shared.Eyebrow>운영 · 시스템 &gt; 데이터 품질</Shared.Eyebrow>
              <Shared.PageTitle>데이터 품질 이슈 모니터링</Shared.PageTitle>
              <Shared.PageDescription>자동 감지된 미해결 이슈를 확인하고, 대상 관리 화면에서 후속 조치를 진행합니다.</Shared.PageDescription>
            </div>
            <Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton></Shared.HeaderActions>
          </Shared.PageHeader>
          {errorMessage ? <Shared.Notice ref={errorNotice} tabIndex={-1} $variant="error" role="alert">
            {requestedPage}페이지 조회에 실패했습니다. {errorMessage}
            {hasResult ? ' 표시된 목록과 건수는 이전 조회 결과입니다.' : ' 미해결 건수는 확인되지 않았습니다.'}
            <Shared.SecondaryButton type="button" disabled={isLoading} onClick={() => void fetchIssues()}>다시 조회</Shared.SecondaryButton>
          </Shared.Notice> : null}
          <S.MetricGrid>
            <S.MetricCard><span>조회 범위</span><strong>페이지당 {limit.toLocaleString()}건</strong></S.MetricCard>
            <S.MetricCard><span>미해결 이슈 전체</span><strong>{totalLabel}</strong></S.MetricCard>
            <S.MetricCard><span>표시된 페이지 오류</span><strong>{hasResult ? `${errorCount.toLocaleString()}건` : '—'}</strong></S.MetricCard>
            <S.MetricCard><span>필터 결과 · 현재 페이지</span><strong>{hasResult ? `${filteredRows.length.toLocaleString()}건` : '—'}</strong></S.MetricCard>
          </S.MetricGrid>
          <Shared.QuerySummary role="status">{resultDescription}{isLoading ? ` · ${requestedPage}페이지 조회 중` : ''}</Shared.QuerySummary>
          <AdminStatusFilter label="이슈 필터" description="현재 표시된 페이지의 이슈만 심각도로 좁혀 봅니다. 전체 건수에는 적용되지 않습니다."
            controls={<AdminStatusSelect aria-label="심각도 필터" value={severity} disabled={isLoading || !hasResult} onChange={event => {
              setFilter({ owner, severity: event.target.value as DataQualityIssueSeverity | '' }); setSelection(null)
            }}><option value="">심각도 전체</option>{Object.entries(SEVERITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminStatusSelect>} />
          <Shared.Workspace>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>감지 이슈</Shared.PanelTitle><Shared.PanelDescription>이슈를 선택해 규칙과 감지 사유를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{totalLabel}</Shared.PanelCount></Shared.PanelHeader>
              <Shared.ScrollArea>
                {isLoading && !hasResult ? <Shared.EmptyState><strong>데이터 품질 이슈를 불러오는 중입니다.</strong></Shared.EmptyState>
                  : !hasResult ? <Shared.EmptyState><strong>{phase === 'error' ? '이슈 목록을 확인하지 못했습니다.' : '조회가 시작되면 결과를 표시합니다.'}</strong></Shared.EmptyState>
                  : filteredRows.length === 0 ? <Shared.EmptyState><strong>{phase === 'success'
                    ? total === 0 ? '미해결 이슈가 없습니다.' : '현재 페이지에 선택한 심각도의 이슈가 없습니다.'
                    : '이전에 조회한 목록에는 표시할 이슈가 없습니다.'}</strong></Shared.EmptyState>
                  : <S.CardList>{filteredRows.map(({ issue, index }) => (
                    <S.RecordButton key={`${revision}:${index}`} type="button"
                      $selected={selected === issue} disabled={isLoading}
                      onClick={() => setSelection({ owner, revision, index })}>
                      <S.RecordHeader><S.RecordTitle>{entityLabel(issue.entityType)} #{issue.entityId}</S.RecordTitle><S.StatusBadge $tone={severityTone(issue.severity)}>{SEVERITY_LABELS[issue.severity]}</S.StatusBadge></S.RecordHeader>
                      <S.RecordMeta>{issue.ruleCode} · 감지 {formatDate(issue.detectedAt)}</S.RecordMeta>
                      <S.RecordDescription>{issue.details || '상세 사유가 제공되지 않았습니다.'}</S.RecordDescription>
                    </S.RecordButton>
                  ))}</S.CardList>}
              </Shared.ScrollArea>
              {totalPages > 1 ? <AdminPagination ariaLabel="데이터 품질 이슈 목록 페이지네이션" page={page} totalPages={totalPages} hasNext={hasNext} disabled={isLoading} onPageChange={nextPage => { setSelection(null); void fetchIssues(nextPage) }} /> : null}
            </Shared.Panel>
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>이슈 상세</Shared.PanelTitle><Shared.PanelDescription>이 화면은 확인 전용입니다. 수정이 필요한 경우 대상 관리 화면에서 처리해주세요.</Shared.PanelDescription></div></Shared.PanelHeader>
              <Shared.CompareBody>{!selected ? <Shared.EmptyState><strong>목록에서 이슈를 선택하세요.</strong><p>대상, 규칙 코드, 심각도, 감지 사유를 확인할 수 있습니다.</p></Shared.EmptyState> : <>
                {isPreviousResult ? <Shared.Notice $variant="error">이전에 조회한 이슈 상세입니다.</Shared.Notice> : null}
                <S.RecordHeader><div><S.RecordTitle>{entityLabel(selected.entityType)} #{selected.entityId}</S.RecordTitle><S.RecordMeta>{selected.ruleCode} · 감지 {formatDate(selected.detectedAt)}</S.RecordMeta></div><S.StatusBadge $tone={statusTone(selected.status)}>{STATUS_LABELS[selected.status]}</S.StatusBadge></S.RecordHeader>
                <S.DetailGrid>
                  <S.DetailItem><dt>대상 유형</dt><dd>{entityLabel(selected.entityType)}</dd></S.DetailItem>
                  <S.DetailItem><dt>대상 ID</dt><dd>{selected.entityId}</dd></S.DetailItem>
                  <S.DetailItem><dt>규칙 코드</dt><dd>{selected.ruleCode}</dd></S.DetailItem>
                  <S.DetailItem><dt>심각도</dt><dd>{SEVERITY_LABELS[selected.severity]}</dd></S.DetailItem>
                  <S.DetailItem><dt>처리 상태</dt><dd>{STATUS_LABELS[selected.status]}</dd></S.DetailItem>
                  <S.DetailItem><dt>감지 시각</dt><dd>{formatDate(selected.detectedAt)}</dd></S.DetailItem>
                </S.DetailGrid>
                <S.Section><S.SectionTitle>감지 사유</S.SectionTitle><S.RecordDescription>{selected.details || '상세 사유가 제공되지 않았습니다.'}</S.RecordDescription></S.Section>
                {entityManagementPath(selected.entityType) ? <S.InlineActions><Shared.SecondaryButton type="button" disabled={isLoading} onClick={() => navigate(entityManagementPath(selected.entityType)!)}>대상 관리 열기</Shared.SecondaryButton></S.InlineActions> : null}
              </>}</Shared.CompareBody>
            </Shared.Panel>
          </Shared.Workspace>
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default DataQualityPage
