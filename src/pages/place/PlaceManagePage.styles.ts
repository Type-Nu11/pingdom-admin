import styled, { css } from 'styled-components'
import KakaoMap from '../../components/map/KakaoMap'
import { adminColors } from '../../styles/theme'

const neutral = adminColors

const controlStyle = css`
  min-height: 44px;
  border-radius: 8px;
  font-family: inherit;
`

export const AppShell = styled.div`
  min-height: 100vh;
  background: ${neutral.background};
  color: ${neutral.text};
  font-family:
    'Hanken Grotesk',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
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
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  padding: 0 24px;
  border: 0;
  border-right: 2px solid transparent;
  background: transparent;
  color: ${neutral.muted};
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
  border: 1px solid ${neutral.borderSoft};
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
  border: 1px solid ${neutral.primarySoft};
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
    font-weight: 800;
    line-height: 1.3;
  }

  span {
    color: ${neutral.muted};
    font-size: 12px;
    font-weight: 600;
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
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease;

  &:hover {
    border-color: ${neutral.primary};
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
  border-radius: 8px;
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const SplitContent = styled.div<{
  $isPanelCollapsed?: boolean
  $isDetailOpen?: boolean
}>`
  min-height: 0;
  display: grid;
  grid-template-columns: ${({ $isDetailOpen, $isPanelCollapsed }) =>
    `${$isPanelCollapsed ? '0' : '380px'} ${
      $isDetailOpen ? '360px' : '0'
    } minmax(0, 1fr)`};
  flex: 1;
  overflow: hidden;
  transition: grid-template-columns 180ms ease;

  @media (max-width: 1180px) {
    grid-template-columns: ${({ $isDetailOpen, $isPanelCollapsed }) =>
      `${$isPanelCollapsed ? '0' : '340px'} ${
        $isDetailOpen ? '320px' : '0'
      } minmax(0, 1fr)`};
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
  min-width: 0;
  min-height: 0;
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  overflow: hidden;
  flex-direction: column;
  border-right: 1px solid ${neutral.border};
  background: ${neutral.surface};

  @media (max-width: 900px) {
    display: ${({ $open }) => ($open ? 'flex' : 'none')};
    min-height: 420px;
    border-right: 0;
    border-bottom: 1px solid ${neutral.border};
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
  font-size: 11px;
  font-weight: 800;
`

export const DetailTitle = styled.h3`
  overflow: hidden;
  margin: 0;
  color: ${neutral.strongText};
  font-size: 18px;
  font-weight: 800;
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
  border-radius: 8px;
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
  padding: 16px;
`

export const DetailStatus = styled.div`
  padding: 14px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
`

export const DetailNotice = styled.p`
  margin: 0 0 14px;
  padding: 12px;
  border: 1px solid ${neutral.error};
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
`

export const DetailMetaList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
`

export const DetailMetaItem = styled.div`
  padding: 12px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  span {
    display: block;
    color: ${neutral.muted};
    font-size: 11px;
    font-weight: 800;
    line-height: 1.4;
  }

  strong {
    display: block;
    overflow: hidden;
    margin-top: 4px;
    color: ${neutral.text};
    font-size: 13px;
    font-weight: 700;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const DetailSection = styled.section`
  margin-top: 18px;
`

export const DetailSectionTitle = styled.h4`
  margin: 0 0 10px;
  color: ${neutral.strongText};
  font-size: 14px;
  font-weight: 800;
`

export const DetailPostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const DetailPostItem = styled.article`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border: 1px solid ${neutral.borderSoft};
  border-radius: 8px;
  background: ${neutral.surface};
`

export const DetailPostImage = styled.div`
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 8px;
  background: ${neutral.surfaceLow};

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`

export const DetailPostFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${neutral.softText};

  ${MaterialIcon} {
    font-size: 20px;
  }
`

export const DetailPostText = styled.div`
  min-width: 0;

  p {
    overflow: hidden;
    margin: 4px 0 0;
    color: ${neutral.muted};
    font-size: 12px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const DetailPostTitleButton = styled.button`
  max-width: 100%;
  display: block;
  overflow: hidden;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${neutral.strongText};
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${neutral.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

export const DetailPostMeta = styled.span`
  display: block;
  margin-top: 6px;
  color: ${neutral.softText};
  font-size: 11px;
  font-weight: 700;
`

export const DetailFooter = styled.footer`
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surface};
`

export const DetailActionButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`

export const DetailDeleteButton = styled(DetailActionButton)`
  border-color: ${neutral.error};
  background: ${neutral.errorTint};
  color: ${neutral.error};

  &:hover:not(:disabled) {
    border-color: ${neutral.error};
    background: ${neutral.error};
    color: ${neutral.primaryText};
  }
`

export const PanelControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
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
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.primary};
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease;

  &:hover {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const PanelActionGroup = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
`

export const PanelCount = styled.p`
  min-height: 23px;
  margin: 0;
  color: ${neutral.muted};
  font-size: 15px;
  line-height: 1.5;

  strong {
    color: ${neutral.primary};
    font-weight: 800;
  }
`

export const SearchField = styled.label`
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
  padding: 0 14px 0 40px;
  border: 1px solid ${neutral.border};
  outline: 1px solid transparent;
  background: ${neutral.surface};
  color: ${neutral.text};

  &::placeholder {
    color: ${neutral.placeholder};
  }

  &:focus {
    border-color: ${neutral.primary};
    outline-color: ${neutral.primary};
    box-shadow: 0 0 0 3px ${neutral.primaryTint};
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
  font-weight: 700;
`

export const ClearFilterButton = styled.button`
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: ${neutral.primary};
  font-size: 12px;
  font-weight: 800;
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
  font-size: 13px;
  font-weight: 600;
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
  border: 1px solid ${neutral.primary};
  border-radius: 8px;
  background: ${neutral.primary};
  color: ${neutral.primaryText};
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    opacity 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${neutral.primaryHover};
    background: ${neutral.primaryHover};
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

  @media (max-width: 900px) {
    max-height: 560px;
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
  padding: 14px 16px;
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
    background: ${neutral.primaryTint};
  }

  &:focus-visible {
    outline: 2px solid ${neutral.primary};
    outline-offset: -2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      box-shadow: inset 3px 0 0 ${neutral.primary};
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

export const PlaceInfo = styled.div`
  min-width: 0;
`

export const PlaceTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

export const PlaceName = styled.h3`
  overflow: hidden;
  margin: 0;
  color: ${neutral.strongText};
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ReportBadge = styled.span`
  flex-shrink: 0;
  padding: 3px 7px;
  border: 1px solid ${neutral.error};
  border-radius: 999px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 12px;
  font-weight: 700;
`

export const PlaceCaption = styled.p`
  margin: 4px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
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

export const PlaceStatList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
`

export const PlaceStat = styled.span`
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 0 8px;
  border: 1px solid ${neutral.primarySoft};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 12px;
  font-weight: 600;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ${MaterialIcon} {
    flex-shrink: 0;
    color: ${neutral.primary};
    font-size: 14px;
  }
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin: 16px;
  padding: 16px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  font-size: 14px;
  line-height: 1.5;
`

export const RetryButton = styled.button`
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${neutral.primary};
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
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
  color: ${neutral.text};
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${neutral.primarySoft};
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
  border-radius: 9px;
  background: ${({ $active }) => ($active ? neutral.primary : 'transparent')};
  color: ${({ $active }) => ($active ? neutral.primaryText : neutral.text)};
  font-size: 14px;
  font-weight: 600;
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

export const MapPanel = styled.section<{ $hasDetail?: boolean }>`
  position: relative;
  grid-column: ${({ $hasDetail }) => ($hasDetail ? '3' : '2 / 4')};
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: ${neutral.surfaceLow};

  @media (max-width: 900px) {
    grid-column: auto;
    min-height: 460px;
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

export const MapListToggleButton = styled.button`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 7;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px 0 10px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.softOverlay};
  color: ${neutral.text};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 22px ${neutral.shadow};

  &:hover {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }

  ${MaterialIcon} {
    font-size: 18px;
  }
`

export const MapControlButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.softOverlay};
  color: ${neutral.text};
  cursor: pointer;
  box-shadow: 0 8px 22px ${neutral.shadow};

  &:hover {
    border-color: ${neutral.primarySoft};
    background: ${neutral.primaryTint};
    color: ${neutral.primary};
  }
`

export const MapInfo = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(360px, calc(100% - 32px));
  padding: 8px 10px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.softOverlay};
  color: ${neutral.text};
  font-size: 12px;
  box-shadow: 0 8px 22px ${neutral.shadow};

  @media (max-width: 720px) {
    top: 12px;
    right: 12px;
    left: 12px;
    max-width: none;
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
  border-radius: 999px;
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
  line-height: 1.35;
  word-break: break-word;
`

export const ReportNotice = styled.div`
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${neutral.error};
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
  line-height: 1.45;
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
  line-height: 1.45;

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
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surface};
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
  border-radius: 8px;
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
  border: 1px solid ${neutral.error};
  border-radius: 8px;
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
  border: 1px solid ${neutral.success};
  border-radius: 8px;
  background: ${neutral.successSurface};
  box-shadow: 0 16px 40px ${neutral.shadow};
  color: ${neutral.successText};
  font-size: 14px;
  font-weight: 800;

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
  border: 1px solid ${neutral.error};
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
  font-weight: 800;
  line-height: 1.35;
`

export const DeleteConfirmDescription = styled.p`
  margin: 0;
  color: ${neutral.text};
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  word-break: keep-all;
`

export const DeleteConfirmMeta = styled.p`
  margin: 14px 0 0;
  padding: 12px;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceHighest};
  color: ${neutral.muted};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
`

export const DeleteConfirmNotice = styled.p`
  margin: 12px 0 0;
  padding: 12px;
  border: 1px solid ${neutral.error};
  border-radius: 8px;
  background: ${neutral.errorTint};
  color: ${neutral.error};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
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
