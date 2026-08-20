import { lazy, Suspense, useLayoutEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import {
  MerchantOnboardingRoute,
  MerchantProtectedRoute,
  ProtectedRoute,
} from './ProtectedRoute'
import { RouteLoadingFallback } from './RouteLoadingFallback'

const LoginPage = lazy(() => import('../../pages/login/LoginPage'))
const DashboardPage = lazy(() => import('../../pages/dashboard/DashboardPage'))
const MainPage = lazy(() => import('../../pages/main/MainPage'))
const NotFoundPage = lazy(() => import('../../pages/notFound/NotFoundPage'))
const PlaceManagePage = lazy(() => import('../../pages/place/PlaceManagePage'))
const PlaceMergePage = lazy(() => import('../../pages/placeMerge/PlaceMergePage'))
const PlaceDuplicateCandidatePage = lazy(
  () => import('../../pages/placeDuplicateCandidate/PlaceDuplicateCandidatePage'),
)
const PlaceVerificationPage = lazy(
  () => import('../../pages/placeVerification/PlaceVerificationPage'),
)
const UserBanPage = lazy(() => import('../../pages/userBan/UserBanPage'))
const ReportedUsersPage = lazy(() => import('../../pages/reportedUsers/ReportedUsersPage'))
const ReportAppealPage = lazy(() => import('../../pages/reportAppeal/ReportAppealPage'))
const RecommendationMetricsPage = lazy(
  () => import('../../pages/recommendationMetrics/RecommendationMetricsPage'),
)
const MerchantOwnerPage = lazy(() => import('../../pages/merchantOwner/MerchantOwnerPage'))
const TrustScorePage = lazy(() => import('../../pages/trustScore/TrustScorePage'))
const MerchantVerificationPage = lazy(
  () => import('../../pages/merchantVerification/MerchantVerificationPage'),
)
const VisitorVerificationPage = lazy(
  () => import('../../pages/visitorVerification/VisitorVerificationPage'),
)
const ScoutPage = lazy(() => import('../../pages/scout/ScoutPage'))
const VerifiedBoostProductPage = lazy(
  () => import('../../pages/verifiedBoostProduct/VerifiedBoostProductPage'),
)
const UserRolePage = lazy(() => import('../../pages/userRole/UserRolePage'))
const MerchantPlaceClaimPage = lazy(
  () => import('../../pages/merchantPlaceClaim/MerchantPlaceClaimPage'),
)
const S3OrphanPage = lazy(() => import('../../pages/s3Orphan/S3OrphanPage'))
const NotificationOperationsPage = lazy(
  () => import('../../pages/notificationOperations/NotificationOperationsPage'),
)
const OperationHistoryPage = lazy(
  () => import('../../pages/operationHistory/OperationHistoryPage'),
)
const MerchantStorePage = lazy(() => import('../../pages/merchantStore/MerchantStorePage'))
const MerchantOnboardingPage = lazy(
  () => import('../../pages/merchantOnboarding/MerchantOnboardingPage'),
)
const MerchantPlaceApplicationPage = lazy(
  () => import('../../pages/merchantPlaceApplication/MerchantPlaceApplicationPage'),
)
const MerchantPlaceRegistrationPage = lazy(
  () => import('../../pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage'),
)
const MerchantCampaignPage = lazy(
  () => import('../../pages/merchantCampaign/MerchantCampaignPage'),
)
const PlaceEventPage = lazy(() => import('../../pages/placeEvent/PlaceEventPage'))
const AdManagementPage = lazy(
  () => import('../../pages/adManagement/AdManagementPage'),
)

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
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<MerchantProtectedRoute />}>
            <Route path="/merchant" element={<MerchantStorePage />} />
            <Route path="/merchant/place-application" element={<MerchantPlaceApplicationPage />} />
            <Route path="/merchant/place-registration" element={<MerchantPlaceRegistrationPage />} />
            <Route path="/merchant/campaigns" element={<MerchantCampaignPage />} />
          </Route>
          <Route element={<MerchantOnboardingRoute />}>
            <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/main" element={<MainPage />} />
            <Route path="/places" element={<PlaceManagePage />} />
            <Route path="/places/events" element={<PlaceEventPage />} />
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
            <Route
              path="/recommendations/metrics"
              element={<RecommendationMetricsPage />}
            />
            <Route path="/merchant-owners" element={<MerchantOwnerPage />} />
            <Route path="/trust-score" element={<TrustScorePage />} />
            <Route
              path="/merchant-verifications"
              element={<MerchantVerificationPage />}
            />
            <Route
              path="/visitor-verifications"
              element={<VisitorVerificationPage />}
            />
            <Route path="/scouts" element={<ScoutPage />} />
            <Route
              path="/verified-boost-products"
              element={<VerifiedBoostProductPage />}
            />
            <Route path="/users/roles" element={<UserRolePage />} />
            <Route
              path="/merchant-place-claims"
              element={<MerchantPlaceClaimPage />}
            />
            <Route path="/s3-orphans" element={<S3OrphanPage />} />
            <Route
              path="/operations/notifications"
              element={<NotificationOperationsPage />}
            />
            <Route path="/operations/history" element={<OperationHistoryPage />} />
            <Route path="/operations/ads" element={<AdManagementPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
