// Synthetic records only. No operational review targets or credentials.
export function dispute(reportId = 1, disputeId = reportId * 10 + 1) {
  return { disputeId, reportId, disputedByUserId: 90, description: `합성 반박 ${disputeId}`,
    evidenceUrl: null, status: 'SUBMITTED', reviewedByAdminUserId: null, reviewReason: null,
    reviewedAt: null, createdAt: '2026-10-19T09:00:00Z', updatedAt: '2026-10-19T09:00:00Z' }
}
export function report(reportId = 1) {
  return { reportId, placeId: 100 + reportId, evidenceId: null, reporterUserId: 80,
    targetType: 'ADDRESS', reasonType: 'INCORRECT', description: `합성 신고 본문 ${reportId}`,
    evidenceUrl: null, status: 'SUBMITTED', reviewedByAdminUserId: null, reviewReason: null,
    reviewedAt: null, resolvedAt: null, createdAt: '2026-10-19T09:00:00Z', updatedAt: '2026-10-19T09:00:00Z',
    disputes: [dispute(reportId), dispute(reportId, reportId * 10 + 2)] }
}
export const list = (reports = [report(1), report(2)]) => ({
  reports, page: 1, limit: 10, totalCount: reports.length, totalPages: reports.length ? 1 : 0, hasNext: false,
})
