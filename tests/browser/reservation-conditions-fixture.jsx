import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import Page from '../../src/pages/merchantReservationOperations/MerchantReservationOperationsPage'
import PaymentsPage from '../../src/pages/merchantPayments/MerchantPaymentsPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'

const confirmation = {
  placeId: 1, placeName: '테스트 매장', availabilityId: 2,
  quantity: 2, startsAt: '2099-10-01T00:00:00Z', endsAt: '2099-10-01T01:00:00Z', timezone: 'Asia/Seoul',
  cancellable: true, cancellationDeadline: window.qaDeadline ?? '2099-09-30T23:00:00Z',
  conditionsVersion: 1, expiresAt: '2020-01-01T00:00:00Z',
}
const base = { availabilityId: 2, quantity: 2, status: 'CONFIRMED', createdAt: '2026-10-01T00:00:00Z' }
let rows = [
  { ...base, id: 1, confirmation },
  { ...base, id: 2, confirmation: { ...confirmation, cancellationDeadline: null } },
  { ...base, id: 3, confirmation: null },
  { ...base, id: 4, confirmation: { ...confirmation, cancellable: false, cancellationDeadline: null } },
  { ...base, id: 5, confirmation: { ...confirmation, cancellationDeadline: '2020-01-01T00:00:00Z' } },
  { ...base, id: 6, status: 'PENDING', confirmation },
  { ...base, id: 7, status: 'REJECTED', reviewReason: '합성 반려 사유', confirmation },
  { ...base, id: 8, status: 'CANCELED', confirmation },
]
const payment = { id: 10, reservationId: 1, amountMinor: null, currency: null, status: 'PAID', provider: 'SYNTHETIC', createdAt: '2026-10-01T00:00:00' }
const pageData = (key, entries) => ({ [key]: entries, page: 1, limit: 20, totalElements: entries.length, totalPages: 1, hasNext: false })
window.qaMode = 'refund'
window.qaWrites = []
client.defaults.adapter = observeFixtureAdapter(async config => {
  const response = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  if (config.method !== 'get') {
    window.qaWrites.push(config.url)
    if (config.method === 'post' && config.url === '/merchant-owner/payments/10/refund') {
      payment.status = 'REFUND_PROCESSING'
      return response({ ...payment })
    }
    if (config.method !== 'post') throw new Error('Unexpected mutation method')
    if (!/^\/merchant-owner\/reservations\/\d+\/cancel$/.test(config.url)) throw new Error('Unexpected mutation')
    if (window.qaMode === 'pending') await new Promise(resolve => { window.qaRelease = resolve })
    if (window.qaMode === 'refund' || window.qaMode === 'policy') {
      const code = window.qaMode === 'refund' ? 'RESERVATION_REFUND_REQUIRED' : 'CANCELLATION_NOT_ALLOWED'
      throw Object.assign(new Error('Synthetic conflict'), { isAxiosError: true, config, response: { status: 409, data: { code }, config, headers: {} } })
    }
    const id = Number(config.url.split('/').at(-2))
    const next = { ...rows.find(row => row.id === id), status: 'CANCELED', canceledAt: '2026-10-01T01:00:00Z' }
    rows = rows.map(row => row.id === id ? next : row)
    return response(next)
  }
  if (config.url.endsWith('/reservations')) return response({ reservations: rows, page: 1, limit: 20, totalElements: rows.length, totalPages: 1, hasNext: false })
  if (config.url === '/merchant-owner/availabilities') return response([])
  if (config.url === '/merchant-owner/me') return response({ placeIds: [1] })
  if (config.url === '/merchant-owner/payments') return response(pageData('payments', [payment]))
  if (config.url === '/merchant-owner/payments/settlements') return response(pageData('entries', []))
  throw new Error(`Unexpected synthetic GET ${config.url}`)
})
const root = createRoot(document.getElementById('root'))
root.render(<AuthContext.Provider value={{ user: { username: 'synthetic' }, clearAuth() {}, logout() {} }}><BrowserRouter><GlobalStyle /><Routes><Route path="/reservation-qa" element={<Page />} /><Route path="/merchant/payments" element={<PaymentsPage />} /></Routes></BrowserRouter></AuthContext.Provider>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
