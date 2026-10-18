// Synthetic read-only QA; deliberately no individual issue ID.
export const qualityIssue = (number = 1, overrides = {}) => ({
  entityType: 'PLACE', entityId: number, ruleCode: 'SYNTHETIC_RULE',
  severity: ['INFO', 'WARNING', 'ERROR'][(number - 1) % 3], status: 'OPEN',
  details: `합성 품질 이슈 ${number}`, detectedAt: '2026-10-19T09:30:00',
  ...overrides,
})
export function qualityPage(page = 1, limit = 20, total = 45) {
  return {
    items: Array.from({ length: Math.max(0, Math.min(limit, total - (page - 1) * limit)) },
      (_, i) => qualityIssue((page - 1) * limit + i + 1)),
    page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit),
  }
}
