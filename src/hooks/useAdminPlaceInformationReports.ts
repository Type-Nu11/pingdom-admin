import { useCallback, useEffect, useLayoutEffect, useRef, useState, type SetStateAction } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import {
  getAdminPlaceInformationReport, getAdminPlaceInformationReports,
  reviewAdminPlaceInformationDispute, reviewAdminPlaceInformationReport,
} from '../api/adminPlaceVerificationApi'
import { shouldClearAuth, getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type {
  AdminPlaceVerificationErrorResponse, PlaceInformationDispute,
  PlaceInformationDisputeReviewRequest, PlaceInformationReport,
  PlaceInformationReportReviewRequest, PlaceInformationReportStatus,
} from '../types/adminPlaceVerification.types'
import { getAuthSessionId } from '../utils/authStorage'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const PAGE_LIMIT = 10
const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다. 다시 로그인해주세요.',
  forbidden: '관리자 권한이 필요합니다.',
  'not-found': '신고 또는 반박 정보를 찾을 수 없습니다.',
  conflict: '처리 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해주세요.',
  network: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'request-blocked': '서버 응답을 읽지 못했습니다. 연결 상태를 확인해주세요.',
  timeout: '응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}
function getErrorMessage(error: unknown, fallbackMessage: string) {
  return isApiError<AdminPlaceVerificationErrorResponse>(error)
    ? getAuthErrorMessage(error, { fallbackMessage, categoryMessages: CATEGORY_MESSAGES })
    : fallbackMessage
}
const isRestricted = (error: unknown) => isApiError(error)
  && ['unauthorized', 'forbidden'].includes(error.category ?? '')
const validId = (id: unknown) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0
function validDispute(value: PlaceInformationDispute, reportId: number, disputeId: number) {
  return value && validId(disputeId) && value.disputeId === disputeId && value.reportId === reportId
    && ['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(value.status)
}
function validReport(value: PlaceInformationReport, reportId: number) {
  return value && validId(reportId) && value.reportId === reportId && Array.isArray(value.disputes)
    && value.disputes.every(dispute => validDispute(dispute, reportId, dispute?.disputeId))
}

export type PlaceReportAction = 'review-report' | 'review-dispute'
interface Selection { owner: string; id: number; version: number; needsRefresh: boolean; saved: boolean }
interface ReportState {
  owner: string
  status: PlaceInformationReportStatus | ''
  reports: PlaceInformationReport[]
  reportDetail: PlaceInformationReport | null
  selectedReportId: number | null
  selectionVersion: number
  page: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasListResult: boolean
  isLoading: boolean
  isDetailLoading: boolean
  canReview: boolean
  activeAction: PlaceReportAction | null
  errorMessage: string
  detailErrorMessage: string
  actionErrorMessage: string
  actionSuccessMessage: string
  actionNotice: string
}
const emptyState = (owner: string): ReportState => ({
  owner, status: 'SUBMITTED', reports: [], reportDetail: null,
  selectedReportId: null, selectionVersion: 0, page: 1, totalCount: 0, totalPages: 0,
  hasNext: false, hasListResult: false, isLoading: false, isDetailLoading: false,
  canReview: false, activeAction: null, errorMessage: '', detailErrorMessage: '',
  actionErrorMessage: '', actionSuccessMessage: '', actionNotice: '',
})

export function useAdminPlaceInformationReports() {
  const { user, clearAuth } = useAuth()
  const session = getAuthSessionId()
  const owner = `${session}:${user?.id ?? ''}:${user?.role ?? ''}`
  const [state, setState] = useState(() => emptyState(owner))
  const lifecycle = useRef(0)
  const activeOwner = useRef<string | null>(null)
  const listRequest = useRef(0)
  const detailRequest = useRef(0)
  const selection = useRef<Selection | null>(null)
  const version = useRef(0)
  const verified = useRef<Selection | null>(null)
  const detailValue = useRef<PlaceInformationReport | null>(null)
  const actionLock = useRef<object | null>(null)
  const refreshRequest = useRef(0)
  const query = useRef<{ status: PlaceInformationReportStatus | ''; page: number }>({ status: 'SUBMITTED', page: 1 })

  useLayoutEffect(() => {
    const generations = lifecycle
    const lists = listRequest
    const details = detailRequest
    const refreshes = refreshRequest
    activeOwner.current = owner
    query.current = { status: 'SUBMITTED', page: 1 }
    return () => {
      activeOwner.current = null
      generations.current++
      lists.current++
      details.current++
      refreshes.current++
      selection.current = null
      verified.current = null
      detailValue.current = null
      actionLock.current = null
    }
  }, [owner])
  const alive = useCallback((generation: number) => activeOwner.current === owner
    && lifecycle.current === generation && getAuthSessionId() === session, [owner, session])

  const clearReportDetail = useCallback(() => {
    detailRequest.current++
    refreshRequest.current++
    selection.current = null
    verified.current = null
    detailValue.current = null
    setState(prev => ({ ...prev, selectedReportId: null, reportDetail: null, canReview: false,
      isDetailLoading: false, detailErrorMessage: '', actionErrorMessage: '', actionNotice: '', actionSuccessMessage: '' }))
  }, [])

  const fetchReports = useCallback(async (nextStatus = query.current.status, nextPage = query.current.page) => {
    const generation = lifecycle.current
    if (!alive(generation)) return false
    const changed = query.current.status !== nextStatus || query.current.page !== nextPage
    if (changed) clearReportDetail()
    const request = ++listRequest.current
    query.current = { status: nextStatus, page: nextPage }
    const current = () => alive(generation) && listRequest.current === request
    setState(prev => ({ ...(prev.owner === owner ? prev : emptyState(owner)),
      status: nextStatus, page: nextPage, isLoading: true, errorMessage: '',
      ...(changed ? { reports: [], hasListResult: false, totalCount: 0, totalPages: 0, hasNext: false } : {}) }))
    try {
      const data = await getAdminPlaceInformationReports({ status: nextStatus || undefined, page: nextPage, limit: PAGE_LIMIT })
      if (!current()) return false
      if (!Array.isArray(data?.reports) || !data.reports.every(report => validReport(report, report?.reportId))
        || !Number.isSafeInteger(data.totalCount) || data.totalCount < 0
        || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0
        || !Number.isSafeInteger(data.page) || data.page < 1 || typeof data.hasNext !== 'boolean') {
        throw new Error('장소 정보 신고 목록 응답 형식이 올바르지 않습니다.')
      }
      setState(prev => ({ ...prev, reports: data.reports, page: data.page, totalCount: data.totalCount,
        totalPages: data.totalPages, hasNext: data.hasNext, hasListResult: true }))
      query.current.page = data.page
      return true
    } catch (error) {
      if (!current()) return false
      if (isRestricted(error)) {
        if (selection.current?.saved && selection.current.needsRefresh) {
          // Hide denied data and invalidate concurrent detail reads without losing the known save outcome.
          detailRequest.current++
          verified.current = null
          detailValue.current = null
          setState(prev => ({ ...prev, reportDetail: null, canReview: false, isDetailLoading: false,
            detailErrorMessage: getErrorMessage(error, '접근 권한을 확인하지 못했습니다.') }))
        } else clearReportDetail()
      }
      setState(prev => ({ ...prev, errorMessage: getErrorMessage(error, '장소 정보 신고 목록을 불러오지 못했습니다.'),
        ...(isRestricted(error) ? { reports: [], hasListResult: false, totalCount: 0, totalPages: 0, hasNext: false } : {}) }))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError('관리자 장소 정보 신고 목록 조회 실패', error)
      return false
    } finally {
      if (current()) setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [alive, clearAuth, clearReportDetail, owner])

  const loadDetail = useCallback(async (target: Selection, retain: boolean) => {
    const generation = lifecycle.current
    const request = ++detailRequest.current
    const current = () => alive(generation) && selection.current === target && detailRequest.current === request
    if (!current()) return false
    verified.current = null
    setState(prev => ({ ...prev, isDetailLoading: true, canReview: false, detailErrorMessage: '' }))
    try {
      const data = await getAdminPlaceInformationReport(target.id)
      if (!current()) return false
      if (!validReport(data, target.id)) throw new Error('장소 정보 신고 상세 응답 형식이 올바르지 않습니다.')
      detailValue.current = data
      if (!target.needsRefresh) verified.current = target
      setState(prev => ({ ...prev, reportDetail: data, canReview: !target.needsRefresh }))
      return true
    } catch (error) {
      if (!current()) return false
      if (!retain || isRestricted(error)) detailValue.current = null
      setState(prev => ({ ...prev, reportDetail: detailValue.current, canReview: false,
        detailErrorMessage: getErrorMessage(error, '장소 정보 신고 상세를 불러오지 못했습니다.') }))
      if (shouldClearAuth(error)) clearAuth()
      logDebugError('관리자 장소 정보 신고 상세 조회 실패', error)
      return false
    } finally {
      if (current()) setState(prev => ({ ...prev, isDetailLoading: false }))
    }
  }, [alive, clearAuth])

  const fetchReportDetail = useCallback(async (reportId: number) => {
    if (!alive(lifecycle.current) || !validId(reportId)) return false
    const target: Selection = { owner, id: reportId, version: ++version.current, needsRefresh: false, saved: false }
    selection.current = target
    verified.current = null
    detailValue.current = null
    refreshRequest.current++
    setState(prev => ({ ...prev, owner, selectedReportId: reportId, selectionVersion: target.version,
      reportDetail: null, canReview: false, actionErrorMessage: '', actionSuccessMessage: '', actionNotice: '' }))
    return loadDetail(target, false)
  }, [alive, loadDetail, owner])

  const refreshSelection = useCallback(async (target: Selection) => {
    const generation = lifecycle.current
    const request = ++refreshRequest.current
    const current = () => alive(generation) && selection.current === target && refreshRequest.current === request
    if (!current()) return false
    target.needsRefresh = true
    verified.current = null
    setState(prev => ({ ...prev, canReview: false }))
    const [listOk, detailOk] = await Promise.all([fetchReports(), loadDetail(target, true)])
    if (!current()) return false
    const refreshed = listOk && detailOk
    target.needsRefresh = !refreshed
    verified.current = refreshed ? target : null
    setState(prev => ({ ...prev, canReview: refreshed, actionNotice: refreshed ? '' : target.saved
      ? '검토 결과는 저장됐지만 최신 목록 또는 상세를 확인하지 못했습니다. 다시 제출하지 말고 최신 정보를 다시 조회해주세요.'
      : '최신 목록 또는 상세를 확인하지 못했습니다. 최신 정보를 다시 조회해주세요.' }))
    return refreshed
  }, [alive, fetchReports, loadDetail])

  const retryRefresh = useCallback(async () => {
    const target = selection.current
    if (!target || actionLock.current) return false
    return refreshSelection(target)
  }, [refreshSelection])

  const runAction = useCallback(async (
    action: PlaceReportAction, reportId: number, disputeId: number | null,
    request: () => Promise<PlaceInformationReport | PlaceInformationDispute>,
  ) => {
    const target = selection.current
    const snapshot = detailValue.current
    const generation = lifecycle.current
    if (!alive(generation) || actionLock.current || !target || target.owner !== owner
      || target.id !== reportId || verified.current !== target || !snapshot
      || (disputeId !== null && !snapshot.disputes.some(item => item.disputeId === disputeId && item.status === 'SUBMITTED'))
      || (disputeId === null && ['RESOLVED', 'CANCELED'].includes(snapshot.status))) return null
    const lock = {}
    actionLock.current = lock
    const current = () => alive(generation) && selection.current === target
    setState(prev => ({ ...prev, activeAction: action, actionErrorMessage: '', actionSuccessMessage: '', actionNotice: '' }))
    try {
      let data: PlaceInformationReport | PlaceInformationDispute
      try {
        data = await request()
      } catch (error) {
        if (current()) {
          setState(prev => ({ ...prev, actionErrorMessage: getErrorMessage(error, '검토 결과를 저장하지 못했습니다.') }))
          if (isRestricted(error)) {
            detailRequest.current++
            verified.current = null
            detailValue.current = null
            setState(prev => ({ ...prev, reportDetail: null, canReview: false }))
          }
          if (shouldClearAuth(error)) clearAuth()
          logDebugError('관리자 장소 정보 검토 저장 실패', error)
        }
        return null
      }
      if (!current()) return { saved: true, refreshed: false }
      verified.current = null
      target.needsRefresh = true
      target.saved = true
      // A dispute response is not a report. Preserve the parent and all other disputes.
      const valid = disputeId === null
        ? validReport(data as PlaceInformationReport, reportId)
        : validDispute(data as PlaceInformationDispute, reportId, disputeId)
      if (valid) {
        detailValue.current = disputeId === null ? data as PlaceInformationReport : {
          ...snapshot, disputes: snapshot.disputes.map(item => item.disputeId === disputeId ? data as PlaceInformationDispute : item),
        }
      }
      setState(prev => ({ ...prev, reportDetail: detailValue.current, canReview: false,
        actionSuccessMessage: action === 'review-report' ? '신고 검토 결과를 저장했습니다.' : '반박 검토 결과를 저장했습니다.' }))
      // Keep read errors out of the POST catch: a successful save must never invite a duplicate save.
      const refreshed = await refreshSelection(target)
      return { saved: true, refreshed }
    } finally {
      if (actionLock.current === lock) {
        actionLock.current = null
        if (alive(generation)) setState(prev => ({ ...prev, activeAction: null }))
      }
    }
  }, [alive, clearAuth, owner, refreshSelection])

  const reviewReport = useCallback((reportId: number, request: PlaceInformationReportReviewRequest) =>
    runAction('review-report', reportId, null, () => reviewAdminPlaceInformationReport(reportId, request)), [runAction])
  const reviewDispute = useCallback((reportId: number, disputeId: number, request: PlaceInformationDisputeReviewRequest) =>
    runAction('review-dispute', reportId, disputeId, () => reviewAdminPlaceInformationDispute(reportId, disputeId, request)), [runAction])
  const setSuccess = useCallback((message: SetStateAction<string>) => setState(prev => ({ ...prev,
    actionSuccessMessage: typeof message === 'function' ? message(prev.actionSuccessMessage) : message })), [])
  const visible = state.owner === owner ? state : emptyState(owner)
  useAutoDismissMessage(visible.actionSuccessMessage, setSuccess)
  useEffect(() => { void fetchReports('SUBMITTED', 1) }, [fetchReports])

  return { ...visible, owner, fetchReports, fetchReportDetail, clearReportDetail, reviewReport, reviewDispute, retryRefresh,
    dismissActionError: () => setState(prev => ({ ...prev, actionErrorMessage: '' })) }
}
