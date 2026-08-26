import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminMerchantOwner,
  getAdminMerchantOwnerPlaces,
  getAdminMerchantOwners,
  replaceAdminMerchantOwnerPlaces,
  revokeAdminMerchantOwner,
  updateAdminMerchantOwnerOnboarding,
  updateAdminMerchantOwnerPlaceQuality,
} from "../api/adminMerchantOwnerApi";
import { getAuthErrorMessage } from "../api/authError";
import { isApiError } from "../api/customAxios";
import type {
  AdminMerchantOnboardingUpdateRequest,
  AdminMerchantOwnerErrorResponse,
  AdminMerchantOwnerPlace,
  AdminMerchantOwnerPlaceQualityUpdateRequest,
  AdminMerchantOwnerPlaceUpdateRequest,
  AdminMerchantOwnerProfile,
  AdminMerchantOwnerReviewRequest,
  MerchantOwnerStatus,
} from "../types/adminMerchantOwner.types";
import { logDebugError } from "../utils/debugLogger";
import { useAuth } from "./useAuth";

const LIMIT = 20;
export type MerchantOwnerAction =
  | "revoke"
  | "places"
  | "onboarding"
  | "quality";
const CATEGORY_MESSAGES = {
  unauthorized: "로그인이 필요합니다. 다시 로그인해주세요.",
  forbidden: "관리자 권한이 필요합니다.",
  "not-found": "상점주 또는 연결 장소를 찾을 수 없습니다.",
  conflict: "신청 또는 운영 상태가 이미 변경되었습니다. 다시 조회해주세요.",
  network: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  "request-blocked": "서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.",
  timeout: "응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
  server: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!isApiError<AdminMerchantOwnerErrorResponse>(error)) return fallback;
  return getAuthErrorMessage(error, {
    fallbackMessage: fallback,
    categoryMessages: CATEGORY_MESSAGES,
  });
}
function shouldClearAuth(error: unknown) {
  return (
    isApiError<AdminMerchantOwnerErrorResponse>(error) &&
    (error.response?.data?.code === "INVALID_TOKEN" ||
      error.category === "unauthorized")
  );
}

export function useAdminMerchantOwners() {
  const { clearAuth } = useAuth();
  const [status, setStatus] = useState<MerchantOwnerStatus | "">("ACTIVE");
  const [profiles, setProfiles] = useState<AdminMerchantOwnerProfile[]>([]);
  const [profile, setProfile] = useState<AdminMerchantOwnerProfile | null>(
    null,
  );
  const [places, setPlaces] = useState<AdminMerchantOwnerPlace[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<MerchantOwnerAction | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const listRef = useRef(0);
  const detailRef = useRef(0);
  const actionRef = useRef<MerchantOwnerAction | null>(null);
  const queryRef = useRef({ status, page });

  const fetchProfiles = useCallback(
    async (
      nextStatus = queryRef.current.status,
      nextPage = queryRef.current.page,
    ) => {
      const requestId = ++listRef.current;
      queryRef.current = { status: nextStatus, page: nextPage };
      setStatus(nextStatus);
      setPage(nextPage);
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await getAdminMerchantOwners({
          status: nextStatus || undefined,
          page: nextPage,
          limit: LIMIT,
        });
        if (requestId === listRef.current) {
          setProfiles(data.profiles);
          setPage(data.page);
          setTotalCount(data.totalCount);
          setTotalPages(data.totalPages);
          setHasNext(data.hasNext);
        }
        return true;
      } catch (error) {
        if (requestId === listRef.current) {
          setProfiles([]);
          setTotalCount(0);
          setTotalPages(0);
          setHasNext(false);
          setErrorMessage(
            getErrorMessage(
              error,
              "상점주 목록을 불러오지 못했습니다.",
            ),
          );
          if (shouldClearAuth(error)) clearAuth();
        }
        logDebugError("관리자 상점주 목록 조회 실패", error);
        return false;
      } finally {
        if (requestId === listRef.current) setIsLoading(false);
      }
    },
    [clearAuth],
  );

  const fetchDetail = useCallback(
    async (userId: number) => {
      const requestId = ++detailRef.current;
      setIsDetailLoading(true);
      setDetailErrorMessage("");
      setActionErrorMessage("");
      try {
        const [nextProfile, nextPlaces] = await Promise.all([
          getAdminMerchantOwner(userId),
          getAdminMerchantOwnerPlaces(userId),
        ]);
        if (requestId === detailRef.current) {
          setProfile(nextProfile);
          setPlaces(nextPlaces);
        }
        return nextProfile;
      } catch (error) {
        if (requestId === detailRef.current) {
          setProfile(null);
          setPlaces([]);
          setDetailErrorMessage(
            getErrorMessage(
              error,
              "상점주 상세를 불러오지 못했습니다.",
            ),
          );
          if (shouldClearAuth(error)) clearAuth();
        }
        logDebugError("관리자 상점주 상세 조회 실패", error);
        return null;
      } finally {
        if (requestId === detailRef.current) setIsDetailLoading(false);
      }
    },
    [clearAuth],
  );

  const runAction = useCallback(
    async <T>(
      action: MerchantOwnerAction,
      userId: number,
      request: () => Promise<T>,
      message: string,
    ) => {
      if (actionRef.current) return null;
      actionRef.current = action;
      setActiveAction(action);
      setActionErrorMessage("");
      setSuccessMessage("");
      try {
        const data = await request();
        setSuccessMessage(message);
        await Promise.all([
          fetchProfiles(queryRef.current.status, queryRef.current.page),
          fetchDetail(userId),
        ]);
        return data;
      } catch (error) {
        setActionErrorMessage(
          getErrorMessage(error, "상점주 작업을 처리하지 못했습니다."),
        );
        if (shouldClearAuth(error)) clearAuth();
        logDebugError(`관리자 상점주 ${action} 실패`, error);
        return null;
      } finally {
        actionRef.current = null;
        setActiveAction(null);
      }
    },
    [clearAuth, fetchDetail, fetchProfiles],
  );

  const review = useCallback(
    (userId: number, request: AdminMerchantOwnerReviewRequest) => {
      return runAction(
        "revoke",
        userId,
        () => revokeAdminMerchantOwner(userId, request),
        "상점주 권한을 회수했습니다.",
      );
    },
    [runAction],
  );
  const replacePlaces = useCallback(
    (userId: number, request: AdminMerchantOwnerPlaceUpdateRequest) =>
      runAction(
        "places",
        userId,
        () => replaceAdminMerchantOwnerPlaces(userId, request),
        "연결 장소를 변경했습니다.",
      ),
    [runAction],
  );
  const updateOnboarding = useCallback(
    (userId: number, request: AdminMerchantOnboardingUpdateRequest) =>
      runAction(
        "onboarding",
        userId,
        () => updateAdminMerchantOwnerOnboarding(userId, request),
        "온보딩 상태를 변경했습니다.",
      ),
    [runAction],
  );
  const updateQuality = useCallback(
    (
      userId: number,
      placeId: number,
      request: AdminMerchantOwnerPlaceQualityUpdateRequest,
    ) =>
      runAction(
        "quality",
        userId,
        () => updateAdminMerchantOwnerPlaceQuality(userId, placeId, request),
        "장소 운영 품질을 변경했습니다.",
      ),
    [runAction],
  );
  const clearDetail = useCallback(() => {
    ++detailRef.current;
    setProfile(null);
    setPlaces([]);
    setDetailErrorMessage("");
  }, []);

  useEffect(() => {
    void fetchProfiles("ACTIVE", 1);
  }, [fetchProfiles]);

  return {
    status,
    profiles,
    profile,
    places,
    page,
    totalCount,
    totalPages,
    hasNext,
    isLoading,
    isDetailLoading,
    activeAction,
    errorMessage,
    detailErrorMessage,
    actionErrorMessage,
    successMessage,
    fetchProfiles,
    fetchDetail,
    clearDetail,
    review,
    replacePlaces,
    updateOnboarding,
    updateQuality,
  };
}
