import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationProvider } from '../../src/app/providers/AdminNotificationProvider'
import Page from '../../src/pages/dashboard/DashboardPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const scenario = new URLSearchParams(location.search).get('scenario') || 'success'
let attempt = 0
const requests = []
window.qaHeldRequests = []
window.qaCompletedRequests = []
client.defaults.adapter = async config => {
  requests.push(config.url)
  if (config.url === '/admin/reservations') attempt++
  if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 800))
  const work = !config.url.includes('/dashboard/') && !config.url.includes('/notifications')
  if (requests.filter(path => path === config.url).length > 1 &&
      ((scenario === 'refresh-work-slow' && work) || (scenario === 'refresh-summary-slow' && config.url.includes('/dashboard/')))) {
    await new Promise(resolve => window.qaHeldRequests.push(resolve))
  }
  if ((scenario === 'all-error' && work) || ((scenario === 'partial' || (scenario === 'retry' && attempt === 2)) && config.url === '/admin/reservations')) throw new Error('Synthetic query failure')
  let data
  if (config.url === '/admin/dashboard/summary') data = { placeCount: 10, bannedUserCount: 0, operationalMetrics: { duplicatePlaceGroupCount: 0, expiringBannedUserCount: 0, missingLocationPlaceCount: 0, today: { placeRegistrationCount: 0 }, last7Days: { placeRegistrationCount: 0 } } }
  else if (config.url === '/admin/dashboard/recent-activities') data = { places: [], userSanctions: [] }
  else if (config.url.includes('/notifications')) data = { unreadCount: 0, count: 0, notifications: [] }
  else data = { total: 0, totalCount: 0, totalElements: config.url === '/admin/reservations' && scenario !== 'zero' && !(scenario === 'retry' && attempt > 2) ? (scenario.startsWith('refresh-') && attempt > 1 ? 2 : 6) : 0 }
  window.qaCompletedRequests.push(config.url)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
function RouteProbe() {
  const current = useLocation()
  return <output aria-label="검증 경로" hidden>{current.pathname}</output>
}
function RequestProbe() {
  return <button type="button" style={{position:'fixed',bottom:0,right:0}} aria-label="검증 요청 수" onClick={event => { event.currentTarget.textContent = String(requests.filter(path => path === '/admin/reservations').length) }}>요청 수</button>
}
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationProvider><MemoryRouter><GlobalStyle /><Page /><RouteProbe /><RequestProbe /></MemoryRouter></AdminNotificationProvider></AuthContext.Provider>)
