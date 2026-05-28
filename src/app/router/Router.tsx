import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../../pages/login/LoginPage'
import MainPage from '../../pages/main/MainPage'
import NotFoundPage from '../../pages/notFound/NotFoundPage'
import PlaceManagePage from '../../pages/place/PlaceManagePage'
import { ProtectedRoute } from './ProtectedRoute'

// 관리자 인증과 보호 라우팅 구조를 관리합니다.
export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/main" element={<MainPage />} />
          <Route path="/places" element={<PlaceManagePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
