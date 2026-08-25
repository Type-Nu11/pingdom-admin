import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminStatusFilter } from '../../components/common/AdminStatusFilter'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminReportAppeals } from '../../hooks/useAdminReportAppeals'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminReportAppealItem,
  AdminReportAppealStatus,
} from '../../types/adminReportAppeal.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as Form from '../placeVerification/PlaceVerificationPage.styles'

const STATUS_LABELS: Record<AdminReportAppealStatus, string> = {
  SUBMITTED: '검토 대기',
  APPROVED: '승인',
  REJECTED: '반려',
}

function formatDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date)
}

function ReportAppealPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [selectedAppeal, setSelectedAppeal] = useState<AdminReportAppealItem | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const {
    status,
    appeals,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    processingAppealId,
    errorMessage,
    actionErrorMessage,
    actionSuccessMessage,
    fetchAppeals,
    processAppeal,
  } = useAdminReportAppeals()
  const adminIdentifier = user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  const changeStatus = (nextStatus: AdminReportAppealStatus | '') => {
    setSelectedAppeal(null)
    void fetchAppeals(nextStatus, 1)
  }

  const openAction = (nextAction: 'approve' | 'reject') => {
    setAction(nextAction)
    setReason('')
    setFormError('')
  }

  const submitAction = async () => {
    if (!selectedAppeal || !action || processingAppealId !== null) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setFormError('처리 사유를 입력해주세요.')
      return
    }
    const result = await processAppeal(selectedAppeal.appealId, action, { reason: trimmedReason })
    if (result) {
      setAction(null)
      setSelectedAppeal(null)
    }
  }

  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader><Shell.BrandLockup><Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></Shell.BrandLockup></Shell.SideHeader>
        <Shell.SideMenu>
          <AdminNavigationMenu />
        </Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile aria-label="관리자 계정"><Shell.AdminProfileIcon><Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon></Shell.AdminProfileIcon><Shell.AdminProfileText><strong>{adminIdentifier}</strong><span>관리자</span></Shell.AdminProfileText></Shell.AdminProfile>
          <Shell.LogoutButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon><span>로그아웃</span></Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>

      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup><Shell.TopTitle>신고 이의제기 검토</Shell.TopTitle></Shell.TopTitleGroup>
          <Shell.TopActions><AdminNotificationButton /><Shell.IconButton type="button" aria-label="목록 새로고침" disabled={isLoading || processingAppealId !== null} onClick={() => void fetchAppeals(status, page)}><Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon></Shell.IconButton></Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div><Shared.Eyebrow>사용자 · 안전 &gt; 신고 이의제기</Shared.Eyebrow><Shared.PageTitle>신고 이의제기 검토</Shared.PageTitle><Shared.PageDescription>신고 처리에 대한 사용자 이의제기를 검토하고 승인 또는 반려합니다.</Shared.PageDescription></div>
              <Shared.HeaderActions><Shared.HeaderButton type="button" onClick={() => navigate('/reports/reported-users')}>신고 사용자 조회</Shared.HeaderButton><Shared.HeaderButton type="button" onClick={() => navigate('/bans')}>사용자 밴</Shared.HeaderButton></Shared.HeaderActions>
            </Shared.PageHeader>
            {actionErrorMessage ? <Shared.Notice $variant="error">{actionErrorMessage}</Shared.Notice> : null}
            {actionSuccessMessage ? <Shared.Notice $variant="success">{actionSuccessMessage}</Shared.Notice> : null}
            <AdminStatusFilter
              label="처리 상태"
              description="상태별 이의제기를 조회합니다."
              aria-label="이의제기 상태"
              value={status}
              disabled={isLoading || processingAppealId !== null}
              onChange={(event) => changeStatus(event.target.value as AdminReportAppealStatus | '')}
            >
              <option value="">전체 상태</option>
              <option value="SUBMITTED">검토 대기</option>
              <option value="APPROVED">승인</option>
              <option value="REJECTED">반려</option>
            </AdminStatusFilter>
            {errorMessage ? <Shared.Notice $variant="error">{errorMessage}</Shared.Notice> : null}
            <Shared.Workspace>
              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>{status ? STATUS_LABELS[status] : '전체'} 이의제기</Shared.PanelTitle><Shared.PanelDescription>항목을 선택하면 상세 사유를 확인합니다.</Shared.PanelDescription></div><Shared.PanelCount>{totalCount.toLocaleString()}건</Shared.PanelCount></Shared.PanelHeader>
                <Shared.ScrollArea>
                  {isLoading && appeals.length === 0 ? <Shared.EmptyState><strong>이의제기를 불러오는 중입니다.</strong></Shared.EmptyState> : appeals.length === 0 ? <Shared.EmptyState><Shell.MaterialIcon aria-hidden="true">task_alt</Shell.MaterialIcon><strong>조건에 맞는 이의제기가 없습니다.</strong></Shared.EmptyState> : (
                    <Form.CardList>{appeals.map((appeal) => (
                      <Form.RecordButton key={appeal.appealId} type="button" $selected={selectedAppeal?.appealId === appeal.appealId} onClick={() => setSelectedAppeal(appeal)}>
                        <Form.RecordHeader><Form.RecordTitle>이의제기 #{appeal.appealId}</Form.RecordTitle><Form.StatusBadge $tone={appeal.status === 'APPROVED' ? 'success' : appeal.status === 'REJECTED' ? 'danger' : 'warning'}>{STATUS_LABELS[appeal.status]}</Form.StatusBadge></Form.RecordHeader>
                        <Form.RecordMeta>{appeal.appellantUsername || `사용자 #${appeal.appellantUserId}`} · 신고 #{appeal.reportId} · {formatDate(appeal.createdAt)}</Form.RecordMeta>
                        <Form.RecordDescription>{appeal.reason}</Form.RecordDescription>
                      </Form.RecordButton>
                    ))}</Form.CardList>
                  )}
                </Shared.ScrollArea>
                {totalPages > 1 ? <Form.Pagination><Shared.SecondaryButton type="button" disabled={page <= 1 || isLoading} onClick={() => { setSelectedAppeal(null); void fetchAppeals(status, page - 1) }}>이전</Shared.SecondaryButton><span>{Math.max(page, 1)} / {Math.max(totalPages, 1)}</span><Shared.SecondaryButton type="button" disabled={!hasNext || isLoading} onClick={() => { setSelectedAppeal(null); void fetchAppeals(status, page + 1) }}>다음</Shared.SecondaryButton></Form.Pagination> : null}
              </Shared.Panel>
              <Shared.Panel>
                <Shared.PanelHeader><div><Shared.PanelTitle>이의제기 상세</Shared.PanelTitle><Shared.PanelDescription>원 신고와 처리 이력을 함께 확인합니다.</Shared.PanelDescription></div></Shared.PanelHeader>
                <Shared.CompareBody>
                  {!selectedAppeal ? <Shared.EmptyState><strong>검토할 이의제기를 선택해주세요.</strong></Shared.EmptyState> : (
                    <>
                      <Form.RecordHeader><div><Form.RecordTitle>이의제기 #{selectedAppeal.appealId}</Form.RecordTitle><Form.RecordMeta>접수 {formatDate(selectedAppeal.createdAt)}</Form.RecordMeta></div><Form.StatusBadge $tone={selectedAppeal.status === 'APPROVED' ? 'success' : selectedAppeal.status === 'REJECTED' ? 'danger' : 'warning'}>{STATUS_LABELS[selectedAppeal.status]}</Form.StatusBadge></Form.RecordHeader>
                      <Form.RecordDescription>{selectedAppeal.reason}</Form.RecordDescription>
                      <Form.DetailGrid>
                        <Form.DetailItem><dt>이의제기 사용자</dt><dd>{selectedAppeal.appellantUsername || '이름 없음'} (ID {selectedAppeal.appellantUserId})</dd></Form.DetailItem>
                        <Form.DetailItem><dt>제재 대상 사용자</dt><dd>ID {selectedAppeal.targetUserId}</dd></Form.DetailItem>
                        <Form.DetailItem><dt>원 신고</dt><dd>신고 #{selectedAppeal.reportId}</dd></Form.DetailItem>
                        <Form.DetailItem><dt>처리 관리자</dt><dd>{selectedAppeal.adminUserId ? `ID ${selectedAppeal.adminUserId}` : '미처리'}</dd></Form.DetailItem>
                        <Form.DetailItem><dt>처리 사유</dt><dd>{selectedAppeal.adminReason || '아직 입력되지 않음'}</dd></Form.DetailItem>
                      </Form.DetailGrid>
                      <Form.InlineActions>
                        {selectedAppeal.status === 'SUBMITTED' ? <><Shared.SecondaryButton type="button" disabled={processingAppealId !== null} onClick={() => openAction('reject')}>반려</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={processingAppealId !== null} onClick={() => openAction('approve')}>승인</Shared.PrimaryButton></> : null}
                      </Form.InlineActions>
                    </>
                  )}
                </Shared.CompareBody>
              </Shared.Panel>
            </Shared.Workspace>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>

      {action && selectedAppeal ? (
        <Shared.ModalOverlay role="presentation" onMouseDown={() => processingAppealId === null && setAction(null)}>
          <Shared.Modal role="dialog" aria-modal="true" aria-labelledby="appeal-action-title" onMouseDown={(event) => event.stopPropagation()}>
            <Shared.ModalHeader><Shared.ModalTitle id="appeal-action-title">이의제기 {action === 'approve' ? '승인' : '반려'}</Shared.ModalTitle><Shared.ModalCloseButton type="button" aria-label="닫기" disabled={processingAppealId !== null} onClick={() => setAction(null)}><Shell.MaterialIcon aria-hidden="true">close</Shell.MaterialIcon></Shared.ModalCloseButton></Shared.ModalHeader>
            <Shared.ModalBody>
              <Shared.ModalWarning>이의제기 #{selectedAppeal.appealId}의 처리 결과는 원 신고 및 관련 제재 상태에 영향을 줄 수 있습니다.</Shared.ModalWarning>
              <Form.Section><Form.Field>처리 사유 *<Form.TextArea value={reason} maxLength={500} disabled={processingAppealId !== null} onChange={(event) => { setReason(event.target.value); setFormError('') }} /><small>{reason.length}/500</small></Form.Field></Form.Section>
              {formError || actionErrorMessage ? <Shared.Notice $variant="error">{formError || actionErrorMessage}</Shared.Notice> : null}
            </Shared.ModalBody>
            <Shared.ModalFooter><Shared.SecondaryButton type="button" disabled={processingAppealId !== null} onClick={() => setAction(null)}>취소</Shared.SecondaryButton><Shared.PrimaryButton type="button" disabled={processingAppealId !== null} onClick={() => void submitAction()}>{processingAppealId !== null ? '처리 중' : action === 'approve' ? '승인 확정' : '반려 확정'}</Shared.PrimaryButton></Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  )
}

export default ReportAppealPage
