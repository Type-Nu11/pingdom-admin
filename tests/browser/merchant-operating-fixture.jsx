import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { MerchantPlaceProvider } from '../../src/app/providers/MerchantPlaceProvider'
import MerchantPlaceOperationsPage from '../../src/pages/merchantPlaceOperations/MerchantPlaceOperationsPage'
import MerchantOperatingNoticePage from '../../src/pages/merchantOperatingNotice/MerchantOperatingNoticePage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
window.qaOperating = null
window.qaFail = false
window.qaRequests = []
client.defaults.adapter = async config => {
  window.qaRequests.push(config.method)
  if (config.method !== 'get') throw new Error('Mutations prohibited')
  await new Promise(resolve => setTimeout(resolve, 30))
  let data
  if (config.url.endsWith('/me')) data = { placeIds: [1, 2] }
  else if (config.url.endsWith('/media')) data = { media: [] }
  else {
    if (window.qaFail) throw new Error('Synthetic failure')
    data = { placeId: 1, name: '테스트 매장', currentlyOperating: window.qaOperating, checkedAt: '2026-09-30T12:00:00', operatingStatus: 'OPERATING', regularHours: [], operatingExceptions: [], notices: [] }
  }
  return { config, data, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { username: 'synthetic', role: 'MERCHANT_OWNER' } }
const Page = location.search.includes('notices') ? MerchantOperatingNoticePage : MerchantPlaceOperationsPage
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><MerchantPlaceProvider><BrowserRouter><GlobalStyle/><Page/></BrowserRouter></MerchantPlaceProvider></AuthContext.Provider>)
