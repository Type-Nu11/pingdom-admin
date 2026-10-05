import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import * as api from '../api/adminS3OrphanApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { AdminS3OrphanErrorResponse, S3OrphanDeleteResult, S3OrphanDryRun, S3OrphanReport, S3OrphanReportStatus } from '../types/adminS3Orphan.types'
import { isMissingLatestS3Report } from '../utils/s3ReportState'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

type QueryState = 'loading' | 'ready' | 'empty' | 'error'
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.', forbidden: '관리자 권한이 필요합니다.',
  'not-found': '요청한 리포트를 찾을 수 없습니다.', conflict: '현재 리포트 상태에서는 처리할 수 없습니다.',
  network: '서버에 연결할 수 없습니다.', 'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.', server: '저장소 또는 서버 오류가 발생했습니다.',
}

export function useAdminS3Orphans() {
  const { clearAuth } = useAuth()
  const [dryRun, setDryRun] = useState<S3OrphanDryRun | null>(null)
  const [status, setStatus] = useState<S3OrphanReportStatus | null>(null)
  const [report, setReport] = useState<S3OrphanReport | null>(null)
  const [result, setResult] = useState<S3OrphanDeleteResult | null>(null)
  const [dryRunState, setDryRunState] = useState<QueryState>('loading')
  const [statusState, setStatusState] = useState<QueryState>('loading')
  const [reportState, setReportState] = useState<QueryState>('empty')
  const [dryRunError, setDryRunError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [reportError, setReportError] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeAction, setActiveAction] = useState<'refresh' | 'delete' | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const action = useRef(false)
  const mounted = useRef(true)
  const dryRunRequest = useRef(0)
  const statusRequest = useRef(0)
  const reportRequest = useRef(0)

  const message = useCallback((error: unknown, fallbackMessage: string) => {
    if (!isApiError<AdminS3OrphanErrorResponse>(error)) return fallbackMessage
    if (shouldClearAuth(error)) clearAuth()
    return getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
  }, [clearAuth])

  const fetchDryRun = useCallback(async (prefix = 'map/', limit = 1000) => {
    const request = ++dryRunRequest.current
    setDryRunState('loading')
    setDryRunError('')
    try {
      const data = await api.getAdminS3OrphanDryRun(prefix, limit)
      if (!mounted.current || request !== dryRunRequest.current) return false
      setDryRun(data)
      setDryRunState('ready')
      return true
    } catch (error) {
      if (!mounted.current || request !== dryRunRequest.current) return false
      setDryRunState('error')
      setDryRunError(message(error, '파일 비교 결과를 불러오지 못했습니다.'))
      logDebugError('파일 비교 조회 실패', error)
      return false
    }
  }, [message])

  const fetchReport = useCallback(async (reportId?: string, page = 1) => {
    const request = ++reportRequest.current
    setReportState('loading')
    setReportError('')
    try {
      const data = await api.getAdminS3OrphanReport(reportId, page, 5)
      if (!mounted.current || request !== reportRequest.current) return false
      if (data.status !== 'COMPLETED') {
        setReport(null)
        setStatus(data)
        setReportState(data.status === 'NOT_FOUND' ? 'error' : 'empty')
        if (data.status === 'NOT_FOUND') setReportError('요청한 리포트를 찾을 수 없습니다. 다시 상태를 조회해주세요.')
        return false
      }
      setReport(data)
      setStatus(data)
      setReportState('ready')
      return true
    } catch (error) {
      if (!mounted.current || request !== reportRequest.current) return false
      setReportState('error')
      setReportError(message(error, '미연결 파일 리포트를 불러오지 못했습니다.'))
      logDebugError('미연결 파일 리포트 조회 실패', error)
      return false
    }
  }, [message])

  const fetchStatus = useCallback(async (reportId?: string) => {
    const request = ++statusRequest.current
    ++reportRequest.current
    setStatusState('loading')
    setStatusError('')
    setReportState('empty')
    setReportError('')
    try {
      const data = await api.getAdminS3OrphanReportStatus(reportId)
      if (!mounted.current || request !== statusRequest.current) return null
      if (data.status === 'NOT_FOUND') {
        setStatus(null)
        setReport(null)
        setStatusState(reportId ? 'error' : 'empty')
        if (reportId) setStatusError('요청한 리포트를 찾을 수 없습니다. 최신 리포트 상태를 다시 조회해주세요.')
        return null
      }
      setStatus(data)
      setStatusState('ready')
      if (data.status === 'COMPLETED') await fetchReport(data.reportId, 1)
      else setReport(null)
      return data
    } catch (error) {
      if (!mounted.current || request !== statusRequest.current) return null
      if (isMissingLatestS3Report(error, reportId)) {
        setStatus(null)
        setReport(null)
        setStatusState('empty')
      } else {
        setStatusState('error')
        setStatusError(message(error, '리포트 상태를 불러오지 못했습니다.'))
      }
      return null
    }
  }, [fetchReport, message])

  const refresh = useCallback(async () => {
    if (action.current) return null
    action.current = true
    ++statusRequest.current
    ++reportRequest.current
    setActiveAction('refresh')
    setActionError('')
    setSuccessMessage('')
    setResult(null)
    try {
      const data = await api.refreshAdminS3OrphanReport()
      if (!mounted.current) return null
      setStatus(data.status === 'NOT_FOUND' ? null : data)
      setStatusState(data.status === 'NOT_FOUND' ? 'empty' : 'ready')
      setStatusError('')
      setReport(null)
      setReportState('empty')
      setReportError('')
      if (data.status === 'RUNNING') setSuccessMessage('리포트 생성을 시작했습니다.')
      else if (data.status === 'COMPLETED') setSuccessMessage('리포트를 갱신했습니다.')
      if (data.status === 'COMPLETED') await fetchReport(data.reportId, 1)
      return data
    } catch (error) {
      if (mounted.current) {
        setStatusState('error')
        setActionError(message(error, '리포트 생성을 시작하지 못했습니다.'))
      }
      return null
    } finally {
      action.current = false
      if (mounted.current) setActiveAction(null)
    }
  }, [fetchReport, message])

  const remove = useCallback(async (keys: string[]) => {
    if (!report || report.status !== 'COMPLETED' || statusState !== 'ready' || reportState !== 'ready' || action.current) return null
    action.current = true
    setActiveAction('delete')
    setActionError('')
    setSuccessMessage('')
    try {
      const data = await api.deleteAdminS3Orphans(report.reportId, keys)
      if (!mounted.current) return null
      setResult(data)
      setSuccessMessage(`${data.deletedKeyCount}개 파일을 삭제했고 ${data.failedKeyCount}개가 실패했습니다.`)
      await fetchReport(report.reportId, report.page)
      return data
    } catch (error) {
      if (mounted.current) {
        setActionError(message(error, '미연결 파일을 삭제하지 못했습니다.'))
        logDebugError('미연결 파일 삭제 실패', error)
      }
      return null
    } finally {
      action.current = false
      if (mounted.current) setActiveAction(null)
    }
  }, [fetchReport, message, report, reportState, statusState])

  useEffect(() => {
    const requests = [dryRunRequest, statusRequest, reportRequest]
    mounted.current = true
    void fetchDryRun()
    void fetchStatus()
    return () => {
      mounted.current = false
      for (const request of requests) ++request.current
    }
  }, [fetchDryRun, fetchStatus])

  useEffect(() => {
    if (status?.status !== 'RUNNING' || statusState !== 'ready' || activeAction !== null) return
    const id = window.setTimeout(() => void fetchStatus(status.reportId), 3000)
    return () => window.clearTimeout(id)
  }, [activeAction, fetchStatus, status, statusState])

  return {
    dryRun, status, report, result, dryRunState, statusState, reportState,
    isLoading: dryRunState === 'loading' || statusState === 'loading' || reportState === 'loading',
    activeAction, errorMessage: [dryRunError, statusError, reportError, actionError].filter(Boolean).join(' '),
    successMessage, fetchDryRun, fetchReport, fetchStatus, refresh, remove,
  }
}
