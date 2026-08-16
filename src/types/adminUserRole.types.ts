import type { AuthErrorResponse } from './auth.types'

export type AdminRole = 'SUPER_ADMIN' | 'CONTENT_MODERATOR' | 'MERCHANT_OPERATOR' | 'SUPPORT_OPERATOR' | 'ANALYST'
export type AdminRoleAssignmentStatus = 'ACTIVE' | 'REVOKED'
export type AdminPermission = 'ADMIN_ROLE_MANAGE' | 'USER_READ' | 'USER_SANCTION' | 'PLACE_READ' | 'PLACE_MODERATE' | 'MERCHANT_REVIEW' | 'REPORT_REVIEW' | 'SCOUT_REVIEW' | 'DASHBOARD_READ' | 'AUDIT_READ' | 'OUTBOX_RECOVERY'

export interface AdminRoleAssignment {
  id: number
  adminUserId: number
  role: AdminRole
  status: AdminRoleAssignmentStatus
  assignedByUserId: number
  assignedAt: string
  revokedAt: string | null
  permissions: AdminPermission[]
}

export type AdminUserRoleErrorResponse = AuthErrorResponse<string>
