import type { ElementType, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminNavigationMenu } from '../../components/navigation/AdminNavigationMenu'
import { ADMIN_MAIN_SCROLL_AREA_ID } from '../../constants/layout'
import { useAuth } from '../../hooks/useAuth'
import { MaterialIcon } from '../../shared/ui/MaterialIcon'
import { WorkspaceFrame, type WorkspaceFrameParts } from './WorkspaceFrame'
import * as Shell from './AdminShell.styles'

type SidebarPart = 'SideNav' | 'SideHeader' | 'BrandLockup' | 'BrandLogo' | 'SideMenu'
  | 'SideFooter' | 'AdminProfile' | 'AdminProfileIcon' | 'AdminProfileText' | 'LogoutButton'
type AdminLayoutParts = WorkspaceFrameParts & Record<SidebarPart, ElementType>

const defaultParts: AdminLayoutParts = {
  AppShell: Shell.AppShell, MainArea: Shell.MainArea, TopBar: Shell.TopBar,
  SideNav: Shell.SideNav, SideHeader: Shell.SideHeader, BrandLockup: Shell.BrandLockup,
  BrandLogo: Shell.BrandLogo, SideMenu: Shell.SideMenu, SideFooter: Shell.SideFooter,
  AdminProfile: Shell.AdminProfile, AdminProfileIcon: Shell.AdminProfileIcon,
  AdminProfileText: Shell.AdminProfileText, LogoutButton: Shell.LogoutButton,
}

type Props = {
  identifier: string
  profileLabel?: string
  profileAppearance?: 'standard' | 'text'
  parts?: AdminLayoutParts
  icon?: ElementType
  header: ReactNode
  children: ReactNode
  overlays?: ReactNode
}

// Used at the existing page boundary, not as a new persistent route/provider.
export function AdminLayout({ identifier, profileLabel, profileAppearance = 'standard',
  parts: S = defaultParts, icon: Icon = MaterialIcon, header, children, overlays }: Props) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  return (
    <WorkspaceFrame parts={S} mainId={ADMIN_MAIN_SCROLL_AREA_ID} header={header} overlays={overlays}
      sidebar={
        <S.SideNav aria-label="관리자 메뉴">
          <S.SideHeader>
            <S.BrandLockup>
              <S.BrandLogo src={`${import.meta.env.BASE_URL}pingdom-logo.png`} alt="PingDom" />
            </S.BrandLockup>
          </S.SideHeader>
          <S.SideMenu><AdminNavigationMenu /></S.SideMenu>
          <S.SideFooter>
            <S.AdminProfile aria-label={profileLabel}>
              {profileAppearance === 'standard' ? <S.AdminProfileIcon>
                <Icon aria-hidden="true">admin_panel_settings</Icon>
              </S.AdminProfileIcon> : null}
              <S.AdminProfileText><strong>{identifier}</strong><span>관리자</span></S.AdminProfileText>
            </S.AdminProfile>
            <S.LogoutButton type="button" onClick={handleLogout}>
              {profileAppearance === 'standard' ? <><Icon aria-hidden="true">logout</Icon><span>로그아웃</span></> : '로그아웃'}
            </S.LogoutButton>
          </S.SideFooter>
        </S.SideNav>
      }>
      {children}
    </WorkspaceFrame>
  )
}
