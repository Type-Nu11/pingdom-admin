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
  position: relative;
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

  &:focus-visible {
    outline: 3px solid ${neutral.primarySoft};
    outline-offset: 2px;
  }
`

export const UtilityPanel = styled.div`
  position: absolute;
  top: 44px;
  right: 0;
  z-index: 60;
  width: min(280px, calc(100vw - 32px));
  padding: 14px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
  box-shadow: 0 8px 24px ${neutral.shadow};
`

export const UtilityPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong {
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 600;
  }
`

export const UtilityPanelClose = styled.button`
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${neutral.softText};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceLow};
    color: ${neutral.text};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  ${MaterialIcon} { font-size: 18px; }
`

export const UtilityPanelText = styled.p`
  margin: 10px 0 0;
  color: ${neutral.muted};
  font-size: 13px;
  line-height: 1.5;
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

export const PlaceholderSection = styled(Section)`
  margin-top: 48px;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const OperationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

export const OperationsPanel = styled.section<{ $tone?: 'neutral' | 'action' }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 18px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${({ $tone }) => ($tone === 'action' ? neutral.surfaceHighest : neutral.surface)};
`

export const OperationsPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

export const OperationsPanelTitle = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: ${neutral.strongText};
  font-size: 15px;
  font-weight: 700;
`

export const PanelCount = styled.span`
  color: ${neutral.softText};
  font-size: 12px;
  font-weight: 500;
`

export const PanelUpdatingText = styled.span`
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 600;
`

export const ActivityGroups = styled.div`
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  scrollbar-width: thin;
  scrollbar-color: ${neutral.border} transparent;
`

export const ActivityGroup = styled.div`
  min-width: 0;
`

export const ActivityGroupTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  color: ${neutral.softText};
  font-size: 12px;
  font-weight: 600;
`

export const ActivityGroupCount = styled.span`
  color: ${neutral.disabled};
  font-size: 11px;
  font-weight: 500;
`

export const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const ActivityItem = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid ${neutral.borderSoft};

  &:last-child {
    border-bottom: 0;
  }
`

export const ActivityItemMain = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${neutral.text};
    font-size: 13px;
    font-weight: 600;
  }

  span {
    color: ${neutral.softText};
    font-size: 12px;
  }
`

export const ActivityItemDate = styled.time`
  flex-shrink: 0;
  color: ${neutral.softText};
  font-size: 11px;
`

export const ActivityBadge = styled.span<{
  $tone: 'neutral' | 'success' | 'warning' | 'error'
}>`
  flex-shrink: 0;
  padding: 3px 6px;
  border-radius: 6px;
  background: ${({ $tone }) => {
    if ($tone === 'success') return neutral.successTint
    if ($tone === 'warning') return neutral.warningTint
    if ($tone === 'error') return neutral.errorTint
    return neutral.surfaceContainer
  }};
  color: ${({ $tone }) => {
    if ($tone === 'success') return neutral.successText
    if ($tone === 'warning') return neutral.warningText
    if ($tone === 'error') return neutral.error
    return neutral.softText
  }};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
`

export const PendingList = styled.div`
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  scrollbar-width: thin;
  scrollbar-color: ${neutral.border} transparent;
`

export const PendingItem = styled.button`
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border: 0;
  border-bottom: 1px solid ${neutral.borderSoft};
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 3px solid ${neutral.primarySoft};
    outline-offset: 3px;
    border-radius: 6px;
  }
`

export const PendingItemMain = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: ${neutral.text};
    font-size: 13px;
    font-weight: 600;
  }

  span {
    color: ${neutral.warningText};
    font-size: 12px;
  }
`

export const PendingItemMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: ${neutral.softText};
  font-size: 11px;

  ${PendingItem}:hover & {
    color: ${neutral.primary};
  }

  ${MaterialIcon} {
    font-size: 16px;
  }
`

export const EmptyState = styled.p`
  margin: 0;
  padding: 14px 8px;
  color: ${neutral.softText};
  font-size: 13px;
  text-align: center;
`

export const DataStatus = styled.div<{ $tone?: 'error' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid ${({ $tone }) => ($tone === 'error' ? neutral.error : neutral.border)};
  border-radius: 8px;
  background: ${({ $tone }) => ($tone === 'error' ? neutral.errorTint : neutral.surfaceLow)};
  color: ${({ $tone }) => ($tone === 'error' ? neutral.error : neutral.muted)};

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const DataStatusText = styled.span`
  min-width: 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.4;
`

export const InlineRetryButton = styled.button`
  min-height: 28px;
  margin-left: auto;
  flex-shrink: 0;
  padding: 0 8px;
  border: 1px solid ${neutral.border};
  border-radius: 6px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${neutral.primary};
    color: ${neutral.primary};
  }
`

export const ActivitySkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const ActivitySkeleton = styled.span`
  width: 100%;
  height: 44px;
  display: block;
  border-radius: 6px;
  background: linear-gradient(90deg, ${neutral.surfaceContainer} 25%, ${neutral.surfaceHigh} 50%, ${neutral.surfaceContainer} 75%);
  background-size: 200% 100%;
  animation: ${loadingShimmer} 1.2s infinite;
`

export const SummaryCard = styled.button<{ $tone?: 'neutral' | 'action' }>`
  min-height: 140px;
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
  margin-bottom: 16px;
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
  font-weight: 500;
`

export const SummaryValue = styled.strong`
  margin-top: 6px;
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
