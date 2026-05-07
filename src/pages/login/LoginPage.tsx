import { useNavigate } from 'react-router-dom'
import { useLogin } from '../../hooks/useLogin'

function LoginPage() {
  const navigate = useNavigate()
  const {
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    isError,
    errorMessage,
    handleLogin,
  } = useLogin()

  return (
    <main>
      <h1>로그인</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const isSuccess = await handleLogin()

          if (isSuccess) {
            navigate('/main')
          }
        }}
      >
        <div>
          <label htmlFor="username">아이디</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>

        {isError && errorMessage ? <p>{errorMessage}</p> : null}

        <button type="submit" disabled={isLoading}>
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
