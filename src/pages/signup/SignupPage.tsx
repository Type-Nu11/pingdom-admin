import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSignup } from '../../hooks/useSignup'

function SignupPage() {
  const [isSuccess, setIsSuccess] = useState(false)
  const {
    username,
    setUsername,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    isError,
    errorMessage,
    fieldErrors,
    handleSignup,
  } = useSignup()

  return (
    <main>
      <div
        style={{
          maxWidth: '420px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 8px' }}>회원가입</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            아이디, 이름, 이메일, 비밀번호를 입력해주세요.
          </p>
        </div>

        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          onSubmit={async (event) => {
            event.preventDefault()
            setIsSuccess(false)

            const result = await handleSignup()

            if (result) {
              setIsSuccess(true)
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />
            {fieldErrors.username ? (
              <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
                {fieldErrors.username}
              </p>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />
            {fieldErrors.name ? (
              <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />
            {fieldErrors.email ? (
              <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
            />
            {fieldErrors.password ? (
              <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          {isError && errorMessage ? (
            <p
              style={{
                margin: 0,
                padding: '12px',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#b91c1c',
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          {isSuccess ? (
            <p
              style={{
                margin: 0,
                padding: '12px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#047857',
              }}
            >
              회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px',
              border: 0,
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p style={{ margin: 0, color: '#6b7280' }}>
          이미 계정이 있나요? <Link to="/login">로그인하러 가기</Link>
        </p>
      </div>
    </main>
  )
}

export default SignupPage
