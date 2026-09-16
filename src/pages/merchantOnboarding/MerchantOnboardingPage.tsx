import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantOnboarding } from '../../hooks/useMerchantOnboarding'
import * as S from './MerchantOnboardingPage.styles'
import * as Store from '../merchantStore/MerchantStorePage.styles'

const STATUS = { PENDING: '심사 대기', ACTIVE: '승인 완료', REJECTED: '반려', REVOKED: '권한 회수' }

export default function MerchantOnboardingPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { profile, status, errorMessage, fetchOnboarding } = useMerchantOnboarding()
  if (user?.role === 'MERCHANT_OWNER') return <Navigate to="/merchant" replace />
  const relogin = async () => {
    await logout()
    navigate('/login', { replace: true })
  }
  return <Store.Page>
    <Store.Header><Store.BrandLogo src="/pingdom-logo.png" alt="PingDom" /><Store.RetryButton onClick={() => void relogin()}>로그아웃</Store.RetryButton></Store.Header>
    <Store.Content>
      <Store.PageIntro><Store.PageTitle>상점주 신청</Store.PageTitle></Store.PageIntro>
      <S.Stack>
        {status === 'loading' ? <Store.Empty role="status">신청 정보를 확인하고 있습니다.</Store.Empty> : null}
        {errorMessage ? <Store.Notice $tone="error" role="alert">{errorMessage}</Store.Notice> : null}
        <S.FormActions><Store.RetryButton disabled={status === 'loading'} onClick={() => void fetchOnboarding()}>상태 새로고침</Store.RetryButton></S.FormActions>
        {status === 'ready' ? <>
          {profile ? <S.ReadonlySummary><strong>기존 상점주 신청 · {STATUS[profile.status]}</strong><span>{profile.businessName}</span><span>{profile.contactEmail} · {profile.contactPhone}</span></S.ReadonlySummary> : null}
          {profile?.status === 'ACTIVE' ? <S.ReviewState><div><strong>상점주 권한이 승인되었습니다.</strong><p>다시 로그인하면 최신 권한으로 가게 관리를 이용할 수 있습니다.</p><Store.RetryButton onClick={() => void relogin()}>다시 로그인</Store.RetryButton></div></S.ReviewState> : <>
            <S.IntroNotice><strong>운영할 장소를 신청해주세요.</strong><span>사업자 정보와 증빙을 장소 신청서에 함께 제출합니다. 기존 신청의 대기·반려 상태는 유지됩니다.</span></S.IntroNotice>
            <S.FormActions>
              <Store.RetryButton onClick={() => navigate('/merchant/place-application')}>기존 장소 신청·내역</Store.RetryButton>
              <Store.RetryButton onClick={() => navigate('/merchant/place-registration')}>신규 장소 신청·내역</Store.RetryButton>
            </S.FormActions>
          </>}
        </> : null}
      </S.Stack>
    </Store.Content>
  </Store.Page>
}
