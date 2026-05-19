import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmailVerification } from '../../hooks/useEmailVerification'
import { useSignup } from '../../hooks/useSignup'

function SignupPage() {
  const [isSignupSuccess, setIsSignupSuccess] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
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
  const {
    code,
    setCode,
    isLoading: isVerifyLoading,
    isError: isVerifyError,
    errorMessage: verifyErrorMessage,
    isSuccess: isEmailVerificationSuccess,
    resetEmailVerification,
    handleVerifyEmail,
  } = useEmailVerification()

  const handleEditSignupInfo = () => {
    setIsSignupSuccess(false)
    setSignupEmail('')
    resetEmailVerification()
  }

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
            setIsSignupSuccess(false)

            const result = await handleSignup()

            if (result) {
              setSignupEmail(email.trim())
              setIsSignupSuccess(true)
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
              disabled={isSignupSuccess}
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
              disabled={isSignupSuccess}
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
              disabled={isSignupSuccess}
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
              disabled={isSignupSuccess}
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

          {isSignupSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p
                style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#047857',
                }}
              >
                회원가입이 완료되었습니다. 이메일로 받은 인증 코드를 입력해주세요.
              </p>

              <button
                type="button"
                onClick={handleEditSignupInfo}
                disabled={isVerifyLoading}
                style={{
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: isVerifyLoading ? 'default' : 'pointer',
                }}
              >
                정보 수정
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="verification-code">인증 코드</label>
                <input
                  id="verification-code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                />
              </div>

              {isVerifyError && verifyErrorMessage ? (
                <p
                  style={{
                    margin: 0,
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#b91c1c',
                  }}
                >
                  {verifyErrorMessage}
                </p>
              ) : null}

              {isEmailVerificationSuccess ? (
                <p
                  style={{
                    margin: 0,
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                  }}
                >
                  이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.
                </p>
              ) : null}

              <button
                type="button"
                disabled={isVerifyLoading}
                onClick={() => {
                  void handleVerifyEmail(signupEmail)
                }}
                style={{
                  padding: '12px',
                  border: 0,
                  borderRadius: '8px',
                  background: '#111827',
                  color: '#ffffff',
                  cursor: isVerifyLoading ? 'default' : 'pointer',
                }}
              >
                {isVerifyLoading ? '인증 중...' : '이메일 인증'}
              </button>
            </div>
          ) : null}

          {!isSignupSuccess ? (
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
          ) : null}
        </form>

        <p style={{ margin: 0, color: '#6b7280' }}>
          이미 계정이 있나요? <Link to="/login">로그인하러 가기</Link>
        </p>
      </div>
    </main>
  )
}

export default SignupPage
