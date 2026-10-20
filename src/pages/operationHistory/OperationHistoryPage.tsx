import { AccessibleTabList } from '../../components/common/AccessibleTabList'
import { ListQueryBoundary } from '../../components/common/ListQueryBoundary'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminPagination } from '../../components/common/AdminPagination'
import { ListPane } from '../../components/common/ListPane'
import { formatListRange } from '../../utils/listRange'
import { ListDetailWorkspace } from '../../components/common/ListDetailWorkspace'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminOperationHistories } from '../../hooks/useAdminOperationHistories'
import { useAuth } from '../../hooks/useAuth'
import { AUDIT_ACTION_LABELS, AUDIT_TARGET_TYPE_LABELS, auditActionCode, auditTargetTypeCode, formatAuditAction, formatAuditTargetType, formatAuditReason, isAuditReadOnly, auditApplicationId } from '../../utils/adminAuditPresentation'
import type {
  AdminAuditLogItem,
  AdminAuditLogRequest,
  PrivacyProcessingAction,
  PrivacyProcessingHistoryItem,
  PrivacyProcessingHistoryRequest,
} from '../../types/adminOperationHistory.types'
import * as Shell from '../place/PlaceManagePage.styles'
import * as Shared from '../placeMerge/PlaceMergePage.styles'
import * as S from '../placeVerification/PlaceVerificationPage.styles'
import * as History from './OperationHistoryPage.styles'

type Tab = 'audit' | 'privacy'

const PAGE_LIMIT = 5

const PRIVACY_ACTION_LABELS: Record<PrivacyProcessingAction, string> = {
  EXPORT_REQUESTED: '내보내기 요청',
  WITHDRAWAL_REQUESTED: '탈퇴 요청',
  ANONYMIZED: '익명화',
  DELETED: '삭제',
}

const PRIVACY_ACTOR_LABELS: Record<PrivacyProcessingHistoryItem['actorType'], string> = {
  USER: '사용자', SYSTEM: '시스템 자동 처리', ADMIN: '관리자',
}

function formatDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function formatAuditDate(value?: string | null) {
  if (!value) return '정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}.${month}.${day} ${hour}:${minute}`
}

function parseUserId(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function validatePeriod(from: string, to: string) {
  return !from || !to || from <= to
}

function OperationHistoryPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const hook = useAdminOperationHistories()
  const { fetchPrivacy } = hook
  const [tab, setTab] = useState<Tab>('audit')
  const [auditSelection, setSelectedAudit] = useState<AdminAuditLogItem | null>(null)
  const [privacySelection, setSelectedPrivacy] =
    useState<PrivacyProcessingHistoryItem | null>(null)
  const selectedAudit = hook.auditState.hasResult && !hook.auditState.restricted
    ? auditSelection
    : null
  const selectedPrivacy = hook.privacyState.hasResult && !hook.privacyState.restricted
    ? privacySelection
    : null
  const [isAuditAdvancedFilterOpen, setIsAuditAdvancedFilterOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [auditActorId, setAuditActorId] = useState('')
  const [auditAction, setAuditAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [auditFrom, setAuditFrom] = useState('')
  const [auditTo, setAuditTo] = useState('')
  const [subjectUserId, setSubjectUserId] = useState('')
  const [privacyActorId, setPrivacyActorId] = useState('')
  const [privacyAction, setPrivacyAction] = useState<PrivacyProcessingAction | ''>('')
  const [privacyFrom, setPrivacyFrom] = useState('')
  const [privacyTo, setPrivacyTo] = useState('')
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  useEffect(() => {
    if (tab === 'privacy' && hook.privacyState.phase === 'idle') {
      void fetchPrivacy()
    }
  }, [fetchPrivacy, hook.privacyState.phase, tab])

  const auditRequest = (page: number): AdminAuditLogRequest | null => {
    const actorUserId = parseUserId(auditActorId)
    if (actorUserId === null) {
      setFormError('작업 관리자 ID는 1 이상의 정수로 입력해주세요.')
      return null
    }
    if (!validatePeriod(auditFrom, auditTo)) {
      setFormError('조회 종료 시각은 시작 시각 이후여야 합니다.')
      return null
    }
    return {
      actorUserId,
      action: auditActionCode(auditAction) || undefined,
      targetType: auditTargetTypeCode(targetType) || undefined,
      targetId: targetId.trim() || undefined,
      from: auditFrom || undefined,
      to: auditTo || undefined,
      page,
      limit: PAGE_LIMIT,
    }
  }

  const privacyRequest = (page: number): PrivacyProcessingHistoryRequest | null => {
    const subjectId = parseUserId(subjectUserId)
    const actorUserId = parseUserId(privacyActorId)
    if (subjectId === null || actorUserId === null) {
      setFormError('대상·수행 사용자 ID는 1 이상의 정수로 입력해주세요.')
      return null
    }
    if (!validatePeriod(privacyFrom, privacyTo)) {
      setFormError('조회 종료 시각은 시작 시각 이후여야 합니다.')
      return null
    }
    return {
      subjectUserId: subjectId,
      actorUserId,
      action: privacyAction || undefined,
      from: privacyFrom || undefined,
      to: privacyTo || undefined,
      page,
      limit: PAGE_LIMIT,
    }
  }

  const submitAudit = (event: FormEvent) => {
    event.preventDefault()
    const request = auditRequest(1)
    if (!request) return
    setFormError('')
    setSelectedAudit(null)
    void hook.fetchAudit(request)
  }

  const submitPrivacy = (event: FormEvent) => {
    event.preventDefault()
    const request = privacyRequest(1)
    if (!request) return
    setFormError('')
    setSelectedPrivacy(null)
    void hook.fetchPrivacy(request)
  }

  const moveAudit = (page: number) => {
    const request = auditRequest(page)
    if (!request) return
    setFormError('')
    setSelectedAudit(null)
    void hook.fetchAudit(request)
  }

  const movePrivacy = (page: number) => {
    const request = privacyRequest(page)
    if (!request) return
    setFormError('')
    setSelectedPrivacy(null)
    void hook.fetchPrivacy(request)
  }

  const resetAudit = () => {
    setAuditActorId('')
    setAuditAction('')
    setTargetType('')
    setTargetId('')
    setAuditFrom('')
    setAuditTo('')
    setFormError('')
    setSelectedAudit(null)
    void hook.fetchAudit()
  }

  const resetPrivacy = () => {
    setSubjectUserId('')
    setPrivacyActorId('')
    setPrivacyAction('')
    setPrivacyFrom('')
    setPrivacyTo('')
    setFormError('')
    setSelectedPrivacy(null)
    void hook.fetchPrivacy()
  }

  const isLoading = hook.loadingTabs[tab]
  const retryAudit = () => {
    setSelectedAudit(null)
    void hook.retryAudit()
  }
  const retryPrivacy = () => {
    setSelectedPrivacy(null)
    void hook.retryPrivacy()
  }
  const refresh = () => {
    if (tab === 'audit') retryAudit()
    else retryPrivacy()
  }
  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src={`${import.meta.env.BASE_URL}pingdom-logo.png`} alt="PingDom" />
          </Shell.BrandLockup>
        </Shell.SideHeader>
        <Shell.SideMenu>
          <AdminNavigationMenu />
        </Shell.SideMenu>
        <Shell.SideFooter>
          <Shell.AdminProfile>
            <Shell.AdminProfileIcon>
              <Shell.MaterialIcon aria-hidden="true">admin_panel_settings</Shell.MaterialIcon>
            </Shell.AdminProfileIcon>
            <Shell.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton
            type="button"
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
          >
            <Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon>
            <span>로그아웃</span>
          </Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>

      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup>
            <Shell.TopTitle>관리자 운영 이력</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
            <Shell.IconButton
              type="button"
              aria-label="운영 이력 새로고침"
              disabled={isLoading}
              onClick={refresh}
            >
              <Shell.MaterialIcon aria-hidden="true">refresh</Shell.MaterialIcon>
            </Shell.IconButton>
          </Shell.TopActions>
        </Shell.TopBar>

        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>대시보드 &gt; 운영 이력</Shared.Eyebrow>
                <Shared.PageTitle>감사 및 개인정보 처리 이력</Shared.PageTitle>
                <Shared.PageDescription>
                  관리자 작업과 개인정보 내보내기·탈퇴·익명화·삭제 처리 결과를 확인합니다.
                </Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.HeaderButton
                  type="button"
                  onClick={() => navigate('/operations/notifications')}
                >
                  알림 발송 이력
                </Shared.HeaderButton>
                <Shared.HeaderButton type="button" onClick={() => navigate('/dashboard')}>
                  대시보드
                </Shared.HeaderButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>

            <S.TabList as={AccessibleTabList} panelId="operation-history-panel" role="tablist" aria-label="운영 이력 유형">
              <S.TabButton
                type="button"
                role="tab"
                aria-selected={tab === 'audit'}
                $active={tab === 'audit'}
                onClick={() => {
                  setTab('audit')
                  setFormError('')
                }}
              >
                관리자 감사 로그
              </S.TabButton>
              <S.TabButton
                type="button"
                role="tab"
                aria-selected={tab === 'privacy'}
                $active={tab === 'privacy'}
                onClick={() => {
                  setTab('privacy')
                  setFormError('')
                }}
              >
                개인정보 처리 이력
              </S.TabButton>
            </S.TabList>
            <div id="operation-history-panel" role="tabpanel" aria-labelledby={`operation-history-panel-tab-${tab === 'audit' ? 0 : 1}`} tabIndex={0} style={{ display: 'flex', flexDirection: 'column', gap: 'inherit', minWidth: 0 }}>

            {formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}


            {tab === 'audit' ? (
              <>
                <History.FilterPanel>
                  <Shared.PanelHeader>
                    <div>
                      <Shared.PanelTitle>감사 로그 필터</Shared.PanelTitle>
                      <Shared.PanelDescription>
                        작업 관리자와 기간을 기준으로 빠르게 조회합니다.
                      </Shared.PanelDescription>
                    </div>
                  </Shared.PanelHeader>
                  <S.FormBody>
                    <S.FormGrid as="form" onSubmit={submitAudit}>
                      <S.Field>
                        작업 관리자 ID
                        <S.Input
                          inputMode="numeric"
                          value={auditActorId}
                          placeholder="전체"
                          onChange={(event) => setAuditActorId(event.target.value)}
                        />
                      </S.Field>
                      <S.Field>
                        작업 유형
                        <S.Input
                          value={auditAction}
                          list="community-audit-actions"
                          aria-label="감사 로그 작업 유형"
                          placeholder="전체 · 예: 사용자 밴 처리"
                          onChange={(event) => setAuditAction(event.target.value)}
                        />
                        <datalist id="community-audit-actions">
                          {Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => <option key={code} value={label} />)}
                        </datalist>
                      </S.Field>
                      <S.Field>
                        시작 시각
                        <AdminDateTimePicker
                          ariaLabel="감사 로그 조회 시작 시각"
                          value={auditFrom}
                          onChange={setAuditFrom}
                        />
                      </S.Field>
                      <S.Field>
                        종료 시각
                        <AdminDateTimePicker
                          ariaLabel="감사 로그 조회 종료 시각"
                          value={auditTo}
                          onChange={setAuditTo}
                        />
                      </S.Field>
                      <History.AuditFilterDisclosure>
                        <Shared.HeaderButton
                          type="button"
                          aria-expanded={isAuditAdvancedFilterOpen}
                          onClick={() => setIsAuditAdvancedFilterOpen((open) => !open)}
                        >
                          상세 필터 {isAuditAdvancedFilterOpen ? '접기' : '펼치기'}
                        </Shared.HeaderButton>
                      </History.AuditFilterDisclosure>
                      {isAuditAdvancedFilterOpen ? (
                        <History.AuditAdvancedFilters>
                          <S.Field>
                            대상 유형
                            <S.Input
                              value={targetType}
                              list="community-audit-targets"
                              aria-label="감사 로그 대상 유형"
                              placeholder="전체 · 예: 사용자"
                              onChange={(event) => setTargetType(event.target.value)}
                            />
                            <datalist id="community-audit-targets">{Object.entries(AUDIT_TARGET_TYPE_LABELS).map(([code, label]) => <option key={code} value={label} />)}</datalist>
                          </S.Field>
                          <S.Field>
                            대상 ID
                            <S.Input
                              value={targetId}
                              placeholder="전체"
                              onChange={(event) => setTargetId(event.target.value)}
                            />
                          </S.Field>
                        </History.AuditAdvancedFilters>
                      ) : null}
                      <History.AuditFilterActions>
                        <Shared.SecondaryButton type="button" onClick={resetAudit}>
                          초기화
                        </Shared.SecondaryButton>
                        <Shared.PrimaryButton type="submit" disabled={isLoading}>
                          조회
                        </Shared.PrimaryButton>
                      </History.AuditFilterActions>
                    </S.FormGrid>
                  </S.FormBody>
                </History.FilterPanel>

                <ListDetailWorkspace constrained>
                  <ListPane
                    title="감사 로그"
                    count={hook.auditState.hasResult && hook.audit ? `${formatListRange({ page: hook.audit.page, pageSize: PAGE_LIMIT, itemCount: hook.audit.auditLogs.length, total: hook.audit.totalCount })}${hook.auditState.phase === 'error' || isLoading ? ' (이전 결과)' : ''}` : undefined}
                    page={hook.auditState.hasResult ? hook.audit?.page : undefined}
                    ariaLabel="감사 로그 목록"
                    footer={hook.auditState.hasResult && (hook.audit?.totalPages ?? 0) > 1 ? <AdminPagination ariaLabel="감사 로그 페이지네이션" page={hook.audit?.page ?? 1} totalPages={hook.audit?.totalPages ?? 1} hasNext={hook.audit?.hasNext} disabled={isLoading} onPageChange={moveAudit} /> : null}
                  >
                    <ListQueryBoundary state={hook.auditState} error={hook.errors.audit} empty={!hook.audit?.auditLogs.length} onRetry={retryAudit} onReset={resetAudit}>
                        <History.AuditList>
                          {hook.audit?.auditLogs.map((item) => (
                            <History.AuditRowButton
                              key={item.auditLogId}
                              type="button"
                              $selected={selectedAudit?.auditLogId === item.auditLogId}
                              onClick={() => setSelectedAudit(item)}
                            >
                              <History.AuditActionCell>
                                <History.AuditActionTitle>{formatAuditAction(item.action, item.reason)}</History.AuditActionTitle>
                                <History.AuditTargetText>
                                  <History.AuditTypeTag title={item.targetType}>{formatAuditTargetType(item.targetType)}</History.AuditTypeTag>
                                  <span>#{item.targetId}</span>
                                </History.AuditTargetText>
                              </History.AuditActionCell>
                              <History.AuditActorCell>
                                <strong>{item.actorUsername || `관리자 #${item.actorUserId}`}</strong>
                                <span>관리자 #{item.actorUserId}</span>
                              </History.AuditActorCell>
                              <History.AuditTime>{formatAuditDate(item.createdAt)}</History.AuditTime>
                            </History.AuditRowButton>
                          ))}
                        </History.AuditList>
                    </ListQueryBoundary>
                  </ListPane>
                  <Shared.Panel>
                    <Shared.PanelHeader><Shared.PanelTitle>감사 로그 상세</Shared.PanelTitle></Shared.PanelHeader>
                    <Shared.CompareBody>
                      {!selectedAudit ? (
                        <Shared.EmptyState><strong>확인할 감사 로그를 선택해주세요.</strong></Shared.EmptyState>
                      ) : (
                        <>
                          <History.AuditDetailHeader>
                            <div>
                              <History.AuditActionTitle>{formatAuditAction(selectedAudit.action, selectedAudit.reason)}</History.AuditActionTitle>
                              <History.AuditDetailMeta>감사 로그 #{selectedAudit.auditLogId} · {formatAuditDate(selectedAudit.createdAt)}</History.AuditDetailMeta>
                            </div>
                            <History.AuditTypeTag title={selectedAudit.targetType}>{formatAuditTargetType(selectedAudit.targetType)}</History.AuditTypeTag>
                          </History.AuditDetailHeader>
                          <S.DetailGrid>
                            <S.DetailItem><dt>작업 관리자</dt><dd>{selectedAudit.actorUsername} (#{selectedAudit.actorUserId})</dd></S.DetailItem>
                            <S.DetailItem><dt>대상</dt><dd>{formatAuditTargetType(selectedAudit.targetType)} #{selectedAudit.targetId}</dd></S.DetailItem>
                            {auditApplicationId(selectedAudit) !== null ? <S.DetailItem><dt>관련 신청</dt><dd>장소 신청 #{auditApplicationId(selectedAudit)}</dd></S.DetailItem> : null}
                          </S.DetailGrid>
                          {isAuditReadOnly(selectedAudit.action) ? <History.AuditReadNotice role="note">조회·열람 기록입니다. 이 작업 자체는 대상 정보를 변경하지 않습니다.</History.AuditReadNotice> : null}
                          <S.Section><S.SectionTitle>{isAuditReadOnly(selectedAudit.action) ? '조회 내용' : '작업 사유'}</S.SectionTitle><S.RecordDescription>{formatAuditReason(selectedAudit)}</S.RecordDescription></S.Section>
                          {!isAuditReadOnly(selectedAudit.action) ? <History.AuditStateDetails>
                            <summary>작업 전 상태 보기</summary>
                            <History.AuditStateContent>{selectedAudit.beforeState || '기록 없음'}</History.AuditStateContent>
                          </History.AuditStateDetails> : null}
                          {!isAuditReadOnly(selectedAudit.action) ? <History.AuditStateDetails>
                            <summary>작업 후 상태 보기</summary>
                            <History.AuditStateContent>{selectedAudit.afterState || '기록 없음'}</History.AuditStateContent>
                          </History.AuditStateDetails> : null}
                          <History.AuditStateDetails>
                            <summary>기술 정보 보기</summary>
                            <p>문제 확인에 필요한 원본 기록입니다. 요청 번호는 담당 개발자에게 전달할 때 사용합니다.</p>
                            <S.DetailGrid>
                              <S.DetailItem><dt>요청 번호</dt><dd>{selectedAudit.requestId || '없음'}</dd></S.DetailItem>
                              <S.DetailItem><dt>작업 코드</dt><dd>{selectedAudit.action}</dd></S.DetailItem>
                              <S.DetailItem><dt>대상 코드</dt><dd>{selectedAudit.targetType}</dd></S.DetailItem>
                            </S.DetailGrid>
                            <p>기록된 사유</p><History.AuditStateContent>{selectedAudit.reason || '기록 없음'}</History.AuditStateContent>
                            {isAuditReadOnly(selectedAudit.action) ? <><p>기록된 이전 값</p><History.AuditStateContent>{selectedAudit.beforeState || '기록 없음'}</History.AuditStateContent><p>기록된 이후 값</p><History.AuditStateContent>{selectedAudit.afterState || '기록 없음'}</History.AuditStateContent></> : null}
                          </History.AuditStateDetails>
                        </>
                      )}
                    </Shared.CompareBody>
                  </Shared.Panel>
                </ListDetailWorkspace>
              </>
            ) : (
              <>
                <History.FilterPanel>
                  <Shared.PanelHeader>
                    <div>
                      <Shared.PanelTitle>개인정보 처리 필터</Shared.PanelTitle>
                      <Shared.PanelDescription>대상·수행 사용자, 처리 유형, 기간을 조합해 조회합니다.</Shared.PanelDescription>
                    </div>
                  </Shared.PanelHeader>
                  <S.FormBody>
                    <S.FormGrid as="form" onSubmit={submitPrivacy}>
                      <S.Field>대상 사용자 ID<S.Input inputMode="numeric" value={subjectUserId} placeholder="전체" onChange={(event) => setSubjectUserId(event.target.value)} /></S.Field>
                      <S.Field>수행 사용자 ID<S.Input inputMode="numeric" value={privacyActorId} placeholder="전체" onChange={(event) => setPrivacyActorId(event.target.value)} /></S.Field>
                      <S.Field>처리 유형<AdminSelect aria-label="개인정보 처리 유형" value={privacyAction} width="100%" onChange={(event) => setPrivacyAction(event.target.value as PrivacyProcessingAction | '')}><option value="">전체</option>{Object.entries(PRIVACY_ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AdminSelect></S.Field>
                      <S.Field>시작 시각<AdminDateTimePicker ariaLabel="개인정보 처리 조회 시작 시각" value={privacyFrom} onChange={setPrivacyFrom} /></S.Field>
                      <S.Field>종료 시각<AdminDateTimePicker ariaLabel="개인정보 처리 조회 종료 시각" value={privacyTo} onChange={setPrivacyTo} /></S.Field>
                      <S.InlineActions><Shared.SecondaryButton type="button" onClick={resetPrivacy}>초기화</Shared.SecondaryButton><Shared.PrimaryButton type="submit" disabled={isLoading}>조회</Shared.PrimaryButton></S.InlineActions>
                    </S.FormGrid>
                  </S.FormBody>
                </History.FilterPanel>

                <ListDetailWorkspace constrained>
                  <ListPane
                    title="개인정보 처리 이력"
                    count={hook.privacyState.hasResult && hook.privacy ? `${formatListRange({ page: hook.privacy.page, pageSize: PAGE_LIMIT, itemCount: hook.privacy.histories.length, total: hook.privacy.totalCount })}${hook.privacyState.phase === 'error' || isLoading ? ' (이전 결과)' : ''}` : undefined}
                    page={hook.privacyState.hasResult ? hook.privacy?.page : undefined}
                    ariaLabel="개인정보 처리 이력 목록"
                    footer={hook.privacyState.hasResult && (hook.privacy?.totalPages ?? 0) > 1 ? <AdminPagination ariaLabel="개인정보 처리 이력 페이지네이션" page={hook.privacy?.page ?? 1} totalPages={hook.privacy?.totalPages ?? 1} hasNext={hook.privacy?.hasNext} disabled={isLoading} onPageChange={movePrivacy} /> : null}
                  >
                    <ListQueryBoundary state={hook.privacyState} error={hook.errors.privacy} empty={!hook.privacy?.histories.length} onRetry={retryPrivacy} onReset={resetPrivacy}>
<S.CardList>{hook.privacy?.histories.map((item) => <S.RecordButton key={item.id} type="button" $selected={selectedPrivacy?.id === item.id} onClick={() => setSelectedPrivacy(item)}><S.RecordHeader><S.RecordTitle>{PRIVACY_ACTION_LABELS[item.action]}</S.RecordTitle><S.StatusBadge>{PRIVACY_ACTOR_LABELS[item.actorType] || item.actorType}</S.StatusBadge></S.RecordHeader><S.RecordMeta>대상 #{item.subjectUserId} · 수행자 #{item.actorUserId} · {formatDate(item.createdAt)}</S.RecordMeta><S.RecordDescription>{item.details || '처리 상세 없음'}</S.RecordDescription></S.RecordButton>)}</S.CardList>
                    </ListQueryBoundary>
                  </ListPane>
                  <Shared.Panel>
                    <Shared.PanelHeader><Shared.PanelTitle>개인정보 처리 상세</Shared.PanelTitle></Shared.PanelHeader>
                    <Shared.CompareBody>
                      {!selectedPrivacy ? <Shared.EmptyState><strong>확인할 개인정보 처리 이력을 선택해주세요.</strong></Shared.EmptyState> : <><S.RecordHeader><div><S.RecordTitle>{PRIVACY_ACTION_LABELS[selectedPrivacy.action]}</S.RecordTitle><S.RecordMeta>처리 이력 #{selectedPrivacy.id}</S.RecordMeta></div><S.StatusBadge>{PRIVACY_ACTOR_LABELS[selectedPrivacy.actorType] || selectedPrivacy.actorType}</S.StatusBadge></S.RecordHeader><S.DetailGrid><S.DetailItem><dt>대상 사용자</dt><dd>#{selectedPrivacy.subjectUserId}</dd></S.DetailItem><S.DetailItem><dt>수행 사용자</dt><dd>#{selectedPrivacy.actorUserId}</dd></S.DetailItem><S.DetailItem><dt>요청 ID</dt><dd>{selectedPrivacy.requestId || '없음'}</dd></S.DetailItem><S.DetailItem><dt>처리 시각</dt><dd>{formatDate(selectedPrivacy.createdAt)}</dd></S.DetailItem></S.DetailGrid><S.Section><S.SectionTitle>처리 상세</S.SectionTitle><S.RecordDescription>{selectedPrivacy.details || '기록된 처리 상세가 없습니다.'}</S.RecordDescription></S.Section></>}
                    </Shared.CompareBody>
                  </Shared.Panel>
                </ListDetailWorkspace>
              </>
            )}
          </div>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default OperationHistoryPage
