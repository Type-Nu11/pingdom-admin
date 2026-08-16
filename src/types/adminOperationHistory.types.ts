export interface AdminOperationHistoryPage {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

export interface AdminAuditLogItem {
  auditLogId: number
  actorUserId: number
  actorUsername: string
  action: string
  targetType: string
  targetId: string
  reason?: string | null
  beforeState?: string | null
  afterState?: string | null
  requestId?: string | null
  createdAt: string
}

export interface AdminAuditLogResponse extends AdminOperationHistoryPage {
  auditLogs: AdminAuditLogItem[]
}

export interface AdminAuditLogRequest {
  actorUserId?: number
  action?: string
  targetType?: string
  targetId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export type PrivacyProcessingAction =
  | 'EXPORT_REQUESTED'
  | 'WITHDRAWAL_REQUESTED'
  | 'ANONYMIZED'
  | 'DELETED'

export interface PrivacyProcessingHistoryItem {
  id: number
  subjectUserId: number
  actorUserId: number
  actorType: 'USER' | 'SYSTEM' | 'ADMIN'
  action: PrivacyProcessingAction
  details?: string | null
  requestId?: string | null
  createdAt: string
}

export interface PrivacyProcessingHistoryResponse extends AdminOperationHistoryPage {
  histories: PrivacyProcessingHistoryItem[]
}

export interface PrivacyProcessingHistoryRequest {
  subjectUserId?: number
  actorUserId?: number
  action?: PrivacyProcessingAction
  from?: string
  to?: string
  page?: number
  limit?: number
}
