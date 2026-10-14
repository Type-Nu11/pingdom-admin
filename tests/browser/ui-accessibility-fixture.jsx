import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import VisitorPage from '../../src/pages/visitorVerification/VisitorVerificationPage'
import LoginPage from '../../src/pages/login/LoginPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import { adminColors as c } from '../../src/styles/theme'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'
import * as Login from '../../src/pages/login/LoginPage.styles'
import * as Pages from '../../src/components/common/AdminPagination.styles'
import * as Dates from '../../src/components/common/AdminDateTimePicker.styles'
import * as Nav from '../../src/components/navigation/AdminNavigationMenu.styles'
import * as MerchantNav from '../../src/components/navigation/MerchantNavigationMenu.styles'
import * as Verification from '../../src/pages/placeVerification/PlaceVerificationPage.styles'
import * as Utility from '../../src/pages/adminUtility/AdminUtilityPage.styles'
import * as Place from '../../src/pages/place/PlaceManagePage.styles'
import * as Merge from '../../src/pages/placeMerge/PlaceMergePage.styles'
import * as Review from '../../src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage.styles'
import * as Campaign from '../../src/components/merchant/MerchantWorkspace.styles'
import * as Store from '../../src/components/merchant/MerchantSurface.styles'
import * as Notices from '../../src/pages/merchantOperatingNotice/MerchantOperatingNoticePage.styles'
import * as Operations from '../../src/pages/merchantPlaceOperations/MerchantPlaceOperationsPage.styles'
import * as Registration from '../../src/pages/merchantPlaceRegistration/MerchantPlaceRegistrationPage.styles'
import * as Claims from '../../src/pages/merchantPlaceApplication/MerchantPlaceApplicationPage.styles'
import * as Feedback from '../../src/components/common/FeedbackMessage.styles'
import * as Confirmation from '../../src/components/merchant/MerchantConfirmationDialog.styles'

const scenario = new URLSearchParams(location.search).get('scenario') || 'catalog'
const sampleReport = {
  id: 1, reporterUserId: 99, placeId: 1, reportType: 'LOCATION', description: '합성 QA 위치 제보 내용',
  evidenceUrl: null, waitTimeMinutes: null, languageCode: null, couponUsageStatus: null, crowdLevel: null,
  status: 'SUBMITTED', reviewerAdminUserId: null, reviewNote: null, reviewedAt: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
let requests = 0
client.defaults.adapter = observeFixtureAdapter(async config => {
  if (config.method !== 'get') throw new Error(`Synthetic QA blocked ${config.method}`)
  if (!['/admin/visitor-verification-reports', '/admin/visitor-verification-reports/corrections'].includes(config.url)) throw new Error(`Unexpected accessibility fixture API ${config.url}`)
  requests++
  document.documentElement.dataset.requests = String(requests)
  const populated = scenario === 'visitor'
  const data = {
    reports: populated ? [sampleReport] : [],
    corrections: populated ? [{ ...sampleReport, reportId: 1, requesterUserId: 99, reportStatus: 'SUBMITTED', description: '합성 QA 정정 요청 내용' }] : [],
    page: 1, limit: 10, totalElements: populated ? 1 : 0, totalPages: populated ? 1 : 0, hasNext: false,
  }
  if (scenario === 'failure') throw Object.assign(new Error('합성 조회 실패'), { isAxiosError: true, config, response: { config, status: 500, data: { message: '합성 조회 실패' }, headers: {} } })
  return { config, data, status: 200, statusText: 'OK', headers: {} }
})
const auth = { user: scenario === 'login' ? null : { username: '합성 QA', role: 'ADMIN' }, clearAuth() {}, logout() {}, isAuthenticated: scenario !== 'login', isAuthReady: true }
const notifications = { notifications: [], unreadCount: 6, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkCount: 0, pendingWorkStatus: 'success', pendingWorkErrorMessage: '', status: 'success', errorMessage: '', isUnreadCountLoading: false, isActionLoading: false, fetchNotifications: async () => {}, refreshUnreadCount: async () => {}, refreshPendingWork: async () => {} }
// Use the production styled components, not copies of their CSS or theme-only assertions.
const cases = [
  ['login-role-inactive', Login.RoleSwitch, { $active: false }, c.surfaceContainer],
  ['login-role-active', Login.RoleSwitch, { $active: true }, c.surfaceContainer],
  ['login-submit', Login.SubmitButton], ['login-error', Login.ErrorMessage],
  ['page-selected', Pages.PageButton, { $active: true }], ['page-normal', Pages.PageButton, { $active: false }],
  ['date-selected', Dates.DayButton, { $selected: true }], ['date-today', Dates.DayButton, { $today: true }],
  ['date-outside', Dates.DayButton, { $outside: true }], ['date-confirm', Dates.PrimaryButton],
  ['time-selected', Dates.TimeOption, { $selected: true }, c.surfaceLow],
  ['admin-menu', Nav.ItemButton, { $active: true }], ['admin-group', Nav.GroupTitle, { $active: true }],
  ['merchant-menu', MerchantNav.ItemButton, { $active: true }],
  ['verification-selected', Verification.TabButton, { $active: true }, c.surfaceLow],
  ['verification-normal', Verification.TabButton, { $active: false }, c.surfaceLow],
  ['verification-danger', Verification.StatusBadge, { $tone: 'danger' }],
  ['utility-primary', Utility.PrimaryButton], ['utility-tab', Utility.DetailTabButton, { $active: true }, c.surfaceLow],
  ['utility-date', Utility.DatePickerDayButton, { $selected: true }],
  ['place-page', Place.PageNumberButton, { $active: true }], ['place-primary', Place.OperatingPrimaryButton],
  ['place-danger', Place.OperatingPrimaryButton, { $danger: true }],
  ['place-action', Place.OperatingActionTab, { $active: true }],
  ['place-danger-tab', Place.OperatingActionTab, { $active: true, $danger: true }],
  ['merge-primary', Merge.PrimaryButton], ['merge-error', Merge.Notice, { $variant: 'error' }],
  ['review-selected', Review.FilterTab, { $active: true }, c.surfaceLow],
  ['review-normal', Review.FilterTab, { $active: false }, c.surfaceLow],
  ['campaign-create', Campaign.CreateButton], ['campaign-selected', Campaign.FilterButton, { $selected: true }, c.surfaceContainer],
  ['campaign-primary', Campaign.ActionButton, { $variant: 'primary' }], ['campaign-error', Campaign.FormError],
  ['store-save', Store.SaveButton], ['store-error', Store.Notice, { $tone: 'error' }],
  ['notice-create', Notices.CreateButton], ['notice-primary', Notices.ActionButton, { $variant: 'primary' }],
  ['notice-danger', Notices.ActionButton, { $variant: 'danger' }],
  ['operations-primary', Operations.ActionButton, { $variant: 'primary' }],
  ['operations-danger', Operations.ActionButton, { $variant: 'danger' }],
  ['registration-search', Registration.PlaceSearchButton], ['registration-tab', Registration.HistoryTab, { $active: false }, c.surfaceLow],
  ['claim-tab', Claims.HistoryTab, { $active: false }, c.surfaceLow],
  ['confirmation-danger', Confirmation.ConfirmButton],
  ...['error', 'success', 'warning', 'info'].map(tone => [`feedback-${tone}`, Feedback.Root, { $tone: tone }]),
]
function Catalog() {
  return <section style={{ padding: 24 }}><h1>실제 컴포넌트 대비 QA</h1>
    <p>합성 화면 · 실제 API 요청 없음 · 브랜드 기본색 유지</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
      {cases.map(([name, Component, props = {}, background = c.surface]) => <div key={name} style={{ padding: 16, border: '1px solid #ddd', background, minWidth: 0 }}>
        <p style={{ margin: '0 0 8px', color: c.muted }}>{name}</p>
        <Component {...props} tabIndex={0} data-contrast={name}>확인 12</Component>
      </div>)}
    </div>
  </section>
}
const root = createRoot(document.getElementById('root'))
root.render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter initialEntries={[scenario === 'login' ? '/login' : '/visitor-verifications']}><GlobalStyle />
  <style>{'* { transition: none !important; }'}</style>
  {scenario === 'login' ? <LoginPage /> : ['visitor', 'empty', 'failure'].includes(scenario) ? <VisitorPage /> : <Catalog />}
</MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
