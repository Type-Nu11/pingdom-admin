import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceProvider } from '../../src/app/providers/MerchantPlaceProvider'
import MerchantOfferPage from '../../src/pages/merchantOffer/MerchantOfferPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
const offers = Array.from({ length: 65 }, (_, i) => ({ id: i + 1, placeId: i < 45 ? 1 : 2, status: 'DRAFT', title: `합성 혜택 ${i + 1}`, description: '합성 설명', benefitDescription: '합성 할인 혜택', startsAt: '2026-10-01T09:00:00', endsAt: '2026-10-31T18:00:00', eligibilityPolicy: 'PUBLIC', inventoryPolicy: 'UNLIMITED', expiryPolicy: 'OFFER_END', couponValidityDays: 7 }))
window.qaRequests = []
window.qaHoldList = false
window.qaFailNextList = false
client.defaults.adapter = async config => {
  window.qaRequests.push({ url: config.url, method: config.method, params: config.params })
  await new Promise(resolve => setTimeout(resolve, 20))
  let data
  if (config.url === '/merchant-owner/me') data = { placeIds: [1, 2], displayName: '합성 상점' }
  else if (config.url === '/merchant-owner/offers') {
    if (window.qaHoldList) await new Promise(resolve => { window.qaReleaseList = resolve })
    if (window.qaFailNextList) {
      window.qaFailNextList = false
      throw new Error('Synthetic list failure')
    }
    const { page, limit, placeId, status } = config.params
    const filtered = offers.filter(item => (!placeId || item.placeId === placeId) && (!status || item.status === status))
    data = { offers: filtered.slice((page - 1) * limit, page * limit), totalElements: filtered.length, totalPages: Math.ceil(filtered.length / limit), page, limit, hasNext: page * limit < filtered.length }
  } else {
    const match = config.url.match(/^\/merchant-owner\/offers\/(\d+)(?:\/(publish|close))?$/)
    if (!match) throw new Error('Unexpected request')
    data = offers.find(item => item.id === Number(match[1]))
    if (config.method === 'post') {
      if (!match[2]) throw new Error('Unexpected mutation')
      data.status = match[2] === 'publish' ? 'PUBLISHED' : 'CLOSED'
    }
  }
  return { config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 1, username: 'synthetic', role: 'MERCHANT_OWNER' }, isAuthenticated: true, isAuthReady: true }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><MerchantPlaceProvider><BrowserRouter><GlobalStyle/><MerchantOfferPage/></BrowserRouter></MerchantPlaceProvider></AuthContext.Provider>)
