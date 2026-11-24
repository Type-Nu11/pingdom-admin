import React from 'react'
import { createRoot } from 'react-dom/client'
import { Router } from '../../src/app/router/Router'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const date = '2030-01-01T09:00:00'
const event = {
  eventId: 1, placeId: 1, placeName: '합성 장소 1', title: '합성 초안', description: '',
  eventType: 'POP_UP', publicationStatus: 'DRAFT', scheduleStatus: 'UPCOMING',
  startAt: date, endAt: '2030-01-02T09:00:00',
}
const place = id => ({
  id, name: `합성 장소 ${id}`, address: `합성 주소 ${id}`,
  latitude: 37, longitude: 127, userId: 1, username: 'synthetic', registrant: 'synthetic', photoCount: 0,
})
const candidate = (id, status) => ({
  candidateId: id, leftPlaceId: id, rightPlaceId: id + 100,
  matchReason: '동일 주소', confidenceScore: 0.9, distanceMeters: 10, status, detectedAt: date,
})
const backgroundPaths = new Set([
  '/admin/notifications', '/admin/notifications/unread-count', '/admin/merchant-place-applications',
  '/admin/place-review-deletion-requests', '/admin/community-reports', '/admin/place-information-reports',
  '/admin/visitor-verification-reports', '/admin/visitor-verification-reports/corrections',
  '/admin/scout-profiles', '/admin/scout-field-reports', '/admin/trust-score/anomalies',
])
const empty = { count: 0, unreadCount: 0, total: 0, totalCount: 0, totalElements: 0, totalPages: 0, page: 1,
  hasNext: false, notifications: [], applications: [], requests: [], reports: [], items: [] }
let selectedStatus = 'PENDING'
window.placeToolsCalls = []
client.defaults.adapter = async config => {
  const { url, method, params } = config
  window.placeToolsCalls.push({ url, method, params })
  if (method !== 'get') throw new Error(`Mutation forbidden in place-tools fixture: ${method} ${url}`)
  const id = Number(url.split('/').at(-1))
  const page = params?.page ?? 1
  const pagination = { page, limit: params?.limit ?? 20, total: 21, totalPages: 2, hasNext: page === 1 }
  let data
  if (url === '/admin/place-events') data = { events: [event], ...empty, totalCount: 1, totalPages: 1 }
  else if (url === '/admin/place-events/1') data = event
  else if (url === '/admin/places/duplicates') {
    data = { ...pagination, groups: [{ representativePlaceId: page, duplicatePlaceIds: [page, page + 100], reasons: ['동일 주소'] }] }
  } else if (/^\/admin\/places\/duplicates\/\d+$/.test(url)) {
    data = { ...place(id), candidates: [{ ...place(id + 100), reason: '동일 주소', distanceMeters: 10 }] }
  } else if (url === '/admin/places/duplicate-candidates') {
    // The top bar also fetches pending counts with limit 1.
    if (params.limit !== 1) selectedStatus = params.status
    data = { ...pagination, candidates: [candidate(page, params.status)] }
  } else if (/^\/admin\/places\/duplicate-candidates\/\d+$/.test(url)) data = candidate(id, selectedStatus)
  else if (/^\/admin\/places\/\d+$/.test(url)) data = place(id)
  else if (url === '/admin/places/merge-histories') {
    data = { histories: [{ historyId: 7, sourcePlaceId: 101, targetPlaceId: 1, adminUserId: 99, mergedAt: date, restored: false }] }
  } else if (backgroundPaths.has(url)) data = empty
  else throw new Error(`Unexpected place-tools API: ${url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}

const auth = {
  user: { id: 99, username: 'synthetic', role: 'ADMIN' },
  isAuthReady: true, isAuthenticated: true, accessToken: 'synthetic-only',
  clearAuth() {}, logout: async () => {},
}

createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={auth}><GlobalStyle /><Router /></AuthContext.Provider>,
)
