import type {
  AdminAuditLogRequest,
  AdminAuditLogResponse,
  PrivacyProcessingHistoryRequest,
  PrivacyProcessingHistoryResponse,
} from '../types/adminOperationHistory.types'
import customAxios from './customAxios'

export async function getAdminAuditLogs(request: AdminAuditLogRequest = {}) {
  const { data } = await customAxios.get<AdminAuditLogResponse>('/admin/audit-logs', {
    params: { ...request, page: request.page ?? 1, limit: request.limit ?? 5 },
  })
  return data
}

export async function getPrivacyProcessingHistories(
  request: PrivacyProcessingHistoryRequest = {},
) {
  const { data } = await customAxios.get<PrivacyProcessingHistoryResponse>(
    '/admin/privacy-processing-histories',
    { params: { ...request, page: request.page ?? 1, limit: request.limit ?? 5 } },
  )
  return data
}
