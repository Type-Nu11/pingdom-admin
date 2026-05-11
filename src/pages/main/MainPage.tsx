import { Link, Navigate } from 'react-router-dom'
import KakaoMap from '../../components/map/KakaoMap'

function MainPage() {
  const accessToken = localStorage.getItem('accessToken')
  const username = localStorage.getItem('username')
  const name = localStorage.getItem('name')

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <main>
      <h1>메인 페이지</h1>
      <p>로그인 성공</p>
      <p>username: {username ?? '-'}</p>
      <p>name: {name ?? '-'}</p>
      <Link to="/profile">프로필 페이지로 이동</Link>
      <KakaoMap />
    </main>
  )
}

export default MainPage
