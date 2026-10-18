// Synthetic QA only; no production identifiers, credentials or mutation calls.
export const reporter = (id = 1) => ({
  reporterUserId: id, reporterUsername: `합성 신고자 ${id}`, trustScore: 75, trustGrade: 'NORMAL',
  restricted: false, restrictedUntil: null, restrictionReason: null,
  evidence: { submittedCount: 10, acceptedCount: 8, declinedCount: 2, falseReportCount: 0, acceptanceRate: 80, baseScore: 50, acceptedScoreBonus: 25, falseReportScorePenalty: 0 },
})
export function historyPage(id = 1, page = 1, limit = 20, total = 45) {
  return {
    items: Array.from({ length: Math.max(0, Math.min(limit, total - (page - 1) * limit)) }, (_, i) => ({
      id: id * 1000 + (page - 1) * limit + i + 1, reporterUserId: id, beforeScore: 50, afterScore: 51,
      reason: `합성 이력 ${id}-${(page - 1) * limit + i + 1}`, changedAt: '2026-10-19T10:00:00',
    })),
    page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit),
  }
}
