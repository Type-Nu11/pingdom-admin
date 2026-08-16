import customAxios from './customAxios'
import type { AdminTrustScore, TrustScoreAnomaly, TrustScoreAnomalyResponse, TrustScoreBatchResponse, TrustScoreHistory, TrustScoreInterventionEvaluation, TrustScoreInterventionRule, TrustScoreInterventionRuleRequest, TrustScoreInterventionRuleResponse } from '../types/adminTrustScore.types'

const PATH = '/admin/trust-score'
export async function getAdminTrustScore(reporterUserId: number) { const { data } = await customAxios.get<AdminTrustScore>(`${PATH}/reporters/${reporterUserId}`); return data }
export async function getAdminTrustScoreHistory(reporterUserId: number) { const { data } = await customAxios.get<TrustScoreHistory[]>(`${PATH}/reporters/${reporterUserId}/history`); return data }
export async function recalculateAdminTrustScores() { const { data } = await customAxios.post<TrustScoreBatchResponse>(`${PATH}/batch/recalculate`); return data }
export async function getAdminTrustScoreAnomalies(params: { page?: number; limit?: number; reporterUserId?: number; unresolvedOnly?: boolean }) { const { data } = await customAxios.get<TrustScoreAnomalyResponse>(`${PATH}/anomalies`, { params }); return data }
export async function resolveAdminTrustScoreAnomaly(anomalyId: number, resolutionReason: string) { const { data } = await customAxios.patch<TrustScoreAnomaly>(`${PATH}/anomalies/${anomalyId}/resolve`, { resolutionReason }); return data }
export async function getAdminTrustScoreRules(enabledOnly = false) { const { data } = await customAxios.get<TrustScoreInterventionRuleResponse>(`${PATH}/intervention-rules`, { params: { enabledOnly } }); return data }
export async function createAdminTrustScoreRule(request: TrustScoreInterventionRuleRequest) { const { data } = await customAxios.post<TrustScoreInterventionRule>(`${PATH}/intervention-rules`, request); return data }
export async function updateAdminTrustScoreRule(ruleId: number, request: TrustScoreInterventionRuleRequest) { const { data } = await customAxios.put<TrustScoreInterventionRule>(`${PATH}/intervention-rules/${ruleId}`, request); return data }
export async function toggleAdminTrustScoreRule(ruleId: number, enabled: boolean) { const { data } = await customAxios.patch<{ ruleId: number; enabled: boolean; message: string }>(`${PATH}/intervention-rules/${ruleId}/${enabled ? 'enable' : 'disable'}`); return data }
export async function evaluateAdminTrustScoreReporter(reporterUserId: number) { const { data } = await customAxios.post<TrustScoreInterventionEvaluation>(`${PATH}/reporters/${reporterUserId}/interventions/evaluate`); return data }
