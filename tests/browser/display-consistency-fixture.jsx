import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import S3Page from '../../src/pages/s3Orphan/S3OrphanPage'
import PaymentPage from '../../src/pages/merchantPayments/MerchantPaymentsPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

// Entirely synthetic adapter: no request (including mutations) reaches a real API.
const params = new URLSearchParams(location.search)
const screen = params.get('screen') || 's3'
const scenario = params.get('scenario') || 'empty'
const report = { reportId: 'synthetic-report', status: scenario === 'running' ? 'RUNNING' : scenario === 'failed' ? 'FAILED' : 'COMPLETED', generatedAt: '2026-10-05T12:30:00', completedAt: '2026-10-05T12:31:00', dbKeyCount: 2, s3KeyCount: 3, deleteCandidateCount: 1, errorMessage: scenario === 'failed' ? '합성 리포트 생성 실패' : null, deleteCandidates: [{ key: 'map/synthetic-only.png', reason: '합성 비교 후보 — 실제 파일 아님' }], page: 1, totalCount: 1, totalPages: 1, hasNext: false }
client.defaults.adapter = async config => {
  if (config.method !== 'get') throw new Error('QA: mutations blocked')
  if (scenario === 'loading' && !config.url.includes('notifications')) await new Promise(resolve => setTimeout(resolve, 10_000))
  let data
  if (config.url.includes('notifications')) data = { notifications: [], unreadCount: 0, totalCount: 0 }
  else if (config.url === '/admin/s3/orphan-objects') data = { dbKeyCount: 2, s3ObjectCount: 3, orphanObjectCount: 1, truncated: false }
  else if (config.url === '/admin/posts/s3/orphans/report/status') {
    if (scenario === 'empty' || scenario === 'error') throw Object.assign(new Error('Synthetic query failure'), { isAxiosError: true, config, response: { status: scenario === 'empty' ? 404 : 500, data: { message: scenario === 'empty' ? '생성된 S3 고아 파일 리포트가 없습니다.' : '합성 조회 실패' }, headers: {}, config } })
    data = report
  } else if (config.url === '/admin/posts/s3/orphans/report') data = report
  else if (config.url === '/merchant-owner/payments' || config.url === '/merchant-owner/payments/settlements') {
    if (scenario === 'error') throw new Error('Synthetic payment query failure')
    data = { payments: scenario === 'empty' ? [] : [{ id: 1, reservationId: 2, status: 'PAID', amountMinor: 2050, currency: 'USD', provider: 'SYNTHETIC', providerPaymentId: 'synthetic-only', createdAt: '2026-10-05T12:30:00', paidAt: '2026-10-05T12:30:00', refundedAt: null }], entries: [], page: 1, totalElements: scenario === 'empty' ? 0 : 1, totalPages: 1, hasNext: false }
  } else throw new Error(`Unexpected synthetic request ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: '합성 QA', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
// Notifications are outside this fixture's scope; avoid unrelated pending-work polls.
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkCount: 0, pendingWorkStatus: 'success', pendingWorkErrorMessage: '', status: 'success', errorMessage: '', isUnreadCountLoading: false, isActionLoading: false, async fetchNotifications() {}, async refreshUnreadCount() {}, async refreshPendingWork() {}, async markAsRead() { return false }, async markAllAsRead() { return false } }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><MemoryRouter><GlobalStyle />{screen === 'payments' ? <PaymentPage /> : <AdminNotificationContext.Provider value={notifications}><S3Page /></AdminNotificationContext.Provider>}</MemoryRouter></AuthContext.Provider>)
