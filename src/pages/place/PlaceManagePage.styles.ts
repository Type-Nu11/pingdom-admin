import styled, { css } from 'styled-components'
import KakaoMap from '../../components/map/KakaoMap'
import { adminColors, radius } from '../../styles/theme'

const neutral = adminColors
const mapControlHoverBackground = '#FFF0F4'

const controlStyle = css`
  min-height: 44px;
  border-radius: 8px;
  font-family: inherit;
`

export const AppShell = styled.div`
  min-height: 100vh;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family: inherit;
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

export const BrandLockup = styled.div`
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

export const MenuButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  padding: 0 24px;
  border: 0;
  border-right: 2px solid transparent;
  background: transparent;
  color: ${neutral.neutralText};
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;

  &:hover:not(:disabled) {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    border-right-color: ${neutral.warning};
    background: ${neutral.warningTint};
    color: ${neutral.muted};
    cursor: default;

    ${MaterialIcon} {
      color: ${neutral.warning};
    }
  }

  ${({ $active }) =>
    $active &&
    css`
      border-right-color: ${neutral.primary};
      background: ${neutral.primaryTint};
      color: ${neutral.primary};
      font-weight: 700;

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

    &:disabled {
      border-right: 0;
      border-bottom-color: ${neutral.warning};
    }

    ${({ $active }) =>
      $active &&
      css`
        border-bottom-color: ${neutral.primary};
      `}
  }
`

export const MenuStatusText = styled.span`
  margin-left: auto;
  color: ${neutral.warning};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
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
  color: ${neutral.primary};

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
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
  }

  span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
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
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
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
  font-size: 18px;
  font-weight: 700;
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
    color: ${neutral.primary};
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
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
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

export const SplitContent = styled.div<{
  $isPanelCollapsed?: boolean
}>`
  min-height: 0;
  display: grid;
  grid-template-columns: ${({ $isPanelCollapsed }) =>
    `${$isPanelCollapsed ? '0' : '380px'} minmax(0, 1fr)`};
  flex: 1;
  overflow: hidden;
  transition: grid-template-columns 180ms ease;

  @media (max-width: 1180px) {
    grid-template-columns: ${({ $isPanelCollapsed }) =>
      `${$isPanelCollapsed ? '0' : '340px'} minmax(0, 1fr)`};
  }

  @media (max-width: 900px) {
    min-height: auto;
    grid-template-columns: 1fr;
    overflow: visible;
  }
`

export const PlacePanel = styled.section<{ $collapsed?: boolean }>`
  min-height: 0;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border-right: ${({ $collapsed }) =>
    $collapsed ? '0' : `1px solid ${neutral.border}`};
  background: ${neutral.surface};
  opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
  pointer-events: ${({ $collapsed }) => ($collapsed ? 'none' : 'auto')};

  @media (max-width: 900px) {
    display: ${({ $collapsed }) => ($collapsed ? 'none' : 'flex')};
    border-right: 0;
    border-bottom: 1px solid ${neutral.border};
  }
`

export const PlaceDetailPanel = styled.aside<{ $open?: boolean }>`
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 12px;
  z-index: 8;
  width: min(432px, calc(100% - 24px));
  min-width: 0;
  min-height: 0;
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  overflow: hidden;
  flex-direction: column;
  border: 0;
  border-radius: ${radius.lg};
  background: ${neutral.surface};
  box-shadow: 0 18px 48px ${neutral.strongShadow};

  @media (max-width: 900px) {
    inset: 16px;
    width: auto;
    min-height: 0;
  }
`

export const DetailHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const DetailTitleGroup = styled.div`
  min-width: 0;
`

export const DetailEyebrow = styled.p`
  margin: 0 0 4px;
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
`

export const DetailTitle = styled.h3`
  overflow: hidden;
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DetailCloseButton = styled.button`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceLow};
    color: ${neutral.primary};
  }
`

export const DetailBody = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 24px;
`

export const DetailStatus = styled.div`
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
`

export const DetailNotice = styled.p`
  margin: 0 0 14px;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
`

export const DetailErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};

  p {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
  }
`

export const DetailMetaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const DetailRepresentativeImage = styled.img`
  width: 100%;
  height: 176px;
  display: block;
  margin: 0 0 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  object-fit: cover;
`

export const DetailImagePlaceholder = styled.div`
  width: 100%;
  height: 176px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 12px;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 700;

  ${MaterialIcon} {
    font-size: 20px;
  }
`

export const DetailMetaGroup = styled.section`
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
`

export const DetailMetaGroupTitle = styled.h4`
  margin: 0 0 10px;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
`

export const DetailMetaRow = styled.div`
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 8px 0;
  border-top: 1px solid ${neutral.border};

  &:first-of-type {
    border-top: 0;
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }

  span {
    display: block;
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 700;
    line-height: 1.3;
  }

  strong {
    display: block;
    overflow: hidden;
    color: ${neutral.text};
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const DetailSection = styled.section`
  margin-top: 18px;
`

export const DetailSectionTitle = styled.h4`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
`

export const DetailSectionHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
  margin-bottom: 12px;

  ${DetailSectionTitle} {
    padding-top: 6px;
  }
`

export const DetailInlineButton = styled.button`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 0 10px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  ${MaterialIcon} {
    font-size: 16px;
  }

  &:hover:not(:disabled) {
    background: ${neutral.primarySoft};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const OperatingSummary = styled.div`
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
`

export const OperatingSummaryRow = styled.div`
  min-height: 66px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border-top: 1px solid ${neutral.border};

  &:first-child {
    border-top: 0;
  }

  > ${DetailInlineButton} {
    align-self: center;
  }
`

export const OperatingSummaryLabel = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  span {
    color: ${neutral.text};
    font-size: 14px;
    font-weight: 700;
  }

  small {
    overflow: hidden;
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const OperatingSummaryAction = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;

  ${DetailInlineButton} {
    min-width: 68px;
  }
`

export const OperatingStatusBadge = styled.span<{
  $tone: 'normal' | 'notice' | 'danger' | 'muted'
}>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${({ $tone }) =>
    $tone === 'danger'
      ? neutral.errorTint
      : $tone === 'notice'
        ? neutral.warningTint
        : $tone === 'muted'
          ? neutral.primaryTint
          : neutral.successSurface};
  color: ${({ $tone }) =>
    $tone === 'danger'
      ? neutral.error
      : $tone === 'notice'
        ? neutral.warningText
        : $tone === 'muted'
          ? neutral.primary
          : neutral.successText};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`

export const OperatingHoursList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const OperatingHoursItem = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 7px;
  background: ${neutral.surface};

  span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    overflow: hidden;
    color: ${neutral.text};
    font-size: 12px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const OperatingExceptionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;

  span {
    color: ${neutral.strongText};
    font-size: 12px;
    font-weight: 700;
  }

  small {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 700;
  }
`

export const OperatingExceptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
`

export const OperatingExceptionItem = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 7px;
  background: ${neutral.surface};

  span,
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    color: ${neutral.text};
    font-size: 12px;
    font-weight: 700;
    text-align: right;
  }
`

export const OperatingEmptyState = styled.p`
  margin: 10px 0 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 7px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
`

export const DetailFooter = styled.footer`
  position: relative;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid ${neutral.borderDark};
  background: ${neutral.surface};
  box-shadow: 0 -12px 24px ${neutral.shadow};
`

export const DetailActionButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 0 12px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const DetailDeleteButton = styled(DetailActionButton)`
  background: ${neutral.errorTint};
  color: ${neutral.error};

  &:hover:not(:disabled) {
    background: ${neutral.error};
    color: ${neutral.primaryText};
  }
`

export const PanelControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid ${neutral.border};

  @media (max-width: 520px) {
    padding: 16px;
  }
`

export const PanelSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const PanelCollapseButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    background: ${neutral.primarySoft};
    color: ${neutral.primary};
  }
`

export const PanelActionGroup = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(118px, 0.9fr) 40px;
  align-items: center;
  gap: 8px;
`

export const PanelCount = styled.p`
  min-height: 23px;
  margin: 0;
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.3;

  strong {
    color: ${neutral.primary};
    font-weight: 700;
  }
`

export const SearchField = styled.div`
  position: relative;
  display: block;
`

export const SearchIcon = styled(MaterialIcon)`
  position: absolute;
  top: 50%;
  left: 12px;
  z-index: 1;
  color: ${neutral.primary};
  transform: translateY(-50%);
  pointer-events: none;
`

export const SearchInput = styled.input`
  ${controlStyle}
  width: 100%;
  padding: 0 44px 0 40px;
  border: 1px solid ${neutral.border};
  outline: 1px solid transparent;
  background: ${neutral.surface};
  color: ${neutral.text};

  &::-webkit-search-cancel-button,
  &::-webkit-search-decoration {
    appearance: none;
    display: none;
  }

  &::-ms-clear {
    display: none;
  }

  &::placeholder {
    color: ${neutral.placeholder};
  }

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const SearchClearButton = styled.button`
  position: absolute;
  top: 50%;
  right: 8px;
  z-index: 2;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceHigh};
  color: ${neutral.muted};
  cursor: pointer;
  transform: translateY(-50%);

  ${MaterialIcon} {
    font-size: 16px;
    font-variation-settings:
      'FILL' 0,
      'wght' 600,
      'GRAD' 0,
      'opsz' 16;
  }

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }
`

export const PanelResultSummary = styled.div`
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 500;
`

export const ListInlineNotice = styled.div`
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 16px 10px;
  padding: 8px 10px 8px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;

  button {
    min-height: 30px;
    flex: 0 0 auto;
    padding: 0 9px;
    border-color: ${neutral.error};
    color: ${neutral.error};
    font-size: 12px;
  }
`

export const ClearFilterButton = styled.button`
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: ${neutral.primaryHover};
  }
`

export const FilterRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
`

export const FilterControl = styled.label`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
`

export const Select = styled.select`
  height: 40px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid ${neutral.border};
  border-radius: 4px;
  outline: 1px solid transparent;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  cursor: pointer;

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }
`

export const CompactSelect = styled.select`
  height: 40px;
  width: 92px;
  padding: 0 10px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

export const IconFilterButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  cursor: pointer;
  transition:
    background 160ms ease,
    opacity 160ms ease;

  &:hover:not(:disabled) {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const PlaceList = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;

  scrollbar-width: thin;
  scrollbar-color: ${neutral.borderDark} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    border: 2px solid ${neutral.surface};
    border-radius: 999px;
    background: ${neutral.borderDark};
  }

  @media (max-width: 900px) {
    max-height: 560px;
  }
`

export const PlaceListSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

export const PlaceSkeletonItem = styled.div`
  min-height: 104px;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${neutral.borderSoft};
`

export const PlaceSkeletonThumbnail = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: ${neutral.surfaceHigh};
`

export const PlaceSkeletonContent = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
`

export const PlaceSkeletonLine = styled.span<{ $width: string }>`
  width: ${({ $width }) => $width};
  height: 11px;
  display: block;
  border-radius: 3px;
  background: ${neutral.surfaceHigh};

  @media (prefers-reduced-motion: no-preference) {
    animation: place-skeleton-pulse 1.5s ease-in-out infinite;
  }

  @keyframes place-skeleton-pulse {
    50% {
      opacity: 0.55;
    }
  }
`

export const ListStatus = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 10px 20px;
  border-bottom: 1px solid ${neutral.border};
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
`

export const PlaceItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 16px 18px;
  border: 0;
  border-bottom: 1px solid ${neutral.border};
  background: ${({ $active }) => ($active ? neutral.primaryTint : neutral.surface)};
  color: ${neutral.text};
  text-align: left;
  cursor: pointer;
  transition:
    background 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    background: ${({ $active }) => ($active ? neutral.primaryTint : neutral.surfaceLow)};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: -2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      box-shadow: inset 4px 0 0 ${neutral.primary};
    `}

  @media (max-width: 520px) {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 12px;
    padding: 16px;
  }
`

export const PlaceThumb = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.primary};

  @media (max-width: 520px) {
    width: 40px;
    height: 40px;
  }
`

export const PlaceCategoryIconImage = styled.img`
  width: 22px;
  height: 22px;
  display: block;
  object-fit: contain;
`

export const PlaceInfo = styled.div`
  min-width: 0;
`

export const PlaceTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

export const PlaceTitleBadges = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
`

export const PlaceName = styled.h3`
  overflow: hidden;
  margin: 0;
  color: ${neutral.strongText};
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PlaceCategoryBadge = styled.span`
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px 7px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
`

export const PlaceDiscoveryStatusBadge = styled.span`
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px 7px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.primaryTint};
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
`

export const ReportBadge = styled.span`
  flex-shrink: 0;
  padding: 3px 6px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
`

export const PlaceMeta = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  margin: 8px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${MaterialIcon} {
    flex-shrink: 0;
    font-size: 14px;
  }
`

export const PlaceMetaLine = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 0;
  align-items: center;
  margin: 9px 0 0;
  color: ${neutral.softText};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;

  span {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    overflow-wrap: anywhere;

    &::after {
      display: inline-block;
      margin: 0 7px;
      color: ${neutral.borderDark};
      content: '·';
    }

    &:last-child::after {
      display: none;
    }
  }
`

export const PlaceStatList = PlaceMetaLine

export const PlaceStat = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin: 16px;
  padding: 16px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.3;
`

export const RetryButton = styled.button`
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

export const PanelPagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surface};
`

export const PageButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;

  &:hover:not(:disabled) {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.32;
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const PageNumberList = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid ${neutral.border};
  border-radius: 12px;
  background: ${neutral.surface};
`

export const PageNumberButton = styled.button<{ $active?: boolean }>`
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${radius.pill};
  background: ${({ $active }) => ($active ? neutral.primary : 'transparent')};
  color: ${({ $active }) => ($active ? neutral.primaryText : neutral.text)};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    background: ${({ $active }) =>
      $active ? neutral.primary : neutral.primaryTint};
    color: ${({ $active }) => ($active ? neutral.primaryText : neutral.primary)};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.72;
  }
`

export const MapPanel = styled.section`
  position: relative;
  grid-column: 2;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: ${neutral.surfaceLow};

  @media (max-width: 900px) {
    grid-column: auto;
    min-height: 520px;
  }
`

export const AdminMap = styled(KakaoMap)`
  position: absolute;
  inset: 0;
  min-height: 0;

  > div {
    border: 0;
    border-radius: 0;
  }
`

export const MapMarkerLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
`

export const MapMarker = styled.button<{ $active?: boolean }>`
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 0;
  background: transparent;
  color: ${({ $active }) => ($active ? neutral.primary : neutral.muted)};
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.74)};
  pointer-events: auto;
  transform: translate(-50%, -50%);
  transition:
    color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;

  ${MaterialIcon} {
    font-size: ${({ $active }) => ($active ? '40px' : '32px')};
    font-variation-settings:
      'FILL' 1,
      'wght' 400,
      'GRAD' 0,
      'opsz' 20;
  }

  ${({ $active }) =>
    $active &&
    css`
      &::after {
        position: absolute;
        width: 34px;
        height: 34px;
        border: 2px solid ${neutral.primary};
        border-radius: 999px;
        content: '';
        opacity: 0.72;
      }
    `}

  &:hover {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.06);
  }
`

export const MarkerTooltip = styled.span`
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-bottom: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  background: ${neutral.primary};
  color: ${neutral.primaryText};
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-50%);
  transition: opacity 160ms ease;

  ${MapMarker}:hover & {
    opacity: 1;
  }
`

export const MapControlGroup = styled.div`
  position: absolute;
  right: 32px;
  bottom: 32px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 720px) {
    right: 16px;
    bottom: 16px;
  }
`

export const MapListToggleButton = styled(PanelCollapseButton)`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 7;
  width: auto;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px 0 10px;
  font-size: 14px;
  font-weight: 700;

  &&:hover:not(:disabled) {
    background: ${mapControlHoverBackground};
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const MapControlButton = styled(PanelCollapseButton)`
  width: 40px;
  height: 40px;

  &&:hover:not(:disabled) {
    background: ${mapControlHoverBackground};
  }
`

export const MapInfo = styled.div`
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(360px, calc(100% - 40px));
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 8px 22px ${neutral.shadow};

  @media (max-width: 720px) {
    top: 12px;
    right: 12px;
    max-width: min(340px, calc(100% - 24px));
  }
`

export const MapInfoText = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    color: ${neutral.text};
    font-size: 12px;
    font-weight: 700;
    line-height: 1.3;
  }

`

export const MapInfoDot = styled.span`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
  background: ${neutral.primary};
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: ${neutral.overlay};
  backdrop-filter: blur(3px);
`

export const OperatingDialogOverlay = styled(ModalOverlay)`
  z-index: 130;
`

export const OperatingDialog = styled.section<{ $wide?: boolean }>`
  width: ${({ $wide }) => ($wide ? 'min(840px, 100%)' : 'min(480px, 100%)')};
  max-height: min(820px, calc(100vh - 64px));
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surface};
  box-shadow: 0 24px 70px ${neutral.strongShadow};
`

export const OperatingDialogHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid ${neutral.border};
`

export const OperatingDialogEyebrow = styled.p`
  margin: 0 0 4px;
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 700;
`

export const OperatingDialogTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
`

export const OperatingDialogCloseButton = styled.button`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${neutral.border};
    background: ${neutral.surfaceLow};
    color: ${neutral.primary};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const OperatingDialogBody = styled.div`
  min-height: 0;
  display: flex;
  overflow-y: auto;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
`

export const OperatingDialogDescription = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  word-break: keep-all;
`

export const OperatingFormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;

  small {
    align-self: flex-end;
    color: ${neutral.softText};
    font-size: 12px;
    font-weight: 500;
  }

  &:is(fieldset) {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
  }
`

export const OperatingOptionGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
`

export const OperatingOption = styled.label<{
  $selected?: boolean
  $tone?: 'normal' | 'danger' | 'muted'
}>`
  min-height: 74px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  border: 1px solid
    ${({ $selected, $tone }) =>
      $selected
        ? $tone === 'danger'
          ? neutral.error
          : neutral.primary
        : neutral.border};
  border-radius: 8px;
  background: ${({ $selected, $tone }) =>
    $selected
      ? $tone === 'danger'
        ? neutral.errorTint
        : neutral.primaryTint
      : neutral.surface};
  color: ${neutral.text};
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  strong {
    color: ${({ $selected, $tone }) =>
      $selected && $tone === 'danger' ? neutral.error : neutral.strongText};
    font-size: 14px;
    font-weight: 700;
    line-height: 1.3;
  }

  small {
    align-self: auto;
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
  }

  &:hover:not(:has(input:disabled)) {
    border-color: ${({ $tone }) => ($tone === 'danger' ? neutral.error : neutral.primarySoft)};
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:has(input:disabled) {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingSelect = styled.select`
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  outline: 0;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:focus {
    border-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingTextInput = styled.input`
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  outline: 0;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 14px;
  font-weight: 700;

  &::placeholder {
    color: ${neutral.softText};
  }

  &:focus {
    border-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingFieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 620px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const OperatingCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const OperatingCategoryOption = styled.label<{ $selected?: boolean }>`
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid ${({ $selected }) => ($selected ? neutral.primary : neutral.border)};
  border-radius: 8px;
  background: ${({ $selected }) => ($selected ? neutral.primaryTint : neutral.surface)};
  color: ${({ $selected }) => ($selected ? neutral.primary : neutral.text)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  input {
    width: 15px;
    height: 15px;
    margin: 0;
    accent-color: ${neutral.primary};
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:has(input:disabled) {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingActionTabs = styled.div<{ $columns?: 3 | 4 }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 4 }) => $columns}, minmax(0, 1fr));
  gap: 6px;
  padding: 5px;
  border-radius: 9px;
  background: ${neutral.surfaceHighest};

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const OperatingComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
`

export const OperatingComparisonItem = styled.div<{ $changed?: boolean }>`
  min-width: 0;
  padding: 12px;
  border: 1px solid ${({ $changed }) => ($changed ? neutral.primarySoft : neutral.border)};
  border-radius: 8px;
  background: ${({ $changed }) =>
    $changed ? neutral.primaryTint : neutral.surfaceHighest};

  span,
  strong {
    display: block;
  }

  span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    margin-top: 4px;
    overflow: hidden;
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const OperatingComparisonArrow = styled(MaterialIcon)`
  color: ${neutral.muted};
  font-size: 18px;
`

export const OperatingCoordinateComparison = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;

  strong {
    color: ${neutral.primary};
  }

  ${MaterialIcon} {
    font-size: 16px;
  }
`

export const OperatingActionTab = styled.button<{ $active?: boolean; $danger?: boolean }>`
  min-height: 38px;
  padding: 0 9px;
  border: 1px solid ${({ $active, $danger }) =>
    $active ? ($danger ? neutral.error : neutral.border) : 'transparent'};
  border-radius: 7px;
  background: ${({ $active }) => ($active ? neutral.surface : 'transparent')};
  color: ${({ $active, $danger }) =>
    $active && $danger ? neutral.error : $active ? neutral.primary : neutral.muted};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ $danger }) => ($danger ? neutral.error : neutral.primary)};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingResultNotice = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.primaryTint};
  color: ${neutral.text};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;

  strong {
    color: ${neutral.primary};
    font-weight: 700;
  }
`

export const OperatingTextArea = styled.textarea`
  min-height: 96px;
  resize: vertical;
  padding: 11px 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  outline: 0;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;

  &::placeholder {
    color: ${neutral.softText};
  }

  &:focus {
    border-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const OperatingDangerNotice = styled.p`
  margin: 0;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
`

export const OperatingInfoNotice = styled.p`
  margin: 0;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
`

export const OperatingFormNotice = styled.p`
  margin: 0;
  padding: 11px 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
`

export const OperatingEditorSection = styled.section`
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
`

export const OperatingEditorSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  strong {
    color: ${neutral.strongText};
    font-size: 14px;
    font-weight: 700;
  }

  > span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 500;
  }
`

export const OperatingWeekList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const OperatingWeekRow = styled.div`
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${neutral.border};
  border-radius: 7px;
  background: ${neutral.surface};

  > div:last-child {
    min-width: 0;
    flex: 1;
  }

  @media (max-width: 620px) {
    flex-direction: column;
  }
`

export const OperatingWeekRowHeader = styled.div`
  width: 140px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  @media (max-width: 620px) {
    width: 100%;
  }
`

export const OperatingCheckLabel = styled.label`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${neutral.text};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${neutral.primary};
  }

  input:disabled {
    cursor: default;
  }
`

export const OperatingTimeControls = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex-shrink: 0;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
`

export const OperatingTimeInput = styled.input`
  width: 104px;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid ${neutral.border};
  border-radius: 6px;
  outline: 0;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 12px;
  font-weight: 700;

  &:focus {
    border-color: ${neutral.primary};
    box-shadow: 0 0 0 2px ${neutral.primaryTint};
  }

  &:disabled {
    cursor: default;
    background: ${neutral.surfaceLow};
    color: ${neutral.softText};
  }
`

export const OperatingExceptionEditorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const OperatingExceptionEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${neutral.border};
  border-radius: 7px;
  background: ${neutral.surface};
`

export const OperatingExceptionEditorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  > div:first-child {
    width: 150px;
  }
`

export const OperatingDateInput = styled.input`
  min-height: 36px;
  min-width: 0;
  padding: 0 8px;
  border: 1px solid ${neutral.border};
  border-radius: 6px;
  outline: 0;
  background: ${neutral.surface};
  color: ${neutral.text};
  font: inherit;
  font-size: 12px;
  font-weight: 700;

  &:focus {
    border-color: ${neutral.primary};
    box-shadow: 0 0 0 2px ${neutral.primaryTint};
  }

  &:disabled {
    cursor: default;
    background: ${neutral.surfaceLow};
    color: ${neutral.softText};
  }
`

export const OperatingExceptionHours = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

export const OperatingExceptionTimeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const OperatingIconButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  cursor: pointer;

  ${MaterialIcon} {
    font-size: 18px;
  }

  &:hover:not(:disabled) {
    background: ${neutral.errorTint};
    color: ${neutral.error};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
`

export const OperatingTextButton = styled.button`
  width: fit-content;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${neutral.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  ${MaterialIcon} {
    font-size: 16px;
  }

  &:hover:not(:disabled) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const OperatingDialogActions = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surfaceLow};

  @media (max-width: 520px) {
    flex-direction: column-reverse;

    button {
      width: 100%;
    }
  }
`

export const OperatingPrimaryButton = styled.button<{ $danger?: boolean }>`
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${({ $danger }) => ($danger ? neutral.error : neutral.primary)};
  color: ${neutral.primaryText};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`

export const PlaceModal = styled.section`
  width: min(520px, 100%);
  max-height: min(760px, 92vh);
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid ${neutral.border};
  border-radius: 12px;
  background: ${neutral.surface};
  box-shadow: 0 24px 70px ${neutral.strongShadow};
`

export const ModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid ${neutral.border};
`

export const ModalTitle = styled.h2`
  margin: 0;
  color: ${neutral.strongText};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
`

export const ModalCloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: ${radius.pill};
  background: transparent;
  color: ${neutral.text};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceHigh};
  }
`

export const ModalBody = styled.div`
  display: flex;
  overflow-y: auto;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 28px;
`

export const DetailItem = styled.div`
  min-width: 0;
`

export const DetailLabel = styled.p`
  margin: 0 0 6px;
  color: ${neutral.muted};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
`

export const DetailValue = styled.p`
  margin: 0;
  color: ${neutral.text};
  font-size: 16px;
  line-height: 1.3;
  word-break: break-word;
`

export const ReportNotice = styled.div`
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};

  ${MaterialIcon} {
    flex-shrink: 0;
    font-size: 24px;
  }
`

export const ReportTitle = styled.p`
  margin: 0 0 4px;
  color: ${neutral.error};
  font-size: 14px;
  font-weight: 700;
`

export const ReportDescription = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const PhotoLink = styled.button`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  border: 0;
  background: transparent;
  color: ${neutral.primary};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: ${neutral.primaryHover};
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const MemoBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const MemoTextarea = styled.textarea`
  min-height: 120px;
  resize: vertical;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  outline: 1px solid transparent;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};

  &:focus {
    outline-color: ${neutral.primary};
    background: ${neutral.surface};
  }
`

export const DeleteWarning = styled.div`
  display: flex;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: ${neutral.error};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;

  ${MaterialIcon} {
    flex-shrink: 0;
  }
`

export const ModalFooter = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surfaceLow};
`

export const SecondaryButton = styled.button`
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceHigh};
  }
`

export const DangerOutlineButton = styled.button`
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid ${neutral.error};
  border-radius: ${radius.pill};
  background: ${neutral.surface};
  color: ${neutral.error};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${neutral.errorTint};
  }
`

export const DangerButton = styled.button`
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: ${radius.pill};
  background: ${neutral.error};
  color: ${neutral.primaryText};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`

export const ActionToast = styled.div`
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 150;
  min-height: 48px;
  max-width: min(420px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.successToastSurface};
  box-shadow: 0 16px 40px ${neutral.shadow};
  color: ${neutral.successText};
  font-size: 14px;
  font-weight: 700;

  ${MaterialIcon} {
    color: ${neutral.success};
    font-size: 20px;
    font-variation-settings:
      'FILL' 1,
      'wght' 500,
      'GRAD' 0,
      'opsz' 20;
  }

  @media (max-width: 720px) {
    top: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
`

export const DeleteConfirmOverlay = styled(ModalOverlay)`
  z-index: 120;
`

export const DeleteConfirmDialog = styled.section`
  width: min(420px, 100%);
  padding: 24px;
  border: 1px solid ${neutral.error};
  border-radius: 8px;
  background: ${neutral.surface};
  box-shadow: 0 18px 48px ${neutral.strongShadow};
`

export const DeleteConfirmIcon = styled.div`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};

  ${MaterialIcon} {
    font-size: 24px;
    font-variation-settings:
      'FILL' 1,
      'wght' 500,
      'GRAD' 0,
      'opsz' 24;
  }
`

export const DeleteConfirmTitle = styled.h2`
  margin: 0 0 8px;
  color: ${neutral.strongText};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
`

export const DeleteConfirmDescription = styled.p`
  margin: 0;
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  word-break: keep-all;
`

export const DeleteConfirmMeta = styled.p`
  margin: 14px 0 0;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
`

export const DeleteConfirmWarning = styled.p`
  margin: 12px 0 0;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.warningTint};
  color: ${neutral.warningText};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  word-break: keep-all;
`

export const DeleteConfirmInput = styled.input`
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid ${neutral.error};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.strongText};
  font: inherit;
  text-align: center;

  &:focus { outline: 3px solid ${neutral.errorTint}; }
  &:disabled { opacity: 0.6; }
`

export const DeleteConfirmNotice = styled.p`
  margin: 12px 0 0;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
`

export const DeleteConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;

  @media (max-width: 520px) {
    flex-direction: column-reverse;

    ${SecondaryButton},
    ${DangerButton} {
      width: 100%;
    }
  }
`
