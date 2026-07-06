import { useLayoutEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import LoginPage from '../../pages/login/LoginPage'
import MainPage from '../../pages/main/MainPage'
import NotFoundPage from '../../pages/notFound/NotFoundPage'
import PlaceManagePage from '../../pages/place/PlaceManagePage'
import UserBanPage from '../../pages/userBan/UserBanPage'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { ProtectedRoute } from './ProtectedRoute'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const mainScrollArea = document.getElementById(ADMIN_MAIN_SCROLL_AREA_ID)

    if (mainScrollArea) {
      mainScrollArea.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

// 관리자 인증과 보호 라우팅 구조를 관리합니다.
export function Router() {
  return (
    <BrowserRouter>
      <ScrollToTopOnRouteChange />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/main" element={<MainPage />} />
          <Route path="/places" element={<PlaceManagePage />} />
          <Route path="/bans" element={<UserBanPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
