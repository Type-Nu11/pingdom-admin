import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminNotificationButton } from "../../components/adminNotification/AdminNotificationButton";
import { AdminPagination } from "../../components/common/AdminPagination";
import { AdminNavigationMenu } from "../../components/navigation/AdminNavigationMenu";
import { ADMIN_MAIN_SCROLL_AREA_ID } from "../../constants/layout";
import { useAdminTrustScore } from "../../hooks/useAdminTrustScore";
import { useAuth } from "../../hooks/useAuth";
import type {
  TrustScoreAnomaly,
  TrustScoreInterventionAction,
  TrustScoreInterventionRule,
  TrustScoreInterventionTrigger,
} from "../../types/adminTrustScore.types";
import * as Shell from "../place/PlaceManagePage.styles";
import * as Shared from "../placeMerge/PlaceMergePage.styles";
import * as S from "../placeVerification/PlaceVerificationPage.styles";

type Tab = "reporter" | "anomalies" | "rules";
type Dialog =
  | { type: "resolve"; anomaly: TrustScoreAnomaly }
  | { type: "rule"; rule: TrustScoreInterventionRule | null }
  | { type: "toggle"; rule: TrustScoreInterventionRule }
  | { type: "batch" }
  | { type: "evaluate"; reporterUserId: number }
  | null;
const TRIGGERS: Record<TrustScoreInterventionTrigger, string> = {
  TRUST_SCORE_RANGE: "점수 범위",
  FALSE_REPORT_COUNT: "허위 신고 수",
  ACCEPTANCE_RATE: "승인률",
  ANOMALY_DETECTED: "이상치 감지",
};
const ACTIONS: Record<TrustScoreInterventionAction, string> = {
  WARN: "경고",
  REVIEW_REQUIRED: "검토 필요",
  TEMPORARY_RESTRICT: "임시 제한",
  MANUAL_REVIEW: "수동 검토",
};
function formatDate(value?: string | null) {
  if (!value) return "정보 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
function int(value: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function TrustScorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, user } = useAuth();
  const hook = useAdminTrustScore();
  const requestedTab = searchParams.get("tab");
  const tab: Tab =
    requestedTab === "anomalies" || requestedTab === "rules"
      ? requestedTab
      : "reporter";
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
  const [reporterId, setReporterId] = useState("");
  const [anomalyReporterId, setAnomalyReporterId] = useState("");
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [formError, setFormError] = useState("");
  const [reason, setReason] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [triggerType, setTriggerType] =
    useState<TrustScoreInterventionTrigger>("TRUST_SCORE_RANGE");
  const [actionType, setActionType] =
    useState<TrustScoreInterventionAction>("WARN");
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [minSubmitted, setMinSubmitted] = useState("0");
  const [minFalse, setMinFalse] = useState("0");
  const [durationDays, setDurationDays] = useState("");
  const [priority, setPriority] = useState("10");
  const adminIdentifier =
    user?.username ||
    (typeof user?.id === "number" ? `ID ${user.id}` : "관리자 계정");

  const searchReporter = (event: FormEvent) => {
    event.preventDefault();
    const id = int(reporterId, 1);
    if (!id) {
      setFormError("신고자 ID는 1 이상의 정수로 입력해주세요.");
      return;
    }
    setFormError("");
    void hook.fetchReporter(id);
  };
  const searchAnomalies = (page = 1) => {
    const id = anomalyReporterId ? int(anomalyReporterId, 1) : undefined;
    if (id === null) {
      setFormError("신고자 ID는 1 이상의 정수로 입력해주세요.");
      return;
    }
    setFormError("");
    void hook.fetchAnomalies({ page, reporterUserId: id, unresolvedOnly });
  };
  const openRule = (rule: TrustScoreInterventionRule | null) => {
    setDialog({ type: "rule", rule });
    setFormError("");
    setRuleName(rule?.ruleName ?? "");
    setTriggerType(rule?.triggerType ?? "TRUST_SCORE_RANGE");
    setActionType(rule?.actionType ?? "WARN");
    setMinScore(String(rule?.minTrustScore ?? 0));
    setMaxScore(String(rule?.maxTrustScore ?? 100));
    setMinSubmitted(String(rule?.minSubmittedCount ?? 0));
    setMinFalse(String(rule?.minFalseReportCount ?? 0));
    setDurationDays(rule?.durationDays ? String(rule.durationDays) : "");
    setPriority(String(rule?.priority ?? 10));
    setReason(rule?.reason ?? "");
  };
  const submitDialog = async () => {
    if (!dialog || hook.activeAction) return;
    if (dialog.type === "resolve") {
      if (!reason.trim()) {
        setFormError("해결 사유를 입력해주세요.");
        return;
      }
      if (await hook.resolveAnomaly(dialog.anomaly.id, reason.trim()))
        setDialog(null);
      return;
    }
    if (dialog.type === "toggle") {
      if (await hook.toggleRule(dialog.rule.id, !dialog.rule.enabled))
        setDialog(null);
      return;
    }
    if (dialog.type === "batch") {
      if (await hook.recalculate()) setDialog(null);
      return;
    }
    if (dialog.type === "evaluate") {
      if (await hook.evaluateReporter(dialog.reporterUserId)) setDialog(null);
      return;
    }
    const values = {
      min: int(minScore, 0, 100),
      max: int(maxScore, 0, 100),
      submitted: int(minSubmitted),
      falseCount: int(minFalse),
      duration: durationDays ? int(durationDays, 1) : undefined,
      priority: int(priority),
    };
    if (!ruleName.trim() || !reason.trim()) {
      setFormError("규칙 이름과 적용 사유를 입력해주세요.");
      return;
    }
    if (
      Object.values(values).some((value) => value === null) ||
      values.min! > values.max!
    ) {
      setFormError("점수·횟수·우선순위 입력 범위를 확인해주세요.");
      return;
    }
    if (actionType === "TEMPORARY_RESTRICT" && !values.duration) {
      setFormError("임시 제한 액션에는 제한 기간이 필요합니다.");
      return;
    }
    if (
      await hook.saveRule(dialog.rule?.id ?? null, {
        ruleName: ruleName.trim(),
        triggerType,
        actionType,
        minTrustScore: values.min!,
        maxTrustScore: values.max!,
        minSubmittedCount: values.submitted!,
        minFalseReportCount: values.falseCount!,
        durationDays:
          actionType === "TEMPORARY_RESTRICT"
            ? (values.duration ?? undefined)
            : undefined,
        priority: values.priority!,
        reason: reason.trim(),
      })
    )
      setDialog(null);
  };

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
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup>
            <Shell.TopTitle>신뢰 점수 운영</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>성장 운영 &gt; 신뢰 점수</Shared.Eyebrow>
                <Shared.PageTitle>신고자 신뢰 점수 운영</Shared.PageTitle>
                <Shared.PageDescription>
                  점수 근거와 변경 이력, 이상치, 자동 개입 규칙을 분리해
                  검토합니다.
                </Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.HeaderButton
                  type="button"
                  onClick={() => navigate("/visitor-verifications")}
                >
                  방문자 제보·정정 심사
                </Shared.HeaderButton>
                <Shared.HeaderButton
                  type="button"
                  onClick={() => navigate("/scouts")}
                >
                  탐색 후보 운영
                </Shared.HeaderButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>
            <S.TabList role="tablist">
              {(
                [
                  ["reporter", "신고자 조회", "person_search"],
                  ["anomalies", "이상치", "warning"],
                  ["rules", "개입 규칙", "rule"],
                ] as const
              ).map(([value, label, icon]) => (
                <S.TabButton
                  key={value}
                  type="button"
                  role="tab"
                  $active={tab === value}
                  aria-selected={tab === value}
                  onClick={() => {
                    setTab(value);
                    setFormError("");
                  }}
                >
                  <Shell.MaterialIcon aria-hidden="true">
                    {icon}
                  </Shell.MaterialIcon>
                  {label}
                </S.TabButton>
              ))}
            </S.TabList>
            {hook.actionErrorMessage ? (
              <Shared.Notice $variant="error">
                {hook.actionErrorMessage}
              </Shared.Notice>
            ) : null}
            {hook.successMessage ? (
              <Shared.Notice $variant="success">
                {hook.successMessage}
              </Shared.Notice>
            ) : null}
            {hook.errorMessage ? (
              <Shared.Notice $variant="error">
                {hook.errorMessage}
              </Shared.Notice>
            ) : null}

            {tab === "reporter" ? (
              <>
                <S.SearchBar onSubmit={searchReporter}>
                  <S.Field>
                    신고자 사용자 ID
                    <S.SearchInputRow>
                      <S.Input
                        inputMode="numeric"
                        value={reporterId}
                        placeholder="예: 12"
                        onChange={(event) => {
                          setReporterId(event.target.value);
                          setFormError("");
                        }}
                      />
                      <Shared.PrimaryButton
                        type="submit"
                        disabled={hook.isReporterLoading}
                      >
                        조회
                      </Shared.PrimaryButton>
                    </S.SearchInputRow>
                  </S.Field>
                </S.SearchBar>
                {formError ? (
                  <Shared.Notice $variant="error">{formError}</Shared.Notice>
                ) : null}
                {!hook.reporter ? (
                  <Shared.EmptyStateCard>
                    <strong>신고자 ID로 Trust Score를 조회해주세요.</strong>
                  </Shared.EmptyStateCard>
                ) : (
                  <>
                    <Shared.Panel>
                      <Shared.PanelHeader>
                        <div>
                          <Shared.PanelTitle>
                            {hook.reporter.reporterUsername} · 사용자 #
                            {hook.reporter.reporterUserId}
                          </Shared.PanelTitle>
                          <Shared.PanelDescription>
                            현재 점수와 신고 처리 통계 기반 산정 근거입니다.
                          </Shared.PanelDescription>
                        </div>
                        <S.StatusBadge
                          $tone={
                            hook.reporter.trustGrade === "HIGH"
                              ? "success"
                              : hook.reporter.trustGrade === "LOW"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {hook.reporter.trustGrade} ·{" "}
                          {hook.reporter.trustScore}점
                        </S.StatusBadge>
                      </Shared.PanelHeader>
                      <S.FormBody>
                        <S.MetricGrid>
                          <S.MetricCard>
                            <span>제출 / 승인 / 반려</span>
                            <strong>
                              {hook.reporter.evidence.submittedCount} /{" "}
                              {hook.reporter.evidence.acceptedCount} /{" "}
                              {hook.reporter.evidence.declinedCount}
                            </strong>
                          </S.MetricCard>
                          <S.MetricCard>
                            <span>허위 신고</span>
                            <strong>
                              {hook.reporter.evidence.falseReportCount}
                            </strong>
                          </S.MetricCard>
                          <S.MetricCard>
                            <span>승인률</span>
                            <strong>
                              {hook.reporter.evidence.acceptanceRate.toFixed(2)}
                              %
                            </strong>
                          </S.MetricCard>
                          <S.MetricCard>
                            <span>점수 산식</span>
                            <strong>
                              {hook.reporter.evidence.baseScore} +{" "}
                              {hook.reporter.evidence.acceptedScoreBonus} -{" "}
                              {hook.reporter.evidence.falseReportScorePenalty}
                            </strong>
                          </S.MetricCard>
                        </S.MetricGrid>
                        {hook.reporter.restricted ? (
                          <Shared.Notice $variant="error">
                            신고 제한 중 ·{" "}
                            {hook.reporter.restrictionReason || "사유 없음"} ·{" "}
                            {formatDate(hook.reporter.restrictedUntil)}
                          </Shared.Notice>
                        ) : null}
                        <S.InlineActions>
                          <Shared.SecondaryButton
                            type="button"
                            disabled={hook.activeAction !== null}
                            onClick={() =>
                              setDialog({
                                type: "evaluate",
                                reporterUserId: hook.reporter!.reporterUserId,
                              })
                            }
                          >
                            개입 규칙 평가
                          </Shared.SecondaryButton>
                          <Shared.PrimaryButton
                            type="button"
                            disabled={hook.activeAction !== null}
                            onClick={() => setDialog({ type: "batch" })}
                          >
                            전체 점수 재계산
                          </Shared.PrimaryButton>
                        </S.InlineActions>
                      </S.FormBody>
                    </Shared.Panel>
                    <Shared.Panel>
                      <Shared.PanelHeader>
                        <div>
                          <Shared.PanelTitle>점수 변경 이력</Shared.PanelTitle>
                          <Shared.PanelDescription>
                            서버가 보관한 점수 재계산 기록입니다.
                          </Shared.PanelDescription>
                        </div>
                        <Shared.PanelCount>
                          {hook.history.length}건
                        </Shared.PanelCount>
                      </Shared.PanelHeader>
                      <S.FormBody>
                        {hook.history.length === 0 ? (
                          <Shared.EmptyState>
                            <strong>변경 이력이 없습니다.</strong>
                          </Shared.EmptyState>
                        ) : (
                          <S.CardList>
                            {hook.history.map((item) => (
                              <S.RecordCard key={item.id}>
                                <S.RecordHeader>
                                  <S.RecordTitle>
                                    {item.beforeScore} → {item.afterScore}
                                  </S.RecordTitle>
                                  <S.StatusBadge
                                    $tone={
                                      item.afterScore >= item.beforeScore
                                        ? "success"
                                        : "danger"
                                    }
                                  >
                                    {item.afterScore - item.beforeScore > 0
                                      ? "+"
                                      : ""}
                                    {item.afterScore - item.beforeScore}
                                  </S.StatusBadge>
                                </S.RecordHeader>
                                <S.RecordMeta>
                                  {item.reason} · {formatDate(item.changedAt)}
                                </S.RecordMeta>
                              </S.RecordCard>
                            ))}
                          </S.CardList>
                        )}
                      </S.FormBody>
                    </Shared.Panel>
                  </>
                )}
                {hook.evaluation ? (
                  <Shared.Notice $variant="success">
                    평가 결과: {hook.evaluation.message}
                    {hook.evaluation.matchedRuleName
                      ? ` · ${hook.evaluation.matchedRuleName} / ${hook.evaluation.actionType}`
                      : ""}
                  </Shared.Notice>
                ) : null}
                {hook.batchResult ? (
                  <Shared.Notice $variant="success">
                    재계산 {hook.batchResult.processedCount.toLocaleString()}명
                    · 점수 변경 {hook.batchResult.changedCount.toLocaleString()}
                    명
                  </Shared.Notice>
                ) : null}
              </>
            ) : null}

            {tab === "anomalies" ? (
              <>
                <S.SearchBar
                  onSubmit={(event) => {
                    event.preventDefault();
                    searchAnomalies(1);
                  }}
                >
                  <S.InlineSearchControls>
                    <S.Field>
                      신고자 ID 필터
                      <S.Input
                        inputMode="numeric"
                        value={anomalyReporterId}
                        placeholder="전체"
                        onChange={(event) =>
                          setAnomalyReporterId(event.target.value)
                        }
                      />
                    </S.Field>
                    <S.CheckField>
                      <input
                        type="checkbox"
                        checked={unresolvedOnly}
                        onChange={(event) =>
                          setUnresolvedOnly(event.target.checked)
                        }
                      />
                      미해결만
                    </S.CheckField>
                    <Shared.PrimaryButton
                      type="submit"
                      disabled={hook.isAnomaliesLoading}
                    >
                      조회
                    </Shared.PrimaryButton>
                  </S.InlineSearchControls>
                </S.SearchBar>
                {formError ? (
                  <Shared.Notice $variant="error">{formError}</Shared.Notice>
                ) : null}
                <Shared.Panel>
                  <Shared.PanelHeader>
                    <div>
                      <Shared.PanelTitle>Trust Score 이상치</Shared.PanelTitle>
                      <Shared.PanelDescription>
                        점수 급락과 허위 신고 증가 패턴을 검토합니다.
                      </Shared.PanelDescription>
                    </div>
                    <Shared.PanelCount>
                      {hook.anomalyTotalCount.toLocaleString()}건
                    </Shared.PanelCount>
                  </Shared.PanelHeader>
                  <S.FormBody>
                    {hook.isAnomaliesLoading ? (
                      <Shared.EmptyState>
                        <strong>이상치를 불러오는 중입니다.</strong>
                      </Shared.EmptyState>
                    ) : hook.anomalies.length === 0 ? (
                      <Shared.EmptyState>
                        <strong>조건에 맞는 이상치가 없습니다.</strong>
                      </Shared.EmptyState>
                    ) : (
                      <S.CardList>
                        {hook.anomalies.map((item) => (
                          <S.RecordCard key={item.id}>
                            <S.RecordHeader>
                              <div>
                                <S.RecordTitle>
                                  {item.reporterUsername} · 사용자 #
                                  {item.reporterUserId}
                                </S.RecordTitle>
                                <S.RecordMeta>
                                  {item.anomalyType} · 감지{" "}
                                  {formatDate(item.detectedAt)}
                                </S.RecordMeta>
                              </div>
                              <S.StatusBadge
                                $tone={
                                  ["HIGH", "CRITICAL"].includes(item.severity)
                                    ? "danger"
                                    : "warning"
                                }
                              >
                                {item.severity}
                              </S.StatusBadge>
                            </S.RecordHeader>
                            <S.DetailGrid>
                              <S.DetailItem>
                                <dt>점수 변화</dt>
                                <dd>
                                  {item.baselineScore} → {item.observedScore}
                                </dd>
                              </S.DetailItem>
                              <S.DetailItem>
                                <dt>신고 / 허위</dt>
                                <dd>
                                  {item.submittedCount} /{" "}
                                  {item.falseReportCount}
                                </dd>
                              </S.DetailItem>
                            </S.DetailGrid>
                            {item.resolvedAt ? (
                              <S.RecordDescription>
                                해결: {item.resolutionReason} ·{" "}
                                {formatDate(item.resolvedAt)}
                              </S.RecordDescription>
                            ) : (
                              <S.InlineActions>
                                <Shared.PrimaryButton
                                  type="button"
                                  disabled={hook.activeAction !== null}
                                  onClick={() => {
                                    setReason("");
                                    setFormError("");
                                    setDialog({
                                      type: "resolve",
                                      anomaly: item,
                                    });
                                  }}
                                >
                                  해결 처리
                                </Shared.PrimaryButton>
                              </S.InlineActions>
                            )}
                          </S.RecordCard>
                        ))}
                      </S.CardList>
                    )}
                  </S.FormBody>
                  {hook.anomalyTotalPages > 1 ? <AdminPagination ariaLabel="신뢰 점수 이상치 목록 페이지네이션" page={hook.anomalyPage} totalPages={hook.anomalyTotalPages} disabled={hook.isAnomaliesLoading} onPageChange={searchAnomalies} /> : null}
                </Shared.Panel>
              </>
            ) : null}

            {tab === "rules" ? (
              <>
                <Shared.Panel>
                  <Shared.PanelHeader>
                    <div>
                      <Shared.PanelTitle>개입 규칙</Shared.PanelTitle>
                      <Shared.PanelDescription>
                        우선순위가 낮은 규칙부터 평가됩니다.
                      </Shared.PanelDescription>
                    </div>
                    <Shared.HeaderActions>
                      <S.CheckField>
                        <input
                          type="checkbox"
                          checked={enabledOnly}
                          onChange={(event) => {
                            setEnabledOnly(event.target.checked);
                            void hook.fetchRules(event.target.checked);
                          }}
                        />
                        활성만
                      </S.CheckField>
                      <Shared.PrimaryButton
                        type="button"
                        onClick={() => openRule(null)}
                      >
                        규칙 생성
                      </Shared.PrimaryButton>
                    </Shared.HeaderActions>
                  </Shared.PanelHeader>
                  <S.FormBody>
                    {hook.isRulesLoading ? (
                      <Shared.EmptyState>
                        <strong>규칙을 불러오는 중입니다.</strong>
                      </Shared.EmptyState>
                    ) : hook.rules.length === 0 ? (
                      <Shared.EmptyState>
                        <strong>개입 규칙이 없습니다.</strong>
                      </Shared.EmptyState>
                    ) : (
                      <S.CardList>
                        {hook.rules.map((rule) => (
                          <S.RecordCard key={rule.id}>
                            <S.RecordHeader>
                              <div>
                                <S.RecordTitle>
                                  {rule.priority}. {rule.ruleName}
                                </S.RecordTitle>
                                <S.RecordMeta>
                                  {TRIGGERS[rule.triggerType]} →{" "}
                                  {ACTIONS[rule.actionType]}
                                </S.RecordMeta>
                              </div>
                              <S.StatusBadge
                                $tone={rule.enabled ? "success" : "danger"}
                              >
                                {rule.enabled ? "활성" : "비활성"}
                              </S.StatusBadge>
                            </S.RecordHeader>
                            <S.RecordDescription>
                              {rule.reason}
                            </S.RecordDescription>
                            <S.DetailGrid>
                              <S.DetailItem>
                                <dt>점수 범위</dt>
                                <dd>
                                  {rule.minTrustScore}~{rule.maxTrustScore}
                                </dd>
                              </S.DetailItem>
                              <S.DetailItem>
                                <dt>최소 신고 / 허위</dt>
                                <dd>
                                  {rule.minSubmittedCount} /{" "}
                                  {rule.minFalseReportCount}
                                </dd>
                              </S.DetailItem>
                              <S.DetailItem>
                                <dt>제한 기간</dt>
                                <dd>
                                  {rule.durationDays
                                    ? `${rule.durationDays}일`
                                    : "해당 없음"}
                                </dd>
                              </S.DetailItem>
                            </S.DetailGrid>
                            <S.InlineActions>
                              <Shared.SecondaryButton
                                type="button"
                                onClick={() => openRule(rule)}
                              >
                                수정
                              </Shared.SecondaryButton>
                              <Shared.PrimaryButton
                                type="button"
                                onClick={() =>
                                  setDialog({ type: "toggle", rule })
                                }
                              >
                                {rule.enabled ? "비활성화" : "활성화"}
                              </Shared.PrimaryButton>
                            </S.InlineActions>
                          </S.RecordCard>
                        ))}
                      </S.CardList>
                    )}
                  </S.FormBody>
                </Shared.Panel>
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
            aria-labelledby="trust-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Shared.ModalHeader>
              <Shared.ModalTitle id="trust-dialog-title">
                {dialog.type === "resolve"
                  ? "이상치 해결"
                  : dialog.type === "rule"
                    ? dialog.rule
                      ? "개입 규칙 수정"
                      : "개입 규칙 생성"
                    : dialog.type === "toggle"
                      ? `규칙 ${dialog.rule.enabled ? "비활성화" : "활성화"}`
                      : dialog.type === "batch"
                        ? "전체 Trust Score 재계산"
                        : "개입 규칙 수동 평가"}
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
              {dialog.type === "rule" ? (
                <S.FormGrid>
                  <S.WideField>
                    규칙 이름 *
                    <S.Input
                      value={ruleName}
                      maxLength={100}
                      onChange={(event) => setRuleName(event.target.value)}
                    />
                  </S.WideField>
                  <S.Field>
                    트리거
                    <S.Select
                      value={triggerType}
                      onChange={(event) =>
                        setTriggerType(
                          event.target.value as TrustScoreInterventionTrigger,
                        )
                      }
                    >
                      {Object.entries(TRIGGERS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </S.Select>
                  </S.Field>
                  <S.Field>
                    액션
                    <S.Select
                      value={actionType}
                      onChange={(event) =>
                        setActionType(
                          event.target.value as TrustScoreInterventionAction,
                        )
                      }
                    >
                      {Object.entries(ACTIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </S.Select>
                  </S.Field>
                  <S.Field>
                    최소 점수
                    <S.Input
                      value={minScore}
                      inputMode="numeric"
                      onChange={(event) => setMinScore(event.target.value)}
                    />
                  </S.Field>
                  <S.Field>
                    최대 점수
                    <S.Input
                      value={maxScore}
                      inputMode="numeric"
                      onChange={(event) => setMaxScore(event.target.value)}
                    />
                  </S.Field>
                  <S.Field>
                    최소 신고 수
                    <S.Input
                      value={minSubmitted}
                      inputMode="numeric"
                      onChange={(event) => setMinSubmitted(event.target.value)}
                    />
                  </S.Field>
                  <S.Field>
                    최소 허위 신고 수
                    <S.Input
                      value={minFalse}
                      inputMode="numeric"
                      onChange={(event) => setMinFalse(event.target.value)}
                    />
                  </S.Field>
                  <S.Field>
                    제한 기간(일)
                    <S.Input
                      value={durationDays}
                      inputMode="numeric"
                      disabled={actionType !== "TEMPORARY_RESTRICT"}
                      onChange={(event) => setDurationDays(event.target.value)}
                    />
                  </S.Field>
                  <S.Field>
                    우선순위
                    <S.Input
                      value={priority}
                      inputMode="numeric"
                      onChange={(event) => setPriority(event.target.value)}
                    />
                  </S.Field>
                  <S.WideField>
                    적용 사유 *
                    <S.TextArea
                      value={reason}
                      maxLength={500}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </S.WideField>
                </S.FormGrid>
              ) : dialog.type === "resolve" ? (
                <S.Field>
                  해결 사유 *
                  <S.TextArea
                    value={reason}
                    maxLength={500}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setFormError("");
                    }}
                  />
                </S.Field>
              ) : (
                <Shared.ModalWarning>
                  {dialog.type === "toggle"
                    ? `${dialog.rule.ruleName} 규칙을 ${dialog.rule.enabled ? "비활성화" : "활성화"}합니다.`
                    : dialog.type === "batch"
                      ? "모든 신고자의 Trust Score를 다시 계산하고 변경 이력을 남깁니다."
                      : `신고자 #${dialog.reporterUserId}에게 현재 활성 규칙을 즉시 평가합니다.`}
                </Shared.ModalWarning>
              )}
              {formError || hook.actionErrorMessage ? (
                <Shared.Notice $variant="error">
                  {formError || hook.actionErrorMessage}
                </Shared.Notice>
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
                onClick={() => void submitDialog()}
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

export default TrustScorePage;
