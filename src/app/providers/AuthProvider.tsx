import { Fragment, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { logout as requestLogout } from '../../api/authApi'
import { runAuthTransition } from '../../api/customAxios'
import type { LoginResponse } from '../../types/auth.types'
import {
  clearStoredAuth,
  getAuthSessionId,
  getStoredAuthSnapshot,
  getStoredAuthState,
  saveLoginAuth,
  subscribeAuthStorageChange,
  updateStoredAuthUser,
} from '../../utils/authStorage'
import { logDebugError } from '../../utils/debugLogger'
import { restoreAuthSession } from '../../api/authSessionApi'
import { RouteLoadingFallback } from '../router/RouteLoadingFallback'
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
  const isAuthReady = snapshot.status === 'ready'
  const syncAuth = useCallback(() => {
    const next = getInitialAuthSnapshot()
    setSnapshot(next)
  }, [])

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeAuthStorageChange(syncAuth)
    queueMicrotask(() => { if (active) syncAuth() })
    return () => { active = false; unsubscribe() }
  }, [syncAuth])

  useEffect(() => {
    if (snapshot.status === 'loading') void restoreAuthSession()
  }, [snapshot.sessionId, snapshot.status])

  const retryAuthRestore = useCallback(() => { void restoreAuthSession() }, [])

  const clearAuth = useCallback(() => {
    clearStoredAuth()
  }, [])

  const login = useCallback((data: LoginResponse) => {
    saveLoginAuth(data)
  }, [])

  const logout = useCallback(async () => {
    clearStoredAuth(undefined, 'logout')
    const logoutSession = getAuthSessionId()

    try {
      await runAuthTransition(async () => {
        // A newer explicit login owns the cookie now; do not delete its session.
        if (getAuthSessionId() !== logoutSession) return
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

  return <AuthContext.Provider value={value}>
    {isAuthReady ? <Fragment key={authState.user ? `${sessionId}:${authState.user.id}:${authState.user.role}` : 'guest'}>{children}</Fragment>
      : <RouteLoadingFallback title={snapshot.error ? '로그인 상태를 확인하지 못했습니다.' : '로그인 상태를 확인하고 있습니다.'}
        description={snapshot.error || '안전하게 세션을 복구하고 있습니다. 잠시만 기다려주세요.'}
        onRetry={snapshot.error ? retryAuthRestore : undefined}
        onSignIn={snapshot.error ? clearAuth : undefined} />}
  </AuthContext.Provider>
}
