import { useCallback, useState } from 'react'
import { getCommunityReports } from '../../api/adminCommunityApi'
import { useCommunityListQuery } from '../../hooks/useCommunityListQuery'
import { useCommunityReportDetail } from '../../hooks/useCommunityReportDetail'
import { useCommunityReview } from '../../hooks/useCommunityReview'
import { canReviewCommunityReport, COMMUNITY_STATUS_LABELS, COMMUNITY_TARGET_LABELS, COMMUNITY_REASON_LABELS, communityDate } from '../../utils/community'
import type { CommunityDecision, CommunityReportStatus, CommunityTargetType } from '../../types/adminCommunity.types'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AppDialog } from '../../components/common/AppDialog'
import { FeedbackMessage } from '../../components/common/FeedbackMessage'
import { ListDetailWorkspace } from '../../components/common/ListDetailWorkspace'
import { ListPane } from '../../components/common/ListPane'
import { CommunityShell, CommunityContentView, CommunityPagination, QueryMessage } from './CommunityShared'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'
import * as S from './Community.styles'

export default function CommunityReportsPage() {
  const [status, setStatus] = useState<CommunityReportStatus | ''>('PENDING')
  const [targetType, setTargetType] = useState<CommunityTargetType | ''>('')
  const [reportId, setReportId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<{ reportId: number; targetId: number; targetType: CommunityTargetType; decision: CommunityDecision } | null>(null)
  const load = useCallback((page: number, signal: AbortSignal) => getCommunityReports({ page, status: status || undefined, targetType: targetType || undefined }, signal), [status, targetType])
  const query = useCommunityListQuery(JSON.stringify({ status, targetType }), load)
  const { page } = query
  const detail = useCommunityReportDetail(reportId)
  const action = useCommunityReview()
  const report = detail.data?.report
  const canReview = canReviewCommunityReport(detail.data) && !action.busy && !!report && !action.completed.includes(report.reportId)
  const resetSelection = () => { setReportId(null); setDialog(null); action.dismissError() }
  const openDialog = (decision: CommunityDecision) => {
    if (!canReview || !report) return
    action.dismissError()
    setDialog({ reportId: report.reportId, targetId: report.targetId, targetType: report.targetType, decision })
  }
  const submit = async () => {
    if (!dialog || !canReview || report?.targetId !== dialog.targetId || report.targetType !== dialog.targetType) return
    const done = await action.review(detail.data, dialog.reportId, dialog.decision, () => Promise.all([query.refresh(), detail.refresh()]))
    if (done) setDialog(null)
  }
  return <CommunityShell title="커뮤니티 신고 심사">
    <Shared.PageHeader><div><Shared.PageTitle>커뮤니티 신고 심사</Shared.PageTitle><Shared.PageDescription>신고 원문을 확인한 뒤 수락하거나 반려합니다. 수락하면 대상이 숨김 처리됩니다.</Shared.PageDescription></div></Shared.PageHeader>
    {action.success ? <FeedbackMessage tone="success">{action.success}</FeedbackMessage> : null}
    {action.warning ? <FeedbackMessage tone="warning">{action.warning}</FeedbackMessage> : null}
    {action.error && !dialog ? <FeedbackMessage tone="error" onDismiss={action.dismissError}>{action.error}</FeedbackMessage> : null}
    <S.Filters onSubmit={e => e.preventDefault()}>
      <Form.Field>처리 상태<AdminSelect aria-label="신고 처리 상태" value={status} disabled={action.busy || !!dialog} onChange={e => { setStatus(e.target.value as CommunityReportStatus | ''); resetSelection() }}><option value="">전체</option>{Object.entries(COMMUNITY_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</AdminSelect></Form.Field>
      <Form.Field>대상 유형<AdminSelect aria-label="신고 대상 유형" value={targetType} disabled={action.busy || !!dialog} onChange={e => { setTargetType(e.target.value as CommunityTargetType | ''); resetSelection() }}><option value="">전체</option>{Object.entries(COMMUNITY_TARGET_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</AdminSelect></Form.Field>
      <Shared.SecondaryButton type="button" disabled={query.loading || action.busy || !!dialog} onClick={() => { resetSelection(); void query.refresh() }}>목록 새로고침</Shared.SecondaryButton>
    </S.Filters>
    <ListDetailWorkspace>
      <ListPane title="신고 목록" count={query.data ? `${query.data.totalCount}건` : undefined} page={page} footer={<CommunityPagination data={query.data} page={page} label="신고 페이지네이션" disabled={action.busy || !!dialog} onChange={p => { void query.changePage(p); resetSelection() }} />}>
        <QueryMessage {...query} empty={query.data?.reports.length === 0} onRetry={query.refresh} />
        <Form.CardList>{query.data?.reports.map(item => <Form.RecordButton key={item.reportId} $selected={reportId === item.reportId} disabled={action.busy || !!dialog} onClick={() => { setReportId(item.reportId); action.dismissError() }}>
          <Form.RecordTitle>신고 #{item.reportId} · {COMMUNITY_TARGET_LABELS[item.targetType] || '알 수 없는 대상'} #{item.targetId}</Form.RecordTitle>
          <Form.RecordMeta>{COMMUNITY_STATUS_LABELS[item.status] || item.status} · {COMMUNITY_REASON_LABELS[item.reason] || item.reason}</Form.RecordMeta>
          <Form.RecordMeta>{communityDate(item.createdAt)} · {item.targetHidden ? '대상 숨김' : '대상 공개'}</Form.RecordMeta>
        </Form.RecordButton>)}</Form.CardList>
      </ListPane>
      <ListPane title="신고 상세 및 원문" footer={report ? <S.Actions>
        <Shared.SecondaryButton disabled={action.busy || detail.loading || !!dialog} onClick={() => void detail.refresh()}>상세 새로고침</Shared.SecondaryButton>
        <Shared.SecondaryButton disabled={!canReview} onClick={() => openDialog('decline')}>반려</Shared.SecondaryButton>
        <Shared.PrimaryButton disabled={!canReview} onClick={() => openDialog('accept')}>수락·숨김</Shared.PrimaryButton>
      </S.Actions> : null}>
        {reportId === null ? <S.Body>신고를 선택해주세요.</S.Body> : null}
        <QueryMessage {...detail} onRetry={detail.refresh} />
        {report ? <S.Body>
          <Form.RecordTitle>신고 #{report.reportId} · {COMMUNITY_STATUS_LABELS[report.status] || report.status}</Form.RecordTitle>
          <Form.DetailGrid>
            <Form.DetailItem><dt>신고자</dt><dd>#{report.reporterUserId}</dd></Form.DetailItem>
            <Form.DetailItem><dt>신고 사유</dt><dd>{COMMUNITY_REASON_LABELS[report.reason] || report.reason}</dd></Form.DetailItem>
            <Form.DetailItem><dt>접수 시각</dt><dd>{communityDate(report.createdAt)}</dd></Form.DetailItem>
            <Form.DetailItem><dt>처리 정보</dt><dd>{report.processedByAdminUserId ? `관리자 #${report.processedByAdminUserId}` : report.status === 'PENDING' ? '미처리' : '처리자 정보 없음'} · {communityDate(report.processedAt)}</dd></Form.DetailItem>
          </Form.DetailGrid>
          <S.Text>{report.description || '추가 설명 없음'}</S.Text>
          {detail.data?.unavailable ? <FeedbackMessage tone="warning">{detail.data.unavailable}</FeedbackMessage> : null}
          {detail.data?.target ? <section aria-label="신고 원문"><Form.SectionTitle>신고 원문 · {COMMUNITY_TARGET_LABELS[report.targetType]} #{report.targetId}</Form.SectionTitle><CommunityContentView content={detail.data.target} /></section> : null}
        </S.Body> : null}
      </ListPane>
    </ListDetailWorkspace>
    {dialog ? <AppDialog title={`신고 #${dialog.reportId} ${dialog.decision === 'accept' ? '수락' : '반려'}`} isDismissible={!action.busy} onClose={() => setDialog(null)} footer={<>
      <Shared.SecondaryButton disabled={action.busy} onClick={() => setDialog(null)}>취소</Shared.SecondaryButton>
      <Shared.PrimaryButton disabled={!canReview} onClick={() => void submit()}>{action.busy ? '처리 중…' : '처리 확정'}</Shared.PrimaryButton>
    </>}>
      <S.Text>대상: {COMMUNITY_TARGET_LABELS[dialog.targetType]} #{dialog.targetId}</S.Text>
      <FeedbackMessage tone="warning">{dialog.decision === 'accept' ? '수락하면 해당 글 또는 댓글이 숨김 처리됩니다. 삭제는 아니며, 이 화면에는 숨김 복원 기능이 없습니다.' : '반려하면 이 신고의 상태만 변경합니다. 대상 글·댓글의 노출 상태는 변경하지 않습니다.'}</FeedbackMessage>
      {action.error ? <FeedbackMessage tone="error">{action.error}</FeedbackMessage> : null}
      {!action.busy && !canReview ? <FeedbackMessage tone="info">대상의 현재 상태를 확인할 수 없거나 이미 처리됐습니다. 창을 닫고 상세를 확인해주세요.</FeedbackMessage> : null}
    </AppDialog> : null}
  </CommunityShell>
}
