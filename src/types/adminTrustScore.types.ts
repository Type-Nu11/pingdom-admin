import type { AuthErrorResponse } from './auth.types'

export type TrustScoreGrade = 'HIGH' | 'NORMAL' | 'LOW'
export type TrustScoreAnomalyType = 'RAPID_DROP' | 'FALSE_REPORT_SPIKE' | 'LOW_ACCEPTANCE_RATE' | 'MANUAL_REVIEW'
export type TrustScoreAnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TrustScoreInterventionTrigger = 'TRUST_SCORE_RANGE' | 'FALSE_REPORT_COUNT' | 'ACCEPTANCE_RATE' | 'ANOMALY_DETECTED'
export type TrustScoreInterventionAction = 'WARN' | 'REVIEW_REQUIRED' | 'TEMPORARY_RESTRICT' | 'MANUAL_REVIEW'

export interface TrustScoreEvidence { submittedCount: number; acceptedCount: number; declinedCount: number; falseReportCount: number; acceptanceRate: number; baseScore: number; acceptedScoreBonus: number; falseReportScorePenalty: number }
export interface AdminTrustScore { reporterUserId: number; reporterUsername: string; trustScore: number; trustGrade: TrustScoreGrade; restricted: boolean; restrictedUntil: string | null; restrictionReason: string | null; evidence: TrustScoreEvidence }
export interface TrustScoreHistory { id: number; reporterUserId: number; beforeScore: number; afterScore: number; reason: string; changedAt: string }
export interface TrustScoreBatchResponse { processedCount: number; changedCount: number }
export interface TrustScoreAnomaly { id: number; reporterUserId: number; reporterUsername: string; anomalyType: TrustScoreAnomalyType; severity: TrustScoreAnomalySeverity; baselineScore: number; observedScore: number; submittedCount: number; acceptedCount: number; declinedCount: number; falseReportCount: number; detectedAt: string; resolvedAt: string | null; resolutionReason: string | null }
export interface TrustScoreAnomalyResponse { anomalies: TrustScoreAnomaly[]; page: number; limit: number; totalCount: number; totalPages: number }
export interface TrustScoreInterventionRule { id: number; ruleName: string; triggerType: TrustScoreInterventionTrigger; actionType: TrustScoreInterventionAction; enabled: boolean; minTrustScore: number; maxTrustScore: number; minSubmittedCount: number; minFalseReportCount: number; durationDays: number | null; priority: number; reason: string; createdAt: string; updatedAt: string }
export interface TrustScoreInterventionRuleRequest { ruleName: string; triggerType: TrustScoreInterventionTrigger; actionType: TrustScoreInterventionAction; minTrustScore: number; maxTrustScore: number; minSubmittedCount: number; minFalseReportCount: number; durationDays?: number; priority: number; reason: string }
export interface TrustScoreInterventionRuleResponse { rules: TrustScoreInterventionRule[] }
export interface TrustScoreInterventionEvaluation { reporterUserId: number; trustScore: number; matchedRuleId: number | null; matchedRuleName: string | null; actionType: TrustScoreInterventionAction | null; restrictedUntil: string | null; message: string }
export type AdminTrustScoreErrorResponse = AuthErrorResponse<string>
