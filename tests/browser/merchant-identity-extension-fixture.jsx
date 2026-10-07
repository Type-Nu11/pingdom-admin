import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { Router } from '../../src/app/router/Router'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { createIdentityExtensionData } from './merchant-identity-extension-data.mjs'

const params = new URLSearchParams(location.search)
const data = createIdentityExtensionData(Number(params.get('count') ?? 2), params.has('long'))
window.qaRequests = []
window.qaFail = params.has('fail')
window.qaData = { name: data.name, address: data.address(2) }
client.defaults.adapter = async config => {
  window.qaRequests.push({ url: config.url, method: config.method })
  if (config.method !== 'get') throw new Error('All mutations prohibited in browser identity QA')
  await new Promise(resolve => setTimeout(resolve, 20))
  if (window.qaFail && config.url === '/merchant-owner/places/2') throw new Error('Synthetic detail failure')
  return { config, data: data.read(config.url), status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, logout() {}, user: { id: 99, username: '합성 QA', role: 'MERCHANT_OWNER' }, isAuthenticated: true, isAuthReady: true }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><GlobalStyle/><Router/></AuthContext.Provider>)
