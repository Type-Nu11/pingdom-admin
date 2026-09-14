import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoDismissMessage } from './useAutoDismissMessage'
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
  const [loading, setLoading] = useState({ inbox: false, delivery: false, outbox: false });
  const isLoading = Object.values(loading).some(Boolean);
  const queryRef = useRef({ inbox: { page: 1, status: "" }, delivery: { page: 1, status: "FAILED" }, outbox: { page: 1, status: "FAILED" } });
  const requestRef = useRef({ inbox: 0, delivery: 0, outbox: 0 });
  const mountedRef = useRef(true);
  const [retryingId, setRetryingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("")
  useAutoDismissMessage(successMessage, setSuccessMessage);
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
      const requestId = ++requestRef.current[tab];
      const s = status ?? queryRef.current[tab].status;
      const filterChanged = s !== queryRef.current[tab].status;
      queryRef.current[tab] = { page, status: s };
      const isCurrent = () => mountedRef.current && requestRef.current[tab] === requestId;
      setPages((p) => ({ ...p, [tab]: page }));
      // 이전 페이지의 이동 가능 여부를 새 요청에 재사용하지 않습니다.
      setHasNext((p) => ({ ...p, [tab]: false }));
      if (filterChanged) {
        setTotals((p) => ({ ...p, [tab]: 0 }));
        setTotalPages((p) => ({ ...p, [tab]: 0 }));
      }
      if (tab === "delivery") {
        setDeliveryStatus(s as AdminNotificationDeliveryStatus | "");
        setDeliveries([]);
      } else if (tab === "outbox") {
        setOutboxStatus(s as AdminOutboxEventStatus | "");
        setEvents([]);
      } else setNotifications([]);
      setLoading((current) => ({ ...current, [tab]: true }));
      setErrorMessage("");
      try {
        if (tab === "inbox") {
          const d = await getAdminNotifications({ page, limit: 10 });
          if (!isCurrent()) return false;
          queryRef.current.inbox.page = d.page;
          setNotifications(d.notifications);
          setPages((p) => ({ ...p, inbox: d.page }));
          setTotals((p) => ({ ...p, inbox: d.totalCount }));
          setTotalPages((p) => ({ ...p, inbox: d.totalPages }));
          setHasNext((p) => ({ ...p, inbox: d.hasNext }));
        } else if (tab === "delivery") {
          const d = await getAdminNotificationDeliveries({
            status: (s || undefined) as AdminNotificationDeliveryStatus | undefined,
            page,
            limit: 10,
          });
          if (!isCurrent()) return false;
          queryRef.current.delivery.page = d.page;
          setDeliveries(d.deliveries);
          setPages((p) => ({ ...p, delivery: d.page }));
          setTotals((p) => ({ ...p, delivery: d.totalCount }));
          setTotalPages((p) => ({ ...p, delivery: d.totalPages }));
          setHasNext((p) => ({ ...p, delivery: d.hasNext }));
        } else {
          const d = await getAdminOutboxEvents({
            status: (s || undefined) as AdminOutboxEventStatus | undefined,
            page,
            limit: 10,
          });
          if (!isCurrent()) return false;
          queryRef.current.outbox.page = d.page;
          setEvents(d.events);
          setPages((p) => ({ ...p, outbox: d.page }));
          setTotals((p) => ({ ...p, outbox: d.totalCount }));
          setTotalPages((p) => ({ ...p, outbox: d.totalPages }));
          setHasNext((p) => ({ ...p, outbox: d.hasNext }));
        }
        return true;
      } catch (e) {
        if (!isCurrent()) return false;
        setErrorMessage(msg(e, "운영 목록을 불러오지 못했습니다."));
        logDebugError(`관리자 ${tab} 운영 조회 실패`, e);
        return false;
      } finally {
        if (isCurrent()) setLoading((current) => ({ ...current, [tab]: false }));
      }
    },
    [msg],
  );
  const read = useCallback(
    async (id?: number) => {
      try {
        if (id) await markAdminNotificationAsRead(id);
        else await markAllAdminNotificationsAsRead();
        if (!mountedRef.current) return false;
        await fetchTab("inbox", queryRef.current.inbox.page);
        return true;
      } catch (e) {
        setErrorMessage(msg(e, "알림을 읽음 처리하지 못했습니다."));
        return false;
      }
    },
    [fetchTab, msg],
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
        if (!mountedRef.current) return false;
        setSuccessMessage("재처리 이벤트 재실행을 예약했습니다.");
        await fetchTab("outbox", queryRef.current.outbox.page);
        return true;
      } catch (e) {
        setErrorMessage(msg(e, "재처리 이벤트를 재실행하지 못했습니다."));
        return false;
      } finally {
        retryRef.current = false;
        setRetryingId("");
      }
    },
    [fetchTab, msg],
  );
  useEffect(() => {
    mountedRef.current = true;
    const requests = requestRef.current;
    void fetchTab("inbox", 1);
    void fetchTab("delivery", 1, "FAILED");
    void fetchTab("outbox", 1, "FAILED");
    return () => {
      mountedRef.current = false;
      requests.inbox += 1;
      requests.delivery += 1;
      requests.outbox += 1;
    };
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
