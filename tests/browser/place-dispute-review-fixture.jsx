import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AxiosError } from 'axios'
import { AuthContext } from '../../src/app/providers/AuthContext'
import { AdminNotificationContext } from '../../src/app/providers/AdminNotificationContext'
import { UnsavedChangesProvider } from '../../src/components/common/UnsavedChangesProvider'
import Page from '../../src/pages/placeVerification/PlaceVerificationPage'
import { GlobalStyle } from '../../src/styles/globalStyle'
import client from '../../src/api/customAxios'
import { observeFixtureAdapter } from '../helpers/fixture-adapter.mjs'
import { report, list } from '../helpers/place-dispute-data.mjs'

const path = '/admin/place-information-reports'
const qa = window.placeReviewQA = { calls: [], detailStatus: 0, listStatus: 0, postStatus: 0,
  delayPost: false, delayList: false, delayDetail: false, empty: false, clears: 0 }
const records = new Map([[1, report(1)], [2, report(2)]])
client.defaults.adapter = observeFixtureAdapter(async config => {
  qa.calls.push({ method: config.method, path: config.url })
  let data, status
  if (config.method === 'get' && config.url === path) {
    data = list(qa.empty ? [] : [...records.values()]); status = qa.listStatus
    if (qa.delayList) await new Promise(resolve => { qa.releaseList = resolve })
  } else if (config.method === 'get' && /^\/admin\/place-information-reports\/\d+$/.test(config.url)) {
    data = records.get(Number(config.url.split('/').at(-1))); status = qa.detailStatus
    if (qa.delayDetail) await new Promise(resolve => { qa.releaseDetail = resolve })
  } else {
    const match = config.url.match(/^\/admin\/place-information-reports\/(\d+)(?:\/disputes\/(\d+))?\/review$/)
    if (config.method !== 'post' || !match) throw Error(`Unexpected synthetic API ${config.method} ${config.url}`)
    if (qa.delayPost) await new Promise(resolve => { qa.releasePost = resolve })
    const current = records.get(Number(match[1]))
    status = qa.postStatus
    if (!status) {
      const body = JSON.parse(config.data)
      if (match[2]) {
        const target = current.disputes.find(item => item.disputeId === Number(match[2]))
        Object.assign(target, body); current.status = 'UNDER_REVIEW'; data = target
      } else { Object.assign(current, body); data = current }
    }
  }
  if (status) throw new AxiosError('합성 검토 API 실패', 'ERR_BAD_RESPONSE', config, undefined,
    { config, data: {}, status, statusText: 'Synthetic', headers: {} })
  return { config, data: structuredClone(data), status: 200, statusText: 'OK', headers: {} }
})
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [],
  pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
function App() {
  const [user, setUser] = useState({ id: 99, username: '합성 QA', role: 'ADMIN' })
  qa.changeAccount = id => setUser({ id, username: '합성 QA', role: 'ADMIN' })
  return <AuthContext.Provider value={{ user, clearAuth() { qa.clears++; setUser(null) },
    logout: async () => {}, isAuthenticated: Boolean(user), isAuthReady: true }}>
    <AdminNotificationContext.Provider value={notifications}>
      <UnsavedChangesProvider><GlobalStyle /><Page /></UnsavedChangesProvider>
    </AdminNotificationContext.Provider>
  </AuthContext.Provider>
}
const router = createMemoryRouter([{ path: '*', element: <App /> }], {
  initialEntries: ['/places/information-verification'],
})
const root = createRoot(document.getElementById('root'))
root.render(<RouterProvider router={router} />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
