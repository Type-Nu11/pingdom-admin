import * as S from './NotFoundPage.styles'

function NotFoundPage() {
  return (
    <S.Page>
      <S.Content>
        <S.StatusCode>404</S.StatusCode>
        <S.Title>페이지를 찾을 수 없습니다.</S.Title>
        <S.Description>
          요청한 관리자 페이지가 없거나 이동된 경로입니다.
        </S.Description>
        <S.NavLink to="/main">메인으로 이동</S.NavLink>
      </S.Content>
    </S.Page>
  )
}

export default NotFoundPage
