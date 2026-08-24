import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const AppShell = styled.div`
  height: 100vh;
  overflow: hidden;
  background: ${colors.background};
  color: ${colors.text};

  @media (max-width: 900px) {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
`

export const MaterialIcon = styled.span`
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  line-height: 1;
  font-weight: 400;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
`

export const SideNav = styled.nav`
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  width: 248px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${colors.border};
  background: ${colors.surface};

  @media (max-width: 900px) {
    position: static;
    width: 100%;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid ${colors.border};
  }
`

export const SideHeader = styled.div`
  min-height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 24px;
  border-bottom: 1px solid ${colors.border};
`

export const BrandLockup = styled.div`
  width: min(168px, 100%);
`

export const BrandLogo = styled.img`
  width: 100%;
  height: auto;
  display: block;
`

export const SideMenu = styled.div`
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
  padding: 18px 0;

  @media (max-width: 900px) {
    flex: 0 1 auto;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px;
  }
`

export const SideFooter = styled.div`
  padding: 18px 24px 24px;
  border-top: 1px solid ${colors.border};

  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
  }
`

export const MerchantProfile = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid ${colors.borderSoft};
  border-radius: 8px;
  background: ${colors.surfaceLow};

  @media (max-width: 900px) {
    flex: 1;
    margin-bottom: 0;
  }
`

export const MerchantProfileIcon = styled.div`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${colors.primarySoft};
  border-radius: 8px;
  background: ${colors.primaryTint};
  color: ${colors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
`

export const MerchantProfileText = styled.div`
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

  strong { color: ${colors.strongText}; font-size: 14px; font-weight: 700; }
  span { color: ${colors.muted}; font-size: 12px; }
`

export const LogoutButton = styled.button`
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 12px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.surface};
  color: ${colors.text};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;

  &:hover { border-color: ${colors.primary}; background: ${colors.primaryTint}; color: ${colors.primary}; }
  &:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }

  @media (max-width: 900px) {
    width: auto;
    padding: 0 14px;
  }
`

export const MainArea = styled.div`
  height: 100vh;
  margin-left: 248px;
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (max-width: 900px) {
    height: auto;
    min-height: 100vh;
    margin-left: 0;
    overflow: visible;
  }
`

export const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surface};
`

export const TopTitle = styled.h1`
  margin: 0;
  color: ${colors.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const TopContext = styled.span`
  color: ${colors.muted};
  font-size: 13px;
  font-weight: 600;
`
