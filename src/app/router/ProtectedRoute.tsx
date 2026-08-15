import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import styled from 'styled-components'
import { useAuth } from '../../hooks/useAuth'
import { adminColors } from '../../styles/theme'
import { AdminNotificationProvider } from '../providers/AdminNotificationProvider'

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
      <RouteLoadingPage role="status" aria-live="polite">
        <RouteLoadingCard>
          <RouteLoadingIcon aria-hidden="true">admin_panel_settings</RouteLoadingIcon>
          <RouteLoadingTitle>관리자 정보를 불러오는 중입니다.</RouteLoadingTitle>
          <RouteLoadingDescription>
            잠시만 기다리면 관리자 화면으로 이동합니다.
          </RouteLoadingDescription>
        </RouteLoadingCard>
      </RouteLoadingPage>
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

const RouteLoadingPage = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: ${adminColors.background};
  color: ${adminColors.text};
  font-family: inherit;
`

const RouteLoadingCard = styled.section`
  width: min(360px, 100%);
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  padding: 32px;
  border: 1px solid ${adminColors.border};
  border-top: 4px solid ${adminColors.primary};
  border-radius: 8px;
  background: ${adminColors.surface};
  box-shadow: 0 18px 48px ${adminColors.shadow};
  text-align: center;
`

const RouteLoadingIcon = styled.span`
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  border: 1px solid ${adminColors.primarySoft};
  border-radius: 8px;
  background: ${adminColors.primaryTint};
  color: ${adminColors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 24px;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

const RouteLoadingTitle = styled.p`
  margin: 0;
  color: ${adminColors.strongText};
  font-size: 18px;
  font-weight: 700;
`

const RouteLoadingDescription = styled.p`
  margin: 0;
  color: ${adminColors.muted};
  font-size: 14px;
  line-height: 1.45;
`
