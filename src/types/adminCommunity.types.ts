export type CommunityReportStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'
export type CommunityTargetType = 'POST' | 'COMMENT'
export type CommunityDecision = 'accept' | 'decline'
export interface CommunityPage {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}
export interface CommunityContent {
  postId: number
  authorUserId: number
  authorUsername: string | null
  hidden: boolean
  hiddenByAdminUserId: number | null
  hiddenAt: string | null
  createdAt: string
}
export interface AdminCommunityPostItem extends CommunityContent {
  title: string
  categoryId: string
}
export interface AdminCommunityPost extends AdminCommunityPostItem {
  content: string
  places: { placeId: number; name: string; deleted: boolean }[]
}
export interface AdminCommunityComment extends CommunityContent {
  commentId: number
  content: string
}
export interface AdminCommunityReportItem {
  reportId: number
  targetType: CommunityTargetType
  targetId: number
  targetHidden: boolean
  reporterUserId: number
  reason: string
  status: CommunityReportStatus
  createdAt: string
  processedAt: string | null
}
export interface AdminCommunityReport extends AdminCommunityReportItem {
  // Server #1649 requires postId; tolerate old deployments only to block unsafe review.
  postId?: number | null
  description: string | null
  processedByAdminUserId: number | null
}
export interface CommunityPostsPage extends CommunityPage { posts: AdminCommunityPostItem[] }
export interface CommunityCommentsPage extends CommunityPage { comments: AdminCommunityComment[] }
export interface CommunityReportsPage extends CommunityPage { reports: AdminCommunityReportItem[] }
export interface CommunityReportResult {
  reportId: number
  status: CommunityReportStatus
  targetType: CommunityTargetType
  targetId: number
  targetHidden: boolean
  processedAt: string | null
}
export interface CommunityReportDetail {
  report: AdminCommunityReport
  target: AdminCommunityPost | AdminCommunityComment | null
  unavailable: string
}
