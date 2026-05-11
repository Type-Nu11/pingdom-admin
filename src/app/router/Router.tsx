import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../../pages/login/LoginPage'
import MainPage from '../../pages/main/MainPage'
import SignupPage from '../../pages/signup/SignupPage'

// 로그인과 회원가입 중심의 최소 라우팅 구조를 관리합니다.
export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </BrowserRouter>
  )
}
