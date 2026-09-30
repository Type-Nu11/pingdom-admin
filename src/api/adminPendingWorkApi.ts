import { getAdminPlaceDuplicateGroups, getAdminPlaceDuplicateReviewCandidates } from './adminPlaceMergeApi'
import { getAdminPlaceInformationReports } from './adminPlaceVerificationApi'
import { getAdminScoutFieldReports, getAdminScoutProfiles } from './adminScoutApi'
import { getAdminTrustScoreAnomalies } from './adminTrustScoreApi'
import { getAdminVisitorVerificationCorrections, getAdminVisitorVerificationReports } from './adminVisitorVerificationApi'
import { getAdminMerchantPlaceApplications } from './adminMerchantPlaceApplicationApi'
import { getAdminReservations } from './adminReservationApi'
import { getAdminPlaceReviewDeletionRequests } from './adminPlaceReviewDeletionApi'
import { getCommunityReports } from './adminCommunityApi'

export interface AdminPendingWorkItem {
  key: string
  title: string
  description: string
  count: number
  path: string
  state?: Record<string, unknown>
}

export interface AdminPendingWorkEntry extends Omit<AdminPendingWorkItem, 'count'> {
  count: number | null
  status: 'loading' | 'success' | 'error'
  updatedAt: number | null
}

interface PendingWorkDefinition extends Omit<AdminPendingWorkItem, 'count'> {
  load: () => Promise<number>
}

// Failed and empty checks keep their category and navigation target.
const definitions: PendingWorkDefinition[] = [
  { key: 'reservations', title: '예약 심사', description: '심사 대기 예약', path: '/reservations/review', load: async () => (await getAdminReservations({ status: 'PENDING', page: 1, limit: 1 })).totalElements },
  { key: 'merchant-place-applications', title: '상점주 장소 신청 심사', description: '심사 대기 신규 장소 등록·장소 권한 신청', path: '/merchant-place-applications', load: async () => (await getAdminMerchantPlaceApplications({ status: 'PENDING', page: 1, limit: 1 })).total },
  { key: 'review-deletion-requests', title: '리뷰 삭제 요청', description: '심사 대기 리뷰 삭제 요청', path: '/review-deletion-requests', load: async () => (await getAdminPlaceReviewDeletionRequests({ status: 'PENDING', page: 1, limit: 1 })).totalElements },
  { key: 'community-reports', title: '커뮤니티 신고', description: '심사 대기 글·댓글 신고', path: '/community-reports', load: async () => (await getCommunityReports({ status: 'PENDING', page: 1 })).totalCount },
  { key: 'duplicate-place-groups', title: '장소 병합 대기', description: '중복 확정 후 병합이 필요한 장소 그룹', path: '/places/duplicates', load: async () => (await getAdminPlaceDuplicateGroups()).totalCount },
  { key: 'duplicate-place-candidates', title: '중복 장소 후보', description: '검토 대기 중인 중복 장소 후보', path: '/places/duplicate-candidates', load: async () => (await getAdminPlaceDuplicateReviewCandidates('PENDING')).totalCount },
  { key: 'place-information-reports', title: '장소 정보 검증', description: '접수 후 검토되지 않은 장소 정보 신고', path: '/places/information-verification', load: async () => (await getAdminPlaceInformationReports({ status: 'SUBMITTED', page: 1, limit: 1 })).totalCount },
  { key: 'visitor-verification-reports', title: '방문자 검증 제보', description: '심사 대기 방문자 현장 제보', path: '/visitor-verifications?tab=reports', load: async () => (await getAdminVisitorVerificationReports({ status: 'SUBMITTED', page: 1, limit: 1 })).totalElements },
  { key: 'visitor-verification-corrections', title: '방문자 정정 요청', description: '심사 대기 방문자 정정 요청', path: '/visitor-verifications?tab=corrections', load: async () => (await getAdminVisitorVerificationCorrections({ status: 'SUBMITTED', page: 1, limit: 1 })).totalElements },
  { key: 'scout-profiles', title: 'Scout 프로필', description: '승인 대기 Scout 프로필', path: '/scouts?tab=profiles', load: async () => (await getAdminScoutProfiles({ status: 'PENDING', page: 1, limit: 1 })).totalCount },
  { key: 'scout-field-reports', title: 'Scout 현장 제보', description: '심사 대기 Scout 현장 제보', path: '/scouts?tab=reports', load: async () => (await getAdminScoutFieldReports({ status: 'SUBMITTED', page: 1, limit: 1 })).totalElements },
  { key: 'trust-score-anomalies', title: 'Trust Score 이상치', description: '미해결 Trust Score 이상치', path: '/trust-score?tab=anomalies', load: async () => (await getAdminTrustScoreAnomalies({ unresolvedOnly: true, page: 1, limit: 1 })).totalCount },
]

export function initialPendingWorkEntries(): AdminPendingWorkEntry[] {
  return definitions.map(({ key, title, description, path, state }) => ({ key, title, description, path, state, count: null, updatedAt: null, status: 'loading' }))
}

export function mergePendingWorkEntries(previous: AdminPendingWorkEntry[], next: AdminPendingWorkEntry[]) {
  return next.map(entry => {
    const cached = previous.find(item => item.key === entry.key)
    return entry.status !== 'success' && cached
      ? { ...entry, count: cached.count, updatedAt: cached.updatedAt }
      : entry
  })
}

export interface AdminPendingWorkSummary {
  entries: AdminPendingWorkEntry[]
  items: AdminPendingWorkItem[]
  totalCount: number
  checkedCount: number
  failedCount: number
  failures: unknown[]
}

export async function getAdminPendingWorkSummary(): Promise<AdminPendingWorkSummary> {
  const results = await Promise.allSettled(definitions.map(async definition => {
    const count = await definition.load()
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Invalid pending count: ${definition.key}`)
    return count
  }))
  const entries = initialPendingWorkEntries().map((entry, index): AdminPendingWorkEntry => {
    const result = results[index]
    return result.status === 'fulfilled'
      ? { ...entry, status: 'success', count: result.value, updatedAt: Date.now() }
      : { ...entry, status: 'error' }
  })
  const failures = results.flatMap(result => result.status === 'rejected' ? [result.reason] : [])
  const items = entries.flatMap(entry => entry.status === 'success' && entry.count !== null && entry.count > 0 ? [{ ...entry, count: entry.count }] : [])
  return { entries, items, totalCount: items.reduce((sum, item) => sum + item.count, 0), checkedCount: entries.length, failedCount: failures.length, failures }
}
