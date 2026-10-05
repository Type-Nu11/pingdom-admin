import { AdminNavigationMenu } from "../../components/navigation/AdminNavigationMenu";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNotificationButton } from "../../components/adminNotification/AdminNotificationButton";
import { AdminPagination } from "../../components/common/AdminPagination";
import { ADMIN_MAIN_SCROLL_AREA_ID } from "../../constants/layout";
import { useAdminS3Orphans } from "../../hooks/useAdminS3Orphans";
import { useAuth } from "../../hooks/useAuth";
import { formatLocalDateTime as date } from "../../utils/displayFormat";
import * as Shell from "../place/PlaceManagePage.styles";
import * as Shared from "../placeMerge/PlaceMergePage.styles";
import * as S from "../placeVerification/PlaceVerificationPage.styles";
function S3OrphanPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const h = useAdminS3Orphans();
  const [prefix, setPrefix] = useState("map/");
  const [limit, setLimit] = useState("1000");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionReportId, setSelectionReportId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const admin =
    user?.username ||
    (typeof user?.id === "number" ? `ID ${user.id}` : "관리자 계정");
  const report = h.report;
  const canDelete = h.statusState === "ready" && h.reportState === "ready"
    && h.status?.status === "COMPLETED" && h.activeAction === null;
  const previousReport = Boolean(report) && (h.statusState !== "ready" || h.reportState !== "ready");
  const statusLabel = h.status ? ({ RUNNING: "생성 중", COMPLETED: "생성 완료", FAILED: "생성 실패", NOT_FOUND: "리포트 없음" }[h.status.status]) : "";
  const selectedKeys = selectionReportId === report?.reportId ? selected : [];
  const moveReportPage = (page: number) => {
    if (!report || page === report.page) return;

    setSelected([]);
    setSelectionReportId("");
    void h.fetchReport(report.reportId, page);
  };
  const dry = () => {
    const n = Number(limit);
    if (!prefix.trim() || !Number.isInteger(n) || n < 1 || n > 10000) {
      setFormError("prefix와 1~10000 범위의 스캔 수를 확인해주세요.");
      return;
    }
    setFormError("");
    void h.fetchDryRun(prefix.trim(), n);
  };
  const remove = async () => {
    if (!report || !canDelete) return;
    if (confirm !== report.reportId) {
      setFormError("리포트 ID가 일치하지 않습니다.");
      return;
    }
    if (selectedKeys.length === 0) {
      setFormError("삭제할 후보를 선택해주세요.");
      return;
    }
    if (await h.remove(selectedKeys)) {
      setDeleteOpen(false);
      setSelected([]);
    }
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
              <Shell.MaterialIcon>admin_panel_settings</Shell.MaterialIcon>
            </Shell.AdminProfileIcon>
            <Shell.AdminProfileText>
              <strong>{admin}</strong>
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
            <Shell.MaterialIcon>logout</Shell.MaterialIcon>
            <span>로그아웃</span>
          </Shell.LogoutButton>
        </Shell.SideFooter>
      </Shell.SideNav>
      <Shell.MainArea id={ADMIN_MAIN_SCROLL_AREA_ID}>
        <Shell.TopBar>
          <Shell.TopTitleGroup>
            <Shell.TopTitle>미연결 파일 관리</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>시스템 &gt; 미연결 파일 관리</Shared.Eyebrow>
                <Shared.PageTitle>미연결 파일 관리</Shared.PageTitle>
                <Shared.PageDescription>
                  장소 이미지에 연결되지 않은 저장소 파일을 확인합니다.
                  삭제는 비교가 완료된 리포트에서 직접 선택한 파일에만 적용됩니다.
                </Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.PrimaryButton
                  type="button"
                  disabled={h.activeAction !== null || h.statusState === "loading" || h.reportState === "loading"}
                  onClick={() => void h.refresh()}
                >
                  {h.activeAction === "refresh"
                    ? "생성 중"
                    : "리포트 새로 생성"}
                </Shared.PrimaryButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>
            {h.errorMessage ? (
              <Shared.Notice $variant="error" role="alert">{h.errorMessage}</Shared.Notice>
            ) : null}
            {h.successMessage ? (
              <Shared.Notice $variant="success">
                {h.successMessage}
              </Shared.Notice>
            ) : null}
            {formError ? (
              <Shared.Notice $variant="error">{formError}</Shared.Notice>
            ) : null}
            <Shared.Panel>
              <Shared.PanelHeader>
                <div>
                  <Shared.PanelTitle>파일 비교 · 삭제 없음</Shared.PanelTitle>
                  <Shared.PanelDescription>
                    지정한 저장 경로의 파일을 스캔 한도까지 비교합니다. 파일은 삭제하지 않습니다.
                  </Shared.PanelDescription>
                </div>
              </Shared.PanelHeader>
              <S.FormBody>
                <S.FormGrid>
                  <S.Field>
                    저장 경로 접두어
                    <S.Input
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                    />
                  </S.Field>
                  <S.Field>
                    스캔 한도
                    <S.Input
                      type="number"
                      min="1"
                      max="10000"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                    />
                  </S.Field>
                </S.FormGrid>
                <S.InlineActions>
                  <Shared.SecondaryButton
                    type="button"
                    disabled={h.dryRunState === "loading" || h.activeAction !== null}
                    onClick={dry}
                  >
                    파일 비교
                  </Shared.SecondaryButton>
                </S.InlineActions>
                {h.dryRunState === "loading" ? <Shared.PanelDescription role="status">파일을 비교하는 중입니다.</Shared.PanelDescription> : null}
                {h.dryRun && h.dryRunState !== "ready" ? <Shared.PanelDescription>이전 비교 결과입니다.</Shared.PanelDescription> : null}
                {h.dryRun ? (
                  <S.DetailGrid>
                    <S.DetailItem>
                      <dt>연결된 이미지 키</dt>
                      <dd>{h.dryRun.dbKeyCount.toLocaleString()}개</dd>
                    </S.DetailItem>
                    <S.DetailItem>
                      <dt>저장소 파일</dt>
                      <dd>{h.dryRun.s3ObjectCount.toLocaleString()}개</dd>
                    </S.DetailItem>
                    <S.DetailItem>
                      <dt>미연결 후보</dt>
                      <dd>{h.dryRun.orphanObjectCount.toLocaleString()}개</dd>
                    </S.DetailItem>
                    <S.DetailItem>
                      <dt>스캔 상태</dt>
                      <dd>{h.dryRun.truncated ? "한도 도달" : "전체 범위"}</dd>
                    </S.DetailItem>
                  </S.DetailGrid>
                ) : null}
              </S.FormBody>
            </Shared.Panel>
            <Shared.Panel>
              <Shared.PanelHeader>
                <div>
                  <Shared.PanelTitle>전체 비교 리포트</Shared.PanelTitle>
                  <Shared.PanelDescription>
                    {h.statusState === "loading" ? "리포트 상태를 조회하는 중입니다."
                      : h.statusState === "error" ? "리포트 상태를 확인하지 못했습니다."
                      : h.statusState === "empty" ? "조회할 리포트가 없습니다. 미생성 또는 보관 기간이 지난 상태일 수 있습니다."
                      : `${h.status?.reportId} · ${statusLabel} · ${date(h.status?.generatedAt)} (서버 기록 기준)`}
                  </Shared.PanelDescription>
                </div>
                <Shared.PanelCount>
                  {h.statusState === "ready" && h.status?.status === "COMPLETED"
                    ? `${h.status.deleteCandidateCount.toLocaleString()}개 후보` : "후보 수 미확인"}
                </Shared.PanelCount>
              </Shared.PanelHeader>
              <Shared.CompareBody>
                {h.statusState === "empty" ? <Shared.EmptyState><strong>조회할 리포트가 없습니다.</strong><p>필요하면 상단의 ‘리포트 새로 생성’을 눌러 비교를 시작하세요. 파일은 자동 삭제되지 않습니다.</p></Shared.EmptyState> : null}
                <Shared.SecondaryButton type="button" disabled={h.statusState === "loading" || h.reportState === "loading" || h.activeAction !== null} onClick={() => void h.fetchStatus()}>리포트 상태 다시 조회</Shared.SecondaryButton>
              </Shared.CompareBody>
              {h.statusState === "ready" && h.status?.status === "RUNNING" ? (
                <Shared.EmptyState>
                  <strong>
                    DB와 S3를 비교 중입니다. 자동으로 상태를 갱신합니다.
                  </strong>
                </Shared.EmptyState>
              ) : h.statusState === "ready" && h.status?.status === "FAILED" ? (
                <Shared.Notice $variant="error">
                  {h.status.errorMessage || "리포트 생성이 실패했습니다."}
                </Shared.Notice>
              ) : null}
            </Shared.Panel>
            <Shared.Panel>
              <Shared.PanelHeader>
                <div>
                  <Shared.PanelTitle>삭제 후보</Shared.PanelTitle>
                  <Shared.PanelDescription>
                    현재 페이지에서 최대 5개까지 선택할 수 있습니다.
                  </Shared.PanelDescription>
                </div>
                <Shared.HeaderActions>
                  <Shared.HeaderButton
                    type="button"
                    disabled={!report || !canDelete || selectedKeys.length === 0}
                    onClick={() => {
                      setConfirm("");
                      setFormError("");
                      setDeleteOpen(true);
                    }}
                  >
                    선택 {selectedKeys.length}개 삭제
                  </Shared.HeaderButton>
                </Shared.HeaderActions>
              </Shared.PanelHeader>
              <Shared.CompareBody>
                {previousReport ? <Shared.PanelDescription>이전 리포트 결과입니다. 최신 조회가 완료되기 전에는 삭제할 수 없습니다.</Shared.PanelDescription> : null}
                {!report ? (
                  <Shared.EmptyState>
                    <strong>{h.statusState === "loading" || h.reportState === "loading" ? "리포트를 불러오는 중입니다."
                      : h.statusState === "error" || h.reportState === "error" ? "리포트 조회를 다시 시도해주세요."
                      : h.status?.status === "RUNNING" ? "비교가 완료되면 삭제 후보를 확인할 수 있습니다."
                      : h.status?.status === "FAILED" ? "리포트 생성에 실패해 삭제 후보를 확인할 수 없습니다."
                      : "조회할 완료 리포트가 없습니다."}</strong>
                  </Shared.EmptyState>
                ) : report.deleteCandidates.length === 0 ? (
                  <Shared.EmptyState>
                    <strong>삭제 후보가 없습니다.</strong>
                  </Shared.EmptyState>
                ) : (
                  <S.CardList>
                    {report.deleteCandidates.map((c) => (
                      <S.RecordCard key={c.key}>
                        <S.RecordHeader>
                          <label>
                            <input
                              type="checkbox"
                              disabled={!canDelete}
                              checked={selectedKeys.includes(c.key)}
                              onChange={(e) => {
                                setSelectionReportId(report.reportId);
                                setSelected(
                                  e.target.checked
                                    ? [...selectedKeys, c.key]
                                    : selectedKeys.filter((k) => k !== c.key),
                                );
                              }}
                            />
                            <S.RecordTitle>{c.key}</S.RecordTitle>
                          </label>
                        </S.RecordHeader>
                        <S.RecordDescription>{c.reason}</S.RecordDescription>
                      </S.RecordCard>
                    ))}
                  </S.CardList>
                )}
              </Shared.CompareBody>
              {report && report.totalPages > 1 ? (
                <AdminPagination
                  ariaLabel="삭제 후보 페이지네이션"
                  page={report.page}
                  totalPages={report.totalPages}
                  hasNext={report.hasNext}
                  disabled={h.statusState === "loading" || h.reportState === "loading" || h.activeAction !== null}
                  onPageChange={moveReportPage}
                />
              ) : null}
            </Shared.Panel>
            {h.result && h.result.failedKeys.length ? (
              <Shared.Panel>
                <Shared.PanelHeader>
                  <div>
                    <Shared.PanelTitle>부분 실패 결과</Shared.PanelTitle>
                  </div>
                  <Shared.PanelCount>
                    {h.result.failedKeyCount}건
                  </Shared.PanelCount>
                </Shared.PanelHeader>
                <Shared.CompareBody>
                  <S.CardList>
                    {h.result.failedKeys.map((f) => (
                      <S.RecordCard key={f.key}>
                        <S.RecordTitle>{f.key}</S.RecordTitle>
                        <S.RecordDescription>{f.reason}</S.RecordDescription>
                      </S.RecordCard>
                    ))}
                  </S.CardList>
                </Shared.CompareBody>
              </Shared.Panel>
            ) : null}
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
      {deleteOpen && report ? (
        <Shared.ModalOverlay
          role="presentation"
          onMouseDown={() => h.activeAction === null && setDeleteOpen(false)}
        >
          <Shared.Modal
            role="dialog"
            aria-modal="true"
            aria-labelledby="s3-delete-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Shared.ModalHeader>
              <Shared.ModalTitle id="s3-delete-title">
                미연결 파일 영구 삭제
              </Shared.ModalTitle>
              <Shared.ModalCloseButton
                type="button"
                aria-label="닫기"
                onClick={() => setDeleteOpen(false)}
              >
                <Shell.MaterialIcon>close</Shell.MaterialIcon>
              </Shared.ModalCloseButton>
            </Shared.ModalHeader>
            <Shared.ModalBody>
              <Shared.ModalWarning>
                선택한 {selectedKeys.length}개 객체를 영구 삭제합니다. 복구할 수
                없으며 서버가 DB 참조를 다시 확인합니다.
              </Shared.ModalWarning>
              <S.Section>
                <S.Field>
                  리포트 ID 재입력 *
                  <S.Input
                    value={confirm}
                    placeholder={report.reportId}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setFormError("");
                    }}
                  />
                </S.Field>
              </S.Section>
              {formError || h.errorMessage ? (
                <Shared.Notice $variant="error">
                  {formError || h.errorMessage}
                </Shared.Notice>
              ) : null}
            </Shared.ModalBody>
            <Shared.ModalFooter>
              <Shared.SecondaryButton
                type="button"
                disabled={h.activeAction !== null}
                onClick={() => setDeleteOpen(false)}
              >
                취소
              </Shared.SecondaryButton>
              <Shared.PrimaryButton
                type="button"
                disabled={
                  !canDelete || confirm !== report.reportId
                }
                onClick={() => void remove()}
              >
                {h.activeAction === "delete" ? "삭제 중" : "영구 삭제"}
              </Shared.PrimaryButton>
            </Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  );
}
export default S3OrphanPage;
