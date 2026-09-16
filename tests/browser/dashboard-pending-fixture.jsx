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
  if (config.url === '/admin/merchant-place-applications') data = { total: 32, items: [
    { id: 7, status: 'PENDING', placeName: '합성 장소 신청 '.repeat(15), submittedAt: '2026-09-16T09:00:00' },
    { id: -1, status: 'PENDING', placeName: '잘못된 신청 ID 예시' },
    { id: null, status: 'PENDING', placeName: '신청 ID 누락 예시' },
  ] }
  else if (config.url === '/admin/dashboard/summary') data = { placeCount: 10, bannedUserCount: 0 }
  else if (config.url === '/admin/dashboard/recent-activities') data = { places: [], userSanctions: [] }
  else throw new Error(`Unexpected fixture API: ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter><GlobalStyle /><Page /></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
