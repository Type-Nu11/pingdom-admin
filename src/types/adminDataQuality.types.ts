import type { AuthErrorResponse } from './auth.types'

export type DataQualityIssueSeverity = 'INFO' | 'WARNING' | 'ERROR'
export type DataQualityIssueStatus = 'OPEN' | 'RESOLVED' | 'IGNORED'

export interface AdminDataQualityIssue {
  entityType: string
  entityId: number
  ruleCode: string
  severity: DataQualityIssueSeverity
  status: DataQualityIssueStatus
  details: string
  detectedAt: string
}

export interface AdminDataQualityIssuePageResponse {
  items: AdminDataQualityIssue[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
}

export type AdminDataQualityIssueListResponse =
  | AdminDataQualityIssue[]
  | AdminDataQualityIssuePageResponse

export type AdminDataQualityErrorResponse = AuthErrorResponse<string>
