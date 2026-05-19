import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'
import type { LoginResponse } from '../../types/auth.types'
import {
  AUTH_STORAGE_KEYS,
  AuthContext,
  EMPTY_AUTH_STATE,
  type AuthContextValue,
  type AuthState,
  type AuthUser,
} from './AuthContext'

function getInitialAuthState(): AuthState {
  const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.accessToken) ?? ''
  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) ?? ''
  const username = localStorage.getItem(AUTH_STORAGE_KEYS.username) ?? ''
  const name = localStorage.getItem(AUTH_STORAGE_KEYS.name) ?? ''
  const userId = Number(localStorage.getItem(AUTH_STORAGE_KEYS.userId))

  if (!accessToken) {
    return EMPTY_AUTH_STATE
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: Number.isNaN(userId) ? null : userId,
      username,
      name,
    },
  }
}

function saveAuthToStorage(data: LoginResponse) {
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, data.accessToken)
  localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken)
  localStorage.setItem(AUTH_STORAGE_KEYS.userId, String(data.id))
  localStorage.setItem(AUTH_STORAGE_KEYS.username, data.username)
  localStorage.setItem(AUTH_STORAGE_KEYS.name, data.name)
}

function clearAuthStorage() {
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(() => getInitialAuthState())

  const clearAuth = useCallback(() => {
    clearAuthStorage()
    setAuthState(EMPTY_AUTH_STATE)
  }, [])

  const login = useCallback((data: LoginResponse) => {
    saveAuthToStorage(data)
    setAuthState({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: data.id,
        username: data.username,
        name: data.name,
      },
    })
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

      if (typeof user.id === 'number') {
        localStorage.setItem(AUTH_STORAGE_KEYS.userId, String(user.id))
      }

      if (typeof user.username === 'string') {
        localStorage.setItem(AUTH_STORAGE_KEYS.username, user.username)
      }

      if (typeof user.name === 'string') {
        localStorage.setItem(AUTH_STORAGE_KEYS.name, user.name)
      }

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
