import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import client from '../../src/api/customAxios'
import { shouldClearAuth } from '../../src/api/authError'
import { AuthProvider } from '../../src/app/providers/AuthProvider'
import { ProtectedRoute, MerchantProtectedRoute } from '../../src/app/router/ProtectedRoute'
import { useAuth } from '../../src/hooks/useAuth'
import LoginPage from '../../src/pages/login/LoginPage'
import { GlobalStyle } from '../../src/styles/globalStyle'

const response = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const failure = (config, status) => { throw new axios.AxiosError('Synthetic failure', 'ERR_BAD_RESPONSE', config, {}, { ...response(config), status }) }
axios.defaults.adapter = async config => failure(config, 401)
client.defaults.adapter = async config => {
  if (config.url === '/auth/admin/login' || config.url === '/auth/login') {
    const role = config.url === '/auth/admin/login' ? 'ADMIN' : 'MERCHANT_OWNER'
    return response(config, { id: 1, username: 'synthetic-operator', role, accessToken: `header.${btoa(JSON.stringify({ sub: '1', type: 'access' }))}.signature` })
  }
  if (config.url === '/auth/logout') return response(config)
  if (config.method !== 'get') throw new Error('Business mutations forbidden in deployment QA')
  if (config.url === '/qa/expired') return failure(config, 401)
  if (config.url === '/qa/forbidden') return failure(config, 403)
  return response(config, { notifications: [], unreadCount: 0, items: [], reports: [], requests: [], candidates: [], groups: [], profiles: [], reservations: [], applications: [], anomalies: [], total: 0, totalCount: 0, totalElements: 0, totalPages: 0, page: 1, limit: 20, hasNext: false })
}

function Work() {
  const { user, clearAuth, logout } = useAuth()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const check = async path => {
    try { await client.get(path) } catch (error) {
      if (shouldClearAuth(error)) clearAuth()
      else setMessage('권한 부족 — 현재 작업 화면을 유지합니다.')
    }
  }
  return <main>
    <h1>{user.role === 'ADMIN' ? '관리자' : '상점주'} 배포 경로 검증</h1>
    <p>실제 운영 요청 없이 합성 로그인과 인증 오류만 사용합니다.</p>
    <p data-testid="route">{location.pathname + location.search}</p>
    <nav style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
      {user.role === 'ADMIN' ? <><Link to="/dashboard">대시보드</Link><Link to="/places?placeId=8">장소 상세</Link></>
        : <><Link to="/merchant">내 가게</Link><Link to="/merchant/menus?page=2">메뉴 관리</Link></>}
    </nav>
    <button onClick={() => void check('/qa/expired')}>인증 만료 재현</button>{' '}
    <button onClick={() => void check('/qa/forbidden')}>권한 오류 재현</button>{' '}
    <button onClick={() => void logout()}>로그아웃 검증</button>
    {message ? <p role="alert">{message}</p> : null}
  </main>
}

createRoot(document.getElementById('root')).render(<StrictMode><AuthProvider><BrowserRouter basename={import.meta.env.BASE_URL}>
  <GlobalStyle />
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route path="/places" element={<Work />} /><Route path="/dashboard" element={<Work />} /></Route>
    <Route element={<MerchantProtectedRoute />}><Route path="/merchant" element={<Work />} /><Route path="/merchant/menus" element={<Work />} /></Route>
  </Routes>
  <small style={{ position: 'fixed', bottom: 8, left: 8, background: '#fff', padding: 6 }}>합성 배포 QA · 실서버 호출 없음 · {import.meta.env.BASE_URL}</small>
</BrowserRouter></AuthProvider></StrictMode>)
