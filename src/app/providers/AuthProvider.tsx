import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { logout as requestLogout } from '../../api/authApi'
import { runAuthTransition } from '../../api/customAxios'
import type { LoginResponse } from '../../types/auth.types'
import {
  clearStoredAuth,
  getStoredAuthSnapshot,
  getStoredAuthState,
  saveLoginAuth,
  subscribeAuthStorageChange,
  updateStoredAuthUser,
} from '../../utils/authStorage'
import { logDebugError } from '../../utils/debugLogger'
import { clearLoginReturn, rememberAuthExit } from '../../utils/authReturn'
import {
  AuthContext,
  EMPTY_AUTH_STATE,
  type AuthContextValue,
  type AuthUser,
} from './AuthContext'

function getInitialAuthSnapshot() {
  const snapshot = getStoredAuthSnapshot()
  return { ...snapshot, authState: snapshot.authState ?? EMPTY_AUTH_STATE }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(getInitialAuthSnapshot)
  const { authState, sessionId } = snapshot
  const previousSnapshot = useRef(snapshot)
  const [isAuthReady, setIsAuthReady] = useState(true)
  const syncAuth = useCallback((source?: 'local' | 'remote') => {
    const next = getInitialAuthSnapshot()
    const previousUser = previousSnapshot.current.authState.user
    const nextUser = next.authState.user
    if (source === 'remote' && previousUser && (previousUser.id !== nextUser?.id || previousUser.role !== nextUser?.role)) {
      clearLoginReturn()
      if (!nextUser) rememberAuthExit(null, 'session-changed')
    }
    previousSnapshot.current = next
    setSnapshot(next)
    setIsAuthReady(true)
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeAuthStorageChange(syncAuth)
    queueMicrotask(() => { if (active) syncAuth() })
    return () => { active = false; unsubscribe() }
  }, [syncAuth])

  const clearAuth = useCallback(() => {
    clearStoredAuth()
  }, [])

  const login = useCallback((data: LoginResponse) => {
    saveLoginAuth(data)
  }, [])

  const logout = useCallback(async () => {
    clearStoredAuth(undefined, 'logout')

    try {
      await runAuthTransition(async () => {
        // 앞서 대기 중이던 로그인 응답이 저장됐더라도 로그아웃이 마지막 상태가 됩니다.
        clearStoredAuth(undefined, 'logout')
        await requestLogout()
      })
    } catch (error) {
      logDebugError('로그아웃 요청 실패', error)
    }
  }, [])

  const updateUser = useCallback((user: Partial<AuthUser>) => {
    if (getStoredAuthState()?.user) updateStoredAuthUser(user)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      isAuthReady,
      isAuthenticated: Boolean(authState.accessToken),
      login,
      logout,
      clearAuth,
      updateUser,
    }),
    [authState, clearAuth, isAuthReady, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}><Fragment key={`${sessionId}:${authState.user?.id ?? ''}:${authState.user?.role ?? ''}`}>{children}</Fragment></AuthContext.Provider>
}
