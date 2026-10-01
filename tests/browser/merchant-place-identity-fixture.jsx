import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceProvider } from '../../src/app/providers/MerchantPlaceProvider'
import MerchantStorePage from '../../src/pages/merchantStore/MerchantStorePage'
import MerchantMenuPage from '../../src/pages/merchantMenu/MerchantMenuPage'
import MerchantPlaceReviewPage from '../../src/pages/merchantPlaceReview/MerchantPlaceReviewPage'
import MerchantReservationSetupPage from '../../src/pages/merchantReservationSetup/MerchantReservationSetupPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

const count = Number(new URLSearchParams(location.search).get('count') ?? 2)
window.qaRequests = []
window.qaFail = new URLSearchParams(location.search).has('fail')
const profile = { id: 1, placeIds: Array.from({ length: count }, (_, i) => i + 1), status: 'ACTIVE', displayName: '상점주 표시명', businessName: '사업자 상호', contactEmail: 'synthetic@example.com' }
client.defaults.adapter = async config => {
  window.qaRequests.push(config.url)
  if (config.method !== 'get') throw new Error('Mutations prohibited')
  await new Promise(resolve => setTimeout(resolve, 20))
  let data
  const id = Number(config.url.match(/\/places\/(\d+)/)?.[1])
  if (config.url.endsWith('/me')) data = profile
  else if (/^\/merchant-owner\/places\/\d+$/.test(config.url)) {
    if (window.qaFail && id === 2) throw new Error('Synthetic identity failure')
    data = { id, name: '동일한 매장 이름', roadAddress: `서울특별시 테스트로 ${id}` }
  } else if (config.url.endsWith('/performance')) data = { placeCount: count, exposureCount: 100, clickCount: 20, bookmarkCount: 10, clickThroughRate: 20, reservationCount: 5, confirmedReservationCount: 2, reservationConversionRate: 10 }
  else if (config.url.endsWith('/information')) data = { placeId: id, description: `매장 ${id} 소개` }
  else if (config.url.endsWith('/campaigns')) data = { items: [] }
  else if (config.url.endsWith('/offers')) data = { offers: [] }
  else if (config.url.endsWith('/operating-notices')) data = { notices: [] }
  else if (config.url.endsWith('/reviews')) data = { reviews: [], page: 1, limit: 20, totalElements: 0, totalPages: 0, hasNext: false }
  else if (['/menus', '/reservable-products', '/availabilities'].some(path => config.url.endsWith(path))) data = []
  else throw new Error(`Unexpected request: ${config.url}`)
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 1, username: 'synthetic', role: 'MERCHANT_OWNER' }, isAuthenticated: true, isAuthReady: true }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><MerchantPlaceProvider><BrowserRouter><GlobalStyle/><nav>{['home', 'menu', 'reviews', 'reservation'].map(path => <Link key={path} style={{ marginRight: 20 }} to={`/identity-qa/${path}`}>{path}</Link>)}</nav><Routes><Route path="/identity-qa/home" element={<MerchantStorePage/>}/><Route path="/identity-qa/menu" element={<MerchantMenuPage/>}/><Route path="/identity-qa/reviews" element={<MerchantPlaceReviewPage/>}/><Route path="/identity-qa/reservation" element={<MerchantReservationSetupPage/>}/></Routes></BrowserRouter></MerchantPlaceProvider></AuthContext.Provider>)
