import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type LoginMode } from '../../api/authApi'
import { useAuth } from '../../hooks/useAuth'
import { useLogin } from '../../hooks/useLogin'
import * as S from './LoginPage.styles'

const ROLE_OPTIONS: Array<{
  mode: LoginMode
  icon: string
  title: string
}> = [
  {
    mode: 'admin',
    icon: 'admin_panel_settings',
    title: '관리자',
  },
  {
    mode: 'merchant',
    icon: 'storefront',
    title: '상점주',
  },
]

function LoginPage() {
  const navigate = useNavigate()
  const { clearAuth, isAuthenticated, isAuthReady, user } = useAuth()
  const [selectedMode, setSelectedMode] = useState<LoginMode | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [merchantLoginComplete, setMerchantLoginComplete] = useState(false)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const isMerchantSession = isAuthenticated && user?.role === 'MERCHANT_OWNER'
  const activeMode = selectedMode ?? (isMerchantSession ? 'merchant' : null)
  const loginMode = activeMode ?? 'admin'
  const {
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    isError,
    errorMessage,
    handleLogin,
  } = useLogin(loginMode)
  const isSubmitting = isLoading || isRedirecting
  const isAdminSession =
    isAuthenticated && (!user?.role || user.role === 'ADMIN')

  useEffect(() => {
    if (isAuthReady && isAdminSession) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAdminSession, isAuthReady, navigate])

  const selectMode = (mode: LoginMode) => {
    if (isMerchantSession && mode === 'admin') {
      clearAuth()
    }

    setMerchantLoginComplete(false)
    setShowPassword(false)
    setSelectedMode(mode)
  }

  if (
    activeMode === 'merchant' &&
    (merchantLoginComplete || isMerchantSession)
  ) {
    return (
      <S.Page>
        <S.CenterShell>
          <S.BrandHeader>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </S.BrandHeader>
          <S.SuccessCard>
            <S.SuccessIconBox>
              <S.MaterialIcon aria-hidden="true">check</S.MaterialIcon>
            </S.SuccessIconBox>
            <S.SuccessTitle>상점주 로그인이 완료됐어요</S.SuccessTitle>
            <S.SuccessDescription>
              상점주 포털을 준비 중입니다. 서비스가 열리면
              <br />이 계정으로 바로 이용할 수 있어요.
            </S.SuccessDescription>
          </S.SuccessCard>
        </S.CenterShell>
      </S.Page>
    )
  }

  return (
    <S.Page>
      <S.StartShell>
        <S.BrandHeader>
          <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
        </S.BrandHeader>

        {activeMode ? (
          <S.WelcomeHeader>
            <S.Title>다시 만나서 반가워요</S.Title>
            <S.Description>
              {`${activeMode === 'admin' ? '관리자' : '상점주'} 계정으로 안전하게 시작하세요.`}
            </S.Description>
          </S.WelcomeHeader>
        ) : null}

        {activeMode === null ? (
          <S.RoleGrid aria-label="로그인 역할 선택">
            {ROLE_OPTIONS.map((role) => (
              <S.RoleCard
                key={role.mode}
                type="button"
                $mode={role.mode}
                onClick={() => selectMode(role.mode)}
              >
                <S.RoleCardContent>
                  <S.RoleTitle>{role.title}</S.RoleTitle>
                </S.RoleCardContent>
                <S.RoleArtwork $mode={role.mode}>
                  <S.ArtworkCircle $position="top" />
                  <S.ArtworkCircle $position="bottom" />
                  <S.MaterialIcon aria-hidden="true">{role.icon}</S.MaterialIcon>
                </S.RoleArtwork>
                <S.RoleCta $mode={role.mode}>
                  로그인
                  <S.MaterialIcon aria-hidden="true">chevron_right</S.MaterialIcon>
                </S.RoleCta>
              </S.RoleCard>
            ))}
          </S.RoleGrid>
        ) : (
          <>
            <S.LoginPanel>
            <S.RoleSwitcher aria-label="로그인 역할 전환">
              {ROLE_OPTIONS.map((role) => (
                <S.RoleSwitch
                  key={role.mode}
                  type="button"
                  $active={activeMode === role.mode}
                  onClick={() => selectMode(role.mode)}
                >
                  <S.MaterialIcon aria-hidden="true">{role.icon}</S.MaterialIcon>
                  {role.mode === 'admin' ? '관리자' : '상점주'}
                </S.RoleSwitch>
              ))}
            </S.RoleSwitcher>
            <S.Form
              onKeyDownCapture={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
                  return
                }

                event.preventDefault()

                if (!isSubmitting) {
                  event.currentTarget.requestSubmit()
                }
              }}
              onSubmit={async (event) => {
                event.preventDefault()

                if (isSubmitting) {
                  return
                }

                const result = await handleLogin()

                if (result === 'success') {
                  if (loginMode === 'admin') {
                    setIsRedirecting(true)
                  } else {
                    setMerchantLoginComplete(true)
                  }
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
                <S.Label htmlFor="username">
                  {loginMode === 'admin' ? '관리자 아이디' : '상점주 아이디'}
                </S.Label>
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
                      : '로그인하기'}
                </span>
                {!isSubmitting ? (
                  <S.MaterialIcon aria-hidden="true">arrow_forward</S.MaterialIcon>
                ) : null}
              </S.SubmitButton>
            </S.Form>
            </S.LoginPanel>
            <S.BackButton
              type="button"
              onClick={() => {
                setSelectedMode(null)
                setShowPassword(false)
                setIsRedirecting(false)
              }}
            >
              <S.MaterialIcon aria-hidden="true">arrow_back</S.MaterialIcon>
              돌아가기
            </S.BackButton>
          </>
        )}

        <S.FooterText>
          도움이 필요하신가요? <S.FooterLink href="#support">고객센터에 문의하기</S.FooterLink>
        </S.FooterText>
      </S.StartShell>
    </S.Page>
  )
}

export default LoginPage
