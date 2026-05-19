import { Link } from 'react-router-dom'
import KakaoMap from '../../components/map/KakaoMap'
import { useAuth } from '../../hooks/useAuth'

function MainPage() {
  const { user } = useAuth()

  return (
    <main>
      <h1>메인 페이지</h1>
      <p>로그인 성공</p>
      <p>username: {user?.username || '-'}</p>
      <p>name: {user?.name || '-'}</p>
      <Link to="/profile">프로필 페이지로 이동</Link>
      <KakaoMap />
    </main>
  )
}

export default MainPage
