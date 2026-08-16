import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { RecommendationPolicyPanel } from '../../components/recommendation/RecommendationPolicyPanel'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import {
  type RecommendationMetricQuery,
  useAdminRecommendationMetrics,
} from '../../hooks/useAdminRecommendationMetrics'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminRecommendationMetricSummary,
  RecommendationMetricSortBy,
} from '../../types/adminRecommendationMetric.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'

type Tab = 'metrics' | 'compare' | 'explanation' | 'policy'

const SORT_OPTIONS: Array<{ value: RecommendationMetricSortBy; label: string }> = [
  { value: 'SMOOTHED_CTR', label: '보정 CTR' },
  { value: 'RAW_CTR', label: '원본 CTR' },
  { value: 'BOOKMARK_CONVERSION', label: '북마크 전환' },
  { value: 'LIKE_CONVERSION', label: '좋아요 전환' },
  { value: 'TOTAL_CONVERSION', label: '전체 전환' },
  { value: 'EXPOSURE', label: '노출 수' },
  { value: 'CLICK', label: '클릭 수' },
  { value: 'UPDATED_AT', label: '최근 갱신' },
]

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function signed(value: number, percentValue = false) {
  const formatted = percentValue ? `${(value * 100).toFixed(2)}%p` : value.toLocaleString()
  return value > 0 ? `+${formatted}` : formatted
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(date)
}

function SummaryCards({ summary, delta }: { summary: AdminRecommendationMetricSummary; delta?: boolean }) {
  return (
    <S.MetricGrid>
      <S.MetricCard><span>노출</span><strong>{delta ? signed(summary.exposureCount) : summary.exposureCount.toLocaleString()}</strong></S.MetricCard>
      <S.MetricCard><span>클릭</span><strong>{delta ? signed(summary.clickCount) : summary.clickCount.toLocaleString()}</strong></S.MetricCard>
      <S.MetricCard><span>원본 CTR</span><strong>{delta ? signed(summary.rawCtr, true) : percent(summary.rawCtr)}</strong></S.MetricCard>
      <S.MetricCard><span>보정 CTR</span><strong>{delta ? signed(summary.smoothedCtr, true) : percent(summary.smoothedCtr)}</strong></S.MetricCard>
      <S.MetricCard><span>북마크 전환율</span><strong>{delta ? signed(summary.bookmarkConversionRate, true) : percent(summary.bookmarkConversionRate)}</strong></S.MetricCard>
      <S.MetricCard><span>좋아요 전환율</span><strong>{delta ? signed(summary.likeConversionRate, true) : percent(summary.likeConversionRate)}</strong></S.MetricCard>
      <S.MetricCard><span>전체 전환율</span><strong>{delta ? signed(summary.totalConversionRate, true) : percent(summary.totalConversionRate)}</strong></S.MetricCard>
    </S.MetricGrid>
  )
}

function RecommendationMetricsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminRecommendationMetrics()
  const [tab, setTab] = useState<Tab>('metrics')
  const [keyword, setKeyword] = useState('')
  const [version, setVersion] = useState('')
  const [days, setDays] = useState('')
  const [sortBy, setSortBy] = useState<RecommendationMetricSortBy>('SMOOTHED_CTR')
  const [baselineVersion, setBaselineVersion] = useState('')
  const [targetVersion, setTargetVersion] = useState('')
  const [compareKeyword, setCompareKeyword] = useState('')
  const [compareDays, setCompareDays] = useState('')
  const [requestId, setRequestId] = useState('')
  const [formError, setFormError] = useState('')
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const parseDays = (value: string) => {
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  const submitMetrics = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedDays = parseDays(days)
    if (parsedDays === null) {
      setFormError('기간은 1일 이상의 정수로 입력해주세요.')
      return
    }
    setFormError('')
    void hook.fetchMetrics({
      page: 1,
      sortBy,
      keyword: keyword.trim(),
      recommendationVersion: version.trim(),
      days: parsedDays,
    })
  }

  const submitCompare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const baseline = baselineVersion.trim()
    const target = targetVersion.trim()
    const parsedDays = parseDays(compareDays)
    if (!baseline || !target) {
      setFormError('기준 버전과 비교 버전을 모두 입력해주세요.')
      return
    }
    if (baseline === target) {
      setFormError('서로 다른 두 추천 버전을 입력해주세요.')
      return
    }
    if (parsedDays === null) {
      setFormError('기간은 1일 이상의 정수로 입력해주세요.')
      return
    }
    setFormError('')
    void hook.compareMetrics({ baselineVersion: baseline, targetVersion: target, keyword: compareKeyword.trim() || undefined, days: parsedDays })
  }

  const submitExplanation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = requestId.trim()
    if (!value) {
      setFormError('추천 requestId를 입력해주세요.')
      return
    }
    setFormError('')
    void hook.fetchExplanation(value)
  }

  const movePage = (page: number) => {
    const nextQuery: RecommendationMetricQuery = { ...hook.query, page }
    void hook.fetchMetrics(nextQuery)
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu>
          <AdminNavigationMenu />
        </Shell.SideMenu>
        <Shell.SideFooter><Shell.AdminProfile aria-label="관리자 계정"><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile><Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton></Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar><Shell.TopTitleGroup><Shell.TopTitle>추천 성과 분석</Shell.TopTitle></Shell.TopTitleGroup><Shell.TopActions><AdminNotificationButton /></Shell.TopActions></Shell.TopBar>
        <Shared.Content><Shared.PageStack>
          <Shared.PageHeader><div><Shared.Eyebrow>장소 관리 &gt; 추천 성과</Shared.Eyebrow><Shared.PageTitle>추천 성과 및 버전 비교</Shared.PageTitle><Shared.PageDescription>장소별 추천 성과를 조회하고 동일 조건에서 버전 차이와 추천 근거를 확인합니다.</Shared.PageDescription></div><Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/places')}>장소 관리</Shared.HeaderButton></Shared.HeaderActions></Shared.PageHeader>
          <S.TabList role="tablist" aria-label="추천 분석 작업">
            <S.TabButton type="button" role="tab" $active={tab === 'metrics'} aria-selected={tab === 'metrics'} onClick={() => { setTab('metrics'); setFormError('') }}><Shell.MaterialIcon aria-hidden="true">monitoring</Shell.MaterialIcon>성과 조회</S.TabButton>
            <S.TabButton type="button" role="tab" $active={tab === 'compare'} aria-selected={tab === 'compare'} onClick={() => { setTab('compare'); setFormError('') }}><Shell.MaterialIcon aria-hidden="true">compare_arrows</Shell.MaterialIcon>버전 비교</S.TabButton>
            <S.TabButton type="button" role="tab" $active={tab === 'explanation'} aria-selected={tab === 'explanation'} onClick={() => { setTab('explanation'); setFormError('') }}><Shell.MaterialIcon aria-hidden="true">manage_search</Shell.MaterialIcon>추천 설명</S.TabButton>
            <S.TabButton type="button" role="tab" $active={tab === 'policy'} aria-selected={tab === 'policy'} onClick={() => { setTab('policy'); setFormError('') }}><Shell.MaterialIcon aria-hidden="true">tune</Shell.MaterialIcon>운영 정책</S.TabButton>
          </S.TabList>

          {tab === 'metrics' ? <>
            <S.SearchBar onSubmit={submitMetrics}>
              <S.Field>장소 키워드<S.Input value={keyword} placeholder="장소명 또는 주소" onChange={(event) => setKeyword(event.target.value)} /></S.Field>
              <S.Field>추천 버전<S.Input value={version} placeholder="place-rec-v1" onChange={(event) => setVersion(event.target.value)} /></S.Field>
              <S.Field>최근 N일<S.Input inputMode="numeric" value={days} placeholder="전체" onChange={(event) => setDays(event.target.value)} /></S.Field>
              <S.Field>정렬<S.Select value={sortBy} onChange={(event) => setSortBy(event.target.value as RecommendationMetricSortBy)}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</S.Select></S.Field>
              <Shared.PrimaryButton type="submit" disabled={hook.isLoading}>조회</Shared.PrimaryButton>
            </S.SearchBar>
            {formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}
            {hook.errorMessage ? <Shared.Notice $variant="error">{hook.errorMessage}</Shared.Notice> : null}
            <Shared.Panel>
              <Shared.PanelHeader><div><Shared.PanelTitle>장소별 추천 성과</Shared.PanelTitle><Shared.PanelDescription>{hook.query.recommendationVersion || '전체 버전'} · {SORT_OPTIONS.find((item) => item.value === hook.query.sortBy)?.label} 순</Shared.PanelDescription></div><Shared.PanelCount>{hook.totalCount.toLocaleString()}개 장소</Shared.PanelCount></Shared.PanelHeader>
              {hook.isLoading && hook.metrics.length === 0 ? <Shared.EmptyState><strong>추천 성과를 불러오는 중입니다.</strong></Shared.EmptyState> : hook.metrics.length === 0 ? <Shared.EmptyState><strong>조건에 맞는 추천 성과가 없습니다.</strong></Shared.EmptyState> : <S.TableScroll><S.Table><thead><tr><th>장소</th><th>노출</th><th>클릭</th><th>원본 CTR</th><th>보정 CTR</th><th>북마크</th><th>좋아요</th><th>전체 전환율</th><th>갱신</th></tr></thead><tbody>{hook.metrics.map((metric) => <tr key={metric.id}><td><S.TableTitle>{metric.name}</S.TableTitle><S.TableMeta>#{metric.id} · {metric.address}</S.TableMeta></td><td>{metric.exposureCount.toLocaleString()}</td><td>{metric.clickCount.toLocaleString()}</td><td>{percent(metric.rawCtr)}</td><td>{percent(metric.smoothedCtr)}</td><td>{metric.bookmarkConversionCount.toLocaleString()} · {percent(metric.bookmarkConversionRate)}</td><td>{metric.likeConversionCount.toLocaleString()} · {percent(metric.likeConversionRate)}</td><td>{percent(metric.totalConversionRate)}</td><td>{formatDate(metric.snapshotUpdatedAt)}</td></tr>)}</tbody></S.Table></S.TableScroll>}
              <S.Pagination><Shared.SecondaryButton type="button" disabled={hook.query.page <= 1 || hook.isLoading} onClick={() => movePage(hook.query.page - 1)}>이전</Shared.SecondaryButton><span>{Math.max(hook.query.page, 1)} / {Math.max(hook.totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hook.hasNext || hook.isLoading} onClick={() => movePage(hook.query.page + 1)}>다음</Shared.SecondaryButton></S.Pagination>
            </Shared.Panel>
          </> : null}

          {tab === 'compare' ? <>
            <S.SearchBar onSubmit={submitCompare}>
              <S.Field>기준 버전 *<S.Input value={baselineVersion} placeholder="place-rec-v1" onChange={(event) => setBaselineVersion(event.target.value)} /></S.Field>
              <S.Field>비교 버전 *<S.Input value={targetVersion} placeholder="place-rec-v2" onChange={(event) => setTargetVersion(event.target.value)} /></S.Field>
              <S.Field>장소 키워드<S.Input value={compareKeyword} placeholder="전체 장소" onChange={(event) => setCompareKeyword(event.target.value)} /></S.Field>
              <S.Field>최근 N일<S.Input inputMode="numeric" value={compareDays} placeholder="전체" onChange={(event) => setCompareDays(event.target.value)} /></S.Field>
              <Shared.PrimaryButton type="submit" disabled={hook.isComparisonLoading}>비교</Shared.PrimaryButton>
            </S.SearchBar>
            {formError || hook.comparisonErrorMessage ? <Shared.Notice $variant="error">{formError || hook.comparisonErrorMessage}</Shared.Notice> : null}
            {hook.isComparisonLoading ? <Shared.EmptyStateCard><strong>버전 성과를 비교하는 중입니다.</strong></Shared.EmptyStateCard> : hook.comparison ? <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>{hook.comparison.baselineVersion} ↔ {hook.comparison.targetVersion}</Shared.PanelTitle><Shared.PanelDescription>{hook.comparison.keyword || '전체 장소'} · {hook.comparison.days ? `최근 ${hook.comparison.days}일` : '전체 기간'}</Shared.PanelDescription></div></Shared.PanelHeader><S.FormBody><S.SectionTitle>기준 버전</S.SectionTitle><SummaryCards summary={hook.comparison.baseline} /><S.Section><S.SectionTitle>비교 버전</S.SectionTitle><SummaryCards summary={hook.comparison.target} /></S.Section><S.Section><S.SectionTitle>차이 (비교 - 기준)</S.SectionTitle><SummaryCards summary={hook.comparison.delta} delta /></S.Section></S.FormBody></Shared.Panel> : <Shared.EmptyStateCard><strong>비교할 두 추천 버전을 입력해주세요.</strong></Shared.EmptyStateCard>}
          </> : null}

          {tab === 'explanation' ? <>
            <S.SearchBar onSubmit={submitExplanation}><S.Field>추천 requestId *<S.Input value={requestId} placeholder="9f7263d5-65f1-4834-9ca3-86ad2fc4e7d0" onChange={(event) => setRequestId(event.target.value)} /><small>추천 응답에 기록된 requestId를 그대로 입력하세요.</small></S.Field><Shared.PrimaryButton type="submit" disabled={hook.isExplanationLoading}>설명 조회</Shared.PrimaryButton></S.SearchBar>
            {formError || hook.explanationErrorMessage ? <Shared.Notice $variant="error">{formError || hook.explanationErrorMessage}</Shared.Notice> : null}
            {hook.isExplanationLoading ? <Shared.EmptyStateCard><strong>추천 설명을 불러오는 중입니다.</strong></Shared.EmptyStateCard> : hook.explanation ? <Shared.Panel><Shared.PanelHeader><div><Shared.PanelTitle>추천 요청 {hook.explanation.requestId}</Shared.PanelTitle><Shared.PanelDescription>노출 순위와 최종 점수 구성 요소입니다.</Shared.PanelDescription></div><Shared.PanelCount>{hook.explanation.items.length.toLocaleString()}개 후보</Shared.PanelCount></Shared.PanelHeader><Shared.CompareBody><S.CardList>{hook.explanation.items.map((item) => <S.RecordCard key={`${item.ranking}-${item.placeId}`}><S.RecordHeader><div><S.RecordTitle>{item.ranking}위 · {item.placeName}</S.RecordTitle><S.RecordMeta>장소 #{item.placeId} · 사용자 #{item.userId} · {item.recommendationVersion}</S.RecordMeta></div><S.StatusBadge $tone={item.recommendationStage === 'STABLE' ? 'success' : 'warning'}>{item.recommendationStage === 'STABLE' ? '안정' : '실험'}</S.StatusBadge></S.RecordHeader><S.DetailGrid><S.DetailItem><dt>후보 소스</dt><dd>{item.source}</dd></S.DetailItem><S.DetailItem><dt>거리</dt><dd>{item.distanceMeters.toLocaleString()}m</dd></S.DetailItem><S.DetailItem><dt>최종 점수</dt><dd>{item.finalScore.toFixed(4)}</dd></S.DetailItem><S.DetailItem><dt>개인화 / 지역</dt><dd>{item.personalScore.toFixed(4)} / {item.geoScore.toFixed(4)}</dd></S.DetailItem><S.DetailItem><dt>품질 / 참여</dt><dd>{item.qualityScore.toFixed(4)} / {item.engagementScore.toFixed(4)}</dd></S.DetailItem><S.DetailItem><dt>전환 / 탐색</dt><dd>{item.conversionScore.toFixed(4)} / {item.explorationScore.toFixed(4)}</dd></S.DetailItem><S.DetailItem><dt>신뢰 / 맥락</dt><dd>{item.trustScore.toFixed(4)} / {item.contextScore.toFixed(4)}</dd></S.DetailItem><S.DetailItem><dt>혜택 / 가용 / 부스트</dt><dd>{item.benefitScore.toFixed(4)} / {item.availabilityScore.toFixed(4)} / {item.boostScore.toFixed(4)}</dd></S.DetailItem></S.DetailGrid></S.RecordCard>)}</S.CardList></Shared.CompareBody></Shared.Panel> : <Shared.EmptyStateCard><strong>추천 requestId로 설명 로그를 조회해주세요.</strong></Shared.EmptyStateCard>}
          </> : null}
          {tab === 'policy' ? <RecommendationPolicyPanel /> : null}
        </Shared.PageStack></Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default RecommendationMetricsPage
