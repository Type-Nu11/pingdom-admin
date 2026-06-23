import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import * as U from '../adminUtility/AdminUtilityPage.styles'
import * as S from '../place/PlaceManagePage.styles'

const BAN_POLICIES = [
  {
    icon: 'person_off',
    title: '사용자 단위 제재',
    description: '계정 ID 기준으로 임시 정지와 영구 정지를 분리합니다.',
  },
  {
    icon: 'history',
    title: '처리 이력 보존',
    description: '제재 사유, 담당자, 처리 시점을 한 화면에서 확인합니다.',
  },
  {
    icon: 'rule',
    title: '해제 검토',
    description: '해제 요청이 들어오면 상태별로 따로 검토합니다.',
  },
]

function UserBanPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
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
          <S.MenuButton type="button" $active>
            <S.MaterialIcon aria-hidden="true">block</S.MaterialIcon>
            <span>사용자 밴</span>
          </S.MenuButton>
          <S.MenuButton type="button" onClick={() => navigate('/settings')}>
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
            <S.TopTitle>사용자 밴</S.TopTitle>
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
                <U.Eyebrow>USER MODERATION</U.Eyebrow>
                <U.IntroTitle>제재 대상 사용자를 빠르게 확인하는 화면</U.IntroTitle>
                <U.IntroDescription>
                  사용자 ID와 닉네임을 기준으로 밴 상태를 확인하고, 처리 사유와 해제
                  검토 흐름을 한 곳에 모으는 초기 구조입니다.
                </U.IntroDescription>
              </U.IntroText>
              <U.StatusBadge>초기 구성</U.StatusBadge>
            </U.IntroBand>

            <U.SummaryGrid>
              <U.MetricItem>
                <U.MetricLabel>현재 밴 사용자</U.MetricLabel>
                <U.MetricValue>0</U.MetricValue>
                <U.MetricHint>API 연동 후 실시간 집계</U.MetricHint>
              </U.MetricItem>
              <U.MetricItem>
                <U.MetricLabel>해제 검토</U.MetricLabel>
                <U.MetricValue>0</U.MetricValue>
                <U.MetricHint>처리 대기 상태 기준</U.MetricHint>
              </U.MetricItem>
              <U.MetricItem>
                <U.MetricLabel>최근 처리</U.MetricLabel>
                <U.MetricValue>-</U.MetricValue>
                <U.MetricHint>담당자 이력 표시 예정</U.MetricHint>
              </U.MetricItem>
            </U.SummaryGrid>

            <U.WorkGrid>
              <U.Section>
                <U.SectionHeader>
                  <U.SectionTitle>밴 내역</U.SectionTitle>
                  <U.SecondaryButton type="button" disabled>
                    <S.MaterialIcon aria-hidden="true">add</S.MaterialIcon>
                    밴 등록
                  </U.SecondaryButton>
                </U.SectionHeader>
                <U.SectionBody>
                  <U.Toolbar>
                    <U.SearchInput
                      type="search"
                      placeholder="사용자 ID 또는 닉네임 검색"
                      aria-label="사용자 ID 또는 닉네임 검색"
                    />
                    <U.PrimaryButton type="button" disabled>
                      검색
                    </U.PrimaryButton>
                  </U.Toolbar>
                  <U.TableWrap>
                    <U.Table>
                      <thead>
                        <tr>
                          <U.TableHeadCell>사용자</U.TableHeadCell>
                          <U.TableHeadCell>상태</U.TableHeadCell>
                          <U.TableHeadCell>사유</U.TableHeadCell>
                          <U.TableHeadCell>처리일</U.TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <U.EmptyRow colSpan={4}>표시할 밴 내역이 없습니다.</U.EmptyRow>
                        </tr>
                      </tbody>
                    </U.Table>
                  </U.TableWrap>
                </U.SectionBody>
              </U.Section>

              <U.Section>
                <U.SectionHeader>
                  <U.SectionTitle>처리 기준</U.SectionTitle>
                  <U.StatusBadge $tone="warning">검토 필요</U.StatusBadge>
                </U.SectionHeader>
                <U.SectionBody>
                  <U.PolicyList>
                    {BAN_POLICIES.map((policy) => (
                      <U.PolicyItem key={policy.title}>
                        <U.PolicyIcon>
                          <S.MaterialIcon aria-hidden="true">{policy.icon}</S.MaterialIcon>
                        </U.PolicyIcon>
                        <U.PolicyText>
                          <strong>{policy.title}</strong>
                          <span>{policy.description}</span>
                        </U.PolicyText>
                      </U.PolicyItem>
                    ))}
                  </U.PolicyList>
                </U.SectionBody>
              </U.Section>
            </U.WorkGrid>
          </U.PageStack>
        </U.Content>
      </S.MainArea>
    </S.AppShell>
  )
}

export default UserBanPage
