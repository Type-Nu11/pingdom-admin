import styled from 'styled-components'
import { typo, adminColors, radius } from '../../styles/theme'
import { BrandHomeLink } from '../../components/navigation/BrandHomeLink'
import { MaterialIcon } from '../../shared/ui/MaterialIcon'

const neutral = adminColors

export const AppShell = styled.div`
  min-height: 100vh;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family: inherit;
`

export const SideNav = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  width: 248px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid ${neutral.border};
  background: ${neutral.surface};

  @media (max-width: 900px) {
    position: static;
    width: 100%;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid ${neutral.border};
  }
`

export const SideHeader = styled.div`
  flex: 0 0 auto;
  min-height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 24px;
  border-bottom: 1px solid ${neutral.border};
`

export const BrandLockup = styled(BrandHomeLink)`
  position: relative;
  width: min(168px, 100%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`

export const BrandLogo = styled.img`
  width: 100%;
  height: auto;
  display: block;
`

export const SideMenu = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px 0;

  @media (max-width: 900px) {
    flex: 0 1 auto;
    flex-direction: row;
    overflow-y: hidden;
    overflow-x: auto;
    padding: 8px;
  }
`

export const SideFooter = styled.div`
  flex: 0 0 auto;
  padding: 18px 24px 24px;
  border-top: 1px solid ${neutral.border};

  @media (max-width: 900px) {
    padding: 8px;
  }
`

export const AdminProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
`

export const AdminProfileIcon = styled.div`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: ${neutral.primaryTint};
  color: ${neutral.primaryForeground};

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const AdminProfileText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${neutral.strongText};
    ${typo.label.bold}
  }

  span {
    color: ${neutral.muted};
    ${typo.caption.medium}
  }
`

export const LogoutButton = styled.button`
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 12px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  ${typo.label.medium}
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primaryForeground};
  }

  @media (max-width: 900px) {
    width: auto;
    padding: 0 14px;
  }
`

export const MainArea = styled.div`
  height: 100vh;
  margin-left: 248px;
  display: flex;
  overflow: hidden;
  flex-direction: column;

  @media (max-width: 900px) {
    height: auto;
    min-height: 100vh;
    margin-left: 0;
    overflow: visible;
  }
`

export const TopBar = styled.header`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-shrink: 0;
  padding: 0 32px;
  border-bottom: 1px solid ${neutral.border};
  background: ${neutral.surface};

  @media (max-width: 720px) {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    padding: 16px 24px;
  }
`

export const TopTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const TopTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  ${typo.headline2.bold}
`

export const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 720px) {
    width: 100%;
  }
`

export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primaryForeground};
  }
`

export const TopActionButton = styled.button`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  ${typo.caption.bold}
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primaryForeground};
  }

  &:disabled {
    background: ${neutral.surfaceLow};
    color: ${neutral.softText};
    cursor: not-allowed;
  }

  &:disabled:hover {
    background: ${neutral.surfaceLow};
    color: ${neutral.softText};
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`
