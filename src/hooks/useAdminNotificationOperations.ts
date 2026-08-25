import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminNotificationDeliveries,
  getAdminNotifications,
  getAdminOutboxEvents,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  retryAdminOutboxEvent,
} from "../api/adminNotificationApi";
import { getAuthErrorMessage } from "../api/authError";
import { isApiError } from "../api/customAxios";
import type {
  AdminNotificationDeliveryItem,
  AdminNotificationDeliveryStatus,
  AdminNotificationItem,
  AdminOutboxEventItem,
  AdminOutboxEventStatus,
} from "../types/adminNotification.types";
import type { AuthErrorResponse } from "../types/auth.types";
import { logDebugError } from "../utils/debugLogger";
import { useAuth } from "./useAuth";
const C = {
  unauthorized: "로그인이 필요합니다.",
  forbidden: "해당 운영 권한이 필요합니다.",
  "not-found": "대상 이벤트를 찾을 수 없습니다.",
  conflict: "현재 이벤트 상태에서는 재처리할 수 없습니다.",
  network: "서버에 연결할 수 없습니다.",
  "request-blocked": "서버 응답을 읽지 못했습니다.",
  timeout: "응답이 지연되고 있습니다.",
  server: "서버 오류가 발생했습니다.",
};
export function useAdminNotificationOperations() {
  const { clearAuth } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>(
    [],
  );
  const [deliveries, setDeliveries] = useState<AdminNotificationDeliveryItem[]>(
    [],
  );
  const [events, setEvents] = useState<AdminOutboxEventItem[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<
    AdminNotificationDeliveryStatus | ""
  >("FAILED");
  const [outboxStatus, setOutboxStatus] = useState<AdminOutboxEventStatus | "">(
    "FAILED",
  );
  const [pages, setPages] = useState({ inbox: 1, delivery: 1, outbox: 1 });
  const [totals, setTotals] = useState({ inbox: 0, delivery: 0, outbox: 0 });
  const [totalPages, setTotalPages] = useState({
    inbox: 0,
    delivery: 0,
    outbox: 0,
  });
  const [hasNext, setHasNext] = useState({
    inbox: false,
    delivery: false,
    outbox: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const retryRef = useRef(false);
  const msg = useCallback(
    (e: unknown, f: string) => {
      if (!isApiError<AuthErrorResponse>(e)) return f;
      if (
        e.response?.data?.code === "INVALID_TOKEN" ||
        e.category === "unauthorized"
      )
        clearAuth();
      return getAuthErrorMessage(e, {
        fallbackMessage: f,
        categoryMessages: C,
      });
    },
    [clearAuth],
  );
  const fetchTab = useCallback(
    async (tab: "inbox" | "delivery" | "outbox", page = 1, status?: string) => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        if (tab === "inbox") {
          const d = await getAdminNotifications({ page, limit: 20 });
          setNotifications(d.notifications);
          setPages((p) => ({ ...p, inbox: d.page }));
          setTotals((p) => ({ ...p, inbox: d.totalCount }));
          setTotalPages((p) => ({ ...p, inbox: d.totalPages }));
          setHasNext((p) => ({ ...p, inbox: d.hasNext }));
        } else if (tab === "delivery") {
          const s = (status ?? deliveryStatus) as
            | AdminNotificationDeliveryStatus
            | "";
          const d = await getAdminNotificationDeliveries({
            status: s || undefined,
            page,
            limit: 20,
          });
          setDeliveries(d.deliveries);
          setDeliveryStatus(s);
          setPages((p) => ({ ...p, delivery: d.page }));
          setTotals((p) => ({ ...p, delivery: d.totalCount }));
          setTotalPages((p) => ({ ...p, delivery: d.totalPages }));
          setHasNext((p) => ({ ...p, delivery: d.hasNext }));
        } else {
          const s = (status ?? outboxStatus) as AdminOutboxEventStatus | "";
          const d = await getAdminOutboxEvents({
            status: s || undefined,
            page,
            limit: 20,
          });
          setEvents(d.events);
          setOutboxStatus(s);
          setPages((p) => ({ ...p, outbox: d.page }));
          setTotals((p) => ({ ...p, outbox: d.totalCount }));
          setTotalPages((p) => ({ ...p, outbox: d.totalPages }));
          setHasNext((p) => ({ ...p, outbox: d.hasNext }));
        }
        return true;
      } catch (e) {
        setErrorMessage(msg(e, "운영 목록을 불러오지 못했습니다."));
        logDebugError(`관리자 ${tab} 운영 조회 실패`, e);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [deliveryStatus, msg, outboxStatus],
  );
  const read = useCallback(
    async (id?: number) => {
      try {
        if (id) await markAdminNotificationAsRead(id);
        else await markAllAdminNotificationsAsRead();
        await fetchTab("inbox", pages.inbox);
        return true;
      } catch (e) {
        setErrorMessage(msg(e, "알림을 읽음 처리하지 못했습니다."));
        return false;
      }
    },
    [fetchTab, msg, pages.inbox],
  );
  const retry = useCallback(
    async (eventId: string, reason: string) => {
      if (retryRef.current) return false;
      retryRef.current = true;
      setRetryingId(eventId);
      setErrorMessage("");
      setSuccessMessage("");
      try {
        await retryAdminOutboxEvent(eventId, reason);
        setSuccessMessage("재처리 이벤트 재실행을 예약했습니다.");
        await fetchTab("outbox", pages.outbox);
        return true;
      } catch (e) {
        setErrorMessage(msg(e, "재처리 이벤트를 재실행하지 못했습니다."));
        return false;
      } finally {
        retryRef.current = false;
        setRetryingId("");
      }
    },
    [fetchTab, msg, pages.outbox],
  );
  useEffect(() => {
    void fetchTab("inbox", 1);
    void fetchTab("delivery", 1, "FAILED");
    void fetchTab("outbox", 1, "FAILED");
  }, [fetchTab]);
  return {
    notifications,
    deliveries,
    events,
    deliveryStatus,
    outboxStatus,
    pages,
    totals,
    totalPages,
    hasNext,
    isLoading,
    retryingId,
    errorMessage,
    successMessage,
    fetchTab,
    read,
    retry,
  };
}
