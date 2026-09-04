import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSelect } from '../../components/common/AdminStatusSelect'
import { AdminNotificationButton } from '../../components/adminNotification/AdminNotificationButton'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { AdminDateTimePicker } from '../../components/common/AdminDateTimePicker'
import { AdminPagination } from '../../components/common/AdminPagination'
import { ListPane } from '../../components/common/ListPane'
import { ListDetailWorkspace } from '../../components/common/ListDetailWorkspace'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAdminOperationHistories } from '../../hooks/useAdminOperationHistories'
import { useAuth } from '../../hooks/useAuth'
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

const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_BAN_APPLIED: '사용자 밴 처리',
  USER_BAN_RELEASED: '사용자 밴 해제',
  PLACE_CREATED: '장소 등록',
  PLACE_UPDATED: '장소 정보 수정',
  PLACE_DELETED: '장소 삭제',
  PLACE_MERGED: '장소 병합',
  PLACE_STATUS_CHANGED: '장소 상태 변경',
  MERCHANT_VERIFICATION_APPROVED: '상점주 검증 승인',
  MERCHANT_VERIFICATION_REJECTED: '상점주 검증 반려',
}

const AUDIT_TARGET_TYPE_LABELS: Record<string, string> = {
  USER: '사용자',
  PLACE: '장소',
  MERCHANT: '상점주',
  MERCHANT_OWNER: '상점주',
  REVIEW: '리뷰',
  EVENT: '이벤트',
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

function formatAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? '기타 관리자 작업'
}

function formatAuditTargetType(targetType: string) {
  return AUDIT_TARGET_TYPE_LABELS[targetType] ?? '기타 대상'
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
  const { fetchPrivacy, privacy } = hook
  const [tab, setTab] = useState<Tab>('audit')
  const [selectedAudit, setSelectedAudit] = useState<AdminAuditLogItem | null>(null)
  const [selectedPrivacy, setSelectedPrivacy] =
    useState<PrivacyProcessingHistoryItem | null>(null)
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
    if (tab === 'privacy' && !privacy) {
      void fetchPrivacy()
    }
  }, [fetchPrivacy, privacy, tab])

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
      action: auditAction.trim() || undefined,
      targetType: targetType.trim() || undefined,
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
  const activeError = hook.errors[tab]
  const refresh = () => {
    if (tab === 'audit') moveAudit(hook.audit?.page ?? 1)
    else movePrivacy(hook.privacy?.page ?? 1)
  }
  return (
    <Shell.AppShell>
      <Shell.SideNav aria-label="관리자 메뉴">
        <Shell.SideHeader>
          <Shell.BrandLockup>
            <Shell.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
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
                  관리자 작업과 개인정보 export·탈퇴·익명화·삭제 처리 결과를 추적합니다.
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

            <S.TabList role="tablist" aria-label="운영 이력 유형">
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

            {formError ? <Shared.Notice $variant="error">{formError}</Shared.Notice> : null}
            {activeError ? <Shared.Notice $variant="error">{activeError}</Shared.Notice> : null}

            {tab === 'audit' ? (
              <>
                <Shared.Panel>
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
                          placeholder="예: USER_BAN_APPLIED"
                          onChange={(event) => setAuditAction(event.target.value)}
                        />
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
                              placeholder="예: USER"
                              onChange={(event) => setTargetType(event.target.value)}
                            />
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
                </Shared.Panel>

                <ListDetailWorkspace constrained>
                  <ListPane
                    title="감사 로그"
                    description="항목을 선택해 전후 상태를 확인합니다."
                    count={`${(hook.audit?.totalCount ?? 0).toLocaleString()}건`}
                    page={hook.audit?.page}
                    ariaLabel="감사 로그 목록"
                    footer={(hook.audit?.totalPages ?? 0) > 1 ? <AdminPagination ariaLabel="감사 로그 페이지네이션" page={hook.audit?.page ?? 1} totalPages={hook.audit?.totalPages ?? 1} hasNext={hook.audit?.hasNext} disabled={isLoading} onPageChange={moveAudit} /> : null}
                  >
                      {isLoading && !hook.audit ? (
                        <Shared.EmptyState><strong>감사 로그를 불러오는 중입니다.</strong></Shared.EmptyState>
                      ) : !hook.audit?.auditLogs.length ? (
                        <Shared.EmptyState><strong>조건에 맞는 감사 로그가 없습니다.</strong></Shared.EmptyState>
                      ) : (
                        <History.AuditList>
                          {hook.audit.auditLogs.map((item) => (
                            <History.AuditRowButton
                              key={item.auditLogId}
                              type="button"
                              $selected={selectedAudit?.auditLogId === item.auditLogId}
                              onClick={() => setSelectedAudit(item)}
                            >
                              <History.AuditActionCell>
                                <History.AuditActionTitle>{formatAuditAction(item.action)}</History.AuditActionTitle>
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
                      )}
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
                              <History.AuditActionTitle>{formatAuditAction(selectedAudit.action)}</History.AuditActionTitle>
                              <History.AuditDetailMeta>감사 로그 #{selectedAudit.auditLogId} · {formatAuditDate(selectedAudit.createdAt)}</History.AuditDetailMeta>
                            </div>
                            <History.AuditTypeTag title={selectedAudit.targetType}>{formatAuditTargetType(selectedAudit.targetType)}</History.AuditTypeTag>
                          </History.AuditDetailHeader>
                          <S.DetailGrid>
                            <S.DetailItem><dt>작업 관리자</dt><dd>{selectedAudit.actorUsername} (#{selectedAudit.actorUserId})</dd></S.DetailItem>
                            <S.DetailItem><dt>대상</dt><dd>{formatAuditTargetType(selectedAudit.targetType)} #{selectedAudit.targetId}</dd></S.DetailItem>
                            <S.DetailItem><dt>요청 ID</dt><dd>{selectedAudit.requestId || '없음'}</dd></S.DetailItem>
                            <S.DetailItem><dt>작업 코드</dt><dd>{selectedAudit.action}</dd></S.DetailItem>
                          </S.DetailGrid>
                          <S.Section><S.SectionTitle>작업 사유</S.SectionTitle><S.RecordDescription>{selectedAudit.reason || '기록된 사유가 없습니다.'}</S.RecordDescription></S.Section>
                          <History.AuditStateDetails>
                            <summary>작업 전 상태 보기</summary>
                            <History.AuditStateContent>{selectedAudit.beforeState || '기록 없음'}</History.AuditStateContent>
                          </History.AuditStateDetails>
                          <History.AuditStateDetails>
                            <summary>작업 후 상태 보기</summary>
                            <History.AuditStateContent>{selectedAudit.afterState || '기록 없음'}</History.AuditStateContent>
                          </History.AuditStateDetails>
                        </>
                      )}
                    </Shared.CompareBody>
                  </Shared.Panel>
                </ListDetailWorkspace>
              </>
            ) : (
              <>
                <Shared.Panel>
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
                </Shared.Panel>

                <ListDetailWorkspace constrained>
                  <ListPane
                    title="개인정보 처리 이력"
                    description="항목을 선택해 요청과 처리 결과를 확인합니다."
                    count={`${(hook.privacy?.totalCount ?? 0).toLocaleString()}건`}
                    page={hook.privacy?.page}
                    ariaLabel="개인정보 처리 이력 목록"
                    footer={(hook.privacy?.totalPages ?? 0) > 1 ? <AdminPagination ariaLabel="개인정보 처리 이력 페이지네이션" page={hook.privacy?.page ?? 1} totalPages={hook.privacy?.totalPages ?? 1} hasNext={hook.privacy?.hasNext} disabled={isLoading} onPageChange={movePrivacy} /> : null}
                  >
                      {isLoading && !hook.privacy ? <Shared.EmptyState><strong>개인정보 처리 이력을 불러오는 중입니다.</strong></Shared.EmptyState> : !hook.privacy?.histories.length ? <Shared.EmptyState><strong>조건에 맞는 개인정보 처리 이력이 없습니다.</strong></Shared.EmptyState> : <S.CardList>{hook.privacy.histories.map((item) => <S.RecordButton key={item.id} type="button" $selected={selectedPrivacy?.id === item.id} onClick={() => setSelectedPrivacy(item)}><S.RecordHeader><S.RecordTitle>{PRIVACY_ACTION_LABELS[item.action]}</S.RecordTitle><S.StatusBadge>{item.actorType}</S.StatusBadge></S.RecordHeader><S.RecordMeta>대상 #{item.subjectUserId} · 수행자 #{item.actorUserId} · {formatDate(item.createdAt)}</S.RecordMeta><S.RecordDescription>{item.details || '처리 상세 없음'}</S.RecordDescription></S.RecordButton>)}</S.CardList>}
                  </ListPane>
                  <Shared.Panel>
                    <Shared.PanelHeader><Shared.PanelTitle>개인정보 처리 상세</Shared.PanelTitle></Shared.PanelHeader>
                    <Shared.CompareBody>
                      {!selectedPrivacy ? <Shared.EmptyState><strong>확인할 개인정보 처리 이력을 선택해주세요.</strong></Shared.EmptyState> : <><S.RecordHeader><div><S.RecordTitle>{PRIVACY_ACTION_LABELS[selectedPrivacy.action]}</S.RecordTitle><S.RecordMeta>처리 이력 #{selectedPrivacy.id}</S.RecordMeta></div><S.StatusBadge>{selectedPrivacy.actorType}</S.StatusBadge></S.RecordHeader><S.DetailGrid><S.DetailItem><dt>대상 사용자</dt><dd>#{selectedPrivacy.subjectUserId}</dd></S.DetailItem><S.DetailItem><dt>수행 사용자</dt><dd>#{selectedPrivacy.actorUserId}</dd></S.DetailItem><S.DetailItem><dt>요청 ID</dt><dd>{selectedPrivacy.requestId || '없음'}</dd></S.DetailItem><S.DetailItem><dt>처리 시각</dt><dd>{formatDate(selectedPrivacy.createdAt)}</dd></S.DetailItem></S.DetailGrid><S.Section><S.SectionTitle>처리 상세</S.SectionTitle><S.RecordDescription>{selectedPrivacy.details || '기록된 처리 상세가 없습니다.'}</S.RecordDescription></S.Section></>}
                    </Shared.CompareBody>
                  </Shared.Panel>
                </ListDetailWorkspace>
              </>
            )}
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
    </Shell.AppShell>
  )
}

export default OperationHistoryPage
