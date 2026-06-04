import styled, { css } from 'styled-components'
import KakaoMap from '../../components/map/KakaoMap'

const neutral = {
  background: '#f9f9f9',
  surface: '#ffffff',
  surfaceLow: '#f3f3f3',
  surfaceContainer: '#eeeeee',
  surfaceHigh: '#e8e8e8',
  surfaceHighest: '#e2e2e2',
  border: '#c4c7c7',
  borderDark: '#747878',
  text: '#1a1c1c',
  muted: '#444748',
  softText: '#636465',
  primary: '#000000',
  primaryText: '#ffffff',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
}

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
  width: 256px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${neutral.border};
  background: ${neutral.background};
`

export const SideHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  border-bottom: 1px solid ${neutral.border};
`

export const ProfileAvatar = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${neutral.border};
  border-radius: 999px;
  background: ${neutral.surfaceContainer};
`

export const SideTitle = styled.h1`
  margin: 0;
  color: ${neutral.primary};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
`

export const SideCaption = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 12px;
  line-height: 1.3;
`

export const SideMenu = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 0;
`

export const MenuButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
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

  &:hover {
    background: ${neutral.surfaceHigh};
    color: ${neutral.primary};
  }

  ${({ $active }) =>
    $active &&
    css`
      border-right-color: ${neutral.primary};
      background: ${neutral.surfaceHighest};
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
`

export const SideFooter = styled.div`
  padding: 16px 24px 24px;
  border-top: 1px solid ${neutral.border};
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
    background: ${neutral.surfaceContainer};
  }
`

export const MainArea = styled.div`
  height: 100vh;
  margin-left: 256px;
  display: flex;
  overflow: hidden;
  flex-direction: column;
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
  background: ${neutral.background};
`

export const TopTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const TopTitle = styled.h2`
  margin: 0;
  color: ${neutral.primary};
  font-size: 18px;
  font-weight: 700;
`

export const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

export const IconButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: ${neutral.muted};
  cursor: pointer;

  &:hover {
    color: ${neutral.primary};
  }
`

export const SplitContent = styled.div`
  min-height: 0;
  display: grid;
  grid-template-columns: 400px minmax(0, 1fr);
  flex: 1;
  overflow: hidden;
`

export const PlacePanel = styled.section`
  min-height: 0;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border-right: 1px solid ${neutral.border};
  background: ${neutral.surface};
`

export const PanelControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid ${neutral.border};
`

export const PanelSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const PanelCount = styled.p`
  margin: 0;
  color: ${neutral.muted};
  font-size: 14px;

  strong {
    color: ${neutral.primary};
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
  color: ${neutral.muted};
  transform: translateY(-50%);
  pointer-events: none;
`

export const SearchInput = styled.input`
  ${controlStyle}
  width: 100%;
  padding: 0 14px 0 40px;
  border: 0;
  outline: 1px solid transparent;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};

  &:focus {
    outline-color: ${neutral.primary};
    background: ${neutral.surface};
  }
`

export const FilterRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 36px;
  gap: 8px;
`

export const Select = styled.select`
  height: 36px;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  outline: 1px solid transparent;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline-color: ${neutral.primary};
  }
`

export const IconFilterButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: ${neutral.surfaceLow};
  color: ${neutral.text};
  cursor: pointer;

  &:hover {
    background: ${neutral.surfaceHigh};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

export const PlaceList = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
`

export const PlaceItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border: 0;
  border-bottom: 1px solid ${neutral.border};
  background: ${({ $active }) => ($active ? neutral.surfaceLow : neutral.surface)};
  color: ${neutral.text};
  text-align: left;
  cursor: pointer;
  transition:
    background 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    background: ${neutral.surfaceLow};
  }

  ${({ $active }) =>
    $active &&
    css`
      box-shadow: inset 3px 0 0 ${neutral.primary};
    `}
`

export const PlaceThumb = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: ${neutral.surfaceContainer};
  color: ${neutral.muted};
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
  color: ${neutral.primary};
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ReportBadge = styled.span`
  flex-shrink: 0;
  padding: 3px 7px;
  border: 1px solid rgb(186 26 26 / 24%);
  border-radius: 999px;
  background: ${neutral.errorContainer};
  color: ${neutral.error};
  font-size: 12px;
  font-weight: 700;
`

export const PlaceCaption = styled.p`
  margin: 2px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
`

export const PlaceMeta = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  margin: 6px 0 0;
  color: ${neutral.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${MaterialIcon} {
    flex-shrink: 0;
    font-size: 14px;
  }
`

export const PlaceFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  color: ${neutral.muted};
  font-size: 12px;
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
    background: ${neutral.surfaceContainer};
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
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid ${neutral.border};
  background: ${neutral.surface};
`

export const PageButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: ${neutral.surfaceLow};
  color: ${neutral.muted};
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;

  &:hover:not(:disabled) {
    border-color: ${neutral.border};
    background: ${neutral.surfaceContainer};
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
  gap: 3px;
  padding: 3px;
  border: 1px solid ${neutral.border};
  border-radius: 10px;
  background: ${neutral.surfaceLow};
`

export const PageNumberButton = styled.button<{ $active?: boolean }>`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: ${({ $active }) => ($active ? neutral.primary : 'transparent')};
  color: ${({ $active }) => ($active ? neutral.primaryText : neutral.text)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    background: ${({ $active }) =>
      $active ? neutral.primary : neutral.surface};
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
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: ${neutral.surfaceLow};
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
  color: ${({ $active }) => ($active ? neutral.primary : neutral.softText)};
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
`

export const MapControlButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${neutral.border};
  border-radius: 8px;
  background: rgb(255 255 255 / 92%);
  color: ${neutral.text};
  cursor: pointer;
  box-shadow: 0 8px 22px rgb(0 0 0 / 8%);

  &:hover {
    background: ${neutral.surfaceHigh};
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
  background: rgb(255 255 255 / 92%);
  color: ${neutral.text};
  font-size: 12px;
  box-shadow: 0 8px 22px rgb(0 0 0 / 8%);
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
  background: rgb(0 0 0 / 45%);
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
  box-shadow: 0 24px 70px rgb(0 0 0 / 18%);
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
  color: ${neutral.primary};
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
  border: 1px solid rgb(186 26 26 / 14%);
  border-radius: 8px;
  background: rgb(255 218 214 / 28%);
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
    background: rgb(255 218 214 / 28%);
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
