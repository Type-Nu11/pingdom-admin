import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

function SettingsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [notifyReports, setNotifyReports] = useState(true)
  const [notifyDeletes, setNotifyDeletes] = useState(true)
  const [compactMap, setCompactMap] = useState(false)
  const adminIdentifier =
    user?.username || (typeof user?.id === 'number' ? `ID ${user.id}` : '관리자 계정')

  return (
    <S.AppShell>
      <S.SideNav aria-label="관리자 메뉴">
        <S.SideHeader>
          <S.BrandLockup>
            <S.BrandLogo src="/pingdom-logo.png" alt="PingDom" />
          </S.BrandLockup>
        </S.SideHeader>

        <S.SideMenu>
          <S.MenuButton type="button" disabled aria-label="대시보드 점검 중">
            <S.MaterialIcon aria-hidden="true">dashboard</S.MaterialIcon>
            <span>대시보드</span>
            <S.MenuStatusText>점검 중</S.MenuStatusText>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/places')}>
            <S.MaterialIcon aria-hidden="true">location_on</S.MaterialIcon>
            <span>장소 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/main')}>
            <S.MaterialIcon aria-hidden="true">description</S.MaterialIcon>
            <span>게시글 관리</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/bans')}>
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
          <S.MenuButton type="button" $active>
            <S.MaterialIcon aria-hidden="true">settings</S.MaterialIcon>
            <span>설정</span>
          </S.MenuButton>
        </S.SideMenu>

        <S.SideFooter>
          <S.AdminProfile aria-label="관리자 계정">
            <S.AdminProfileIcon>
              <S.MaterialIcon aria-hidden="true">admin_panel_settings</S.MaterialIcon>
            </S.AdminProfileIcon>
            <S.AdminProfileText>
              <strong>{adminIdentifier}</strong>
              <span>관리자</span>
            </S.AdminProfileText>
          </S.AdminProfile>
          <S.LogoutButton
            type="button"
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
          >
            <S.MaterialIcon aria-hidden="true">logout</S.MaterialIcon>
            <span>로그아웃</span>
          </S.LogoutButton>
        </S.SideFooter>
      </S.SideNav>

      <S.MainArea>
        <S.TopBar>
          <S.TopTitleGroup>
            <S.TopTitle>설정</S.TopTitle>
          </S.TopTitleGroup>
          <S.TopActions>
            <S.IconButton type="button" aria-label="알림">
              <S.MaterialIcon aria-hidden="true">notifications</S.MaterialIcon>
            </S.IconButton>
            <S.IconButton type="button" aria-label="도움말">
              <S.MaterialIcon aria-hidden="true">help_outline</S.MaterialIcon>
            </S.IconButton>
          </S.TopActions>
        </S.TopBar>

        <U.Content>
          <U.PageStack>
            <U.IntroBand>
              <U.IntroText>
                <U.Eyebrow>ADMIN SETTINGS</U.Eyebrow>
                <U.IntroTitle>관리 환경을 정리하는 기본 설정 화면</U.IntroTitle>
                <U.IntroDescription>
                  관리자 계정 정보, 알림, 목록 화면 선호값을 한 화면에서 확인하는
                  초기 구조입니다.
                </U.IntroDescription>
              </U.IntroText>
              <U.StatusBadge>초기 구성</U.StatusBadge>
            </U.IntroBand>

            <U.WorkGrid>
              <U.Section>
                <U.SectionHeader>
                  <U.SectionTitle>계정 정보</U.SectionTitle>
                  <U.SecondaryButton type="button" disabled>
                    수정
                  </U.SecondaryButton>
                </U.SectionHeader>
                <U.SectionBody>
                  <U.FormGrid>
                    <U.Field>
                      관리자 ID
                      <U.FieldInput value={String(user?.id ?? '-')} readOnly />
                    </U.Field>
                    <U.Field>
                      관리자명
                      <U.FieldInput value={user?.username ?? '관리자 계정'} readOnly />
                    </U.Field>
                    <U.Field>
                      권한
                      <U.FieldInput value="ADMIN" readOnly />
                    </U.Field>
                    <U.Field>
                      세션 상태
                      <U.FieldInput value="활성" readOnly />
                    </U.Field>
                  </U.FormGrid>
                </U.SectionBody>
              </U.Section>

              <U.Section>
                <U.SectionHeader>
                  <U.SectionTitle>화면 옵션</U.SectionTitle>
                  <U.StatusBadge $tone="warning">로컬 적용</U.StatusBadge>
                </U.SectionHeader>
                <U.SectionBody>
                  <U.ToggleList>
                    <U.ToggleRow>
                      <U.ToggleText>
                        <strong>신고 알림 강조</strong>
                        <small>신고 이력이 있는 게시글을 더 빠르게 구분합니다.</small>
                      </U.ToggleText>
                      <U.ToggleInput
                        type="checkbox"
                        checked={notifyReports}
                        onChange={(event) => setNotifyReports(event.target.checked)}
                      />
                    </U.ToggleRow>
                    <U.ToggleRow>
                      <U.ToggleText>
                        <strong>삭제 처리 알림</strong>
                        <small>게시글 삭제 후 완료 상태를 화면에 유지합니다.</small>
                      </U.ToggleText>
                      <U.ToggleInput
                        type="checkbox"
                        checked={notifyDeletes}
                        onChange={(event) => setNotifyDeletes(event.target.checked)}
                      />
                    </U.ToggleRow>
                    <U.ToggleRow>
                      <U.ToggleText>
                        <strong>지도 목록 압축</strong>
                        <small>장소 관리 화면에서 목록 폭을 더 작게 사용합니다.</small>
                      </U.ToggleText>
                      <U.ToggleInput
                        type="checkbox"
                        checked={compactMap}
                        onChange={(event) => setCompactMap(event.target.checked)}
                      />
                    </U.ToggleRow>
                  </U.ToggleList>
                </U.SectionBody>
              </U.Section>
            </U.WorkGrid>

            <U.Section>
              <U.SectionHeader>
                <U.SectionTitle>운영 기본값</U.SectionTitle>
                <U.PrimaryButton type="button" disabled>
                  저장
                </U.PrimaryButton>
              </U.SectionHeader>
              <U.SectionBody>
                <U.FormGrid>
                  <U.Field>
                    게시글 기본 정렬
                    <U.FieldInput value="최신순" readOnly />
                  </U.Field>
                  <U.Field>
                    장소 기본 정렬
                    <U.FieldInput value="최신순" readOnly />
                  </U.Field>
                  <U.Field>
                    검색 지연 시간
                    <U.FieldInput value="300ms" readOnly />
                  </U.Field>
                  <U.Field>
                    지도 확대 단위
                    <U.FieldInput value="1 level" readOnly />
                  </U.Field>
                </U.FormGrid>
              </U.SectionBody>
            </U.Section>
          </U.PageStack>
        </U.Content>
      </S.MainArea>
    </S.AppShell>
  )
}

export default SettingsPage
