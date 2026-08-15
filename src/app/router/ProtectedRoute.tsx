import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminNotificationProvider } from '../providers/AdminNotificationProvider'
import { RouteLoadingFallback } from './RouteLoadingFallback'

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
    return <Navigate to="/login" replace />
  }

  if (user?.role !== expectedRole) {
    const fallback = user?.role === 'ADMIN' ? '/dashboard' : user?.role === 'MERCHANT_OWNER' ? '/merchant' : '/login'
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
