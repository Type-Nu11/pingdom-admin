import { useLocation, useNavigate } from 'react-router-dom'
import * as S from './NotFoundPage.styles'

function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const requestedPath = `${location.pathname}${location.search}${location.hash}`

  const handleGoBack = () => {
    navigate('/places', { replace: true })
  }

  return (
    <S.Page>
      <S.Content>
        <S.IconBadge aria-hidden="true">error_outline</S.IconBadge>
        <S.StatusCode>404</S.StatusCode>
        <S.Title>페이지를 찾을 수 없습니다.</S.Title>
        <S.Description>
          요청한 관리자 페이지가 없거나 주소가 잘못 입력되었습니다. 입력한
          경로를 확인하거나 이전 화면으로 돌아가 주세요.
        </S.Description>
        <S.RequestPath>
          <span>요청 경로</span>
          <strong>{requestedPath}</strong>
        </S.RequestPath>
        <S.ActionGroup>
          <S.BackButton type="button" onClick={handleGoBack}>
            이전 페이지로
          </S.BackButton>
          <S.NavLink to="/places">장소 관리로 이동</S.NavLink>
        </S.ActionGroup>
      </S.Content>
    </S.Page>
  )
}

export default NotFoundPage
