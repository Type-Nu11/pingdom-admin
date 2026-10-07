import type { AuthUser } from '../app/providers/AuthContext'
import { readReservationReviewContext, writeReservationReviewContext } from './reservationReviewContext'

export type AuthExitReason = 'expired' | 'session-changed' | 'logout'
type ReturnRole = 'ADMIN' | 'MERCHANT_OWNER' | 'USER'
interface LoginReturn {
  reason: AuthExitReason | null
  userId: number | null
  role: ReturnRole | null
  target: string | null
  createdAt: number
}

const STORAGE_KEY = 'pingdom-login-return'
const MAX_AGE = 30 * 60 * 1000
const ADMIN_PATHS = new Set([
  '/dashboard', '/community', '/community-reports', '/places', '/places/events',
  '/places/duplicates', '/places/duplicate-candidates', '/places/information-verification',
  '/bans', '/recommendations/metrics', '/merchant-owners', '/reservations/review',
  '/merchant-place-applications', '/review-deletion-requests', '/trust-score',
  '/visitor-verifications', '/scouts', '/verified-boost-products', '/users/roles',
  '/s3-orphans', '/operations/notifications', '/operations/history', '/data-quality',
])
const MERCHANT_PATHS = new Set([
  '/merchant', '/merchant/campaigns', '/merchant/operating-notices', '/merchant/offers',
  '/merchant/menus', '/merchant/reservations/products', '/merchant/reservations/setup',
  '/merchant/reservations', '/merchant/payments', '/merchant/place-reverification',
  '/merchant/place-operations', '/merchant/reviews', '/merchant/verified-boost',
])
const APPLICATION_PATHS = new Set(['/merchant/onboarding', '/merchant/place-application', '/merchant/place-registration'])
const REASONS = {
  expired: '로그인 인증이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.',
  'session-changed': '로그인 세션이 변경되었거나 계정 정보가 일치하지 않습니다. 다시 로그인해주세요.',
}

function isRole(role: unknown): role is ReturnRole {
  return role === 'ADMIN' || role === 'MERCHANT_OWNER' || role === 'USER'
}

export function getRoleHome(role: string) {
  return role === 'ADMIN' ? '/dashboard' : role === 'MERCHANT_OWNER' ? '/merchant' : role === 'USER' ? '/merchant/onboarding' : '/login'
}

export function safeReturnTarget(value: string, role: string, includeDetails = true): string | null {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32)) return null
  const url = new URL(value, 'https://pingdom.invalid')
  if (url.origin !== 'https://pingdom.invalid') return null
  const path = url.pathname
  const allowed = role === 'ADMIN' ? ADMIN_PATHS.has(path)
    : role === 'MERCHANT_OWNER' ? MERCHANT_PATHS.has(path) || APPLICATION_PATHS.has(path)
      : role === 'USER' && APPLICATION_PATHS.has(path)
  if (!allowed) return null

  if (path === '/reservations/review') {
    const context = readReservationReviewContext(url.search)
    // Guest returns never carry a previously selected person's reservation/place.
    if (!includeDetails) {
      context.query.placeId = undefined
      context.selectedReservationId = null
    }
    return path + writeReservationReviewContext(context)
  }

  const query = new URLSearchParams()
  // Free-text searches, applicant IDs, form values and unknown keys are not persisted.
  const page = url.searchParams.get('page')
  if (page && /^[1-9]\d{0,5}$/.test(page)) query.set('page', page)
  if (path === '/places' || path === '/places/information-verification') {
    const placeId = url.searchParams.get('placeId')
    if (includeDetails && placeId && /^[1-9]\d*$/.test(placeId) && Number.isSafeInteger(Number(placeId))) query.set('placeId', placeId)
  }
  const tabs: Record<string, string[]> = {
    '/places/information-verification': ['reports', 'evidence', 'reverification'],
    '/visitor-verifications': ['reports', 'corrections'],
    '/scouts': ['profiles', 'reports'],
    '/trust-score': ['reporter', 'rules', 'anomalies'],
  }
  const tab = url.searchParams.get('tab')
  if (tab && tabs[path]?.includes(tab)) query.set('tab', tab)
  return path + (query.size ? `?${query}` : '')
}

export function clearLoginReturn() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* Storage may be disabled. */ }
}

export function readLoginReturn(): LoginReturn | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as LoginReturn | null
    if (!value) return null
    if (!Number.isFinite(value.createdAt) || Date.now() - value.createdAt > MAX_AGE || value.createdAt > Date.now()
      || !(value.reason === null || value.reason === 'expired' || value.reason === 'session-changed' || value.reason === 'logout')
      || !(value.role === null || isRole(value.role))
      || !(value.userId === null || Number.isSafeInteger(value.userId) && value.userId > 0)
      || value.reason !== null && value.userId === null && value.target !== null
      || value.reason === 'logout' && value.target !== null
      || !(value.target === null || typeof value.target === 'string' && value.role && safeReturnTarget(value.target, value.role, value.userId !== null) === value.target)) {
      clearLoginReturn()
      return null
    }
    return value
  } catch {
    clearLoginReturn()
    return null
  }
}

function writeLoginReturn(value: LoginReturn) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* Login remains available without storage. */ }
}

export function rememberAuthExit(user: AuthUser | null, reason: AuthExitReason, path?: string) {
  if (reason === 'logout') {
    // A short-lived marker prevents the protected route from creating a new guest return after logout.
    writeLoginReturn({ reason, role: null, userId: null, target: null, createdAt: Date.now() })
    return
  }
  const role = isRole(user?.role) ? user.role : null
  const userId = user?.id && Number.isSafeInteger(user.id) && user.id > 0 ? user.id : null
  const currentPath = path ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')
  writeLoginReturn({ reason, role, userId, target: role && userId !== null ? safeReturnTarget(currentPath, role) : null, createdAt: Date.now() })
}

export function rememberGuestReturn(path: string, role: ReturnRole) {
  if (readLoginReturn()) return
  const target = safeReturnTarget(path, role, false)
  if (target) writeLoginReturn({ reason: null, userId: null, role, target, createdAt: Date.now() })
}

export function getLoginReturnNotice() {
  const reason = readLoginReturn()?.reason
  return reason && reason !== 'logout' ? REASONS[reason] : ''
}

export function consumeLoginReturn(user: AuthUser): string {
  const saved = readLoginReturn()
  clearLoginReturn()
  if (saved?.target && saved.role === user.role && (saved.userId === null || saved.userId === user.id)) {
    return safeReturnTarget(saved.target, user.role, saved.userId !== null) ?? getRoleHome(user.role)
  }
  return getRoleHome(user.role)
}
