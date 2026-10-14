import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceContext } from '../../src/app/providers/MerchantPlaceContext'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import Page from '../../src/pages/merchantReservationSetup/MerchantReservationSetupPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const base = { placeId: 1, productId: null, productName: null, productType: 'GENERAL', startsAt: '2099-10-01T10:00', endsAt: '2099-10-01T11:00', totalCapacity: 5, remainingCapacity: 5, status: 'ACTIVE', conditionsVersion: 0 }
let rows = [
  { ...base, id: 7, reservationTerms: null },
  { ...base, id: 8, startsAt: '2099-10-02T10:00', reservationTerms: { unitAmountMinor: 0, additionalAmountMinor: 0, currency: 'KRW', timezone: 'Asia/Seoul', cancellable: false, cancellationCutoffMinutes: null } },
]
window.qaMode = 'success'
window.qaWrites = []
client.defaults.adapter = async config => {
  const response = data => ({ config, data, status: 200, statusText: 'OK', headers: {} })
  if (config.method === 'put') {
    if (!/^\/merchant-owner\/availabilities\/\d+\/reservation-terms$/.test(config.url)) throw new Error('Unexpected mutation')
    window.qaWrites.push({ url: config.url, body: JSON.parse(config.data) })
    if (window.qaMode === 'pending') await new Promise(resolve => { window.qaRelease = resolve })
    if (window.qaMode === 'failure') throw new Error('Synthetic offline error')
    const id = Number(config.url.split('/').at(-2))
    rows = rows.map(row => row.id === id ? { ...row, reservationTerms: JSON.parse(config.data), conditionsVersion: row.conditionsVersion + 1 } : row)
    sessionStorage.setItem('qaTerms', JSON.stringify(rows))
    return response(JSON.parse(config.data))
  }
  if (config.method !== 'get') throw new Error('Unexpected mutation')
  if (config.url.endsWith('/me')) return response({ displayName: '예약 조건 테스트 상점주', placeIds: [1] })
  if (config.url.endsWith('/availabilities')) {
    if (window.qaMode === 'refresh-failure' && window.qaWrites.length) throw new Error('Synthetic reload failure')
    rows = JSON.parse(sessionStorage.getItem('qaTerms') ?? 'null') ?? rows
    return response(rows)
  }
  return response([])
}
const places = { selectedPlaceId: 1, selectPlace() {}, syncPlaces(ids) { return ids[0] ?? null } }
const router = createBrowserRouter([{ path: '/terms-qa', element: <UnsavedChangesProvider><Page /></UnsavedChangesProvider> }])
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user: { username: 'synthetic' }, clearAuth() {}, logout() {} }}><MerchantPlaceContext.Provider value={places}><GlobalStyle /><RouterProvider router={router} /></MerchantPlaceContext.Provider></AuthContext.Provider>)
