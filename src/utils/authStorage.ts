import { AUTH_STORAGE_KEYS } from '../constants/auth'
import { getAccessTokenSubject } from './accessTokenSubject'
import type { LoginResponse, RefreshTokenResponse } from '../types/auth.types'
import type { AuthState, AuthUser } from '../app/providers/AuthContext'

const AUTH_STORAGE_CHANGE_EVENT = 'pingdom-auth-storage-change'
const LEGACY_REFRESH_TOKEN_STORAGE_KEY = 'refreshToken'
const AUTH_SESSION_KEY = 'pingdom-auth-session'
const AUTH_STORAGE_COMMIT_KEY = 'pingdom-auth-storage-commit'
let fallbackSessionId = ''
let authSessionNotice = ''

export interface AuthStorageSnapshot {
  sessionId: string
  authState: AuthState | null
}

export function getAuthSessionNotice() {
  return authSessionNotice
}

export function getAuthSessionId() {
  return getStoredAuthSnapshot().sessionId
}

function getLegacySessionId() {
  let sessionId = canUseStorage() ? getStoredString(AUTH_SESSION_KEY) : fallbackSessionId
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    setStoredString(AUTH_SESSION_KEY, sessionId)
    fallbackSessionId = sessionId
  }
  return sessionId
}

function rotateAuthSession() {
  fallbackSessionId = crypto.randomUUID()
  setStoredString(AUTH_SESSION_KEY, fallbackSessionId)
  return fallbackSessionId
}

function canUseStorage() {
  return typeof localStorage !== 'undefined'
}

function canUseWindow() {
  return typeof window !== 'undefined'
}

function notifyAuthStorageChange(snapshot: AuthStorageSnapshot) {
  // Publish the operation's complete value, never reread partially written fields.
  setStoredString(AUTH_STORAGE_COMMIT_KEY, JSON.stringify({ ...snapshot, commitId: crypto.randomUUID() }))
  if (!canUseWindow()) {
    return
  }

  window.dispatchEvent(new Event(AUTH_STORAGE_CHANGE_EVENT))
}

function getStoredString(key: string) {
  if (!canUseStorage()) {
    return ''
  }

  return localStorage.getItem(key) ?? ''
}

function setStoredString(key: string, value: string) {
  if (!canUseStorage()) {
    return
  }

  localStorage.setItem(key, value)
}

function removeStoredValue(key: string) {
  if (!canUseStorage()) {
    return
  }

  localStorage.removeItem(key)
}

function parseStoredNumber(value: string) {
  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  return Number.isNaN(parsedValue) ? null : parsedValue
}

function normalizeAuthString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeAuthNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringifyAuthNumber(value: unknown) {
  const normalizedValue = normalizeAuthNumber(value)

  return normalizedValue === null ? '' : String(normalizedValue)
}

export function getStoredAccessToken() {
  return getStoredAuthSnapshot().authState?.accessToken ?? ''
}

export function getStoredAuthState(): AuthState | null {
  return getStoredAuthSnapshot().authState
}

export function getStoredAuthSnapshot(): AuthStorageSnapshot {
  const committed = getStoredString(AUTH_STORAGE_COMMIT_KEY)
  if (committed) {
    try {
      const value = JSON.parse(committed) as AuthStorageSnapshot
      const state = value?.authState
      const user = state?.user
      if (typeof value?.sessionId === 'string' && value.sessionId && (
        state === null || (
          typeof state?.accessToken === 'string' && state.accessToken && user &&
          (user.id === null || typeof user.id === 'number' && Number.isFinite(user.id)) &&
          (user.birthYear === null || typeof user.birthYear === 'number' && Number.isFinite(user.birthYear)) &&
          ['username', 'name', 'email', 'profileImageUrl', 'language', 'country', 'role']
            .every(key => typeof user[key as keyof AuthUser] === 'string')
        )
      )) return { sessionId: value.sessionId, authState: state }
    } catch { /* An invalid commit must not resurrect old individual fields. */ }
    return { sessionId: getLegacySessionId(), authState: null }
  }
  // Existing installations have individual fields but no committed snapshot yet.
  return { sessionId: getLegacySessionId(), authState: readLegacyAuthState() }
}

function readLegacyAuthState(): AuthState | null {
  removeStoredValue(LEGACY_REFRESH_TOKEN_STORAGE_KEY)
  const accessToken = getStoredString(AUTH_STORAGE_KEYS.accessToken)

  if (!accessToken) {
    return null
  }

  return {
    accessToken,
    user: {
      id: parseStoredNumber(getStoredString(AUTH_STORAGE_KEYS.userId)),
      username: getStoredString(AUTH_STORAGE_KEYS.username),
      name: getStoredString(AUTH_STORAGE_KEYS.name),
      email: getStoredString(AUTH_STORAGE_KEYS.email),
      birthYear: parseStoredNumber(getStoredString(AUTH_STORAGE_KEYS.birthYear)),
      profileImageUrl: getStoredString(AUTH_STORAGE_KEYS.profileImageUrl),
      language: getStoredString(AUTH_STORAGE_KEYS.language),
      country: getStoredString(AUTH_STORAGE_KEYS.country),
      role: getStoredString(AUTH_STORAGE_KEYS.role),
    },
  }
}

export function createAuthStateFromLogin(data: LoginResponse): AuthState {
  return {
    accessToken: data.accessToken,
    user: {
      id: normalizeAuthNumber(data.id),
      username: normalizeAuthString(data.username),
      name: '',
      email: normalizeAuthString(data.email),
      birthYear: normalizeAuthNumber(data.birthYear),
      profileImageUrl: normalizeAuthString(data.profileImageUrl),
      language: normalizeAuthString(data.language),
      country: normalizeAuthString(data.country),
      role: normalizeAuthString(data.role),
    },
  }
}

export function saveLoginAuth(data: LoginResponse) {
  const sessionId = rotateAuthSession()
  authSessionNotice = ''
  removeStoredValue(LEGACY_REFRESH_TOKEN_STORAGE_KEY)
  setStoredString(AUTH_STORAGE_KEYS.accessToken, data.accessToken)
  setStoredString(AUTH_STORAGE_KEYS.userId, stringifyAuthNumber(data.id))
  setStoredString(AUTH_STORAGE_KEYS.username, normalizeAuthString(data.username))
  removeStoredValue(AUTH_STORAGE_KEYS.name)
  setStoredString(AUTH_STORAGE_KEYS.email, normalizeAuthString(data.email))
  setStoredString(AUTH_STORAGE_KEYS.birthYear, stringifyAuthNumber(data.birthYear))
  setStoredString(
    AUTH_STORAGE_KEYS.profileImageUrl,
    normalizeAuthString(data.profileImageUrl)
  )
  setStoredString(AUTH_STORAGE_KEYS.language, normalizeAuthString(data.language))
  setStoredString(AUTH_STORAGE_KEYS.country, normalizeAuthString(data.country))
  setStoredString(AUTH_STORAGE_KEYS.role, normalizeAuthString(data.role))
  notifyAuthStorageChange({ sessionId, authState: createAuthStateFromLogin(data) })
}

export function saveRefreshedAuthTokens(data: RefreshTokenResponse, sessionId: string) {
  const snapshot = getStoredAuthSnapshot()
  if (snapshot.sessionId !== sessionId || !snapshot.authState?.user) return false
  const userId = snapshot.authState.user.id
  if (userId === null || getAccessTokenSubject(data.accessToken) !== String(userId)) return false
  setStoredString(AUTH_STORAGE_KEYS.accessToken, data.accessToken)
  notifyAuthStorageChange({ sessionId, authState: { ...snapshot.authState, accessToken: data.accessToken } })
  return true
}

export function clearStoredAuth(notice?: string) {
  if (notice) authSessionNotice = notice
  const sessionId = rotateAuthSession()
  Object.values(AUTH_STORAGE_KEYS).forEach(removeStoredValue)
  removeStoredValue(LEGACY_REFRESH_TOKEN_STORAGE_KEY)
  notifyAuthStorageChange({ sessionId, authState: null })
}

export function updateStoredAuthUser(user: Partial<AuthUser>) {
  const snapshot = getStoredAuthSnapshot()
  if (!snapshot.authState?.user) return
  const nextUser = { ...snapshot.authState.user }
  for (const key of ['id', 'birthYear'] as const) {
    if (user[key] === null || typeof user[key] === 'number' && Number.isFinite(user[key])) {
      nextUser[key] = user[key]
    }
  }
  for (const key of ['username', 'name', 'email', 'profileImageUrl', 'language', 'country', 'role'] as const) {
    if (typeof user[key] === 'string') nextUser[key] = user[key]
  }
  if (typeof user.id === 'number') {
    setStoredString(AUTH_STORAGE_KEYS.userId, String(user.id))
  }

  if (user.id === null) {
    removeStoredValue(AUTH_STORAGE_KEYS.userId)
  }

  if (typeof user.username === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.username, user.username)
  }

  if (typeof user.name === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.name, user.name)
  }

  if (typeof user.email === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.email, user.email)
  }

  if (typeof user.birthYear === 'number') {
    setStoredString(AUTH_STORAGE_KEYS.birthYear, String(user.birthYear))
  }

  if (user.birthYear === null) {
    removeStoredValue(AUTH_STORAGE_KEYS.birthYear)
  }

  if (typeof user.profileImageUrl === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.profileImageUrl, user.profileImageUrl)
  }

  if (typeof user.language === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.language, user.language)
  }

  if (typeof user.country === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.country, user.country)
  }

  if (typeof user.role === 'string') {
    setStoredString(AUTH_STORAGE_KEYS.role, user.role)
  }
  notifyAuthStorageChange({ ...snapshot, authState: { ...snapshot.authState, user: nextUser } })
}

export function subscribeAuthStorageChange(listener: () => void) {
  if (!canUseWindow()) {
    return () => {}
  }

  let lastCommit = getStoredString(AUTH_STORAGE_COMMIT_KEY)
  const handleLocalChange = () => {
    lastCommit = getStoredString(AUTH_STORAGE_COMMIT_KEY)
    listener()
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return
    if (event.key !== null && event.key !== AUTH_STORAGE_COMMIT_KEY) return
    const commit = getStoredString(AUTH_STORAGE_COMMIT_KEY)
    if (event.key !== null && commit === lastCommit) return
    lastCommit = commit
    listener()
  }
  window.addEventListener(AUTH_STORAGE_CHANGE_EVENT, handleLocalChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(AUTH_STORAGE_CHANGE_EVENT, handleLocalChange)
    window.removeEventListener('storage', handleStorage)
  }
}
