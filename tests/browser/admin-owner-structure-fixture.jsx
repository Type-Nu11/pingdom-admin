import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import MerchantOwnerPage from '../../src/features/admin/merchantOwners/pages/MerchantOwnerPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

window.ownerQa = { calls: [], status: 'PENDING' }
const profile = (userId, status) => ({
  userId, businessName: `합성 사업장 ${userId}`, displayName: `합성 상점주 ${userId}`,
  description: '구조 변경 회귀 검사 전용', contactEmail: 'synthetic@example.test', contactPhone: '010-0000-0000',
  status, onboardingStatus: 'NOT_STARTED', onboardingCompletionRate: 0,
  onboardingCompletedAt: null, reviewedBy: null, reviewedAt: null, reviewReason: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', placeIds: [],
})
client.defaults.adapter = async config => {
  window.ownerQa.calls.push({ method: config.method, url: config.url, params: config.params })
  if (config.method !== 'get') throw new Error('Operational writes forbidden in owner UI fixture')
  let data
  if (config.url === '/admin/merchant-owners') {
    const { page, limit, status = 'PENDING' } = config.params
    window.ownerQa.status = status
    data = { profiles: [profile(page === 2 ? 902 : 901, status)], page, limit, totalCount: 11, totalPages: 2, hasNext: page < 2 }
  } else if (/^\/admin\/merchant-owners\/\d+\/places$/.test(config.url)) data = []
  else if (/^\/admin\/merchant-owners\/\d+$/.test(config.url)) data = profile(Number(config.url.split('/').at(-1)), window.ownerQa.status)
  else throw new Error(`Unexpected synthetic request: ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { user: { id: 99, username: '합성 관리자', role: 'ADMIN' }, clearAuth() {}, logout() {} }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><BrowserRouter><GlobalStyle /><MerchantOwnerPage /></BrowserRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
