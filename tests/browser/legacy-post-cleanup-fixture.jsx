import React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import { Router } from '../../src/app/router/Router'
import { GlobalStyle } from '../../src/styles/globalStyle'
import { theme } from '../../src/styles/theme'
import client from '../../src/api/customAxios'

const applicant = { id: 7, applicantUserId: 123, applicationType: 'NEW_PLACE', status: 'PENDING',
  businessName: '합성 가게', legalName: '합성 신청자', placeName: '합성 장소 7',
  version: 1, submissionVersion: 1, submittedAt: '2026-09-16T09:00:00', attachments: [] }
window.qaRequests = []
client.defaults.adapter = async config => {
  window.qaRequests.push({ path: config.url, method: config.method, params: config.params })
  if (config.method !== 'get') throw new Error('Real mutations are forbidden in this fixture')
  let data
  if (config.url === '/admin/dashboard/summary') data = { placeCount: 10, bannedUserCount: 0 }
  else if (config.url === '/admin/dashboard/recent-activities') data = { places: [], userSanctions: [] }
  else if (config.url === '/admin/merchant-place-applications') data = {
    items: [applicant], total: 32, totalPages: 4, hasNext: true, page: 1, limit: 10,
  }
  else if (config.url === '/admin/merchant-place-applications/7') data = applicant
  else if (config.url === '/admin/merchant-place-applications/7/attachments') data = []
  else if (config.url === '/admin/merchant-owners/123') data = { status: 'ACTIVE', businessName: '합성 가게' }
  else if (config.url === '/admin/notifications/unread-count') data = { unreadCount: 0 }
  else if ([
    '/admin/places/duplicates', '/admin/places/duplicate-candidates',
    '/admin/place-information-reports', '/admin/visitor-verification-reports',
    '/admin/visitor-verification-reports/corrections', '/admin/scout-profiles',
    '/admin/scout-field-reports', '/admin/trust-score/anomalies',
  ].includes(config.url)) data = { totalCount: 0, totalElements: 0 }
  else throw new Error('Unexpected API: ' + config.url)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const signedIn = !new URLSearchParams(location.search).has('signedOut')
const auth = { clearAuth() {}, logout() {}, user: signedIn ? { id: 99, username: 'synthetic-admin', role: 'ADMIN' } : null,
  isAuthenticated: signedIn, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0,
  status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}><GlobalStyle /><AuthContext.Provider value={auth}>
    <AdminNotificationContext.Provider value={notifications}><Router /></AdminNotificationContext.Provider>
  </AuthContext.Provider></ThemeProvider>,
)
