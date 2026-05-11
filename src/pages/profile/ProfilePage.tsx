import { Navigate } from 'react-router-dom'
import { useChangePassword } from '../../hooks/useChangePassword'
import { useChangeUsername } from '../../hooks/useChangeUsername'
import { useUserProfile } from '../../hooks/useUserProfile'
import {
  ChangePasswordSection,
  ChangeUsernameSection,
  ProfileInfoSection,
} from './ProfilePage.sections'
import * as S from './ProfilePage.styles'

function ProfilePage() {
  const accessToken = localStorage.getItem('accessToken')
  const profileState = useUserProfile()
  const changeUsernameState = useChangeUsername()
  const changePasswordState = useChangePassword()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <S.Page>
      <S.Container>
        <S.Header>
          <div>
            <S.HeaderTitle>프로필</S.HeaderTitle>
            <S.Description>내 계정 정보를 확인할 수 있습니다.</S.Description>
          </div>

          <S.NavLink to="/main">메인으로 이동</S.NavLink>
        </S.Header>

        <ProfileInfoSection
          profile={profileState.profile}
          isLoading={profileState.isLoading}
          isError={profileState.isError}
          errorMessage={profileState.errorMessage}
          onRefresh={() => {
            void profileState.fetchUserProfile()
          }}
        />
        <ChangeUsernameSection
          {...changeUsernameState}
          onSuccess={() => {
            void profileState.fetchUserProfile()
          }}
        />
        <ChangePasswordSection {...changePasswordState} />
      </S.Container>
    </S.Page>
  )
}

export default ProfilePage
