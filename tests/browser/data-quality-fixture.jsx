import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import Page from '../../src/pages/dataQuality/DataQualityPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'
import { qualityPage, qualityIssue } from '../helpers/data-quality-data.mjs'

const qa = window.qualityQA = { calls: [], status: 0, total: 45, malformed: false,
  delay: false, duplicates: false, clears: 0 }
client.defaults.adapter = observeFixtureAdapter(async config => {
  if (config.method !== 'get' || config.url !== '/admin/data-quality/issues') throw Error('Unexpected API; quality QA is GET-only')
  if (Object.keys(config.params).sort().join(',') !== 'limit,page') throw Error('Unexpected server filter')
  qa.calls.push({ method: config.method, path: config.url, params: config.params })
  let data = qualityPage(config.params.page, config.params.limit, qa.total)
  if (qa.duplicates && config.params.page === 1) data.items = [
    qualityIssue(1, { details: '같은 식별 필드 첫째 이슈', severity: 'ERROR' }),
    qualityIssue(1, { details: '같은 식별 필드 둘째 이슈', severity: 'WARNING' }),
  ]
  if (qa.malformed) data = []
  const status = qa.status
  if (qa.delay) await new Promise(resolve => { qa.release = resolve })
  if (status) throw new AxiosError('합성 품질 조회 실패', 'ERR_BAD_RESPONSE', config, undefined,
    { config, data: {}, status, statusText: 'Synthetic', headers: {} })
  return { config, data, status: 200, statusText: 'OK', headers: {} }
})
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [],
  pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
function LocationProbe() {
  const location = useLocation(), navigate = useNavigate()
  useEffect(() => { qa.path = location.pathname; qa.navigate = navigate }, [location, navigate])
  return null
}
function App() {
  const [user, setUser] = useState({ id: 99, username: '합성 QA', role: 'ADMIN' })
  qa.changeAccount = id => setUser({ id, username: '합성 QA', role: 'ADMIN' })
  return <AuthContext.Provider value={{ user, clearAuth() { qa.clears++; setUser(null) },
    logout: async () => {}, isAuthenticated: Boolean(user), isAuthReady: true }}>
    <AdminNotificationContext.Provider value={notifications}>
      <BrowserRouter><GlobalStyle /><LocationProbe /><Page /></BrowserRouter>
    </AdminNotificationContext.Provider>
  </AuthContext.Provider>
}
const root = createRoot(document.getElementById('root'))
root.render(<App />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
