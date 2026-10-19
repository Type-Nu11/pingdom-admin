import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import History from '../../src/pages/operationHistory/OperationHistoryPage'
import Notifications from '../../src/pages/notificationOperations/NotificationOperationsPage'
import Recommendations from '../../src/pages/recommendationMetrics/RecommendationMetricsPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const screen = new URLSearchParams(location.search).get('screen') || 'history'
const paths = { history: '/operations/history', notifications: '/operations/notifications', recommendations: '/recommendation-metrics' }
const date = '2026-10-19T10:00:00'
const auditRows = [
  { auditLogId: 1, action: 'MERCHANT_PLACE_APPLICATION_ATTACHMENT_VIEWED', targetType: 'MERCHANT_PLACE_APPLICATION_ATTACHMENT', targetId: '2', reason: '통합 신청 민감 첨부 메타데이터 조회: REPRESENTATIVE_IMAGE', beforeState: '{}', afterState: '{"applicationId":1}' },
  { auditLogId: 2, action: 'USER_BAN_APPLIED', targetType: 'USER', targetId: '123', reason: '합성 검토 사유', beforeState: '{"banned":false}', afterState: '{"banned":true}' },
  { auditLogId: 3, action: 'FUTURE_OPERATION', targetType: 'FUTURE_TARGET', targetId: '3', reason: '알 수 없는 작업의 원본 사유', afterState: '{"applicationId":999}' },
].map(row => ({ ...row, actorUserId: 1, actorUsername: '합성 관리자', requestId: 'synthetic-request', createdAt: date }))
window.copyQA = { calls: [] }
const paged = (rows, key, params) => ({ [key]: rows, page: params?.page || 1, limit: params?.limit || 5, totalCount: rows.length, totalPages: rows.length ? 1 : 0, hasNext: false })
client.defaults.adapter = observeFixtureAdapter(async config => {
  window.copyQA.calls.push({ method: config.method, path: config.url, params: config.params })
  if (config.method !== 'get') throw new Error('Admin copy QA forbids operational writes')
  const params = config.params || {}
  let data
  if (config.url === '/admin/audit-logs') data = paged(auditRows.filter(row => (!params.action || row.action === params.action) && (!params.targetType || row.targetType === params.targetType)), 'auditLogs', params)
  else if (config.url === '/admin/notifications') data = paged([{ notificationId: 1, userId: 1, type: 'ADMIN_REPORT_RECEIVED', title: '합성 신고 접수', body: '실제 알림이 아닙니다.', read: true, createdAt: date }], 'notifications', params)
  else if (config.url === '/admin/notification-deliveries') data = paged(['SUCCEEDED', 'FAILED', 'RETRY_SCHEDULED', 'FINAL_FAILED'].filter(status => !params.status || status === params.status).map((status, index) => ({ deliveryId: index + 1, channel: 'FCM', userId: 1, status, retryable: status === 'FAILED', attemptCount: 1, createdAt: date, updatedAt: date })), 'deliveries', params)
  else if (config.url === '/admin/outbox-events') data = paged(['PENDING', 'PROCESSING', 'RETRY', 'SUCCEEDED', 'FAILED'].filter(status => !params.status || status === params.status).map((status, index) => ({ eventId: `synthetic-${index + 1}`, eventType: 'SYNTHETIC_EVENT', aggregateType: 'SYNTHETIC', aggregateId: '1', status, attemptCount: 1, createdAt: date, updatedAt: date })), 'events', params)
  else if (config.url === '/admin/places/recommendation-metrics') data = { ...paged([], 'metrics', params), sortBy: params.sortBy, days: null, recommendationVersion: 'test-v1' }
  else throw new Error(`Unexpected copy fixture GET ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
})
const auth = { user: { id: 1, username: '합성 관리자', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true, clearAuth() { throw new Error('Unexpected auth clear') }, logout() {} }
const notifications = { unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<><GlobalStyle /><AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter initialEntries={[paths[screen]]}>{screen === 'history' ? <History /> : screen === 'notifications' ? <Notifications /> : <Recommendations />}</MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider></>)
