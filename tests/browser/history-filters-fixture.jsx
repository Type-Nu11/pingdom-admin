import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Page from '../../src/pages/merchantPlaceApplicationReview/MerchantPlaceApplicationReviewPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
window.historyQueries = []
client.defaults.adapter = async config => {
  if (config.method !== 'get') throw new Error('Mutation forbidden')
  window.historyQueries.push(config.params)
  return { config, data: { items: [], page: config.params.page, total: 0, totalPages: 0, hasNext: false }, status: 200, statusText: 'OK', headers: {} }
}
const auth = { clearAuth() {}, user: { id: 99, username: 'synthetic', role: 'ADMIN' }, isAuthenticated: true, isAuthReady: true }
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={auth}><AdminNotificationContext.Provider value={notifications}><MemoryRouter><GlobalStyle /><Page /></MemoryRouter></AdminNotificationContext.Provider></AuthContext.Provider>)
