import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationProvider } from '../../src/app/providers/AdminNotificationProvider'
import Page from '../../src/pages/dashboard/DashboardPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'
import { reservation } from '../helpers/reservation-review-data.mjs'

const scenario = new URLSearchParams(location.search).get('scenario') || 'success'
const workPages = {
  '/admin/reservations': ['reservations', 'totalElements'],
  '/admin/merchant-place-applications': ['items', 'total'],
  '/admin/place-review-deletion-requests': ['deletionRequests', 'totalElements'],
  '/admin/community-reports': ['reports', 'totalCount'],
  '/admin/place-information-reports': ['reports', 'totalCount'],
  '/admin/visitor-verification-reports': ['reports', 'totalElements'],
  '/admin/visitor-verification-reports/corrections': ['corrections', 'totalElements'],
  '/admin/scout-profiles': ['profiles', 'totalCount'],
  '/admin/scout-field-reports': ['reports', 'totalElements'],
  '/admin/trust-score/anomalies': ['anomalies', 'totalCount'],
}
let attempt = 0
const requests = []
window.qaHeldRequests = []
window.qaCompletedRequests = []
client.defaults.adapter = observeFixtureAdapter(async config => {
  if (config.method !== 'get') throw new Error('Dashboard fixture prohibits mutations')
  if (!workPages[config.url] && !['/admin/dashboard/summary', '/admin/dashboard/recent-activities', '/admin/places/duplicates', '/admin/places/duplicate-candidates', '/admin/notifications/unread-count', '/admin/notifications'].includes(config.url)) throw new Error(`Unexpected dashboard fixture API ${config.url}`)
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
  if (config.url === '/admin/dashboard/summary') data = { placeCount: 10, bannedUserCount: 0, operationalMetrics: { duplicatePlaceGroupCount: scenario === 'duplicate-groups' ? 3 : 0, expiringBannedUserCount: 0, missingLocationPlaceCount: 0, today: { placeRegistrationCount: 0 }, last7Days: { placeRegistrationCount: 0 } } }
  else if (config.url === '/admin/dashboard/recent-activities') data = { places: [], userSanctions: [] }
  else if (config.url.includes('/notifications')) data = { unreadCount: 0, count: 0, notifications: [] }
  else if (config.url === '/admin/places/duplicates' || config.url === '/admin/places/duplicate-candidates') data = scenario === 'malformed-duplicates' ? { total: 0 } : { [config.url.endsWith('/duplicates') ? 'groups' : 'candidates']: [], total: 0, page: 1, limit: 1, totalPages: 0, hasNext: false }
  else if (workPages[config.url]) {
    const [rows, countKey] = workPages[config.url]
    const count = config.url === '/admin/reservations' && scenario !== 'zero' && !(scenario === 'retry' && attempt > 2) ? (scenario.startsWith('refresh-') && attempt > 1 ? 2 : 6) : 0
    data = { [rows]: count ? [reservation(1)] : [], [countKey]: count, page: 1, limit: 1, totalPages: count, hasNext: count > 1 }
  }
  else throw new Error(`Unexpected dashboard fixture API ${config.url}`)
  window.qaCompletedRequests.push(config.url)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
})
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
function RouteProbe() {
  const current = useLocation()
  return <output aria-label="검증 경로" hidden>{current.pathname}</output>
}
function RequestProbe() {
  return <button type="button" style={{position:'fixed',bottom:0,right:0}} aria-label="검증 요청 수" onClick={event => { event.currentTarget.textContent = String(requests.filter(path => path === '/admin/reservations').length) }}>요청 수</button>
}
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationProvider><MemoryRouter><GlobalStyle /><Page /><RouteProbe /><RequestProbe /></MemoryRouter></AdminNotificationProvider></AuthContext.Provider>)
