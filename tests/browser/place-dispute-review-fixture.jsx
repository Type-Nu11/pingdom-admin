import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react'
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
  delayPost: false, delayList: false, delayDetail: false, empty: false, clears: 0,
  accountId: null, pending: 0, sequence: 0, requestId: 0, trace: [] }
function trace(event, fields = {}) {
  qa.trace.push({ sequence: ++qa.sequence, event, accountId: qa.accountId, ...fields })
  if (qa.trace.length > 200) qa.trace.shift()
}
const records = new Map([[1, report(1)], [2, report(2)]])
const requestIds = new WeakMap()
async function respond(config) {
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
}
client.defaults.adapter = observeFixtureAdapter(async config => {
  const requestId = ++qa.requestId
  requestIds.set(config, requestId)
  const fields = { requestId, method: config.method, path: config.url?.split('?')[0] }
  qa.pending++
  trace('request-start', fields)
  try {
    const response = await respond(config)
    trace('request-success', { ...fields, status: response.status })
    return response
  } catch (error) {
    trace('request-failure', { ...fields, status: error.response?.status ?? 0 })
    throw error
  } finally {
    qa.pending--
  }
})
// Mark the response after the failure collector and the production interceptor have settled.
const traceInterceptor = client.interceptors.response.use(response => {
  trace('response-delivered', { requestId: requestIds.get(response.config), status: response.status })
  return response
}, error => {
  trace('response-rejected', { requestId: requestIds.get(error.config), status: error.response?.status ?? 0 })
  return Promise.reject(error)
})
const notifications = { notifications: [], unreadCount: 0, pendingWorkItems: [], pendingWorkEntries: [],
  pendingWorkCount: 0, status: 'success', pendingWorkStatus: 'success' }
function App() {
  const [user, setUser] = useState({ id: 99, username: '합성 QA', role: 'ADMIN' })
  const changeAccount = useCallback(id => {
    trace('account-requested', { nextAccountId: id })
    setUser({ id, username: '합성 QA', role: 'ADMIN' })
  }, [])
  const clearAuth = useCallback(() => {
    qa.clears++
    trace('logout-requested')
    setUser(null)
  }, [])
  const logout = useCallback(async () => clearAuth(), [clearAuth])
  const auth = useMemo(() => ({ user, clearAuth, logout,
    isAuthenticated: Boolean(user), isAuthReady: true }), [user, clearAuth, logout])
  useLayoutEffect(() => {
    qa.changeAccount = changeAccount
    qa.accountId = user?.id ?? null
    trace('account-committed')
  }, [user, changeAccount])
  return <AuthContext.Provider value={auth}>
    <AdminNotificationContext.Provider value={notifications}>
      <UnsavedChangesProvider><GlobalStyle />
        {/* Match ProtectedRoute's lifecycle without real login or notification API calls. */}
        {user ? <Page /> : <div role="status" data-testid="qa-logged-out">합성 로그아웃 완료</div>}
      </UnsavedChangesProvider>
    </AdminNotificationContext.Provider>
  </AuthContext.Provider>
}
const router = createMemoryRouter([{ path: '*', element: <App /> }], {
  initialEntries: ['/places/information-verification'],
})
const root = createRoot(document.getElementById('root'))
root.render(<RouterProvider router={router} />)
if (import.meta.hot) import.meta.hot.dispose(() => {
  client.interceptors.response.eject(traceInterceptor)
  root.unmount()
})
