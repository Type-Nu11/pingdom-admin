import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../../hooks/useLogin'
import { useAuth } from '../../hooks/useAuth'
import * as S from './LoginPage.styles'

function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isAuthReady } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
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
  const isSubmitting = isLoading || isRedirecting

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthReady, isAuthenticated, navigate])

  return (
    <S.Page>
      <S.LoginCard>
        <S.Header>
          <S.IconBox>
            <S.MaterialIcon aria-hidden="true">shield_lock</S.MaterialIcon>
          </S.IconBox>
          <S.Title>관리자 로그인</S.Title>
          <S.Description>
            발급받은 관리자 계정으로 로그인해 주세요.
          </S.Description>
        </S.Header>

        <S.Form
          onSubmit={async (event) => {
            event.preventDefault()

            if (isSubmitting) {
              return
            }

            const result = await handleLogin()

            if (result === 'success') {
              setIsRedirecting(true)
              return
            }

            if (result === 'username-required') {
              usernameInputRef.current?.focus()
              return
            }

            if (result === 'password-required' || result === 'credential-error') {
              passwordInputRef.current?.focus()
            }
          }}
        >
          <S.Field>
            <S.Label htmlFor="username">관리자 아이디</S.Label>
            <S.InputWrap>
              <S.InputIcon aria-hidden="true">person</S.InputIcon>
              <S.Input
                id="username"
                ref={usernameInputRef}
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="아이디를 입력해주세요"
              />
            </S.InputWrap>
          </S.Field>

          <S.Field>
            <S.Label htmlFor="password">비밀번호</S.Label>
            <S.InputWrap>
              <S.InputIcon aria-hidden="true">key</S.InputIcon>
              <S.Input
                id="password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호를 입력해주세요"
                $hasEndAction
              />
              <S.PasswordToggleButton
                type="button"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                aria-pressed={showPassword}
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <S.MaterialIcon aria-hidden="true">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </S.MaterialIcon>
              </S.PasswordToggleButton>
            </S.InputWrap>
          </S.Field>

          <S.ErrorMessageSlot aria-live="polite">
            {isError && errorMessage ? (
              <S.ErrorMessage role="alert">{errorMessage}</S.ErrorMessage>
            ) : null}
          </S.ErrorMessageSlot>

          <S.SubmitButton type="submit" disabled={isSubmitting}>
            <span>
              {isRedirecting
                ? '관리자 정보를 불러오는 중...'
                : isLoading
                  ? '로그인 중...'
                  : '로그인'}
            </span>
          </S.SubmitButton>
        </S.Form>

        <S.FooterText>PingDom Admin</S.FooterText>
      </S.LoginCard>
    </S.Page>
  )
}

export default LoginPage
