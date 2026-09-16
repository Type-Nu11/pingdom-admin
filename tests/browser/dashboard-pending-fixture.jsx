import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Page from '../../src/pages/dashboard/DashboardPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

client.defaults.adapter = async config => {
  let data
  if (config.url === '/admin/dashboard/pending-items') data = { totalCount: 32, items: [
    { type: 'MERCHANT_PLACE_APPLICATION', targetId: 7, status: 'PENDING', title: '합성 장소 신청 '.repeat(15), createdAt: '2026-09-16T09:00:00', navigationPath: null },
    { type: 'POST_REPORT', targetId: 8, reportId: 8, postId: 22, status: 'PENDING', title: '합성 게시글 신고 '.repeat(15) },
    { type: 'FUTURE_TYPE', targetId: 9, status: 'PENDING', title: '미지원 업무 예시' },
  ] }
  else if (config.url === '/admin/dashboard/summary') data = { placeCount: 10, bannedUserCount: 0 }
  else if (config.url === '/admin/dashboard/recent-activities') data = { places: [], userSanctions: [] }
  else throw new Error(`Unexpected fixture API: ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter><GlobalStyle /><Page /></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
