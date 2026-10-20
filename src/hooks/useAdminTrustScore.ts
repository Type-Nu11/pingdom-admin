import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import * as api from '../api/adminTrustScoreApi'
import { shouldClearAuth as clearable, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { AdminTrustScoreErrorResponse, TrustScoreAnomaly, TrustScoreBatchResponse, TrustScoreInterventionEvaluation, TrustScoreInterventionRule, TrustScoreInterventionRuleRequest } from '../types/adminTrustScore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'
import { useAdminTrustScoreReporter } from './useAdminTrustScoreReporter'
import { getAuthSessionId } from '../utils/authStorage'

type Action = 'resolve' | 'create-rule' | 'update-rule' | 'toggle-rule' | 'evaluate' | 'batch'
const CATEGORY_MESSAGES = { unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.', forbidden: '관리자 권한이 필요합니다.', 'not-found': '신뢰 점수 대상 또는 규칙을 찾을 수 없습니다.', conflict: '이미 처리되었거나 상태가 변경되었습니다.', network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.', timeout: '응답이 지연되고 있습니다.', server: '서버 오류가 발생했습니다.' }
function message(error: unknown, fallback: string) { return isApiError<AdminTrustScoreErrorResponse>(error) ? getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES }) : fallback }

export function useAdminTrustScore() {
  const { clearAuth } = useAuth()
  const [anomalies, setAnomalies] = useState<TrustScoreAnomaly[]>([])
  const [anomalyPage, setAnomalyPage] = useState(1)
  const [anomalyTotalCount, setAnomalyTotalCount] = useState(0)
  const [anomalyTotalPages, setAnomalyTotalPages] = useState(0)
  const [rules, setRules] = useState<TrustScoreInterventionRule[]>([])
  const [evaluationResult, setEvaluationResult] = useState<{ owner: string; data: TrustScoreInterventionEvaluation } | null>(null)
  const [batchResult, setBatchResult] = useState<TrustScoreBatchResponse | null>(null)
  const [isAnomaliesLoading, setIsAnomaliesLoading] = useState(false)
  const [isRulesLoading, setIsRulesLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<Action | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const actionRef = useRef<Action | null>(null)
  const anomalyQueryRef = useRef({ page: 1, reporterUserId: undefined as number | undefined, unresolvedOnly: true })
  const rulesEnabledRef = useRef(false)
  const evaluationRequest = useRef(0)

  const fail = useCallback((error: unknown, fallback: string, debug: string, setter: (message: string) => void = setErrorMessage) => { setter(message(error, fallback)); if (clearable(error)) clearAuth(); logDebugError(debug, error) }, [clearAuth])
  const reporterState = useAdminTrustScoreReporter(fail)
  const fetchReporterQuery = reporterState.fetchReporter
  const fetchReporter = useCallback((reporterUserId: number) => {
    evaluationRequest.current++
    setEvaluationResult(null)
    setErrorMessage('')
    return fetchReporterQuery(reporterUserId)
  }, [fetchReporterQuery])
  const evaluation = evaluationResult?.owner === reporterState.owner && evaluationResult.data.reporterUserId === reporterState.selectedReporterId ? evaluationResult.data : null
  const fetchAnomalies = useCallback(async (query = anomalyQueryRef.current) => { anomalyQueryRef.current = query; setIsAnomaliesLoading(true); setErrorMessage(''); try { const data = await api.getAdminTrustScoreAnomalies({ ...query, limit: 10 }); setAnomalies(data.anomalies); setAnomalyPage(data.page); setAnomalyTotalCount(data.totalCount); setAnomalyTotalPages(data.totalPages); return true } catch (error) { setAnomalies([]); fail(error, '신뢰 점수 이상 징후를 불러오지 못했습니다.', '관리자 Trust Score 이상치 조회 실패'); return false } finally { setIsAnomaliesLoading(false) } }, [fail])
  const fetchRules = useCallback(async (enabledOnly = rulesEnabledRef.current) => { rulesEnabledRef.current = enabledOnly; setIsRulesLoading(true); setErrorMessage(''); try { const data = await api.getAdminTrustScoreRules(enabledOnly); setRules(data.rules); return true } catch (error) { setRules([]); fail(error, '신뢰 점수 관리 규칙을 불러오지 못했습니다.', '관리자 Trust Score 규칙 조회 실패'); return false } finally { setIsRulesLoading(false) } }, [fail])
  const run = useCallback(async <T,>(action: Action, request: () => Promise<T>, success: string, refresh?: () => Promise<unknown>) => { if (actionRef.current) return null; actionRef.current = action; setActiveAction(action); setActionErrorMessage(''); setSuccessMessage(''); try { const data = await request(); setSuccessMessage(success); if (refresh) await refresh(); return data } catch (error) { fail(error, '신뢰 점수 작업을 처리하지 못했습니다.', `관리자 신뢰 점수 ${action} 실패`, setActionErrorMessage); return null } finally { actionRef.current = null; setActiveAction(null) } }, [fail])
  const resolveAnomaly = useCallback((id: number, reason: string) => run('resolve', () => api.resolveAdminTrustScoreAnomaly(id, reason), '이상 징후를 해결 처리했습니다.', () => fetchAnomalies()), [fetchAnomalies, run])
  const saveRule = useCallback((ruleId: number | null, request: TrustScoreInterventionRuleRequest) => run(ruleId ? 'update-rule' : 'create-rule', () => ruleId ? api.updateAdminTrustScoreRule(ruleId, request) : api.createAdminTrustScoreRule(request), ruleId ? '신뢰 점수 관리 규칙을 수정했습니다.' : '신뢰 점수 관리 규칙을 생성했습니다.', () => fetchRules()), [fetchRules, run])
  const toggleRule = useCallback((ruleId: number, enabled: boolean) => run('toggle-rule', () => api.toggleAdminTrustScoreRule(ruleId, enabled), enabled ? '신뢰 점수 관리 규칙을 활성화했습니다.' : '신뢰 점수 관리 규칙을 비활성화했습니다.', () => fetchRules()), [fetchRules, run])
  const evaluateReporter = useCallback(async (reporterUserId: number) => {
    const request = ++evaluationRequest.current
    const session = getAuthSessionId()
    const current = () => evaluationRequest.current === request && getAuthSessionId() === session
    const data = await run('evaluate', () => api.evaluateAdminTrustScoreReporter(reporterUserId), '신고자 신뢰 점수 관리 규칙 평가를 완료했습니다.', () => current() ? fetchReporterQuery(reporterUserId) : Promise.resolve(null))
    if (data && current()) setEvaluationResult({ owner: reporterState.owner, data })
    return data
  }, [fetchReporterQuery, reporterState.owner, run])
  const recalculate = useCallback(async () => { const data = await run('batch', api.recalculateAdminTrustScores, '신뢰 점수 일괄 재계산을 완료했습니다.', () => fetchAnomalies()); if (data) setBatchResult(data); return data }, [fetchAnomalies, run])
  useEffect(() => { void fetchAnomalies(); void fetchRules(false) }, [fetchAnomalies, fetchRules])
  return { ...reporterState, anomalies, anomalyPage, anomalyTotalCount, anomalyTotalPages, rules, evaluation, batchResult, isAnomaliesLoading, isRulesLoading, activeAction, errorMessage, actionErrorMessage, dismissActionError: () => setActionErrorMessage(''), successMessage, fetchReporter, fetchAnomalies, fetchRules, resolveAnomaly, saveRule, toggleRule, evaluateReporter, recalculate }
}
