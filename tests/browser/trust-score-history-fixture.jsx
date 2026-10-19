import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Page from '../../src/pages/trustScore/TrustScorePage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'
import { reporter, historyPage } from '../helpers/trust-score-data.mjs'

const qa = window.trustScoreQA = { calls: [], historyStatus: 0, reporterStatus: 0, delayHistory: false, malformed: false, clears: 0 }
client.defaults.adapter = observeFixtureAdapter(async config => {
  qa.calls.push({ method: config.method, path: config.url, params: config.params })
  if (config.method !== 'get') throw Error('Trust Score browser QA forbids mutations')
  let data, status = 0
  const match = config.url.match(/^\/admin\/trust-score\/reporters\/(\d+)(\/history)?$/)
  if (match) {
    const id = Number(match[1])
    data = match[2] ? historyPage(id, config.params.page, config.params.limit, id === 2 ? 0 : 45) : reporter(id)
    status = match[2] ? qa.historyStatus : qa.reporterStatus
    if (match[2] && qa.malformed) data = []
    if (match[2] && qa.delayHistory) await new Promise(resolve => { qa.releaseHistory = resolve })
  } else if (config.url.endsWith('/anomalies')) data = { anomalies: [], page: 1, limit: 10, totalCount: 0, totalPages: 0 }
  else if (config.url.endsWith('/intervention-rules')) data = { rules: [] }
  else throw Error(`Unexpected synthetic API ${config.url}`)
  if (status) throw new AxiosError('합성 이력 조회 실패', 'ERR_BAD_RESPONSE', config, undefined, { config, data: {}, status, statusText: 'Synthetic', headers: {} })
  return { config, data, status: 200, statusText: 'OK', headers: {} }
})
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [], pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
function App() {
  const [user, setUser] = useState({ id: 99, username: '합성 QA', role: 'ADMIN' })
  qa.changeAccount = id => setUser({ id, username: '합성 QA', role: 'ADMIN' })
  return <AuthContext.Provider value={{ user, clearAuth() { qa.clears++; setUser(null) }, logout: async () => {}, isAuthenticated: Boolean(user), isAuthReady: true }}>
    <AdminNotificationContext.Provider value={notifications}><BrowserRouter><GlobalStyle /><Page /></BrowserRouter></AdminNotificationContext.Provider>
  </AuthContext.Provider>
}
const root = createRoot(document.getElementById('root'))
root.render(<App />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
