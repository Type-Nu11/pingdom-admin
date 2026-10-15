import { AUTH_STORAGE_KEYS } from '../constants/auth'
import { getAccessTokenSubject } from './accessTokenSubject'
import { AuthSessionError } from './authSessionError'
import { clearLoginReturn, getLoginReturnNotice, rememberAuthExit, type AuthExitReason } from './authReturn'
import type { LoginResponse, RefreshTokenResponse } from '../types/auth.types'
import type { AuthState, AuthUser } from '../app/providers/AuthContext'

// Compatibility name only: credentials and profiles live exclusively in module memory.
const CONTROL_KEY = 'pingdom-auth-control'
const LEGACY_KEYS = [...Object.values(AUTH_STORAGE_KEYS), 'refreshToken', 'pingdom-auth-session', 'pingdom-auth-storage-commit']
type Control = { id: string; blocked: boolean }
export interface AuthStorageSnapshot {
  sessionId: string
  authState: AuthState | null
  status: 'loading' | 'ready' | 'error'
  error: string
}
const listeners = new Set<(source?: 'local' | 'remote') => void>()
let control: Control = readControl()
let snapshot: AuthStorageSnapshot = { sessionId: crypto.randomUUID(), authState: null, status: control.blocked ? 'ready' : 'loading', error: '' }
let authSessionNotice = ''
let listening = false

function readControl(): Control {
  try {
    if (typeof localStorage === 'undefined') return { id: 'initial', blocked: false }
    const raw = localStorage.getItem(CONTROL_KEY)
    if (!raw) return { id: 'initial', blocked: false }
    const value = JSON.parse(raw) as Control
    if (typeof value.id === 'string' && value.id && typeof value.blocked === 'boolean') return { id: value.id, blocked: value.blocked }
  } catch { /* Unreadable storage cannot prove that a prior logout was cleared. */ }
  return { id: 'unavailable', blocked: true }
}

export function cleanupLegacyAuthStorage() {
  for (const storage of [() => globalThis.localStorage, () => globalThis.sessionStorage]) {
    try { const target = storage(); LEGACY_KEYS.forEach(key => target?.removeItem(key)) } catch { /* Storage may be disabled. */ }
  }
}
cleanupLegacyAuthStorage()

function emit(source: 'local' | 'remote' = 'local') { listeners.forEach(listener => listener(source)) }

function reconcileControl() {
  const next = readControl()
  if (next.id === control.id && next.blocked === control.blocked) return false
  if (snapshot.authState?.user) {
    clearLoginReturn()
    rememberAuthExit(null, 'session-changed')
  }
  control = next
  snapshot = { sessionId: crypto.randomUUID(), authState: null, status: next.blocked ? 'ready' : 'loading', error: '' }
  cleanupLegacyAuthStorage()
  queueMicrotask(() => emit('remote'))
  return true
}

export function getAuthSessionId() { reconcileControl(); return snapshot.sessionId }
export function getStoredAuthSnapshot() { reconcileControl(); return snapshot }
export function getStoredAuthState() { return getStoredAuthSnapshot().authState }
export function getStoredAccessToken() { return getStoredAuthState()?.accessToken ?? '' }
export function isAuthRestoreBlocked() { reconcileControl(); return control.blocked }
export function getAuthSessionNotice() { return getLoginReturnNotice() || authSessionNotice }
export function dismissAuthSessionNotice() { authSessionNotice = ''; clearLoginReturn() }

function publishControl(blocked: boolean, requireStorage = false) {
  control = { id: crypto.randomUUID(), blocked }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CONTROL_KEY, JSON.stringify(control))
  } catch {
    if (requireStorage) throw new AuthSessionError('로그인 상태를 동기화하지 못했습니다. 사이트 저장소를 허용한 뒤 다시 시도해주세요.')
  }
  return control.id
}

export function createAuthStateFromLogin(data: Omit<LoginResponse, 'message'>): AuthState {
  return {
    accessToken: data.accessToken,
    user: {
      id: data.id, username: data.username ?? '', name: '', email: data.email ?? '',
      birthYear: data.birthYear ?? null, profileImageUrl: data.profileImageUrl ?? '',
      language: data.language ?? '', country: data.country ?? '', role: data.role ?? '',
    },
  }
}

export function assertValidAuthState(state: AuthState) {
  const user = state.user
  if (!user || typeof user.id !== 'number' || !Number.isSafeInteger(user.id) || user.id <= 0 ||
    getAccessTokenSubject(state.accessToken) !== String(user.id) ||
    !['ADMIN', 'MERCHANT_OWNER', 'USER'].includes(user.role) ||
    !['username', 'name', 'email', 'profileImageUrl', 'language', 'country'].every(key => typeof user[key as keyof AuthUser] === 'string') ||
    !(user.birthYear === null || Number.isSafeInteger(user.birthYear))) {
    throw new AuthSessionError('서버의 로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.')
  }
}

export function saveLoginAuth(data: LoginResponse) {
  const authState = createAuthStateFromLogin(data)
  assertValidAuthState(authState)
  const sessionId = publishControl(false, true)
  authSessionNotice = ''
  cleanupLegacyAuthStorage()
  snapshot = { sessionId, authState, status: 'ready', error: '' }
  emit()
}

export function beginLoginAttempt() {
  const sessionId = publishControl(true, true)
  snapshot = { sessionId, authState: null, status: 'ready', error: '' }
  emit()
  return sessionId
}

export function saveRestoredAuth(state: AuthState, sessionId: string) {
  if (getAuthSessionId() !== sessionId || control.blocked) return false
  assertValidAuthState(state)
  snapshot = { sessionId, authState: state, status: 'ready', error: '' }
  authSessionNotice = ''
  emit()
  return true
}

export function setAuthRestoreStatus(sessionId: string, status: AuthStorageSnapshot['status'], error = '') {
  if (getAuthSessionId() !== sessionId) return
  snapshot = { ...snapshot, status, error }
  emit()
}

export function saveRefreshedAuthTokens(data: RefreshTokenResponse, sessionId: string) {
  if (getAuthSessionId() !== sessionId || !snapshot.authState?.user) return false
  if (getAccessTokenSubject(data.accessToken) !== String(snapshot.authState.user.id)) return false
  snapshot = { ...snapshot, authState: { ...snapshot.authState, accessToken: data.accessToken } }
  emit()
  return true
}

export function clearStoredAuth(notice?: string, reason: AuthExitReason = 'expired') {
  const user = getStoredAuthState()?.user ?? null
  authSessionNotice = reason === 'logout' ? '' : notice ?? '로그인 인증이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.'
  if (reason === 'logout' || user) rememberAuthExit(reason === 'logout' ? null : user, reason)
  // Non-sensitive tombstone: failed server logout must not resurrect a cookie on reload.
  const sessionId = publishControl(true)
  snapshot = { sessionId, authState: null, status: 'ready', error: '' }
  cleanupLegacyAuthStorage()
  emit()
}

export function updateStoredAuthUser(user: Partial<AuthUser>) {
  const state = getStoredAuthState()
  if (!state?.user) return
  const next = { ...state, user: { ...state.user, ...user } }
  assertValidAuthState(next)
  snapshot = { ...snapshot, authState: next }
  emit()
}

export function subscribeAuthStorageChange(listener: (source?: 'local' | 'remote') => void) {
  if (!listening && typeof window !== 'undefined') {
    // Read the current record, never trust a delayed StorageEvent payload.
    window.addEventListener('storage', event => {
      if (event.storageArea !== localStorage || event.key !== null && event.key !== CONTROL_KEY) return
      reconcileControl()
    })
    window.addEventListener('pageshow', () => { reconcileControl() })
    listening = true
  }
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
