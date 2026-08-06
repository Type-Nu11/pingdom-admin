import { AUTH_STORAGE_KEYS } from '../constants/auth'
import type { LoginResponse, RefreshTokenResponse } from '../types/auth.types'
import type { AuthState, AuthUser } from '../app/providers/AuthContext'

const AUTH_STORAGE_CHANGE_EVENT = 'pingdom-auth-storage-change'
const LEGACY_REFRESH_TOKEN_STORAGE_KEY = 'refreshToken'

function canUseStorage() {
  return typeof localStorage !== 'undefined'
}

function canUseWindow() {
  return typeof window !== 'undefined'
}

function notifyAuthStorageChange() {
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
  return getStoredString(AUTH_STORAGE_KEYS.accessToken)
}

export function getStoredAuthState(): AuthState | null {
  removeStoredValue(LEGACY_REFRESH_TOKEN_STORAGE_KEY)
  const accessToken = getStoredAccessToken()

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
    },
  }
}

export function saveLoginAuth(data: LoginResponse) {
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
}

export function saveRefreshedAuthTokens(data: RefreshTokenResponse) {
  setStoredString(AUTH_STORAGE_KEYS.accessToken, data.accessToken)
  notifyAuthStorageChange()
}

export function clearStoredAuth() {
  Object.values(AUTH_STORAGE_KEYS).forEach(removeStoredValue)
  removeStoredValue(LEGACY_REFRESH_TOKEN_STORAGE_KEY)
  notifyAuthStorageChange()
}

export function updateStoredAuthUser(user: Partial<AuthUser>) {
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
}

export function subscribeAuthStorageChange(listener: () => void) {
  if (!canUseWindow()) {
    return () => {}
  }

  window.addEventListener(AUTH_STORAGE_CHANGE_EVENT, listener)

  return () => {
    window.removeEventListener(AUTH_STORAGE_CHANGE_EVENT, listener)
  }
}
