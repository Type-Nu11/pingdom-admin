import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ContentRegisterPage from '../../pages/content/ContentRegisterPage'
import LoginPage from '../../pages/login/LoginPage'
import MapPreviewPage from '../../pages/preview/MapPreviewPage'
import { ProtectedRoute } from './ProtectedRoute'

// 관리자 웹의 최소 라우팅 구조를 관리합니다.
export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/content/register" replace />} />
          <Route path="/content/register" element={<ContentRegisterPage />} />
          <Route path="/preview/map" element={<MapPreviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
