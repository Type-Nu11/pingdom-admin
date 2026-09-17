import client from './customAxios'
import type {
  AdminCommunityPost, AdminCommunityComment, AdminCommunityReport,
  CommunityPostsPage, CommunityCommentsPage, CommunityReportsPage,
  CommunityReportStatus, CommunityTargetType, CommunityDecision, CommunityReportResult,
} from '../types/adminCommunity.types'

const CONTENT = '/admin/community/posts'
const REPORTS = '/admin/community-reports'
export const COMMUNITY_PAGE_SIZE = 10

export async function getCommunityPosts(params: { categoryId?: string; hidden?: boolean; page: number }, signal?: AbortSignal) {
  return (await client.get<CommunityPostsPage>(CONTENT, { params: { ...params, limit: COMMUNITY_PAGE_SIZE }, signal })).data
}
export async function getCommunityPost(postId: number, signal?: AbortSignal) {
  return (await client.get<AdminCommunityPost>(`${CONTENT}/${postId}`, { signal })).data
}
export async function getCommunityComments(postId: number, params: { hidden?: boolean; page: number }, signal?: AbortSignal) {
  return (await client.get<CommunityCommentsPage>(`${CONTENT}/${postId}/comments`, { params: { ...params, limit: COMMUNITY_PAGE_SIZE }, signal })).data
}
export async function getCommunityComment(postId: number, commentId: number, signal?: AbortSignal) {
  return (await client.get<AdminCommunityComment>(`${CONTENT}/${postId}/comments/${commentId}`, { signal })).data
}
export async function getCommunityReports(params: { status?: CommunityReportStatus; targetType?: CommunityTargetType; page: number }, signal?: AbortSignal) {
  return (await client.get<CommunityReportsPage>(REPORTS, { params: { ...params, limit: COMMUNITY_PAGE_SIZE }, signal })).data
}
export async function getCommunityReport(reportId: number, signal?: AbortSignal) {
  return (await client.get<AdminCommunityReport>(`${REPORTS}/${reportId}`, { signal })).data
}
export async function reviewCommunityReport(reportId: number, decision: CommunityDecision) {
  return (await client.post<CommunityReportResult>(`${REPORTS}/${reportId}/${decision}`)).data
}
