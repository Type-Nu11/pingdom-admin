import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import * as api from '../api/adminTrustScoreApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { AdminTrustScore, AdminTrustScoreErrorResponse, TrustScoreAnomaly, TrustScoreBatchResponse, TrustScoreHistory, TrustScoreInterventionEvaluation, TrustScoreInterventionRule, TrustScoreInterventionRuleRequest } from '../types/adminTrustScore.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type Action = 'resolve' | 'create-rule' | 'update-rule' | 'toggle-rule' | 'evaluate' | 'batch'
const CATEGORY_MESSAGES = { unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.', forbidden: '관리자 권한이 필요합니다.', 'not-found': 'Trust Score 대상 또는 규칙을 찾을 수 없습니다.', conflict: '이미 처리되었거나 상태가 변경되었습니다.', network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.', timeout: '응답이 지연되고 있습니다.', server: '서버 오류가 발생했습니다.' }
function message(error: unknown, fallback: string) { return isApiError<AdminTrustScoreErrorResponse>(error) ? getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES }) : fallback }
function clearable(error: unknown) { return isApiError<AdminTrustScoreErrorResponse>(error) && (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') }

export function useAdminTrustScore() {
  const { clearAuth } = useAuth()
  const [reporter, setReporter] = useState<AdminTrustScore | null>(null)
  const [history, setHistory] = useState<TrustScoreHistory[]>([])
  const [anomalies, setAnomalies] = useState<TrustScoreAnomaly[]>([])
  const [anomalyPage, setAnomalyPage] = useState(1)
  const [anomalyTotalCount, setAnomalyTotalCount] = useState(0)
  const [anomalyTotalPages, setAnomalyTotalPages] = useState(0)
  const [rules, setRules] = useState<TrustScoreInterventionRule[]>([])
  const [evaluation, setEvaluation] = useState<TrustScoreInterventionEvaluation | null>(null)
  const [batchResult, setBatchResult] = useState<TrustScoreBatchResponse | null>(null)
  const [isReporterLoading, setIsReporterLoading] = useState(false)
  const [isAnomaliesLoading, setIsAnomaliesLoading] = useState(false)
  const [isRulesLoading, setIsRulesLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<Action | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const actionRef = useRef<Action | null>(null)
  const anomalyQueryRef = useRef({ page: 1, reporterUserId: undefined as number | undefined, unresolvedOnly: true })
  const rulesEnabledRef = useRef(false)

  const fail = useCallback((error: unknown, fallback: string, debug: string, setter = setErrorMessage) => { setter(message(error, fallback)); if (clearable(error)) clearAuth(); logDebugError(debug, error) }, [clearAuth])
  const fetchReporter = useCallback(async (reporterUserId: number) => { setIsReporterLoading(true); setErrorMessage(''); try { const [next, nextHistory] = await Promise.all([api.getAdminTrustScore(reporterUserId), api.getAdminTrustScoreHistory(reporterUserId)]); setReporter(next); setHistory(nextHistory); return next } catch (error) { setReporter(null); setHistory([]); fail(error, '신고자 Trust Score를 불러오지 못했습니다.', '관리자 Trust Score 신고자 조회 실패'); return null } finally { setIsReporterLoading(false) } }, [fail])
  const fetchAnomalies = useCallback(async (query = anomalyQueryRef.current) => { anomalyQueryRef.current = query; setIsAnomaliesLoading(true); setErrorMessage(''); try { const data = await api.getAdminTrustScoreAnomalies({ ...query, limit: 10 }); setAnomalies(data.anomalies); setAnomalyPage(data.page); setAnomalyTotalCount(data.totalCount); setAnomalyTotalPages(data.totalPages); return true } catch (error) { setAnomalies([]); fail(error, 'Trust Score 이상치를 불러오지 못했습니다.', '관리자 Trust Score 이상치 조회 실패'); return false } finally { setIsAnomaliesLoading(false) } }, [fail])
  const fetchRules = useCallback(async (enabledOnly = rulesEnabledRef.current) => { rulesEnabledRef.current = enabledOnly; setIsRulesLoading(true); setErrorMessage(''); try { const data = await api.getAdminTrustScoreRules(enabledOnly); setRules(data.rules); return true } catch (error) { setRules([]); fail(error, 'Trust Score 개입 규칙을 불러오지 못했습니다.', '관리자 Trust Score 규칙 조회 실패'); return false } finally { setIsRulesLoading(false) } }, [fail])
  const run = useCallback(async <T,>(action: Action, request: () => Promise<T>, success: string, refresh?: () => Promise<unknown>) => { if (actionRef.current) return null; actionRef.current = action; setActiveAction(action); setActionErrorMessage(''); setSuccessMessage(''); try { const data = await request(); setSuccessMessage(success); if (refresh) await refresh(); return data } catch (error) { fail(error, 'Trust Score 작업을 처리하지 못했습니다.', `관리자 Trust Score ${action} 실패`, setActionErrorMessage); return null } finally { actionRef.current = null; setActiveAction(null) } }, [fail])
  const resolveAnomaly = useCallback((id: number, reason: string) => run('resolve', () => api.resolveAdminTrustScoreAnomaly(id, reason), '이상치를 해결 처리했습니다.', () => fetchAnomalies()), [fetchAnomalies, run])
  const saveRule = useCallback((ruleId: number | null, request: TrustScoreInterventionRuleRequest) => run(ruleId ? 'update-rule' : 'create-rule', () => ruleId ? api.updateAdminTrustScoreRule(ruleId, request) : api.createAdminTrustScoreRule(request), ruleId ? '개입 규칙을 수정했습니다.' : '개입 규칙을 생성했습니다.', () => fetchRules()), [fetchRules, run])
  const toggleRule = useCallback((ruleId: number, enabled: boolean) => run('toggle-rule', () => api.toggleAdminTrustScoreRule(ruleId, enabled), enabled ? '개입 규칙을 활성화했습니다.' : '개입 규칙을 비활성화했습니다.', () => fetchRules()), [fetchRules, run])
  const evaluateReporter = useCallback(async (reporterUserId: number) => { const data = await run('evaluate', () => api.evaluateAdminTrustScoreReporter(reporterUserId), '신고자 개입 규칙 평가를 완료했습니다.', () => fetchReporter(reporterUserId)); if (data) setEvaluation(data); return data }, [fetchReporter, run])
  const recalculate = useCallback(async () => { const data = await run('batch', api.recalculateAdminTrustScores, 'Trust Score 일괄 재계산을 완료했습니다.', () => fetchAnomalies()); if (data) setBatchResult(data); return data }, [fetchAnomalies, run])
  useEffect(() => { void fetchAnomalies(); void fetchRules(false) }, [fetchAnomalies, fetchRules])
  return { reporter, history, anomalies, anomalyPage, anomalyTotalCount, anomalyTotalPages, rules, evaluation, batchResult, isReporterLoading, isAnomaliesLoading, isRulesLoading, activeAction, errorMessage, actionErrorMessage, successMessage, fetchReporter, fetchAnomalies, fetchRules, resolveAnomaly, saveRule, toggleRule, evaluateReporter, recalculate }
}
