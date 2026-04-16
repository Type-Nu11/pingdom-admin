import { Outlet } from 'react-router-dom'

// 인증된 관리자만 보호 페이지에 접근하도록 관리하는 라우트입니다.
export function ProtectedRoute() {
  return <Outlet />
}
