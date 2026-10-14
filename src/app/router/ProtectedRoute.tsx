import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminNotificationProvider } from '../providers/AdminNotificationProvider'
import { RouteLoadingFallback } from './RouteLoadingFallback'
import { getRoleHome, rememberGuestReturn } from '../../utils/authReturn'

function LoginRedirect({ role }: { role: 'ADMIN' | 'MERCHANT_OWNER' | 'USER' }) {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    rememberGuestReturn(location.pathname + location.search, role)
    navigate('/login', { replace: true })
  }, [location.pathname, location.search, navigate, role])
  return <RouteLoadingFallback />
}

function RoleProtectedRoute({ expectedRole, withNotifications = false }: { expectedRole: 'ADMIN' | 'MERCHANT_OWNER'; withNotifications?: boolean }) {
  const { clearAuth, isAuthenticated, isAuthReady, user } = useAuth()
  const hasBrokenAuthState = isAuthReady && isAuthenticated && !user

  useEffect(() => {
    if (hasBrokenAuthState) {
      clearAuth()
    }
  }, [clearAuth, hasBrokenAuthState])

  if (!isAuthReady || hasBrokenAuthState) {
    return (
      <RouteLoadingFallback
        title="관리자 정보를 불러오는 중입니다."
        description="잠시만 기다리면 관리자 화면으로 이동합니다."
      />
    )
  }

  if (!isAuthenticated) {
    return <LoginRedirect role={expectedRole} />
  }

  if (user?.role !== expectedRole) {
    const fallback = getRoleHome(user?.role ?? '')
    return <Navigate to={fallback} replace />
  }

  return withNotifications ? (
    <AdminNotificationProvider>
      <Outlet />
    </AdminNotificationProvider>
  ) : <Outlet />
}

export function ProtectedRoute() { return <RoleProtectedRoute expectedRole="ADMIN" withNotifications /> }
export function MerchantProtectedRoute() { return <RoleProtectedRoute expectedRole="MERCHANT_OWNER" /> }

export function MerchantOnboardingRoute() {
  const { clearAuth, isAuthenticated, isAuthReady, user } = useAuth()
  const hasBrokenAuthState = isAuthReady && isAuthenticated && !user

  useEffect(() => {
    if (hasBrokenAuthState) {
      clearAuth()
    }
  }, [clearAuth, hasBrokenAuthState])

  if (!isAuthReady || hasBrokenAuthState) {
    return (
      <RouteLoadingFallback
        title="상점주 신청 정보를 준비하는 중입니다."
        description="잠시만 기다리면 신청 화면으로 이동합니다."
      />
    )
  }

  if (!isAuthenticated) {
    return <LoginRedirect role="USER" />
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  if (user?.role !== 'USER' && user?.role !== 'MERCHANT_OWNER') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
