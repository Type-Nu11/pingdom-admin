import { AdminNavigationMenu } from "../../components/navigation/AdminNavigationMenu";
import { AdminStatusFilter } from "../../components/common/AdminStatusFilter";
import { AdminPagination } from "../../components/common/AdminPagination";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNotificationButton } from "../../components/adminNotification/AdminNotificationButton";
import { ADMIN_MAIN_SCROLL_AREA_ID } from "../../constants/layout";
import { useAdminNotificationOperations } from "../../hooks/useAdminNotificationOperations";
import { useAuth } from "../../hooks/useAuth";
import { NOTIFICATION_TYPE_LABELS, DELIVERY_STATUS_LABELS, OUTBOX_STATUS_LABELS, DELIVERY_CHANNEL_LABELS } from '../../utils/adminNotificationLabels';
import type {
  AdminNotificationDeliveryStatus,
  AdminOutboxEventItem,
  AdminOutboxEventStatus,
} from "../../types/adminNotification.types";
import * as Shell from "../place/PlaceManagePage.styles";
import * as Shared from "../placeMerge/PlaceMergePage.styles";
import * as S from "../placeVerification/PlaceVerificationPage.styles";
type Tab = "inbox" | "delivery" | "outbox";
const DELIVERY: AdminNotificationDeliveryStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "RETRY_SCHEDULED",
  "FINAL_FAILED",
];
const OUTBOX: AdminOutboxEventStatus[] = [
  "PENDING",
  "PROCESSING",
  "RETRY",
  "SUCCEEDED",
  "FAILED",
];
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
function NotificationOperationsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const h = useAdminNotificationOperations();
  const [tab, setTab] = useState<Tab>("inbox");
  const [target, setTarget] = useState<AdminOutboxEventItem | null>(null);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const admin =
    user?.username ||
    (typeof user?.id === "number" ? `ID ${user.id}` : "관리자 계정");
  const items =
    tab === "inbox"
      ? h.notifications
      : tab === "delivery"
        ? h.deliveries
        : h.events;
  const page = h.pages[tab],
    total = h.totals[tab],
    tp = h.totalPages[tab],
    next = h.hasNext[tab];
  const retry = async () => {
    if (!target) return;
    if (!reason.trim()) {
      setFormError("재처리 사유를 입력해주세요.");
      return;
    }
    if (await h.retry(target.eventId, reason.trim())) setTarget(null);
  };
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
            <Shell.TopTitle>알림 발송 현황</Shell.TopTitle>
          </Shell.TopTitleGroup>
          <Shell.TopActions>
            <AdminNotificationButton />
          </Shell.TopActions>
        </Shell.TopBar>
        <Shared.Content>
          <Shared.PageStack>
            <Shared.PageHeader>
              <div>
                <Shared.Eyebrow>시스템 &gt; 알림 발송 현황</Shared.Eyebrow>
                <Shared.PageTitle>알림 발송 현황</Shared.PageTitle>
                <Shared.PageDescription>
                  관리자 알림과 발송 성공·실패를 확인합니다. 실패한 처리 작업은
                  원인을 확인한 뒤 다시 요청할 수 있습니다.
                </Shared.PageDescription>
              </div>
            </Shared.PageHeader>
            <S.TabList>
              {(
                [
                  ["inbox", "관리자 알림"],
                  ["delivery", "발송 결과"],
                  ["outbox", "처리 작업"],
                ] as const
              ).map(([v, l]) => (
                <S.TabButton
                  key={v}
                  type="button"
                  $active={tab === v}
                  onClick={() => setTab(v)}
                >
                  {l}
                </S.TabButton>
              ))}
            </S.TabList>
            {h.errorMessage ? (
              <Shared.Notice $variant="error">{h.errorMessage}</Shared.Notice>
            ) : null}
            {h.successMessage ? (
              <Shared.Notice $variant="success">
                {h.successMessage}
              </Shared.Notice>
            ) : null}
            {tab === "delivery" ? (
              <AdminStatusFilter
                label="발송 상태"
                value={h.deliveryStatus}
                onChange={(e) => void h.fetchTab("delivery", 1, e.target.value)}
              >
                <option value="">전체</option>
                {DELIVERY.map((v) => (
                  <option key={v} value={v}>{DELIVERY_STATUS_LABELS[v]}</option>
                ))}
              </AdminStatusFilter>
            ) : null}
            {tab === "outbox" ? (
              <AdminStatusFilter
                label="처리 작업 상태"
                value={h.outboxStatus}
                onChange={(e) => void h.fetchTab("outbox", 1, e.target.value)}
              >
                <option value="">전체</option>
                {OUTBOX.map((v) => (
                  <option key={v} value={v}>{OUTBOX_STATUS_LABELS[v]}</option>
                ))}
              </AdminStatusFilter>
            ) : null}
            <Shared.Panel>
              <Shared.PanelHeader>
                <div>
                  <Shared.PanelTitle>
                    {tab === "inbox"
                      ? "관리자 알림"
                      : tab === "delivery"
                        ? "알림 발송 결과"
                        : "처리 작업"}
                  </Shared.PanelTitle>
                </div>
                <Shared.HeaderActions>
                  {tab === "inbox" ? (
                    <Shared.HeaderButton
                      type="button"
                      onClick={() => void h.read()}
                    >
                      모두 읽음
                    </Shared.HeaderButton>
                  ) : null}
                  <Shared.PanelCount>
                    {total.toLocaleString()}건
                  </Shared.PanelCount>
                </Shared.HeaderActions>
              </Shared.PanelHeader>
              <Shared.CompareBody>
                {items.length === 0 ? (
                  <Shared.EmptyState>
                    <strong>
                      {h.isLoading ? "불러오는 중입니다." : "항목이 없습니다."}
                    </strong>
                  </Shared.EmptyState>
                ) : (
                  <S.CardList>
                    {tab === "inbox"
                      ? h.notifications.map((n) => (
                          <S.RecordCard key={n.notificationId}>
                            <S.RecordHeader>
                              <div>
                                <S.RecordTitle>{n.title}</S.RecordTitle>
                                <S.RecordMeta>
                                  {NOTIFICATION_TYPE_LABELS[n.type] || `알림 유형 확인 필요 (${n.type})`} · {date(n.createdAt)}
                                </S.RecordMeta>
                              </div>
                              <S.StatusBadge
                                $tone={n.read ? "success" : "warning"}
                              >
                                {n.read ? "읽음" : "미확인"}
                              </S.StatusBadge>
                            </S.RecordHeader>
                            <S.RecordDescription>{n.body}</S.RecordDescription>
                            {!n.read ? (
                              <S.InlineActions>
                                <Shared.SecondaryButton
                                  type="button"
                                  onClick={() => void h.read(n.notificationId)}
                                >
                                  읽음 처리
                                </Shared.SecondaryButton>
                              </S.InlineActions>
                            ) : null}
                          </S.RecordCard>
                        ))
                      : tab === "delivery"
                        ? h.deliveries.map((d) => (
                            <S.RecordCard key={d.deliveryId}>
                              <S.RecordHeader>
                                <div>
                                  <S.RecordTitle>
                                    {DELIVERY_CHANNEL_LABELS[d.channel] || d.channel} 발송 #{d.deliveryId}
                                  </S.RecordTitle>
                                  <S.RecordMeta>
                                    사용자 #{d.userId} · 시도 {d.attemptCount}회
                                    · {date(d.updatedAt)}
                                  </S.RecordMeta>
                                </div>
                                <S.StatusBadge
                                  $tone={
                                    d.status === "SUCCEEDED"
                                      ? "success"
                                      : d.retryable
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {DELIVERY_STATUS_LABELS[d.status] || '상태 확인 필요'}
                                </S.StatusBadge>
                              </S.RecordHeader>
                              <details><summary>기술 정보 보기</summary><S.DetailGrid>
                                <S.DetailItem>
                                  <dt>발송사 오류</dt>
                                  <dd>{d.providerErrorCode || "없음"}</dd>
                                </S.DetailItem>
                                <S.DetailItem>
                                  <dt>내부 오류</dt>
                                  <dd>{d.errorCode || "없음"}</dd>
                                </S.DetailItem>
                              </S.DetailGrid><p>상태 코드: {d.status}</p>{d.outboxEventId ? <p>관련 작업 번호: {d.outboxEventId}</p> : null}</details>
                              <S.RecordDescription>
                                {d.failureReason || (d.status === 'SUCCEEDED' ? '알림을 정상적으로 발송했습니다.' : '발송 상세 사유가 기록되지 않았습니다.')}
                              </S.RecordDescription>
                            </S.RecordCard>
                          ))
                        : h.events.map((e) => (
                            <S.RecordCard key={e.eventId}>
                              <S.RecordHeader>
                                <div>
                                  <S.RecordTitle>{e.status === 'FAILED' ? '실패한 처리 작업' : '처리 작업'}</S.RecordTitle>
                                  <S.RecordMeta>
                                    등록 {date(e.createdAt)}
                                  </S.RecordMeta>
                                </div>
                                <S.StatusBadge
                                  $tone={
                                    e.status === "SUCCEEDED"
                                      ? "success"
                                      : e.status === "FAILED"
                                        ? "danger"
                                        : "warning"
                                  }
                                >
                                  {OUTBOX_STATUS_LABELS[e.status] || '상태 확인 필요'}
                                </S.StatusBadge>
                              </S.RecordHeader>
                              <S.DetailGrid>
                                <S.DetailItem>
                                  <dt>시도 횟수</dt>
                                  <dd>{e.attemptCount}회</dd>
                                </S.DetailItem>
                                <S.DetailItem>
                                  <dt>다음 시도</dt>
                                  <dd>{date(e.nextAttemptAt)}</dd>
                                </S.DetailItem>
                              </S.DetailGrid>
                              {e.status === 'FAILED' ? <S.RecordDescription>처리하지 못한 작업입니다. 원인을 확인한 뒤 다시 요청해주세요.</S.RecordDescription> : null}
                              <details><summary>기술 정보 보기</summary><S.DetailGrid>
                                <S.DetailItem><dt>작업 코드</dt><dd>{e.eventType}</dd></S.DetailItem>
                                <S.DetailItem><dt>작업 번호</dt><dd>{e.eventId}</dd></S.DetailItem>
                                <S.DetailItem><dt>대상 코드</dt><dd>{e.aggregateType}</dd></S.DetailItem>
                                <S.DetailItem><dt>대상 번호</dt><dd>{e.aggregateId}</dd></S.DetailItem>
                                <S.DetailItem><dt>상태 코드</dt><dd>{e.status}</dd></S.DetailItem>
                                <S.DetailItem><dt>마지막 오류</dt><dd>{e.lastError || '기록 없음'}</dd></S.DetailItem>
                              </S.DetailGrid></details>
                              {e.status === "FAILED" ? (
                                <S.InlineActions>
                                  <Shared.PrimaryButton
                                    type="button"
                                    disabled={Boolean(h.retryingId)}
                                    onClick={() => {
                                      setTarget(e);
                                      setReason("");
                                      setFormError("");
                                    }}
                                  >
                                    재처리
                                  </Shared.PrimaryButton>
                                </S.InlineActions>
                              ) : null}
                            </S.RecordCard>
                          ))}
                  </S.CardList>
                )}
              </Shared.CompareBody>
              {tp > 1 ? <AdminPagination ariaLabel="알림 운영 목록 페이지네이션" page={page} totalPages={tp} hasNext={next} disabled={h.isLoading} onPageChange={(nextPage) => void h.fetchTab(tab, nextPage)} /> : null}
            </Shared.Panel>
          </Shared.PageStack>
        </Shared.Content>
      </Shell.MainArea>
      {target ? (
        <Shared.ModalOverlay
          role="presentation"
          onMouseDown={() => !h.retryingId && setTarget(null)}
        >
          <Shared.Modal
            role="dialog"
            aria-modal="true"
            aria-labelledby="outbox-retry-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Shared.ModalHeader>
              <Shared.ModalTitle id="outbox-retry-title">
                실패한 작업 다시 요청
              </Shared.ModalTitle>
            </Shared.ModalHeader>
            <Shared.ModalBody>
              <Shared.ModalWarning>
                실패 원인이 해결되었는지, 이미 처리된 내용이 중복 반영되지 않는지 담당자에게 확인한 뒤 다시 요청해주세요.
              </Shared.ModalWarning>
              <S.Section>
                <S.Field>
                  재처리 사유 *
                  <S.TextArea
                    value={reason}
                    maxLength={500}
                    onChange={(e) => {
                      setReason(e.target.value);
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
                disabled={Boolean(h.retryingId)}
                onClick={() => setTarget(null)}
              >
                취소
              </Shared.SecondaryButton>
              <Shared.PrimaryButton
                type="button"
                disabled={Boolean(h.retryingId)}
                onClick={() => void retry()}
              >
                {h.retryingId ? "재처리 요청 중" : "재처리 요청"}
              </Shared.PrimaryButton>
            </Shared.ModalFooter>
          </Shared.Modal>
        </Shared.ModalOverlay>
      ) : null}
    </Shell.AppShell>
  );
}
export default NotificationOperationsPage;
