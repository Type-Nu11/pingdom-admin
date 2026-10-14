import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import Page from '../../src/pages/merchantReservationOperations/MerchantReservationOperationsPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const confirmation = {
  placeId: 1, placeName: '테스트 매장', availabilityId: 2, productId: 3, productName: '수락 당시 클래스', productType: 'CLASS',
  quantity: 2, startsAt: '2099-10-01T00:00:00Z', endsAt: '2099-10-01T01:00:00Z', timezone: 'Asia/Seoul',
  unitAmountMinor: 1000, additionalAmountMinor: 50, totalAmountMinor: 2050, currency: 'USD', currencyFractionDigits: 2,
  paymentRequired: true, cancellable: true, cancellationDeadline: window.qaDeadline ?? '2099-09-30T23:00:00Z', cancellationFeeMinor: 0,
  refundableAmountMinor: 2050, conditionsVersion: 1, productVersion: 2, expiresAt: '2020-01-01T00:00:00Z',
}
const base = { productId: 3, availabilityId: 2, productType: 'CLASS', quantity: 2, status: 'CONFIRMED', createdAt: '2026-10-01T00:00:00Z' }
let rows = [
  { ...base, id: 1, confirmation },
  { ...base, id: 2, confirmation: { ...confirmation, productName: '무료 클래스', totalAmountMinor: 0, unitAmountMinor: 0, additionalAmountMinor: 0, refundableAmountMinor: 0, paymentRequired: false } },
  { ...base, id: 3, confirmation: null },
  { ...base, id: 4, confirmation: { ...confirmation, productName: '취소 불가 클래스', cancellable: false, cancellationDeadline: null } },
  { ...base, id: 5, confirmation: { ...confirmation, productName: '기한 경과 클래스', cancellationDeadline: '2020-01-01T00:00:00Z' } },
]
window.qaMode = 'refund'
window.qaWrites = []
client.defaults.adapter = async config => {
  const response = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  if (config.method !== 'get') {
    window.qaWrites.push(config.url)
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
  if (config.url.endsWith('/reservable-products')) return response([{ id: 3, name: '이후 변경된 상품명' }])
  return response([])
}
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user: { username: 'synthetic' }, clearAuth() {}, logout() {} }}><BrowserRouter><GlobalStyle /><Routes><Route path="/reservation-qa" element={<Page />} /><Route path="/merchant/payments" element={<h1>결제 내역 테스트 경로</h1>} /></Routes></BrowserRouter></AuthContext.Provider>)
