import { ListQueryBoundary } from '../../components/common/ListQueryBoundary'
import { FeedbackMessage } from '../../components/common/FeedbackMessage'
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminNotificationButton } from "../../components/adminNotification/AdminNotificationButton";
import { AdminPagination } from "../../components/common/AdminPagination";
import { AdminNavigationMenu } from "../../components/navigation/AdminNavigationMenu";
import { AdminDateTimePicker } from "../../components/common/AdminDateTimePicker";
import { AdminStatusFilter } from "../../components/common/AdminStatusFilter";
import { ADMIN_MAIN_SCROLL_AREA_ID } from "../../constants/layout";
import { useAdminScouts } from "../../hooks/useAdminScouts";
import { useAuth } from "../../hooks/useAuth";
import type {
  ScoutFieldReport,
  ScoutFieldReportStatus,
  ScoutProfileStatus,
} from "../../types/adminScout.types";
import * as Shell from "../place/PlaceManagePage.styles";
import * as Shared from "../placeMerge/PlaceMergePage.styles";
import * as S from "../placeVerification/PlaceVerificationPage.styles";

type Tab = "profiles" | "reports";
type DialogRequest =
  | { type: "profile"; action: "approve" | "suspend" | "revoke" }
  | { type: "eligibility"; action: "grant" | "suspend" | "revoke" }
  | {
      type: "report";
      report: ScoutFieldReport;
      decision: "ACCEPTED" | "REJECTED";
    }
  | null;
type Dialog =
  | (Exclude<DialogRequest, { type: "report" } | null> & {
      target: { userId: number; displayName: string };
    })
  | Extract<DialogRequest, { type: "report" }>
  | null;
const PROFILE: Record<ScoutProfileStatus, string> = {
  PENDING: "승인 대기",
  ACTIVE: "활성",
  SUSPENDED: "정지",
  REVOKED: "회수",
};
const REPORT: Record<ScoutFieldReportStatus, string> = {
  SUBMITTED: "심사 대기",
  ACCEPTED: "승인",
  REJECTED: "반려",
};
const ELIGIBILITY: Record<string, string> = {
  PENDING: "대기",
  ELIGIBLE: "활동 가능",
  SUSPENDED: "정지",
  EXPIRED: "만료",
  REVOKED: "회수",
};
function date(value?: string | null) {
  if (!value) return "정보 없음";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}

function ScoutPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, user } = useAuth();
  const hook = useAdminScouts();
  const tab: Tab =
    searchParams.get("tab") === "reports" ? "reports" : "profiles";
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
  const [reportSelection, setSelectedReport] = useState<ScoutFieldReport | null>(
    null,
  );
  const selectedReport = hook.reportListState.hasResult && !hook.reportListState.restricted
    ? hook.reports.find((item) => item.id === reportSelection?.id) ?? null
    : null;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [eligibleFrom, setEligibleFrom] = useState("");
  const [eligibleUntil, setEligibleUntil] = useState("");
  const [formError, setFormError] = useState("");
  const adminIdentifier =
    user?.username ||
    (typeof user?.id === "number" ? `ID ${user.id}` : "관리자 계정");
  const open = (next: DialogRequest) => {
    if (!next || hook.activeAction) return;
    if (next.type !== "report" &&
      (hook.isDetailLoading || !hook.profile || hook.profile.userId !== hook.selectedUserId)) return;
    setReason("");
    setEligibleFrom("");
    setEligibleUntil("");
    setFormError("");
    hook.dismissActionError();
    setDialog(next.type === "report" ? next : {
      ...next,
      target: { userId: hook.profile!.userId, displayName: hook.profile!.displayName },
    });
  };
  const submit = async () => {
    if (!dialog || hook.activeAction) return;
    if (!reason.trim()) {
      setFormError("처리 사유를 입력해주세요.");
      return;
    }
    if (dialog.type === "report") {
      if (
        await hook.reviewReport(
          dialog.report.id,
          dialog.decision,
          reason.trim(),
        )
      ) {
        setDialog(null);
        setSelectedReport(null);
      }
      return;
    }
    if (dialog.type === "profile") {
      if (
        await hook.reviewProfile(
          dialog.target.userId,
          dialog.action,
          reason.trim(),
        )
      )
        setDialog(null);
      return;
    }
    if (dialog.action === "grant") {
      if (!eligibleFrom) {
        setFormError("활동 시작 시각을 선택해주세요.");
        return;
      }
      if (eligibleUntil && new Date(eligibleUntil) <= new Date(eligibleFrom)) {
        setFormError("종료 시각은 시작 시각보다 이후여야 합니다.");
        return;
      }
      if (
        await hook.grantEligibility(dialog.target.userId, {
          eligibleFrom,
          eligibleUntil: eligibleUntil || undefined,
          reason: reason.trim(),
        })
      )
        setDialog(null);
      return;
    }
    if (
      await hook.reviewEligibility(
        dialog.target.userId,
        dialog.action,
        reason.trim(),
      )
    )
      setDialog(null);
  };
  const shell = (
    <>
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
              <Shell.MaterialIcon aria-hidden="true">
                admin_panel_settings
              </Shell.MaterialIcon>
            </Shell.AdminProfileIcon>
            <Shell.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </Shell.AdminProfileText>
          </Shell.AdminProfile>
          <Shell.LogoutButton
            type="button"
            onClick={() => {
              void logout();
              navigate("/login", { replace: true });
            }}
          >
            <Shell.MaterialIcon aria-hidden="true">logout</Shell.MaterialIcon>
            <span>로그아웃</span>
          </Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
    </>
  );
  return (
    <Shell.AppShell>
      {shell}
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup>
            <Shell.TopTitle>탐색 후보 운영</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>성장 운영 &gt; 탐색 후보 운영</Shared.Eyebrow>
                <Shared.PageTitle>
                  탐색 후보 프로필 및 현장 제보
                </Shared.PageTitle>
                <Shared.PageDescription>
                  탐색 후보의 프로필·활동 자격과 현장 제보 심사를 분리해
                  관리합니다.
                </Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.HeaderButton
                  type="button"
                  onClick={() => navigate("/verified-boost-products")}
                >
                  인증 부스트
                </Shared.HeaderButton>
                <Shared.HeaderButton
                  type="button"
                  onClick={() => navigate("/visitor-verifications")}
                >
                  방문자 제보·정정 심사
                </Shared.HeaderButton>
                <Shared.HeaderButton
                  type="button"
                  onClick={() => navigate("/trust-score")}
                >
                  신뢰 점수
                </Shared.HeaderButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>
            <S.TabList>
              <S.TabButton
                type="button"
                $active={tab === "profiles"}
                onClick={() => setTab("profiles")}
              >
                <Shell.MaterialIcon aria-hidden="true">
                  badge
                </Shell.MaterialIcon>
                탐색 후보 프로필
              </S.TabButton>
              <S.TabButton
                type="button"
                $active={tab === "reports"}
                onClick={() => setTab("reports")}
              >
                <Shell.MaterialIcon aria-hidden="true">
                  travel_explore
                </Shell.MaterialIcon>
                현장 제보
              </S.TabButton>
            </S.TabList>
            {hook.actionErrorMessage ? (
              <FeedbackMessage tone="error" onDismiss={hook.dismissActionError}>{hook.actionErrorMessage}</FeedbackMessage>
            ) : null}
            {hook.successMessage ? (
              <Shared.Notice $variant="success" role="status">
                {hook.successMessage}
              </Shared.Notice>
            ) : null}
            {tab === 'profiles' && hook.errorMessage ? (
              <Shared.Notice $variant="error" role="alert">
                {hook.errorMessage}
              </Shared.Notice>
            ) : null}
            {tab === "profiles" ? (
              <>
                <AdminStatusFilter
                  label="프로필 상태"
                  value={hook.profileStatus}
                  onChange={(event) => {
                    hook.clearProfile();
                    void hook.fetchProfiles(
                      event.target.value as ScoutProfileStatus | "",
                      1,
                    );
                  }}
                >
                  <option value="">전체</option>
                  {Object.entries(PROFILE).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </AdminStatusFilter>
                <Shared.Workspace>
                  <Shared.Panel>
                    <Shared.PanelHeader>
                      <div>
                        <Shared.PanelTitle>탐색 후보 프로필</Shared.PanelTitle>
                      </div>
                      <Shared.PanelCount>
                        {hook.profileListState.hasResult ? `${hook.profileTotal.toLocaleString()}건${hook.profileListState.phase !== 'success' ? ' (이전 결과)' : ''}` : '—'}
                      </Shared.PanelCount>
                    </Shared.PanelHeader>
                    <Shared.ScrollArea>
                      <ListQueryBoundary
                        state={hook.profileListState}
                        error={hook.profileError}
                        empty={hook.profiles.length === 0}
                        onRetry={() => void hook.fetchProfiles()}
                        onReset={() => void hook.fetchProfiles('', 1)}
                      >
                        <S.CardList>
                          {hook.profiles.map((item) => (
                            <S.RecordButton
                              key={item.userId}
                              type="button"
                              $selected={hook.selectedUserId === item.userId}
                              onClick={() => {
                                void hook.fetchProfile(item.userId);
                              }}
                            >
                              <S.RecordHeader>
                                <S.RecordTitle>
                                  {item.displayName}
                                </S.RecordTitle>
                                <S.StatusBadge
                                  $tone={
                                    item.profileStatus === "ACTIVE"
                                      ? "success"
                                      : item.profileStatus === "PENDING"
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {PROFILE[item.profileStatus]}
                                </S.StatusBadge>
                              </S.RecordHeader>
                              <S.RecordMeta>
                                사용자 #{item.userId} · 자격{" "}
                                {ELIGIBILITY[item.activityEligibilityStatus]}
                              </S.RecordMeta>
                              <S.RecordDescription>
                                {item.introduction || "소개 없음"}
                              </S.RecordDescription>
                            </S.RecordButton>
                          ))}
                        </S.CardList>
                      </ListQueryBoundary>
                    </Shared.ScrollArea>
                    {hook.profileListState.hasResult && hook.profileTotalPages > 1 ? <AdminPagination ariaLabel="탐색 후보 프로필 목록 페이지네이션" page={hook.profilePage} totalPages={hook.profileTotalPages} hasNext={hook.profileHasNext} disabled={hook.profileListState.phase === 'loading'} onPageChange={(nextPage) => { hook.clearProfile(); void hook.fetchProfiles(hook.profileStatus, nextPage) }} /> : null}
                  </Shared.Panel>
                  <Shared.Panel>
                    <Shared.PanelHeader>
                      <div>
                        <Shared.PanelTitle>
                          프로필 및 활동 자격
                        </Shared.PanelTitle>
                      </div>
                    </Shared.PanelHeader>
                    <Shared.CompareBody>
                      {hook.isDetailLoading ? (
                        <Shared.EmptyState>
                          <strong>상세 조회 중입니다.</strong>
                        </Shared.EmptyState>
                      ) : !hook.profile || hook.profile.userId !== hook.selectedUserId ? (
                        <Shared.EmptyState>
                          <strong>탐색 후보를 선택해주세요.</strong>
                        </Shared.EmptyState>
                      ) : (
                        <>
                          <S.RecordHeader>
                            <div>
                              <S.RecordTitle>
                                {hook.profile.displayName}
                              </S.RecordTitle>
                              <S.RecordMeta>
                                사용자 #{hook.profile.userId}
                              </S.RecordMeta>
                            </div>
                            <S.StatusBadge
                              $tone={
                                hook.profile.profileStatus === "ACTIVE"
                                  ? "success"
                                  : hook.profile.profileStatus === "PENDING"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {PROFILE[hook.profile.profileStatus]}
                            </S.StatusBadge>
                          </S.RecordHeader>
                          <S.RecordDescription>
                            {hook.profile.introduction || "소개 없음"}
                          </S.RecordDescription>
                          <S.DetailGrid>
                            <S.DetailItem>
                              <dt>활동 자격</dt>
                              <dd>
                                {
                                  ELIGIBILITY[
                                    hook.profile.activityEligibilityStatus
                                  ]
                                }
                              </dd>
                            </S.DetailItem>
                            <S.DetailItem>
                              <dt>활동 기간</dt>
                              <dd>
                                {date(hook.profile.eligibleFrom)} ~{" "}
                                {date(hook.profile.eligibleUntil)}
                              </dd>
                            </S.DetailItem>
                            <S.DetailItem>
                              <dt>프로필 사유</dt>
                              <dd>
                                {hook.profile.profileStatusReason || "없음"}
                              </dd>
                            </S.DetailItem>
                            <S.DetailItem>
                              <dt>자격 사유</dt>
                              <dd>
                                {hook.profile.eligibilityStatusReason || "없음"}
                              </dd>
                            </S.DetailItem>
                          </S.DetailGrid>
                          <S.InlineActions>
                            {hook.profile.profileStatus === "PENDING" ? (
                              <Shared.PrimaryButton
                                type="button"
                                onClick={() =>
                                  open({ type: "profile", action: "approve" })
                                }
                              >
                                프로필 승인
                              </Shared.PrimaryButton>
                            ) : null}
                            {hook.profile.profileStatus === "ACTIVE" ? (
                              <>
                                <Shared.SecondaryButton
                                  type="button"
                                  onClick={() =>
                                    open({ type: "profile", action: "suspend" })
                                  }
                                >
                                  프로필 정지
                                </Shared.SecondaryButton>
                                <Shared.SecondaryButton
                                  type="button"
                                  onClick={() =>
                                    open({ type: "profile", action: "revoke" })
                                  }
                                >
                                  프로필 회수
                                </Shared.SecondaryButton>
                              </>
                            ) : null}
                            {hook.profile.activityEligibilityStatus !==
                            "ELIGIBLE" ? (
                              <Shared.PrimaryButton
                                type="button"
                                onClick={() =>
                                  open({ type: "eligibility", action: "grant" })
                                }
                              >
                                활동 자격 부여
                              </Shared.PrimaryButton>
                            ) : (
                              <>
                                <Shared.SecondaryButton
                                  type="button"
                                  onClick={() =>
                                    open({
                                      type: "eligibility",
                                      action: "suspend",
                                    })
                                  }
                                >
                                  자격 정지
                                </Shared.SecondaryButton>
                                <Shared.SecondaryButton
                                  type="button"
                                  onClick={() =>
                                    open({
                                      type: "eligibility",
                                      action: "revoke",
                                    })
                                  }
                                >
                                  자격 회수
                                </Shared.SecondaryButton>
                              </>
                            )}
                          </S.InlineActions>
                        </>
                      )}
                    </Shared.CompareBody>
                  </Shared.Panel>
                </Shared.Workspace>
              </>
            ) : null}
            {tab === "reports" ? (
              <>
                <AdminStatusFilter
                  label="제보 상태"
                  value={hook.reportStatus}
                  onChange={(event) => {
                    setSelectedReport(null);
                    void hook.fetchReports(
                      event.target.value as ScoutFieldReportStatus | "",
                      1,
                    );
                  }}
                >
                  <option value="">전체</option>
                  {Object.entries(REPORT).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </AdminStatusFilter>
                <Shared.Workspace>
                  <Shared.Panel>
                    <Shared.PanelHeader>
                      <div>
                        <Shared.PanelTitle>현장 제보</Shared.PanelTitle>
                      </div>
                      <Shared.PanelCount>
                        {hook.reportListState.hasResult ? `${hook.reportTotal.toLocaleString()}건${hook.reportListState.phase !== 'success' ? ' (이전 결과)' : ''}` : '—'}
                      </Shared.PanelCount>
                    </Shared.PanelHeader>
                    <Shared.ScrollArea>
                      <ListQueryBoundary
                        state={hook.reportListState}
                        error={hook.reportError}
                        empty={hook.reports.length === 0}
                        onRetry={() => void hook.fetchReports()}
                        onReset={() => void hook.fetchReports('', 1)}
                      >
                        <S.CardList>
                          {hook.reports.map((item) => (
                            <S.RecordButton
                              key={item.id}
                              type="button"
                              $selected={selectedReport?.id === item.id}
                              onClick={() => setSelectedReport(item)}
                            >
                              <S.RecordHeader>
                                <S.RecordTitle>
                                  제보 #{item.id} · 장소 #{item.placeId}
                                </S.RecordTitle>
                                <S.StatusBadge
                                  $tone={
                                    item.status === "ACCEPTED"
                                      ? "success"
                                      : item.status === "REJECTED"
                                        ? "danger"
                                        : "warning"
                                  }
                                >
                                  {REPORT[item.status]}
                                </S.StatusBadge>
                              </S.RecordHeader>
                              <S.RecordMeta>
                                탐색 후보 #{item.scoutUserId} ·{" "}
                                {item.reportType} · {date(item.createdAt)}
                              </S.RecordMeta>
                              <S.RecordDescription>
                                {item.description}
                              </S.RecordDescription>
                            </S.RecordButton>
                          ))}
                        </S.CardList>
                      </ListQueryBoundary>
                    </Shared.ScrollArea>
                    {hook.reportListState.hasResult && hook.reportTotalPages > 1 ? <AdminPagination ariaLabel="탐색 후보 현장 제보 목록 페이지네이션" page={hook.reportPage} totalPages={hook.reportTotalPages} hasNext={hook.reportHasNext} disabled={hook.reportListState.phase === 'loading'} onPageChange={(nextPage) => void hook.fetchReports(hook.reportStatus, nextPage)} /> : null}
                  </Shared.Panel>
                  <Shared.Panel>
                    <Shared.PanelHeader>
                      <div>
                        <Shared.PanelTitle>현장 제보 상세</Shared.PanelTitle>
                      </div>
                    </Shared.PanelHeader>
                    <Shared.CompareBody>
                      {!selectedReport ? (
                        <Shared.EmptyState>
                          <strong>제보를 선택해주세요.</strong>
                        </Shared.EmptyState>
                      ) : (
                        <>
                          <S.RecordHeader>
                            <S.RecordTitle>
                              제보 #{selectedReport.id}
                            </S.RecordTitle>
                            <S.StatusBadge
                              $tone={
                                selectedReport.status === "ACCEPTED"
                                  ? "success"
                                  : selectedReport.status === "REJECTED"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {REPORT[selectedReport.status]}
                            </S.StatusBadge>
                          </S.RecordHeader>
                          <S.RecordDescription>
                            {selectedReport.description}
                          </S.RecordDescription>
                          <S.DetailGrid>
                            <S.DetailItem>
                              <dt>탐색 후보</dt>
                              <dd>#{selectedReport.scoutUserId}</dd>
                            </S.DetailItem>
                            <S.DetailItem>
                              <dt>장소</dt>
                              <dd>#{selectedReport.placeId}</dd>
                            </S.DetailItem>
                            <S.DetailItem>
                              <dt>유형</dt>
                              <dd>{selectedReport.reportType}</dd>
                            </S.DetailItem>
                            <S.DetailItem>
                              <dt>심사 메모</dt>
                              <dd>{selectedReport.reviewNote || "미심사"}</dd>
                            </S.DetailItem>
                          </S.DetailGrid>
                          {selectedReport.evidenceUrl ? (
                            <S.InlineActions>
                              <S.Link
                                href={selectedReport.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                증빙 열기
                              </S.Link>
                            </S.InlineActions>
                          ) : null}
                          {selectedReport.status === "SUBMITTED" ? (
                            <S.InlineActions>
                              <Shared.SecondaryButton
                                type="button"
                                onClick={() =>
                                  open({
                                    type: "report",
                                    report: selectedReport,
                                    decision: "REJECTED",
                                  })
                                }
                              >
                                반려
                              </Shared.SecondaryButton>
                              <Shared.PrimaryButton
                                type="button"
                                onClick={() =>
                                  open({
                                    type: "report",
                                    report: selectedReport,
                                    decision: "ACCEPTED",
                                  })
                                }
                              >
                                승인
                              </Shared.PrimaryButton>
                            </S.InlineActions>
                          ) : null}
                        </>
                      )}
                    </Shared.CompareBody>
                  </Shared.Panel>
                </Shared.Workspace>
              </>
            ) : null}
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
      {dialog ? (
        <Shared.ModalOverlay
          role="presentation"
          onMouseDown={() => hook.activeAction === null && setDialog(null)}
        >
          <Shared.Modal
            role="dialog"
            aria-modal="true"
            aria-labelledby="scout-action-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Shared.ModalHeader>
              <Shared.ModalTitle id="scout-action-title">
                탐색 후보 운영 작업 확인
              </Shared.ModalTitle>
              <Shared.ModalCloseButton
                type="button"
                aria-label="닫기"
                disabled={hook.activeAction !== null}
                onClick={() => setDialog(null)}
              >
                <Shell.MaterialIcon aria-hidden="true">
                  close
                </Shell.MaterialIcon>
              </Shared.ModalCloseButton>
            </Shared.ModalHeader>
            <Shared.ModalBody>
              {dialog.type !== "report" ? (
                <S.RecordDescription>
                  {dialog.target.displayName} · 사용자 #{dialog.target.userId}
                </S.RecordDescription>
              ) : null}
              <S.FormGrid>
                {dialog.type === "eligibility" && dialog.action === "grant" ? (
                  <>
                    <S.Field>
                      활동 시작 *
                      <AdminDateTimePicker
                        ariaLabel="탐색 후보 활동 시작"
                        value={eligibleFrom}
                        onChange={setEligibleFrom}
                      />
                    </S.Field>
                    <S.Field>
                      활동 종료
                      <AdminDateTimePicker
                        ariaLabel="탐색 후보 활동 종료"
                        value={eligibleUntil}
                        onChange={setEligibleUntil}
                      />
                    </S.Field>
                  </>
                ) : null}
                <S.WideField>
                  처리 사유 *
                  <S.TextArea
                    value={reason}
                    maxLength={500}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setFormError(''); hook.dismissActionError();
                    }}
                  />
                </S.WideField>
              </S.FormGrid>
              {formError || hook.actionErrorMessage ? (
                <FeedbackMessage tone="error" onDismiss={() => { setFormError(''); hook.dismissActionError() }}>{formError || hook.actionErrorMessage}</FeedbackMessage>
              ) : null}
            </Shared.ModalBody>
            <Shared.ModalFooter>
              <Shared.SecondaryButton
                type="button"
                disabled={hook.activeAction !== null}
                onClick={() => setDialog(null)}
              >
                취소
              </Shared.SecondaryButton>
              <Shared.PrimaryButton
                type="button"
                disabled={hook.activeAction !== null}
                onClick={() => void submit()}
              >
                {hook.activeAction ? "처리 중" : "확정"}
              </Shared.PrimaryButton>
            </Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  );
}

export default ScoutPage;
