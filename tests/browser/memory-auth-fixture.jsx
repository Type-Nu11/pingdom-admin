import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from '../../src/app/providers/AuthProvider'
import { MerchantProtectedRoute, ProtectedRoute } from '../../src/app/router/ProtectedRoute'
import { useAuth } from '../../src/hooks/useAuth'
import LoginPage from '../../src/pages/login/LoginPage'
import { GlobalStyle } from '../../src/styles/globalStyle'

function Controls() {
  const [status, setStatus] = useState('')
  return <aside style={{ position: 'fixed', zIndex: 99999, bottom: 12, right: 12, padding: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
    <p>합성 인증 QA · 실서버 연결 없음</p>
    <select aria-label="합성 응답" onChange={async event => { await fetch('/api/qa/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: event.target.value }) }); setStatus(event.target.value) }}>
      {['ok', '503', 'logout503', 'expired', 'mismatch'].map(mode => <option key={mode}>{mode}</option>)}
    </select>
    <button onClick={async () => {
      const data = await (await fetch('/api/qa/status')).json()
      const stores = [localStorage, sessionStorage].map(storage => Object.keys(storage).filter(key => key === 'accessToken' || key === 'refreshToken' || key === 'pingdom-auth-storage-commit'))
      setStatus(`회전 ${data.rotations}회 · 민감 저장 키 ${stores.flat().length}개 · JS 쿠키 ${document.cookie || '없음'}`)
    }}>저장소 확인</button>
    <p role="status">{status}</p>
  </aside>
}
function Work() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [draft, setDraft] = useState('')
  return <main style={{ padding: 32 }}>
    <h1>합성 작업 화면 · {user.role}</h1><p>계정 #{user.id} · {location.pathname + location.search}</p>
    <label>작성 중 입력<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
    <button onClick={() => void logout()}>로그아웃 검증</button>
  </main>
}
createRoot(document.getElementById('root')).render(<StrictMode><GlobalStyle/><Controls/><AuthProvider><BrowserRouter basename="/console/">
  <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<ProtectedRoute/>}><Route path="/dashboard" element={<Work/>}/><Route path="/places" element={<Work/>}/></Route>
    <Route element={<MerchantProtectedRoute/>}><Route path="/merchant" element={<Work/>}/><Route path="/merchant/menus" element={<Work/>}/></Route>
  </Routes>
</BrowserRouter></AuthProvider></StrictMode>)
