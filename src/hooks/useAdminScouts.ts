import { useCallback, useEffect, useRef, useState } from 'react'
import { listQueryKey, useListQueryState } from './useListQueryState'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import * as api from '../api/adminScoutApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { AdminScoutErrorResponse, ScoutFieldReport, ScoutFieldReportStatus, ScoutProfile, ScoutProfileStatus } from '../types/adminScout.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'
type Action = 'profile' | 'eligibility' | 'report'
const CATEGORIES = { unauthorized: '로그인이 필요합니다.', forbidden: '관리자 권한이 필요합니다.', 'not-found': 'Scout 프로필 또는 제보를 찾을 수 없습니다.', conflict: '현재 상태에서 처리할 수 없습니다.', network: '서버에 연결할 수 없습니다.', 'request-blocked': '서버 응답을 읽지 못했습니다.', timeout: '응답이 지연되고 있습니다.', server: '서버 오류가 발생했습니다.' }
export function useAdminScouts() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const selectedUserRef = useRef<number | null>(null)
  const detailRequestId = useRef(0)
  const mounted = useRef(true)
  const { clearAuth } = useAuth()
  const [profileStatus, setProfileStatus] = useState<ScoutProfileStatus | ''>('PENDING')
  const [reportStatus, setReportStatus] = useState<ScoutFieldReportStatus | ''>('SUBMITTED')
  const [profiles, setProfiles] = useState<ScoutProfile[]>([])
  const [profile, setProfile] = useState<ScoutProfile | null>(null)
  const [reports, setReports] = useState<ScoutFieldReport[]>([])
  const [profilePage, setProfilePage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const [profileTotal, setProfileTotal] = useState(0)
  const [reportTotal, setReportTotal] = useState(0)
  const [profileTotalPages, setProfileTotalPages] = useState(0)
  const [reportTotalPages, setReportTotalPages] = useState(0)
  const [profileHasNext, setProfileHasNext] = useState(false)
  const [reportHasNext, setReportHasNext] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<Action | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const actionRef = useRef<Action | null>(null)
  const queries = useRef({ profileStatus, reportStatus, profilePage, reportPage })

  const profileListState = useListQueryState()
  const reportListState = useListQueryState()
  const { begin: beginProfiles, succeed: succeedProfiles, fail: failProfiles } = profileListState
  const { begin: beginReports, succeed: succeedReports, fail: failReports } = reportListState
  const profileRequestId = useRef(0)
  const reportRequestId = useRef(0)
  const [profileError, setProfileError] = useState('')
  const [reportError, setReportError] = useState('')
  const fail = useCallback((error: unknown, fallback: string) => { if (isApiError<AdminScoutErrorResponse>(error)) { if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') clearAuth(); return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORIES }) } return fallback }, [clearAuth])
  const fetchProfiles = useCallback(async (status: ScoutProfileStatus | '' = queries.current.profileStatus, page = queries.current.profilePage) => {
    const requestId = ++profileRequestId.current
    const key = listQueryKey({ status, page })
    const current = () => mounted.current && requestId === profileRequestId.current
    queries.current = { ...queries.current, profileStatus: status, profilePage: page }
    setProfileStatus(status)
    setProfilePage(page)
    setProfileError('')
    if (!beginProfiles(key, Boolean(status))) {
      detailRequestId.current += 1
      selectedUserRef.current = null
      setSelectedUserId(null)
      setProfile(null)
      setIsDetailLoading(false)
      setProfiles([])
      setProfileTotal(0)
      setProfileTotalPages(0)
      setProfileHasNext(false)
    }
    try {
      const data = await api.getAdminScoutProfiles({ status: status || undefined, page, limit: 10 })
      if (!current()) return false
      setProfiles(data.profiles)
      setProfilePage(data.page)
      setProfileTotal(data.totalCount)
      setProfileTotalPages(data.totalPages)
      setProfileHasNext(data.hasNext)
      queries.current = { ...queries.current, profileStatus: status, profilePage: data.page }
      succeedProfiles(listQueryKey({ status, page: data.page }))
      return true
    } catch (error) {
      if (!current()) return false
      failProfiles(error)
      if (isApiError(error) && (error.category === 'forbidden' || error.category === 'unauthorized')) {
        detailRequestId.current += 1
        setProfile(null)
        setIsDetailLoading(false)
      }
      setProfileError(fail(error, 'Scout 프로필 목록을 불러오지 못했습니다.'))
      return false
    }
  }, [beginProfiles, succeedProfiles, failProfiles, fail])
  const clearProfile = useCallback(() => {
    detailRequestId.current += 1
    selectedUserRef.current = null
    setSelectedUserId(null)
    setProfile(null)
    setIsDetailLoading(false)
    setErrorMessage('')
  }, [])
  const fetchProfile = useCallback(async (userId: number) => {
    const requestId = ++detailRequestId.current
    selectedUserRef.current = userId
    setSelectedUserId(userId)
    setProfile(null)
    setIsDetailLoading(true)
    setErrorMessage('')
    const isCurrent = () => requestId === detailRequestId.current && selectedUserRef.current === userId
    try {
      const data = await api.getAdminScoutProfile(userId)
      if (!isCurrent()) return null
      if (data.userId !== userId) throw new Error('Scout profile target mismatch')
      setProfile(data)
      return data
    } catch (error) {
      if (!isCurrent()) return null
      setProfile(null)
      setErrorMessage(fail(error, 'Scout 프로필 상세를 불러오지 못했습니다.'))
      logDebugError('관리자 Scout 프로필 상세 조회 실패', error)
      return null
    } finally {
      if (isCurrent()) setIsDetailLoading(false)
    }
  }, [fail])
  const refreshSelectedProfile = useCallback(async (userId: number) => {
    if (selectedUserRef.current === userId) await fetchProfile(userId)
  }, [fetchProfile])
  const fetchReports = useCallback(async (status: ScoutFieldReportStatus | '' = queries.current.reportStatus, page = queries.current.reportPage) => {
    const requestId = ++reportRequestId.current
    const key = listQueryKey({ status, page })
    const current = () => mounted.current && requestId === reportRequestId.current
    queries.current = { ...queries.current, reportStatus: status, reportPage: page }
    setReportStatus(status)
    setReportPage(page)
    setReportError('')
    if (!beginReports(key, Boolean(status))) {
      setReports([])
      setReportTotal(0)
      setReportTotalPages(0)
      setReportHasNext(false)
    }
    try {
      const data = await api.getAdminScoutFieldReports({ status: status || undefined, page, limit: 10 })
      if (!current()) return false
      setReports(data.reports)
      setReportPage(data.page)
      setReportTotal(data.totalElements)
      setReportTotalPages(data.totalPages)
      setReportHasNext(data.hasNext)
      queries.current = { ...queries.current, reportStatus: status, reportPage: data.page }
      succeedReports(listQueryKey({ status, page: data.page }))
      return true
    } catch (error) {
      if (!current()) return false
      failReports(error)
      setReportError(fail(error, 'Scout 현장 제보을 불러오지 못했습니다.'))
      return false
    }
  }, [beginReports, succeedReports, failReports, fail])
  const run = useCallback(async <T,>(action: Action, request: () => Promise<T>, success: string, refresh: () => Promise<unknown>) => {
    if (actionRef.current) return null
    actionRef.current = action
    setActiveAction(action)
    setActionErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await request()
      if (!mounted.current) return data
      setSuccessMessage(success)
      // A successful mutation must not become a failure when its refresh fails.
      try {
        await refresh()
      } catch (error) {
        if (mounted.current) setErrorMessage(fail(error, '처리는 완료됐지만 최신 정보를 불러오지 못했습니다.'))
      }
      return data
    } catch (error) {
      if (mounted.current) setActionErrorMessage(fail(error, 'Scout 작업을 처리하지 못했습니다.'))
      logDebugError(`관리자 Scout ${action} 실패`, error)
      return null
    } finally {
      actionRef.current = null
      if (mounted.current) setActiveAction(null)
    }
  }, [fail])
  const reviewProfile = useCallback((userId: number, action: 'approve' | 'suspend' | 'revoke', reason: string) => run('profile', () => api.reviewAdminScoutProfile(userId, action, reason), 'Scout 프로필 상태를 변경했습니다.', async () => { await fetchProfiles(); await refreshSelectedProfile(userId) }), [refreshSelectedProfile, fetchProfiles, run])
  const grantEligibility = useCallback((userId: number, request: { eligibleFrom: string; eligibleUntil?: string; reason?: string }) => run('eligibility', () => api.grantAdminScoutEligibility(userId, request), 'Scout 활동 자격을 부여했습니다.', () => refreshSelectedProfile(userId)), [refreshSelectedProfile, run])
  const reviewEligibility = useCallback((userId: number, action: 'suspend' | 'revoke', reason: string) => run('eligibility', () => api.reviewAdminScoutEligibility(userId, action, reason), 'Scout 활동 자격 상태를 변경했습니다.', () => refreshSelectedProfile(userId)), [refreshSelectedProfile, run])
  const reviewReport = useCallback((reportId: number, decision: 'ACCEPTED' | 'REJECTED', note: string) => run('report', () => api.reviewAdminScoutFieldReport(reportId, decision, note), 'Scout 현장 제보를 심사했습니다.', () => fetchReports()), [fetchReports, run])
  useEffect(() => {
    mounted.current = true
    void fetchProfiles('PENDING', 1)
    void fetchReports('SUBMITTED', 1)
    return () => {
      mounted.current = false
      detailRequestId.current += 1
      profileRequestId.current += 1
      reportRequestId.current += 1
      selectedUserRef.current = null
    }
  }, [fetchProfiles, fetchReports])
  return { isLoading: profileListState.phase === "loading" || reportListState.phase === "loading", selectedUserId, clearProfile, profileStatus, reportStatus, profiles, profile, reports, profilePage, reportPage, profileTotal, reportTotal, profileTotalPages, reportTotalPages, profileHasNext, reportHasNext, profileListState, reportListState, profileError, reportError, isDetailLoading, activeAction, errorMessage, actionErrorMessage, dismissActionError: () => setActionErrorMessage(''), successMessage, fetchProfiles, fetchProfile, fetchReports, reviewProfile, grantEligibility, reviewEligibility, reviewReport }
}
