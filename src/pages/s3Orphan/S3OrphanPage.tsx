import { AdminNavigationMenu } from "../../components/navigation/AdminNavigationMenu";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNotificationButton } from "../../components/adminNotification/AdminNotificationButton";
import { AdminPagination } from "../../components/common/AdminPagination";
import { ADMIN_MAIN_SCROLL_AREA_ID } from "../../constants/layout";
import { useAdminS3Orphans } from "../../hooks/useAdminS3Orphans";
import { useAuth } from "../../hooks/useAuth";
import * as Shell from "../place/PlaceManagePage.styles";
import * as Shared from "../placeMerge/PlaceMergePage.styles";
import * as S from "../placeVerification/PlaceVerificationPage.styles";
function date(v?: string | null) {
  if (!v) return "없음";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}
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
    if (!report) return;
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
            <Shell.TopTitle>S3 고아 객체</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>시스템 &gt; 저장소 정리</Shared.Eyebrow>
                <Shared.PageTitle>S3 고아 객체 관리</Shared.PageTitle>
                <Shared.PageDescription>
                  DB 참조와 S3 객체를 대조하고 완료된 리포트의 삭제 후보만
                  안전하게 정리합니다.
                </Shared.PageDescription>
              </div>
              <Shared.HeaderActions>
                <Shared.PrimaryButton
                  type="button"
                  disabled={h.activeAction !== null}
                  onClick={() => void h.refresh()}
                >
                  {h.activeAction === "refresh"
                    ? "생성 중"
                    : "리포트 새로 생성"}
                </Shared.PrimaryButton>
              </Shared.HeaderActions>
            </Shared.PageHeader>
            {h.errorMessage ? (
              <Shared.Notice $variant="error">{h.errorMessage}</Shared.Notice>
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
                  <Shared.PanelTitle>즉시 dry-run</Shared.PanelTitle>
                  <Shared.PanelDescription>
                    삭제 없이 지정 prefix를 최대 개수까지 비교합니다.
                  </Shared.PanelDescription>
                </div>
              </Shared.PanelHeader>
              <S.FormBody>
                <S.FormGrid>
                  <S.Field>
                    S3 prefix
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
                    disabled={h.isLoading}
                    onClick={dry}
                  >
                    dry-run 실행
                  </Shared.SecondaryButton>
                </S.InlineActions>
                {h.dryRun ? (
                  <S.DetailGrid>
                    <S.DetailItem>
                      <dt>DB 키</dt>
                      <dd>{h.dryRun.dbKeyCount.toLocaleString()}개</dd>
                    </S.DetailItem>
                    <S.DetailItem>
                      <dt>S3 객체</dt>
                      <dd>{h.dryRun.s3ObjectCount.toLocaleString()}개</dd>
                    </S.DetailItem>
                    <S.DetailItem>
                      <dt>고아 후보</dt>
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
                  <Shared.PanelTitle>백그라운드 리포트</Shared.PanelTitle>
                  <Shared.PanelDescription>
                    {h.status
                      ? `${h.status.reportId} · ${h.status.status} · ${date(h.status.generatedAt)}`
                      : "생성된 리포트가 없습니다."}
                  </Shared.PanelDescription>
                </div>
                <Shared.PanelCount>
                  {h.status?.deleteCandidateCount.toLocaleString() || 0}개 후보
                </Shared.PanelCount>
              </Shared.PanelHeader>
              {h.status?.status === "RUNNING" ? (
                <Shared.EmptyState>
                  <strong>
                    DB와 S3를 비교 중입니다. 자동으로 상태를 갱신합니다.
                  </strong>
                </Shared.EmptyState>
              ) : h.status?.status === "FAILED" ? (
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
                    disabled={!report || selectedKeys.length === 0}
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
                {!report ? (
                  <Shared.EmptyState>
                    <strong>완료된 리포트가 없습니다.</strong>
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
                  disabled={h.isLoading}
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
                S3 객체 영구 삭제
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
                  h.activeAction !== null || confirm !== report.reportId
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
