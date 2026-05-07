import { Navigate } from 'react-router-dom'

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
    </main>
  )
}

export default MainPage
