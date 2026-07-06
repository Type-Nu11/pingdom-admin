import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { logout as requestLogout } from '../../api/authApi'
import type { LoginResponse } from '../../types/auth.types'
import {
  clearStoredAuth,
  createAuthStateFromLogin,
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
  type AuthState,
  type AuthUser,
} from './AuthContext'

function getInitialAuthState(): AuthState {
  return getStoredAuthState() ?? EMPTY_AUTH_STATE
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(() => getInitialAuthState())
  const [isAuthReady, setIsAuthReady] = useState(true)

  useEffect(() => {
    return subscribeAuthStorageChange(() => {
      setAuthState(getInitialAuthState())
      setIsAuthReady(true)
    })
  }, [])

  const clearAuth = useCallback(() => {
    clearStoredAuth()
    setAuthState(EMPTY_AUTH_STATE)
    setIsAuthReady(true)
  }, [])

  const login = useCallback((data: LoginResponse) => {
    saveLoginAuth(data)
    setAuthState(createAuthStateFromLogin(data))
    setIsAuthReady(true)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = authState.refreshToken

    clearAuth()

    if (!refreshToken) {
      return
    }

    try {
      await requestLogout({ refreshToken })
    } catch (error) {
      logDebugError('로그아웃 요청 실패', error)
    }
  }, [authState.refreshToken, clearAuth])

  const updateUser = useCallback((user: Partial<AuthUser>) => {
    setAuthState((prevState) => {
      if (!prevState.user) {
        return prevState
      }

      const nextUser = {
        ...prevState.user,
        ...user,
      }

      updateStoredAuthUser(user)

      return {
        ...prevState,
        user: nextUser,
      }
    })
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
