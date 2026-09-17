import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceProvider } from '../../src/app/providers/MerchantPlaceProvider'
import MerchantMenuPage from '../../src/pages/merchantMenu/MerchantMenuPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'

window.qaRequests = []
client.defaults.adapter = async config => {
  window.qaRequests.push(config.url)
  if (config.method !== 'get') throw new Error('Unexpected mutation')
  let data
  if (config.url === '/merchant-owner/me') {
    data = { placeIds: Array.from({ length: 30 }, (_, i) => i + 1), displayName: '합성 상점' }
  } else {
    const match = config.url.match(/^\/merchant-owner\/places\/(\d+)\/menus$/)
    if (!match) throw new Error(`Unexpected request: ${config.url}`)
    data = [{ id: 9, placeId: Number(match[1]), name: '합성 메뉴', description: '설명', priceAmount: 3000, currency: 'KRW', status: 'AVAILABLE', displayOrder: 0 }]
  }
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 1, username: 'synthetic', role: 'MERCHANT_OWNER' }, isAuthenticated: true, isAuthReady: true }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><MerchantPlaceProvider><BrowserRouter><GlobalStyle/><MerchantMenuPage/></BrowserRouter></MerchantPlaceProvider></AuthContext.Provider>)
