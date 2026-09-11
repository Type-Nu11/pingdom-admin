import { Fragment, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
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
  const [isAuthReady, setIsAuthReady] = useState(true)
  const syncAuth = useCallback(() => {
    setSnapshot(getInitialAuthSnapshot())
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
    clearAuth()

    try {
      await runAuthTransition(async () => {
        // 앞서 대기 중이던 로그인 응답이 저장됐더라도 로그아웃이 마지막 상태가 됩니다.
        clearAuth()
        await requestLogout()
      })
    } catch (error) {
      logDebugError('로그아웃 요청 실패', error)
    }
  }, [clearAuth])

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
