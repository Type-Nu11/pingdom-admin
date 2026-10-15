import axios from 'axios'
import type { AuthState } from '../app/providers/AuthContext'
import type { LoginResponse, RefreshTokenResponse } from '../types/auth.types'
import { withAuthCookieLock } from '../utils/authCookieLock'
import { getAccessTokenSubject } from '../utils/accessTokenSubject'
import { AuthSessionError } from '../utils/authSessionError'
import {
  assertValidAuthState, clearStoredAuth, createAuthStateFromLogin, getAuthSessionId,
  getStoredAuthSnapshot, isAuthRestoreBlocked, saveRestoredAuth, setAuthRestoreStatus,
} from '../utils/authStorage'

export const AUTH_API_BASE_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_PUBLIC_API_BASE_URL
const transportOptions = { baseURL: AUTH_API_BASE_URL, timeout: 10000, withCredentials: true }
const restores = new Map<string, Promise<void>>()
export function isAuthRestoring() { return restores.size > 0 }

export async function requestCookieAccessToken(signal?: AbortSignal) {
  const { data } = await axios.post<RefreshTokenResponse>('/auth/token/refresh', undefined, { ...transportOptions, signal })
  return data
}

export async function requestVerifiedProfile(accessToken: string): Promise<AuthState> {
  if (!getAccessTokenSubject(accessToken)) throw new AuthSessionError('서버의 로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
  // Raw transport bypasses interceptor refresh to avoid bootstrap loops.
  const { data } = await axios.get<Omit<LoginResponse, 'accessToken' | 'message'>>('/users/me', {
    ...transportOptions, headers: { Authorization: `Bearer ${accessToken}` },
  })
  const state = createAuthStateFromLogin({ ...data, accessToken })
  assertValidAuthState(state)
  return state
}

export function restoreAuthSession(): Promise<void> {
  const snapshot = getStoredAuthSnapshot()
  if (snapshot.authState || isAuthRestoreBlocked()) return Promise.resolve()
  const sessionId = snapshot.sessionId
  const pending = restores.get(sessionId)
  if (pending) return pending
  setAuthRestoreStatus(sessionId, 'loading')
  const request = withAuthCookieLock(async () => {
    if (getAuthSessionId() !== sessionId || isAuthRestoreBlocked()) return
    const { accessToken } = await requestCookieAccessToken()
    if (getAuthSessionId() !== sessionId) return
    const state = await requestVerifiedProfile(accessToken)
    saveRestoredAuth(state, sessionId)
  }).catch(error => {
    if (getAuthSessionId() !== sessionId) return
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status === 401 || status === 403) {
      clearStoredAuth(undefined, 'expired')
    } else {
      setAuthRestoreStatus(sessionId, 'error', error instanceof AuthSessionError
        ? error.message : '로그인 상태를 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해주세요.')
    }
  }).finally(() => { restores.delete(sessionId) })
  restores.set(sessionId, request)
  return request
}
