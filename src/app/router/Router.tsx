import { useLayoutEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import LoginPage from '../../pages/login/LoginPage'
import DashboardPage from '../../pages/dashboard/DashboardPage'
import MainPage from '../../pages/main/MainPage'
import NotFoundPage from '../../pages/notFound/NotFoundPage'
import PlaceManagePage from '../../pages/place/PlaceManagePage'
import PlaceMergePage from '../../pages/placeMerge/PlaceMergePage'
import PlaceDuplicateCandidatePage from '../../pages/placeDuplicateCandidate/PlaceDuplicateCandidatePage'
import PlaceVerificationPage from '../../pages/placeVerification/PlaceVerificationPage'
import UserBanPage from '../../pages/userBan/UserBanPage'
import ReportedUsersPage from '../../pages/reportedUsers/ReportedUsersPage'
import ReportAppealPage from '../../pages/reportAppeal/ReportAppealPage'
import RecommendationMetricsPage from '../../pages/recommendationMetrics/RecommendationMetricsPage'
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/places" element={<PlaceManagePage />} />
          <Route path="/places/duplicates" element={<PlaceMergePage />} />
          <Route
            path="/places/duplicate-candidates"
            element={<PlaceDuplicateCandidatePage />}
          />
          <Route
            path="/places/information-verification"
            element={<PlaceVerificationPage />}
          />
          <Route path="/bans" element={<UserBanPage />} />
          <Route path="/reports/reported-users" element={<ReportedUsersPage />} />
          <Route path="/reports/appeals" element={<ReportAppealPage />} />
          <Route path="/recommendations/metrics" element={<RecommendationMetricsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
