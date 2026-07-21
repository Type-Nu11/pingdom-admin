import styled, { css, keyframes } from 'styled-components'
import { adminColors } from '../../styles/theme'

const neutral = adminColors
const loadingShimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`
const refreshSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export const AppShell = styled.div`
  height: 100vh;
  overflow: hidden;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family: inherit;

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
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
`

export const SideNav = styled.nav`
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  width: 248px;
  display: flex;
  flex-direction: column;
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
  min-height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 24px;
  border-bottom: 1px solid ${neutral.border};
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
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 18px 0;

  @media (max-width: 900px) {
    flex: 0 1 auto;
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
  }
`

export const MenuButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  border: 0;
  border-right: 2px solid transparent;
  background: transparent;
  color: ${({ $active }) => ($active ? neutral.primary : neutral.muted)};
  font: inherit;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  ${({ $active }) =>
    $active &&
    css`
      border-right-color: ${neutral.primary};
      background: ${neutral.primaryTint};

      ${MaterialIcon} {
        font-variation-settings:
          'FILL' 1,
          'wght' 400,
          'GRAD' 0,
          'opsz' 20;
      }
    `}

  @media (max-width: 900px) {
    width: auto;
    flex-shrink: 0;
    border-right: 0;
    border-bottom: 2px solid transparent;
    border-radius: 8px;

    ${({ $active }) =>
      $active &&
      css`
        border-bottom-color: ${neutral.primary};
      `}
  }
`

export const SideFooter = styled.div`
  padding: 18px 24px 24px;
  border-top: 1px solid ${neutral.border};

  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
  }
`

export const AdminProfile = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  @media (max-width: 900px) {
    flex: 1;
    margin-bottom: 0;
  }
`

export const AdminProfileIcon = styled.div`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 8px;
  background: ${neutral.primaryTint};
  color: ${neutral.primary};

  ${MaterialIcon} { font-size: 18px; }
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

  strong { color: ${neutral.strongText}; font-size: 14px; font-weight: 700; }
  span { color: ${neutral.muted}; font-size: 12px; }
`

export const LogoutButton = styled.button`
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover { border-color: ${neutral.primary}; color: ${neutral.primary}; }

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
  border-bottom: 1px solid ${neutral.border};
  background: ${neutral.surface};
`

export const TopTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover { background: ${neutral.primaryTint}; color: ${neutral.primary}; }
`

export const PageContent = styled.main`
  width: min(calc(100% - 64px), 1100px);
  min-height: calc(100vh - 64px);
  margin: 0 auto;
  padding: 36px 0 48px;

  @media (max-width: 640px) {
    width: calc(100% - 32px);
    padding: 28px 0 36px;
  }
`

export const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
`

export const PageHeaderMain = styled.div`
  min-width: 0;
`

export const PageTitle = styled.h1`
  margin: 0 0 6px;
  color: ${neutral.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
`

export const PageDescription = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 16px;
  line-height: 1.5;
`

export const UpdateMeta = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin: 0;
  color: ${neutral.softText};
  font-size: 13px;
`

export const RefreshingText = styled.span`
  color: ${neutral.primary};
  font-weight: 600;
`

export const Section = styled.section`
  margin-top: 0;

  & + & {
    margin-top: 40px;
  }
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
`

export const SectionDescription = styled.p`
  margin: 0;
  color: ${neutral.softText};
  font-size: 13px;
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`

export const PlaceholderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

export const SummaryCard = styled.button<{ $tone?: 'neutral' | 'action' }>`
  min-height: 136px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  padding: 18px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${({ $tone }) => ($tone === 'action' ? neutral.surfaceHighest : neutral.surface)};
  color: ${neutral.text};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    border-color: ${({ $tone }) => ($tone === 'action' ? neutral.warning : neutral.primary)};
    background: ${neutral.surface};
  }

  &:focus-visible {
    outline: 3px solid ${neutral.primarySoft};
    outline-offset: 2px;
  }
`

export const SummaryCardTop = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
`

export const SummaryIcon = styled.div<{ $tone?: 'neutral' | 'action' }>`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${({ $tone }) => ($tone === 'action' ? neutral.warningTint : neutral.primaryTint)};
  color: ${({ $tone }) => ($tone === 'action' ? neutral.warningText : neutral.primary)};
`

export const SummaryArrow = styled(MaterialIcon)`
  color: ${neutral.softText};
  font-size: 18px;
  transition: color 160ms ease;

  ${SummaryCard}:hover & {
    color: ${neutral.primary};
  }
`

export const SummaryLabel = styled.span`
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 600;
`

export const SummaryValue = styled.strong`
  margin-top: auto;
  color: ${neutral.strongText};
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
`

export const Skeleton = styled.span`
  width: 76px;
  height: 28px;
  display: inline-block;
  border-radius: 4px;
  background: linear-gradient(90deg, ${neutral.surfaceContainer} 25%, ${neutral.surfaceHigh} 50%, ${neutral.surfaceContainer} 75%);
  background-size: 200% 100%;
  animation: ${loadingShimmer} 1.2s infinite;
`

export const StatusPanel = styled.div<{ $tone?: 'neutral' | 'error' | 'success' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${({ $tone }) => ($tone === 'error' ? neutral.error : neutral.border)};
  border-radius: 8px;
  background: ${({ $tone }) => ($tone === 'error' ? neutral.errorTint : neutral.surface)};
  color: ${({ $tone }) => ($tone === 'error' ? neutral.error : neutral.muted)};
`

export const StatusText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong { color: ${neutral.strongText}; font-size: 14px; font-weight: 700; }
  span { color: ${neutral.muted}; font-size: 13px; line-height: 1.5; }
`

export const RetryButton = styled.button`
  min-height: 36px;
  margin-left: auto;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover { border-color: ${neutral.primary}; color: ${neutral.primary}; }
`

export const RefreshButton = styled.button<{ $isLoading?: boolean }>`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${neutral.muted};
  font: inherit;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${neutral.primaryTint}; color: ${neutral.primary}; }
  &:disabled { color: ${neutral.disabled}; cursor: default; }

  &:focus-visible {
    outline: 3px solid ${neutral.primarySoft};
    outline-offset: 2px;
  }

  ${({ $isLoading }) =>
    $isLoading &&
    css`
      ${MaterialIcon} { animation: ${refreshSpin} 900ms linear infinite; }
    `}
`
