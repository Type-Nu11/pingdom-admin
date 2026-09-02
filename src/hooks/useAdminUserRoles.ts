import { useCallback, useRef, useState } from 'react'
import { useAutoDismissMessage } from './useAutoDismissMessage'
import * as api from '../api/adminUserRoleApi'
import { getAuthErrorMessage } from '../api/authError'
import { isApiError } from '../api/customAxios'
import type { AdminRole, AdminRoleAssignment, AdminUserRoleErrorResponse } from '../types/adminUserRole.types'
import { logDebugError } from '../utils/debugLogger'
import { useAuth } from './useAuth'

const CATEGORY_MESSAGES = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '역할 관리 권한이 필요합니다.',
  'not-found': '대상 관리자 또는 활성 역할을 찾을 수 없습니다.',
  conflict: '이미 부여된 활성 역할입니다.',
  network: '서버에 연결할 수 없습니다.',
  'request-blocked': '서버 응답을 읽지 못했습니다.',
  timeout: '응답이 지연되고 있습니다.',
  server: '서버 오류가 발생했습니다.',
}

export function useAdminUserRoles() {
  const { clearAuth } = useAuth()
  const [targetUserId, setTargetUserId] = useState<number | null>(null)
  const [assignments, setAssignments] = useState<AdminRoleAssignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')
  useAutoDismissMessage(actionErrorMessage, setActionErrorMessage)
  const [successMessage, setSuccessMessage] = useState('')
  useAutoDismissMessage(successMessage, setSuccessMessage)
  const mutationRef = useRef(false)

  const errorText = useCallback((error: unknown, fallback: string) => {
    if (!isApiError<AdminUserRoleErrorResponse>(error)) return fallback
    if (error.response?.data?.code === 'INVALID_TOKEN' || error.category === 'unauthorized') clearAuth()
    return getAuthErrorMessage(error, { fallbackMessage: fallback, categoryMessages: CATEGORY_MESSAGES })
  }, [clearAuth])

  const fetchRoles = useCallback(async (userId: number) => {
    setIsLoading(true); setErrorMessage(''); setActionErrorMessage(''); setSuccessMessage('')
    try {
      const data = await api.getAdminUserRoles(userId)
      setTargetUserId(userId); setAssignments(data)
      return true
    } catch (error) {
      setTargetUserId(null); setAssignments([])
      setErrorMessage(errorText(error, '관리자 역할 이력을 불러오지 못했습니다.'))
      logDebugError('관리자 역할 이력 조회 실패', error)
      return false
    } finally { setIsLoading(false) }
  }, [errorText])

  const mutate = useCallback(async (role: AdminRole, action: 'assign' | 'revoke', reason: string) => {
    if (!targetUserId || mutationRef.current) return false
    mutationRef.current = true; setIsMutating(true); setActionErrorMessage(''); setSuccessMessage('')
    try {
      if (action === 'assign') await api.assignAdminUserRole(targetUserId, role, reason)
      else await api.revokeAdminUserRole(targetUserId, role, reason)
      setSuccessMessage(action === 'assign' ? '관리자 역할을 부여했습니다.' : '관리자 역할을 회수했습니다.')
      const data = await api.getAdminUserRoles(targetUserId)
      setAssignments(data)
      return true
    } catch (error) {
      setActionErrorMessage(errorText(error, '관리자 역할을 변경하지 못했습니다.'))
      logDebugError('관리자 역할 변경 실패', error)
      return false
    } finally { mutationRef.current = false; setIsMutating(false) }
  }, [errorText, targetUserId])

  return { targetUserId, assignments, isLoading, isMutating, errorMessage, actionErrorMessage, successMessage, fetchRoles, mutate }
}
