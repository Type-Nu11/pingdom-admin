import customAxios from './customAxios'
import type { AdminTrustScore, TrustScoreAnomaly, TrustScoreAnomalyResponse, TrustScoreBatchResponse, TrustScoreHistoryResponse, TrustScoreInterventionEvaluation, TrustScoreInterventionRule, TrustScoreInterventionRuleRequest, TrustScoreInterventionRuleResponse } from '../types/adminTrustScore.types'

const PATH = '/admin/trust-score'
export async function getAdminTrustScore(reporterUserId: number) { const { data } = await customAxios.get<AdminTrustScore>(`${PATH}/reporters/${reporterUserId}`); return data }
export async function getAdminTrustScoreHistory(reporterUserId: number, page = 1, limit = 20) {
  const { data } = await customAxios.get<TrustScoreHistoryResponse>(`${PATH}/reporters/${reporterUserId}/history`, { params: { page, limit } })
  // Types alone cannot validate a live response. Never turn a legacy array or
  // malformed page into a misleading empty/successful result.
  if (!data || !Array.isArray(data.items)
    || !Number.isSafeInteger(data.page) || data.page < 1
    || !Number.isSafeInteger(data.limit) || data.limit < 1
    || !Number.isSafeInteger(data.total) || data.total < 0
    || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0
    || typeof data.hasNext !== 'boolean'
    || data.totalPages !== Math.ceil(data.total / data.limit)
    || data.hasNext !== (data.page < data.totalPages)
    || data.items.length > data.limit || data.items.length > data.total
    || data.items.some(item => !item || !Number.isSafeInteger(item.id)
      || item.reporterUserId !== reporterUserId || !Number.isSafeInteger(item.beforeScore)
      || !Number.isSafeInteger(item.afterScore) || typeof item.reason !== 'string' || typeof item.changedAt !== 'string')) {
    throw new Error('신뢰 점수 이력 응답 형식을 확인할 수 없습니다.')
  }
  return data
}
export async function recalculateAdminTrustScores() { const { data } = await customAxios.post<TrustScoreBatchResponse>(`${PATH}/batch/recalculate`); return data }
export async function getAdminTrustScoreAnomalies(params: { page?: number; limit?: number; reporterUserId?: number; unresolvedOnly?: boolean }) { const { data } = await customAxios.get<TrustScoreAnomalyResponse>(`${PATH}/anomalies`, { params }); return data }
export async function resolveAdminTrustScoreAnomaly(anomalyId: number, resolutionReason: string) { const { data } = await customAxios.patch<TrustScoreAnomaly>(`${PATH}/anomalies/${anomalyId}/resolve`, { resolutionReason }); return data }
export async function getAdminTrustScoreRules(enabledOnly = false) { const { data } = await customAxios.get<TrustScoreInterventionRuleResponse>(`${PATH}/intervention-rules`, { params: { enabledOnly } }); return data }
export async function createAdminTrustScoreRule(request: TrustScoreInterventionRuleRequest) { const { data } = await customAxios.post<TrustScoreInterventionRule>(`${PATH}/intervention-rules`, request); return data }
export async function updateAdminTrustScoreRule(ruleId: number, request: TrustScoreInterventionRuleRequest) { const { data } = await customAxios.put<TrustScoreInterventionRule>(`${PATH}/intervention-rules/${ruleId}`, request); return data }
export async function toggleAdminTrustScoreRule(ruleId: number, enabled: boolean) { const { data } = await customAxios.patch<{ ruleId: number; enabled: boolean; message: string }>(`${PATH}/intervention-rules/${ruleId}/${enabled ? 'enable' : 'disable'}`); return data }
export async function evaluateAdminTrustScoreReporter(reporterUserId: number) { const { data } = await customAxios.post<TrustScoreInterventionEvaluation>(`${PATH}/reporters/${reporterUserId}/interventions/evaluate`); return data }
