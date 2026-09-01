import { lazy, Suspense, useLayoutEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { ADMIN_MAIN_SCROLL_AREA_ID, MERCHANT_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import {
  MerchantOnboardingRoute,
  MerchantProtectedRoute,
  ProtectedRoute,
} from './ProtectedRoute'
import { MerchantLayout } from './MerchantLayout'
import { RouteLoadingFallback } from './RouteLoadingFallback'

const LoginPage = lazy(() => import('../../pages/login/LoginPage'))
const DashboardPage = lazy(() => import('../../pages/dashboard/DashboardPage'))
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
const VisitorVerificationPage = lazy(
  () => import('../../pages/visitorVerification/VisitorVerificationPage'),
)
const ScoutPage = lazy(() => import('../../pages/scout/ScoutPage'))
const VerifiedBoostProductPage = lazy(
  () => import('../../pages/verifiedBoostProduct/VerifiedBoostProductPage'),
)
const UserRolePage = lazy(() => import('../../pages/userRole/UserRolePage'))
const MerchantPlaceApplicationReviewPage = lazy(
  () => import('../../pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage'),
)
const PlaceReviewDeletionPage = lazy(
  () => import('../../pages/placeReviewDeletion/PlaceReviewDeletionPage'),
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
const MerchantOperatingNoticePage = lazy(
  () => import('../../pages/merchantOperatingNotice/MerchantOperatingNoticePage'),
)
const MerchantOfferPage = lazy(
  () => import('../../pages/merchantOffer/MerchantOfferPage'),
)
const MerchantReservationSetupPage = lazy(
  () => import('../../pages/merchantReservationSetup/MerchantReservationSetupPage'),
)
const MerchantReservationOperationsPage = lazy(
  () => import('../../pages/merchantReservationOperations/MerchantReservationOperationsPage'),
)
const MerchantPaymentsPage = lazy(
  () => import('../../pages/merchantPayments/MerchantPaymentsPage'),
)
const MerchantPlaceReverificationPage = lazy(
  () => import('../../pages/merchantPlaceReverification/MerchantPlaceReverificationPage'),
)
const MerchantPlaceOperationsPage = lazy(
  () => import('../../pages/merchantPlaceOperations/MerchantPlaceOperationsPage'),
)
const MerchantPlaceReviewPage = lazy(
  () => import('../../pages/merchantPlaceReview/MerchantPlaceReviewPage'),
)
const MerchantVerifiedBoostPage = lazy(
  () => import('../../pages/merchantVerifiedBoost/MerchantVerifiedBoostPage'),
)
const PlaceEventPage = lazy(() => import('../../pages/placeEvent/PlaceEventPage'))
const AdManagementPage = lazy(
  () => import('../../pages/adManagement/AdManagementPage'),
)
const DataQualityPage = lazy(() => import('../../pages/dataQuality/DataQualityPage'))

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

function ScrollToTopOnRouteChange() {
  const { pathname, state } = useLocation()
  const shouldPreserveScrollPosition = Boolean(
    (state as { preserveScrollPosition?: boolean } | null)?.preserveScrollPosition,
  )

  useLayoutEffect(() => {
    if (shouldPreserveScrollPosition) {
      return
    }

    const mainScrollArea = document.getElementById(ADMIN_MAIN_SCROLL_AREA_ID)
      ?? document.getElementById(MERCHANT_MAIN_SCROLL_AREA_ID)

    if (mainScrollArea) {
      mainScrollArea.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, shouldPreserveScrollPosition])

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
            <Route element={<MerchantLayout />}>
              <Route path="/merchant" element={<MerchantStorePage />} />
              <Route path="/merchant/place-application" element={<MerchantPlaceApplicationPage />} />
              <Route path="/merchant/place-registration" element={<MerchantPlaceRegistrationPage />} />
              <Route path="/merchant/campaigns" element={<MerchantCampaignPage />} />
              <Route path="/merchant/operating-notices" element={<MerchantOperatingNoticePage />} />
              <Route path="/merchant/offers" element={<MerchantOfferPage />} />
              <Route path="/merchant/reservations/setup" element={<MerchantReservationSetupPage />} />
              <Route path="/merchant/reservations" element={<MerchantReservationOperationsPage />} />
              <Route path="/merchant/payments" element={<MerchantPaymentsPage />} />
              <Route path="/merchant/place-reverification" element={<MerchantPlaceReverificationPage />} />
              <Route path="/merchant/place-operations" element={<MerchantPlaceOperationsPage />} />
              <Route path="/merchant/reviews" element={<MerchantPlaceReviewPage />} />
              <Route path="/merchant/place-claims" element={<Navigate to="/merchant/place-application" replace />} />
              <Route path="/merchant/verified-boost" element={<MerchantVerifiedBoostPage />} />
            </Route>
          </Route>
          <Route element={<MerchantOnboardingRoute />}>
            <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
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
            <Route
              path="/merchant-place-applications"
              element={<MerchantPlaceApplicationReviewPage />}
            />
            <Route path="/review-deletion-requests" element={<PlaceReviewDeletionPage />} />
            <Route
              path="/place-registration-applications"
              element={<Navigate to="/merchant-place-applications" replace />}
            />
            <Route path="/trust-score" element={<TrustScorePage />} />
            <Route
              path="/merchant-verifications"
              element={<Navigate to="/merchant-place-applications" replace />}
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
              element={<Navigate to="/merchant-place-applications" replace />}
            />
            <Route path="/s3-orphans" element={<S3OrphanPage />} />
            <Route
              path="/operations/notifications"
              element={<NotificationOperationsPage />}
            />
            <Route path="/operations/history" element={<OperationHistoryPage />} />
            <Route path="/operations/ads" element={<AdManagementPage />} />
            <Route path="/data-quality" element={<DataQualityPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
