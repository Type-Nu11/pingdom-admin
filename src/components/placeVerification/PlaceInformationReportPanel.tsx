import { FeedbackMessage } from '../common/FeedbackMessage'
import { useLayoutEffect, useRef, useState } from 'react'
import { AppDialog } from '../common/AppDialog'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { AdminSelect } from '../common/AdminStatusSelect'
import { AdminStatusFilter } from '../common/AdminStatusFilter'
import { AdminPagination } from '../common/AdminPagination'
import type { useAdminPlaceInformationReports } from '../../hooks/useAdminPlaceInformationReports'
import type {
  PlaceInformationDispute,
  PlaceInformationReportReviewRequest,
  PlaceInformationReportStatus,
} from '../../types/adminPlaceVerification.types'
import * as Shared from '../../pages/placeMerge/PlaceMergePage.styles'
import * as S from '../../pages/placeVerification/PlaceVerificationPage.styles'
import {
  DISPUTE_STATUS_LABELS,
  REASON_TYPE_LABELS,
  REPORT_STATUS_LABELS,
  TARGET_TYPE_LABELS,
  formatVerificationDate,
  getStatusTone,
} from './placeVerificationLabels'

type ReportHook = ReturnType<typeof useAdminPlaceInformationReports>

const STATUS_OPTIONS: Array<{ value: PlaceInformationReportStatus | ''; label: string }> = [
  { value: '', label: '전체 상태' },
  ...Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => ({
    value: value as PlaceInformationReportStatus,
    label,
  })),
]

type ReviewDialog =
  | { type: 'report'; reportId: number; version: number; owner: string }
  | { type: 'dispute'; dispute: PlaceInformationDispute; reportId: number; version: number; owner: string }
  | null

export function PlaceInformationReportPanel({ reportHook }: { reportHook: ReportHook }) {
  const {
    status,
    reports,
    reportDetail,
    selectedReportId,
    selectionVersion,
    owner,
    canReview,
    hasListResult,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    dismissActionError,
    actionSuccessMessage,
    actionNotice,
    retryRefresh,
    fetchReports,
    fetchReportDetail,
    clearReportDetail,
    reviewReport,
    reviewDispute,
  } = reportHook
  const [dialog, setDialog] = useState<ReviewDialog>(null)
  const visibleDialog = reportDetail && dialog?.reportId === selectedReportId && dialog?.version === selectionVersion
    && dialog?.owner === owner ? dialog : null
  const currentDialog = useRef(visibleDialog)
  useLayoutEffect(() => { currentDialog.current = visibleDialog }, [visibleDialog])
  const [reportStatus, setReportStatus] =
    useState<PlaceInformationReportReviewRequest['status']>('UNDER_REVIEW')
  const [reviewReason, setReviewReason] = useState('')
  const [formError, setFormError] = useState('')
  const guard = useUnsavedChanges(Boolean(visibleDialog) && (reviewReason !== '' || (visibleDialog?.type === 'report' && reportStatus !== (reportDetail?.status === 'SUBMITTED' ? 'UNDER_REVIEW' : 'RESOLVED'))), Boolean(visibleDialog) && activeAction !== null)
  const closeDialog = () => guard.request(() => setDialog(null))

  const handleStatusChange = (nextStatus: PlaceInformationReportStatus | '') => {
    setDialog(null)
    clearReportDetail()
    void fetchReports(nextStatus, 1)
  }

  const openReportReview = () => {
    if (!reportDetail || !canReview || activeAction) return
    setReportStatus(reportDetail?.status === 'SUBMITTED' ? 'UNDER_REVIEW' : 'RESOLVED')
    setReviewReason('')
    setFormError(''); dismissActionError()
    setDialog({ type: 'report', reportId: reportDetail.reportId, version: selectionVersion, owner })
  }

  const openDisputeReview = (dispute: PlaceInformationDispute) => {
    if (!reportDetail || !canReview || activeAction) return
    setReviewReason('')
    setFormError(''); dismissActionError()
    setDialog({ type: 'dispute', dispute, reportId: reportDetail.reportId, version: selectionVersion, owner })
  }

  const submitReview = async (disputeStatus?: 'ACCEPTED' | 'REJECTED') => {
    if (!reportDetail || !visibleDialog || !canReview || activeAction) return
    const submittedDialog = visibleDialog
    const reason = reviewReason.trim()
    if (!reason) {
      setFormError('판정 근거를 입력해주세요.')
      return
    }

    const result =
      submittedDialog.type === 'report'
        ? await reviewReport(submittedDialog.reportId, {
            status: reportStatus,
            reviewReason: reason,
          })
        : disputeStatus
          ? await reviewDispute(submittedDialog.reportId, submittedDialog.dispute.disputeId, {
              status: disputeStatus,
              reviewReason: reason,
            })
          : null
    if (result && currentDialog.current === submittedDialog) { guard.markClean(); setDialog(null) }
  }

  return (
    <>
      {actionErrorMessage ? <FeedbackMessage tone="error" onDismiss={dismissActionError}>{actionErrorMessage}</FeedbackMessage> : null}
      {actionSuccessMessage ? <Shared.Notice $variant="success" role="status">{actionSuccessMessage}</Shared.Notice> : null}
      {actionNotice ? <Shared.Notice $variant="error" role="alert">
        {actionNotice}
        <Shared.SecondaryButton type="button" disabled={isLoading || isDetailLoading || activeAction !== null} onClick={() => void retryRefresh()}>최신 정보 다시 조회</Shared.SecondaryButton>
      </Shared.Notice> : null}

      <AdminStatusFilter
        label="신고 상태"
        description="상태를 선택하면 첫 페이지부터 다시 조회합니다."
        aria-label="장소 정보 신고 상태"
        value={status}
        disabled={isLoading || activeAction !== null}
        onChange={(event) => handleStatusChange(event.target.value as PlaceInformationReportStatus | '')}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value || 'ALL'} value={option.value}>{option.label}</option>
        ))}
      </AdminStatusFilter>

      {errorMessage && !actionNotice ? <Shared.Notice $variant="error" role="alert">
        {errorMessage}{hasListResult ? ' 이전에 조회한 목록입니다.' : ''}
        <Shared.SecondaryButton type="button" disabled={isLoading || activeAction !== null} onClick={() => void fetchReports()}>목록 다시 조회</Shared.SecondaryButton>
      </Shared.Notice> : null}
      {isLoading && reports.length === 0 ? (
        <Shared.EmptyStateCard><strong>신고를 불러오는 중입니다.</strong></Shared.EmptyStateCard>
      ) : reports.length === 0 && !selectedReportId ? (
        errorMessage || !hasListResult ? null :
        <Shared.EmptyStateCard><strong>조건에 맞는 신고가 없습니다.</strong></Shared.EmptyStateCard>
      ) : (
      <Shared.Workspace>
        <Shared.Panel>
          <Shared.PanelHeader>
            <div>
              <Shared.PanelTitle>정보 신고</Shared.PanelTitle>
              <Shared.PanelDescription>신고를 선택해 근거와 반박을 검토합니다.</Shared.PanelDescription>
            </div>
            <Shared.PanelCount>{errorMessage ? '이전 조회 · ' : ''}{totalCount.toLocaleString()}건</Shared.PanelCount>
          </Shared.PanelHeader>
          <Shared.ScrollArea>
            <S.CardList>
              {reports.map((report) => (
                <S.RecordButton
                  key={report.reportId}
                  type="button"
                  $selected={selectedReportId === report.reportId}
                  disabled={activeAction !== null}
                  onClick={() => {
                    setDialog(null)
                    void fetchReportDetail(report.reportId)
                  }}
                >
                  <S.RecordHeader>
                    <S.RecordTitle>신고 #{report.reportId} · 장소 #{report.placeId}</S.RecordTitle>
                    <S.StatusBadge $tone={getStatusTone(report.status)}>{REPORT_STATUS_LABELS[report.status]}</S.StatusBadge>
                  </S.RecordHeader>
                  <S.RecordMeta>{TARGET_TYPE_LABELS[report.targetType]} · {REASON_TYPE_LABELS[report.reasonType]} · {formatVerificationDate(report.createdAt)}</S.RecordMeta>
                  <S.RecordDescription>{report.description}</S.RecordDescription>
                </S.RecordButton>
              ))}
            </S.CardList>
          </Shared.ScrollArea>
          {totalPages > 1 ? <AdminPagination ariaLabel="장소 정보 신고 목록 페이지네이션" page={page} totalPages={totalPages} hasNext={hasNext} disabled={isLoading || activeAction !== null} onPageChange={(nextPage) => void fetchReports(status, nextPage)} /> : null}
        </Shared.Panel>

        <Shared.Panel>
          <Shared.PanelHeader>
            <div>
              <Shared.PanelTitle>신고 상세 및 반박</Shared.PanelTitle>
              <Shared.PanelDescription>원문과 증빙을 확인한 뒤 판정합니다.</Shared.PanelDescription>
            </div>
          </Shared.PanelHeader>
          <Shared.CompareBody>
            {!selectedReportId ? (
              <Shared.EmptyState><strong>검토할 신고를 선택해주세요.</strong></Shared.EmptyState>
            ) : isDetailLoading ? (
              <Shared.EmptyState><strong>신고 상세를 불러오는 중입니다.</strong></Shared.EmptyState>
            ) : detailErrorMessage && !reportDetail ? (
              <Shared.EmptyState>
                <strong>{detailErrorMessage}</strong>
                {!actionNotice ? <Shared.SecondaryButton type="button" onClick={() => void fetchReportDetail(selectedReportId)}>다시 시도</Shared.SecondaryButton> : null}
              </Shared.EmptyState>
            ) : reportDetail ? (
              <>
                {detailErrorMessage && !actionNotice ? <Shared.Notice $variant="error" role="alert">{detailErrorMessage} 이전에 확인한 상세이며 재조회 전에는 검토할 수 없습니다.</Shared.Notice> : null}
                <S.RecordHeader>
                  <div>
                    <S.RecordTitle>신고 #{reportDetail.reportId}</S.RecordTitle>
                    <S.RecordMeta>신고자 #{reportDetail.reporterUserId} · {formatVerificationDate(reportDetail.createdAt)}</S.RecordMeta>
                  </div>
                  <S.StatusBadge $tone={getStatusTone(reportDetail.status)}>{REPORT_STATUS_LABELS[reportDetail.status]}</S.StatusBadge>
                </S.RecordHeader>
                <S.RecordDescription>{reportDetail.description}</S.RecordDescription>
                <S.DetailGrid>
                  <S.DetailItem><dt>장소 ID</dt><dd>{reportDetail.placeId}</dd></S.DetailItem>
                  <S.DetailItem><dt>대상 정보</dt><dd>{TARGET_TYPE_LABELS[reportDetail.targetType]}</dd></S.DetailItem>
                  <S.DetailItem><dt>신고 사유</dt><dd>{REASON_TYPE_LABELS[reportDetail.reasonType]}</dd></S.DetailItem>
                  <S.DetailItem><dt>연결 증빙</dt><dd>{reportDetail.evidenceId ? `증빙 #${reportDetail.evidenceId}` : '없음'}</dd></S.DetailItem>
                  <S.DetailItem><dt>검토 관리자</dt><dd>{reportDetail.reviewedByAdminUserId ? `ID ${reportDetail.reviewedByAdminUserId}` : '미배정'}</dd></S.DetailItem>
                  <S.DetailItem><dt>검토 사유</dt><dd>{reportDetail.reviewReason || '아직 입력되지 않음'}</dd></S.DetailItem>
                </S.DetailGrid>
                {reportDetail.evidenceUrl ? (
                  <S.InlineActions><S.Link href={reportDetail.evidenceUrl} target="_blank" rel="noreferrer">신고 증빙 열기</S.Link></S.InlineActions>
                ) : null}
                {!['RESOLVED', 'CANCELED'].includes(reportDetail.status) ? (
                  <S.InlineActions>
                    <Shared.PrimaryButton type="button" disabled={!canReview || activeAction !== null} onClick={openReportReview}>신고 검토</Shared.PrimaryButton>
                  </S.InlineActions>
                ) : null}

                <S.Section>
                  <S.SectionHeader>
                    <S.SectionTitle>반박 {reportDetail.disputes.length.toLocaleString()}건</S.SectionTitle>
                  </S.SectionHeader>
                  {reportDetail.disputes.length === 0 ? (
                    <Shared.EmptyState><strong>접수된 반박이 없습니다.</strong></Shared.EmptyState>
                  ) : (
                    <S.CardList>
                      {reportDetail.disputes.map((dispute) => (
                        <S.RecordCard key={dispute.disputeId}>
                          <S.RecordHeader>
                            <S.RecordTitle>반박 #{dispute.disputeId} · 사용자 #{dispute.disputedByUserId}</S.RecordTitle>
                            <S.StatusBadge $tone={getStatusTone(dispute.status)}>{DISPUTE_STATUS_LABELS[dispute.status]}</S.StatusBadge>
                          </S.RecordHeader>
                          <S.RecordDescription>{dispute.description}</S.RecordDescription>
                          <S.RecordMeta>{formatVerificationDate(dispute.createdAt)}{dispute.reviewReason ? ` · 검토: ${dispute.reviewReason}` : ''}</S.RecordMeta>
                          <S.InlineActions>
                            {dispute.evidenceUrl ? <S.Link href={dispute.evidenceUrl} target="_blank" rel="noreferrer">반박 증빙 열기</S.Link> : null}
                            {dispute.status === 'SUBMITTED' ? <Shared.SecondaryButton type="button" disabled={!canReview || activeAction !== null} onClick={() => openDisputeReview(dispute)}>반박 검토</Shared.SecondaryButton> : null}
                          </S.InlineActions>
                        </S.RecordCard>
                      ))}
                    </S.CardList>
                  )}
                </S.Section>
              </>
            ) : null}
          </Shared.CompareBody>
        </Shared.Panel>
      </Shared.Workspace>
      )}

      {visibleDialog && reportDetail ? (
        <AppDialog
          title={visibleDialog.type === 'report' ? '신고 검토' : `반박 #${visibleDialog.dispute.disputeId} 검토`}
          isDismissible={activeAction === null}
          onClose={closeDialog}
          footer={<>
            <Shared.SecondaryButton type="button" disabled={activeAction !== null} onClick={closeDialog}>취소</Shared.SecondaryButton>
            {visibleDialog.type === 'report' ? (
              <Shared.PrimaryButton type="button" disabled={!canReview || activeAction !== null} onClick={() => void submitReview()}>{activeAction ? '저장 중' : '검토 결과 저장'}</Shared.PrimaryButton>
            ) : (
              <>
                <Shared.SecondaryButton type="button" disabled={!canReview || activeAction !== null} onClick={() => void submitReview('REJECTED')}>반박 반려</Shared.SecondaryButton>
                <Shared.PrimaryButton type="button" disabled={!canReview || activeAction !== null} onClick={() => void submitReview('ACCEPTED')}>{activeAction ? '저장 중' : '반박 수용'}</Shared.PrimaryButton>
              </>
            )}
          </>}
        >
          <S.FormGrid>
            {visibleDialog.type === 'report' ? (
              <S.WideField>검토 상태
                <AdminSelect aria-label="신고 검토 결과" value={reportStatus} disabled={activeAction !== null} width="100%" onChange={(event) => setReportStatus(event.target.value as PlaceInformationReportReviewRequest['status'])}>
                  <option value="UNDER_REVIEW">검토 중</option>
                  <option value="ACCEPTED">신고 수용</option>
                  <option value="REJECTED">신고 반려</option>
                  <option value="RESOLVED">처리 완료</option>
                </AdminSelect>
              </S.WideField>
            ) : null}
            <S.WideField>판정 근거 *
              <S.TextArea value={reviewReason} maxLength={500} disabled={activeAction !== null} onChange={(event) => { setReviewReason(event.target.value); setFormError(''); dismissActionError() }} />
              <small>{reviewReason.length}/500</small>
            </S.WideField>
          </S.FormGrid>
          {formError || actionErrorMessage ? <FeedbackMessage tone="error" onDismiss={() => { setFormError(''); dismissActionError() }}>{formError || actionErrorMessage}</FeedbackMessage> : null}
        </AppDialog>
      ) : null}
    </>
  )
}
