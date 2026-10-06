import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import ReservationPage from '../../src/pages/adminReservationReview/AdminReservationReviewPage'
import PlacePage from '../../src/pages/place/PlaceManagePage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { AxiosError } from 'axios'
import { reservation, reservationPage } from '../helpers/reservation-review-data.mjs'

const place = { id: 7, name: '합성 장소 7', address: '합성 주소', latitude: 37.5, longitude: 127, userId: 8, username: '합성 상점주', category: '카페', operatingStatus: 'OPERATING', discoveryStatus: 'VISIBLE', regularHours: [], operatingExceptions: [], posts: [], touristCategories: [] }
window.reservationQA = { calls: [], listStatus: 0, detailStatus: 0, detailOverride: null, omitSelected: false }
client.defaults.adapter = async config => {
  const qa = window.reservationQA
  qa.calls.push({ url: config.url, method: config.method, params: config.params })
  if (config.method !== 'get') throw new Error('Synthetic QA forbids mutations')
  let data, status = 0
  if (config.url === '/admin/reservations') {
    data = reservationPage(config.params, qa.omitSelected ? { reservations: [], totalElements: 0, totalPages: 0, hasNext: false } : {})
    status = qa.listStatus
  } else if (/^\/admin\/reservations\/\d+$/.test(config.url)) {
    data = reservation(Number(config.url.split('/').at(-1)), qa.detailOverride ?? {})
    status = qa.detailStatus
  } else if (config.url === '/admin/places') {
    data = { places: [place], page: 1, limit: 10, totalCount: 1, totalPages: 1, hasNext: false }
  } else if (config.url === '/admin/places/7') data = place
  else throw new Error(`Unexpected synthetic API ${config.url}`)
  if (status) throw new AxiosError('합성 조회 실패', 'ERR_BAD_RESPONSE', config, undefined, { config, data: {}, status, statusText: 'Synthetic failure', headers: {} })
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { user: { id: 99, username: '합성 QA', role: 'ADMIN' }, clearAuth() {}, logout: async () => {}, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
const root = createRoot(document.getElementById('root'))
root.render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><BrowserRouter><GlobalStyle />
  <Routes><Route path="/reservations/review" element={<ReservationPage />} /><Route path="/places" element={<PlacePage />} /></Routes>
</BrowserRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
