import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import VisitorVerificationPage from '../../src/features/admin/visitorVerification/pages/VisitorVerificationPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

window.visitorQa = { calls: [], unexpected: [] }
client.defaults.adapter = async config => {
  window.visitorQa.calls.push({ method: config.method, url: config.url, params: config.params })
  const corrections = config.url === '/admin/visitor-verification-reports/corrections'
  if (config.method !== 'get' || (!corrections && config.url !== '/admin/visitor-verification-reports')) {
    window.visitorQa.unexpected.push(config.url)
    throw new Error('Operational writes or unexpected reads forbidden in visitor fixture')
  }
  const { page, limit, status = 'SUBMITTED' } = config.params
  const item = {
    id: (corrections ? 2900 : 1900) + page,
    ...(corrections ? { reportId: 1901, requesterUserId: 902, reportStatus: 'ACCEPTED' } : { reporterUserId: 901 }),
    placeId: 70001, reportType: 'OPERATING_HOURS',
    description: '합성 방문자 근거 — 실제 운영 데이터가 아닙니다.', evidenceUrl: null,
    waitTimeMinutes: null, languageCode: null, couponUsageStatus: null, crowdLevel: null,
    status: status || 'SUBMITTED', reviewerAdminUserId: null,
    reviewNote: null, createdAt: '2026-01-01T00:00:00Z', reviewedAt: null, updatedAt: '2026-01-01T00:00:00Z',
  }
  const data = { [corrections ? 'corrections' : 'reports']: [item], page, limit, totalElements: 21, totalPages: 3, hasNext: page < 3 }
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { user: { id: 99, username: '합성 관리자', role: 'ADMIN' }, clearAuth() {}, logout() {} }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><BrowserRouter><GlobalStyle /><VisitorVerificationPage /></BrowserRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
