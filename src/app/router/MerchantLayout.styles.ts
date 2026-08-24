import styled from 'styled-components'
import { adminColors } from '../../styles/theme'

const colors = adminColors

export const AppShell = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  background: ${colors.background};

  @media (max-width: 920px) {
    display: block;
  }
`

export const SideNav = styled.aside`
  min-height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${colors.border};
  background: ${colors.surface};

  @media (max-width: 920px) {
    min-height: auto;
    position: sticky;
    z-index: 30;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
    border-right: 0;
    border-bottom: 1px solid ${colors.border};
  }

  @media (max-width: 560px) {
    grid-template-columns: auto 1fr;
    gap: 10px;
    padding: 8px 16px;
  }
`

export const SideHeader = styled.div`
  min-height: 96px;
  display: flex;
  align-items: center;
  padding: 0 22px;
  border-bottom: 1px solid ${colors.borderSoft};

  @media (max-width: 920px) {
    min-height: 0;
    padding: 0;
    border-bottom: 0;
  }
`

export const BrandLockup = styled.div`
  display: grid;
  gap: 5px;
`

export const BrandLogo = styled.img`
  width: 114px;
  height: auto;
  display: block;

  @media (max-width: 560px) {
    width: 98px;
  }
`

export const BrandLabel = styled.span`
  padding-left: 2px;
  color: ${colors.muted};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
`

export const SideMenu = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;

  @media (max-width: 920px) {
    min-height: auto;
    overflow: visible;
    padding: 0;
  }
`

export const SideFooter = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px;
  border-top: 1px solid ${colors.borderSoft};

  @media (max-width: 920px) {
    grid-column: 3;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    border-top: 0;
  }

  @media (max-width: 560px) {
    grid-column: 2;
    justify-self: end;
  }
`

export const MerchantProfile = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  background: ${colors.surfaceLow};

  @media (max-width: 920px) {
    display: none;
  }
`

export const MerchantProfileIcon = styled.span`
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${colors.primaryTint};
  color: ${colors.primary};
  font-family: 'Material Symbols Outlined';
  font-size: 18px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const MerchantProfileText = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;

  strong {
    overflow: hidden;
    color: ${colors.text};
    font-size: 13px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${colors.muted};
    font-size: 11px;
  }
`

export const LogoutButton = styled.button`
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${colors.border};
  border-radius: 6px;
  background: ${colors.surface};
  color: ${colors.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${colors.primarySoft};
    background: ${colors.primaryTint};
    color: ${colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: 920px) {
    width: 38px;
    padding: 0;

    span:last-child {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  }
`

export const MaterialIcon = styled.span`
  font-family: 'Material Symbols Outlined';
  font-size: 19px;
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
`

export const MainArea = styled.div`
  min-width: 0;
  min-height: 100vh;
  overflow: auto;
  background: ${colors.background};

  @media (max-width: 920px) {
    min-height: calc(100vh - 62px);
  }
`
