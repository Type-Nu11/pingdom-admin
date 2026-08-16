import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as S from '../login/LoginPage.styles'

function MerchantPreparationPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  return <S.Page><S.CenterShell><S.BrandHeader><S.BrandLogo src="/pingdom-logo.png" alt="PingDom" /></S.BrandHeader><S.SuccessCard><S.SuccessIconBox><S.MaterialIcon aria-hidden="true">storefront</S.MaterialIcon></S.SuccessIconBox><S.SuccessTitle>상점주 포털을 준비 중입니다</S.SuccessTitle><S.SuccessDescription>{user?.username || '상점주'} 계정으로 로그인했습니다.<br />관리자 전용 화면에는 접근할 수 없습니다.</S.SuccessDescription><S.SubmitButton type="button" onClick={() => { void logout(); navigate('/login', { replace: true }) }}><span>로그아웃</span><S.MaterialIcon aria-hidden="true">logout</S.MaterialIcon></S.SubmitButton></S.SuccessCard></S.CenterShell></S.Page>
}
export default MerchantPreparationPage
