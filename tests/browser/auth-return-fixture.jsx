import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import axios from 'axios'
import { AuthProvider } from '../../src/app/providers/AuthProvider'
import { ProtectedRoute, MerchantProtectedRoute } from '../../src/app/router/ProtectedRoute'
import LoginPage from '../../src/pages/login/LoginPage'
import { useAuth } from '../../src/hooks/useAuth'
import { shouldClearAuth } from '../../src/api/authError'
import client from '../../src/api/customAxios'
import { saveLoginAuth, getStoredAuthState } from '../../src/utils/authStorage'
import { GlobalStyle } from '../../src/styles/globalStyle'

const token = id => `header.${btoa(JSON.stringify({ sub: String(id), type: 'access' }))}.signature`
const login = (id = 1, role = 'ADMIN') => ({ id, role, username: `synthetic-${id}`, accessToken: token(id) })
window.qaMode = 'expired'
window.qaRequests = []
window.qaLogin = { id: 1, role: 'ADMIN' }
const response = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const reject = (config, status) => { throw new axios.AxiosError('Synthetic failure', 'ERR_BAD_RESPONSE', config, {}, { ...response(config), status }) }
axios.defaults.adapter = async config => {
  window.qaRequests.push(config.url)
  if (config.url !== '/auth/token/refresh') throw new Error('Unexpected raw request')
  if (window.qaMode === 'refresh503') return reject(config, 503)
  if (window.qaMode === 'timeout') throw new axios.AxiosError('Synthetic timeout', 'ECONNABORTED', config)
  if (window.qaMode === 'refresh403') return reject(config, 403)
  if (window.qaMode === 'mismatch') return response(config, { accessToken: token(99) })
  if (window.qaMode === 'refresh-success') return response(config, { accessToken: token(1) + '-new' })
  return reject(config, 401)
}
client.defaults.adapter = async config => {
  window.qaRequests.push(config.url)
  if (config.url === '/auth/logout') return response(config)
  if (config.url === '/auth/admin/login' || config.url === '/auth/login') {
    if (JSON.parse(config.data).username === 'wrong') return reject(config, 401)
    return response(config, login(window.qaLogin.id, window.qaLogin.role))
  }
  if (config.method !== 'get') throw new Error('Business mutations forbidden')
  if (config.url === '/qa/work') {
    if (window.qaMode === 'resource403') return reject(config, 403)
    if (window.qaMode === 'refresh-success' && String(config.headers.Authorization).endsWith('-new')) return response(config)
    return reject(config, 401)
  }
  return response(config, { notifications: [], unreadCount: 0, items: [], reports: [], requests: [], candidates: [], groups: [], profiles: [], reservations: [], applications: [], anomalies: [], total: 0, totalCount: 0, totalElements: 0, totalPages: 0, hasNext: false })
}
if (window.location.pathname !== '/login' && !getStoredAuthState()) saveLoginAuth(login())

function Work() {
  const { logout, clearAuth } = useAuth()
  const location = useLocation()
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState('')
  return <main style={{ padding: 24 }}>
    <h1>합성 작업 화면</h1><p data-testid="route">{location.pathname + location.search}</p>
    <label>미저장 입력<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
    <button onClick={async () => {
      try { await client.get('/qa/work'); setResult('success') }
      catch (error) { if (shouldClearAuth(error)) clearAuth(); else setResult(error.category) }
    }}>조회 검증</button>
    <button onClick={() => { void logout() }}>로그아웃 검증</button>
    <p data-testid="result">{result}</p>
  </main>
}
createRoot(document.getElementById('root')).render(<StrictMode><AuthProvider><BrowserRouter><GlobalStyle/><Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route element={<ProtectedRoute/>}><Route path="/places" element={<Work/>}/><Route path="/dashboard" element={<Work/>}/></Route>
  <Route element={<MerchantProtectedRoute/>}><Route path="/merchant" element={<Work/>}/><Route path="/merchant/menus" element={<Work/>}/></Route>
</Routes></BrowserRouter></AuthProvider></StrictMode>)
