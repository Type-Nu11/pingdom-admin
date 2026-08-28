import {
  getAdminPlaceDuplicateGroups,
  getAdminPlaceDuplicateReviewCandidates,
} from "./adminPlaceMergeApi";
import { getAdminPlaceInformationReports } from "./adminPlaceVerificationApi";
import { getAdminReportAppeals } from "./adminReportAppealApi";
import {
  getAdminScoutFieldReports,
  getAdminScoutProfiles,
} from "./adminScoutApi";
import { getAdminTrustScoreAnomalies } from "./adminTrustScoreApi";
import {
  getAdminVisitorVerificationCorrections,
  getAdminVisitorVerificationReports,
} from "./adminVisitorVerificationApi";
import { getAdminMerchantPlaceApplications } from "./adminMerchantPlaceApplicationApi";

export interface AdminPendingWorkItem {
  key: string;
  title: string;
  description: string;
  count: number;
  path: string;
  state?: Record<string, unknown>;
}

export interface AdminPendingWorkSummary {
  items: AdminPendingWorkItem[];
  totalCount: number;
  checkedCount: number;
  failedCount: number;
  failures: unknown[];
}

type PendingWorkCheck = () => Promise<AdminPendingWorkItem[]>;

function item(
  key: string,
  title: string,
  description: string,
  count: number,
  path: string,
  state?: Record<string, unknown>,
): AdminPendingWorkItem {
  return { key, title, description, count, path, state };
}

const checks: PendingWorkCheck[] = [
  async () => {
    const response = await getAdminPlaceDuplicateGroups();
    return [
      item(
        "duplicate-place-groups",
        "장소 병합 대기",
        "중복 확정 후 병합이 필요한 장소 그룹",
        response.totalCount,
        "/places/duplicates",
      ),
    ];
  },
  async () => {
    const response = await getAdminPlaceDuplicateReviewCandidates("PENDING");
    return [
      item(
        "duplicate-place-candidates",
        "중복 장소 후보",
        "검토 대기 중인 중복 장소 후보",
        response.totalCount,
        "/places/duplicate-candidates",
      ),
    ];
  },
  async () => {
    const response = await getAdminPlaceInformationReports({
      status: "SUBMITTED",
      page: 1,
      limit: 1,
    });
    return [
      item(
        "place-information-reports",
        "장소 정보 검증",
        "접수 후 검토되지 않은 장소 정보 신고",
        response.totalCount,
        "/places/information-verification",
      ),
    ];
  },
  async () => {
    const response = await getAdminReportAppeals({
      status: "SUBMITTED",
      page: 1,
      limit: 1,
    });
    return [
      item(
        "report-appeals",
        "신고 이의제기",
        "검토 대기 중인 신고 이의제기",
        response.totalCount,
        "/reports/appeals",
      ),
    ];
  },
  async () => {
    const response = await getAdminMerchantPlaceApplications({
      status: "PENDING",
      page: 1,
      limit: 1,
    });
    return [
      item(
        "merchant-place-applications",
        "상점주 장소 신청 심사",
        "심사 대기 중인 신규 장소 등록·장소 권한 신청",
        response.total,
        "/merchant-place-applications",
      ),
    ];
  },
  async () => {
    const [reports, corrections] = await Promise.all([
      getAdminVisitorVerificationReports({
        status: "SUBMITTED",
        page: 1,
        limit: 1,
      }),
      getAdminVisitorVerificationCorrections({
        status: "SUBMITTED",
        page: 1,
        limit: 1,
      }),
    ]);
    return [
      item(
        "visitor-verification-reports",
        "방문자 검증 제보",
        "심사 대기 중인 방문자 현장 제보",
        reports.totalElements,
        "/visitor-verifications?tab=reports",
      ),
      item(
        "visitor-verification-corrections",
        "방문자 정정 요청",
        "심사 대기 중인 방문자 정정 요청",
        corrections.totalElements,
        "/visitor-verifications?tab=corrections",
      ),
    ];
  },
  async () => {
    const [profiles, reports] = await Promise.all([
      getAdminScoutProfiles({ status: "PENDING", page: 1, limit: 1 }),
      getAdminScoutFieldReports({ status: "SUBMITTED", page: 1, limit: 1 }),
    ]);
    return [
      item(
        "scout-profiles",
        "Scout 프로필",
        "승인 대기 중인 Scout 프로필",
        profiles.totalCount,
        "/scouts?tab=profiles",
      ),
      item(
        "scout-field-reports",
        "Scout 현장 제보",
        "심사 대기 중인 Scout 현장 제보",
        reports.totalElements,
        "/scouts?tab=reports",
      ),
    ];
  },
  async () => {
    const response = await getAdminTrustScoreAnomalies({
      unresolvedOnly: true,
      page: 1,
      limit: 1,
    });
    return [
      item(
        "trust-score-anomalies",
        "Trust Score 이상치",
        "아직 해결되지 않은 Trust Score 이상치",
        response.totalCount,
        "/trust-score?tab=anomalies",
      ),
    ];
  },
];

export async function getAdminPendingWorkSummary(): Promise<AdminPendingWorkSummary> {
  const results = await Promise.allSettled(checks.map((check) => check()));
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((pendingItem) => pendingItem.count > 0);

  return {
    items,
    totalCount: items.reduce((sum, pendingItem) => sum + pendingItem.count, 0),
    checkedCount: checks.length,
    failedCount: failures.length,
    failures,
  };
}
