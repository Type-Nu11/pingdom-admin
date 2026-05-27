import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { LoginResponse } from '../../types/auth.types'
import {
  clearStoredAuth,
  createAuthStateFromLogin,
  getStoredAuthState,
  saveLoginAuth,
  subscribeAuthStorageChange,
  updateStoredAuthUser,
} from '../../utils/authStorage'
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

  useEffect(() => {
    return subscribeAuthStorageChange(() => {
      setAuthState(getInitialAuthState())
    })
  }, [])

  const clearAuth = useCallback(() => {
    clearStoredAuth()
    setAuthState(EMPTY_AUTH_STATE)
  }, [])

  const login = useCallback((data: LoginResponse) => {
    saveLoginAuth(data)
    setAuthState(createAuthStateFromLogin(data))
  }, [])

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
      isAuthenticated: Boolean(authState.accessToken),
      login,
      logout: clearAuth,
      clearAuth,
      updateUser,
    }),
    [authState, clearAuth, login, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
